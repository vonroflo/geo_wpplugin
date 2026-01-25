// /lib/geo-services.ts
import { getFirestore } from "@/lib/gcp/firestore";
import { enqueueHttpTask } from "@/lib/gcp/tasks";

import type {
    BrandCreateRequest,
    BrandUpdateRequest,
    ScanCreateRequest,
    ActionPlanRequest,
    ContentBriefsRequest,
    HeadToHeadRequest,
    CompetitorPatternsRequest,
} from "@/lib/geo-zod-requests";

import type {
    BrandParsed,
    ScanParsed,
    ScoreSummaryParsed,
    CompetitorWinnersParsed,
    DiagnosticsParsed,
    ActionPlanParsed,
    ContentBriefsParsed,
    TrendsParsed,
    AgencyReportParsed,
} from "@/lib/geo-zod-full";

function nowISO() {
    return new Date().toISOString();
}

function randomId(prefix: string) {
    return `${prefix}_${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`.slice(0, 28);
}

function getCloudRunBaseUrl() {
    const base = process.env.PUBLIC_BASE_URL;
    if (!base) throw new Error("Missing PUBLIC_BASE_URL (Cloud Run service base URL)");
    return base.replace(/\/+$/, "");
}

function getTasksConfig() {
    const taskSecret = process.env.TASK_SECRET;
    if (!taskSecret) throw new Error("Missing TASK_SECRET (Secret Manager -> env var)");
    const location = process.env.TASKS_LOCATION || "us-central1";
    const scanQueue = process.env.SCAN_TASK_QUEUE || "geo-scan-queue";
    const computeQueue = process.env.COMPUTE_TASK_QUEUE || "geo-compute-queue";
    return { taskSecret, location, scanQueue, computeQueue };
}

/* ----------------------------
   Brands
---------------------------- */
export async function createBrandService(input: BrandCreateRequest): Promise<BrandParsed> {
    const db = getFirestore();
    const id = randomId("brand");
    const now = nowISO();

    const doc: BrandParsed = {
        id,
        name: input.name,
        domain: input.domain ?? null,
        aliases: input.aliases ?? [],
        created_at: now,
        updated_at: now,
    };

    await db.collection("brands").doc(id).set(doc);
    return doc;
}

export async function getBrandService(brandId: string): Promise<BrandParsed | null> {
    const db = getFirestore();
    const snap = await db.collection("brands").doc(brandId).get();
    if (!snap.exists) return null;
    return snap.data() as BrandParsed;
}

export async function listBrandsService(args: {
    limit?: number;
    cursor?: string;
    sort_by?: string;
    sort_order?: "asc" | "desc";
}): Promise<{ items: BrandParsed[]; next_cursor: string | null }> {
    const db = getFirestore();
    const limit = Math.min(args.limit ?? 50, 200);

    // Build query with proper ordering: orderBy -> startAfter -> limit
    let q: FirebaseFirestore.Query = db.collection("brands");
    q = q.orderBy("created_at", "desc");
    if (args.cursor) q = q.startAfter(args.cursor);
    q = q.limit(limit);

    const snap = await q.get();
    const items = snap.docs.map((d) => d.data() as BrandParsed);
    // Only return cursor if we hit the limit (indicating more results may exist)
    const next_cursor = items.length === limit ? items[items.length - 1].created_at : null;
    return { items, next_cursor };
}

export async function updateBrandService(
    brandId: string,
    input: BrandUpdateRequest
): Promise<BrandParsed | null> {
    const db = getFirestore();
    const ref = db.collection("brands").doc(brandId);
    const snap = await ref.get();
    if (!snap.exists) return null;

    const prev = snap.data() as BrandParsed;
    const updated: BrandParsed = {
        ...prev,
        ...(input.name ? { name: input.name } : {}),
        ...(input.domain !== undefined ? { domain: input.domain } : {}),
        ...(input.aliases ? { aliases: input.aliases } : {}),
        updated_at: nowISO(),
    };

    await ref.set(updated, { merge: true });
    return updated;
}

/* ----------------------------
   Scans
---------------------------- */
export async function createScanService(input: ScanCreateRequest): Promise<{ scan_id: string; status: string }> {
    const db = getFirestore();
    const scan_id = randomId("scan");
    const now = nowISO();

    // Resolve brand (create if embedded)
    let brandId: string;
    let brandSnapshot: { name: string; domain?: string | null; aliases: string[] };

    if ("brand_id" in input.brand) {
        brandId = input.brand.brand_id;
        const brand = await getBrandService(brandId);
        if (!brand) throw new Error(`Brand not found: ${brandId}`);
        brandSnapshot = { name: brand.name, domain: brand.domain ?? null, aliases: brand.aliases ?? [] };
    } else {
        const created = await createBrandService({
            name: input.brand.name,
            domain: input.brand.domain ?? undefined,
            aliases: input.brand.aliases ?? [],
        });
        brandId = created.id;
        brandSnapshot = { name: created.name, domain: created.domain ?? null, aliases: created.aliases ?? [] };
    }

    const scanDoc: any = {
        id: scan_id,
        brand_id: brandId,
        brand_snapshot: brandSnapshot,

        status: "queued",
        created_at: now,
        started_at: null,
        completed_at: null,
        error: null,

        brand: {
            id: brandId,
            name: brandSnapshot.name,
            domain: brandSnapshot.domain ?? null,
            aliases: brandSnapshot.aliases ?? [],
            created_at: now,
            updated_at: now,
        },

        market: input.market,
        category: input.category,
        intents: input.intents,
        providers: input.ai_sources ?? ["chatgpt", "gemini", "perplexity"],
        competitors: input.competitors ?? [],
        mentions: [],
        options: input.options ?? {},
    };

    await db.collection("scans").doc(scan_id).set(scanDoc);

    const base = getCloudRunBaseUrl();
    const { taskSecret, location, scanQueue } = getTasksConfig();

    await enqueueHttpTask({
        queue: scanQueue,
        location,
        url: `${base}/api/internal/tasks/scan-worker`,
        payload: { scan_id },
        taskSecret,
    });

    return { scan_id, status: "queued" };
}

export async function getScanService(scanId: string): Promise<ScanParsed | null> {
    const db = getFirestore();
    const snap = await db.collection("scans").doc(scanId).get();
    if (!snap.exists) return null;

    const scan = snap.data() as any;

    // Attach mentions (limit to keep response manageable)
    const mentionsSnap = await db.collection("scans").doc(scanId).collection("mentions").limit(500).get();
    scan.mentions = mentionsSnap.docs.map((d) => d.data());

    return scan as ScanParsed;
}

export async function listScansService(args: {
    brand_id?: string;
    limit?: number;
    cursor?: string;
    sort_by?: string;
    sort_order?: "asc" | "desc";
}): Promise<{ items: ScanParsed[]; next_cursor: string | null }> {
    const db = getFirestore();
    const limit = Math.min(args.limit ?? 50, 200);

    // Build query with proper ordering: where -> orderBy -> startAfter -> limit
    let q: FirebaseFirestore.Query = db.collection("scans");
    if (args.brand_id) q = q.where("brand_id", "==", args.brand_id);
    q = q.orderBy("created_at", "desc");
    if (args.cursor) q = q.startAfter(args.cursor);
    q = q.limit(limit);

    const snap = await q.get();
    const items = snap.docs.map((d) => d.data() as ScanParsed);
    const next_cursor = items.length === limit ? items[items.length - 1].created_at : null;
    return { items, next_cursor };
}

/* ----------------------------
   Cached compute docs
---------------------------- */
export async function getScoresService(scanId: string, includeBreakdown?: boolean): Promise<ScoreSummaryParsed | null> {
    const db = getFirestore();
    const snap = await db.collection("scan_scores").doc(scanId).get();
    if (!snap.exists) return null;
    const scores = snap.data() as ScoreSummaryParsed;
    if (!includeBreakdown) return { ...scores, breakdown: null };
    return scores;
}

export async function getCompetitorWinnersService(scanId: string): Promise<CompetitorWinnersParsed | null> {
    const db = getFirestore();
    const snap = await db.collection("scan_winners").doc(scanId).get();
    if (!snap.exists) return null;
    return snap.data() as CompetitorWinnersParsed;
}

export async function getDiagnosticsService(scanId: string): Promise<DiagnosticsParsed | null> {
    const db = getFirestore();
    const snap = await db.collection("scan_diagnostics").doc(scanId).get();
    if (!snap.exists) return null;
    return snap.data() as DiagnosticsParsed;
}

export async function headToHeadService(input: HeadToHeadRequest) {
    const db = getFirestore();
    const key = `h2h_${input.scan_id}_${input.competitor.name}`;
    const snap = await db.collection("scan_h2h").doc(key).get();
    if (!snap.exists) return null;
    return snap.data();
}

export async function competitorPatternsService(input: CompetitorPatternsRequest) {
    const db = getFirestore();
    const key = `patterns_${input.scan_id}_${input.competitor.name}`;
    const snap = await db.collection("scan_patterns").doc(key).get();
    if (!snap.exists) return null;
    return snap.data();
}

/* ----------------------------
   Recommendations (async compute)
---------------------------- */
export async function generateActionPlanService(input: ActionPlanRequest): Promise<ActionPlanParsed | null> {
    const db = getFirestore();
    const horizon = input.time_horizon_days ?? 30;
    const planId = `plan_${input.scan_id}_${input.goal}_${horizon}`;

    const existing = await db.collection("scan_action_plans").doc(planId).get();
    if (existing.exists) return existing.data() as ActionPlanParsed;

    const base = getCloudRunBaseUrl();
    const { taskSecret, location, computeQueue } = getTasksConfig();

    await enqueueHttpTask({
        queue: computeQueue,
        location,
        url: `${base}/api/internal/tasks/compute-worker`,
        payload: { scan_id: input.scan_id, mode: "action_plan", goal: input.goal, horizon },
        taskSecret,
    });

    return null;
}

export async function generateContentBriefsService(input: ContentBriefsRequest): Promise<ContentBriefsParsed | null> {
    const db = getFirestore();
    const briefType = input.brief_type ?? "landing_page";
    const key = `briefs_${input.scan_id}_${briefType}`;

    const existing = await db.collection("scan_content_briefs").doc(key).get();
    if (existing.exists) return existing.data() as ContentBriefsParsed;

    const base = getCloudRunBaseUrl();
    const { taskSecret, location, computeQueue } = getTasksConfig();

    await enqueueHttpTask({
        queue: computeQueue,
        location,
        url: `${base}/api/internal/tasks/compute-worker`,
        payload: { scan_id: input.scan_id, mode: "content_briefs", brief_type: briefType, intents: input.intents ?? null },
        taskSecret,
    });

    return null;
}

/* ----------------------------
   Trends
---------------------------- */
export async function getTrendsService(args: {
    brand_id: string;
    window?: "7d" | "30d" | "90d" | "180d" | "365d";
    location?: string;
}): Promise<TrendsParsed> {
    const db = getFirestore();
    const window = args.window ?? "90d";
    const seriesRef = db.collection("brand_trends").doc(args.brand_id).collection("series");
    const snap = await seriesRef.orderBy("date", "desc").limit(400).get();
    const series = snap.docs.map((d) => d.data());

    return {
        brand_id: args.brand_id,
        window,
        market: args.location ?? null,
        series: series as any,
    };
}

/* ----------------------------
   Action plan getter (read-only, no task enqueueing)
---------------------------- */
export async function getActionPlanService(args: {
    scan_id: string;
    goal: "complete_report" | "increase_mentions" | "increase_top_recommendations" | "beat_competitor" | "improve_sov";
    time_horizon_days: number;
}): Promise<ActionPlanParsed | null> {
    const db = getFirestore();
    const horizon = args.time_horizon_days ?? 30;
    const planId = `plan_${args.scan_id}_${args.goal}_${horizon}`;

    const existing = await db.collection("scan_action_plans").doc(planId).get();
    if (existing.exists) return existing.data() as ActionPlanParsed;
    return null;
}

/* ----------------------------
   Agency report
---------------------------- */
export async function getAgencyReportService(args: {
    scan_id: string;
    goal: "complete_report" | "increase_mentions" | "increase_top_recommendations" | "beat_competitor" | "improve_sov";
    time_horizon_days: number;
}): Promise<AgencyReportParsed | null> {
    const { scan_id, goal, time_horizon_days } = args;

    // In a real system, this would fetch from a cache or trigger a compute job.
    // For now, we'll try to assemble it from existing computed docs.
    const scan = await getScanService(scan_id);
    if (!scan) return null;

    const [scores, winners, diagnostics, actionPlan] = await Promise.all([
        getScoresService(scan_id),
        getCompetitorWinnersService(scan_id),
        getDiagnosticsService(scan_id),
        getActionPlanService({ scan_id, goal, time_horizon_days }),
    ]);

    // If critical parts aren't ready, the report isn't ready.
    if (!scores || !winners || !diagnostics || !actionPlan) {
        return null;
    }

    return {
        generated_at: nowISO(),
        scan,
        score_summary: scores,
        competitor_winners: winners,
        diagnostics,
        action_plan: actionPlan,
        // Narrative and suggested briefs are optional/computed later
    };
}
