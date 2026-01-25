import { getFirestore } from "./gcp/firestore";

const COLLECTION = "insight_runs";

export type InsightRunStatus = "processing" | "completed" | "failed";

export type InsightRunInput = {
    brand: {
        name: string;
        domain?: string | null;
        aliases?: string[];
    };
    market: {
        location: string;
        radius_miles?: number;
    };
    category: string;
    intents: Array<{
        text: string;
        funnel_stage?: string;
    }>;
    competitors?: Array<{
        name: string;
        domain?: string | null;
    }>;
    ai_sources?: string[];
    report_options?: {
        goal?: string;
        time_horizon_days?: number;
    };
};

export type InsightRunResult = {
    brand: {
        id: string;
        name: string;
        domain: string | null;
    };
    scan: {
        id: string;
        status: string;
        created_at: string;
        completed_at: string | null;
    };
    scores: {
        visibility_score: number;
        share_of_voice: number;
        by_intent: Array<{
            intent: string;
            score: number;
            sov: number;
        }>;
    } | null;
    mentions: Array<{
        subject: string;
        provider: string;
        intent_text: string;
        presence: string;
    }>;
    competitors: {
        winners_by_intent: Array<{
            intent: string;
            winners: Array<{
                name: string;
                mention_rate: number;
            }>;
        }>;
    } | null;
    diagnostics: {
        gaps: Array<{
            type: string;
            severity: string;
            impact: string;
            recommended_actions: string[];
        }>;
    } | null;
    recommendations: {
        priorities: Array<{
            priority: number;
            action: string;
            why: string;
            effort: string;
        }>;
    } | null;
};

export type InsightRun = {
    id: string;
    status: InsightRunStatus;
    input: InsightRunInput;
    result: InsightRunResult | null;
    error: string | null;
    created_at: string;
    updated_at: string;
    // Internal tracking
    brand_id?: string;
    scan_id?: string;
    poll_count: number;
};


export async function createRun(input: InsightRunInput): Promise<InsightRun> {
    const db = getFirestore();
    const id = `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    const run: InsightRun = {
        id,
        status: "processing",
        input,
        result: null,
        error: null,
        created_at: now,
        updated_at: now,
        poll_count: 0,
    };

    await db.collection(COLLECTION).doc(id).set(run);
    return run;
}

export async function getRun(id: string): Promise<InsightRun | null> {
    const db = getFirestore();
    const snap = await db.collection(COLLECTION).doc(id).get();
    if (!snap.exists) return null;
    return snap.data() as InsightRun;
}

export async function updateRun(id: string, updates: Partial<InsightRun>): Promise<InsightRun | null> {
    const db = getFirestore();
    const ref = db.collection(COLLECTION).doc(id);

    const updatesWithTimestamp = {
        ...updates,
        updated_at: new Date().toISOString(),
    };

    await ref.update(updatesWithTimestamp);
    const snap = await ref.get();
    return snap.data() as InsightRun;
}

export async function deleteRun(id: string): Promise<boolean> {
    const db = getFirestore();
    await db.collection(COLLECTION).doc(id).delete();
    return true;
}

// For debugging
export async function getAllRuns(): Promise<InsightRun[]> {
    const db = getFirestore();
    const snap = await db.collection(COLLECTION).orderBy("created_at", "desc").limit(50).get();
    return snap.docs.map(d => d.data() as InsightRun);
}
