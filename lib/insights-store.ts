// /lib/insights-store.ts
// DEV-ONLY: In-memory store for insight runs
// In production, use Redis/Firestore for persistence across instances

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

// DEV-ONLY: In-memory Map with globalThis to survive hot reloads
// WARNING: This will be lost on server restart and doesn't work with multiple instances
const globalForStore = globalThis as unknown as {
    _insightRunStore: Map<string, InsightRun> | undefined;
};

if (!globalForStore._insightRunStore) {
    globalForStore._insightRunStore = new Map<string, InsightRun>();
}

const runStore = globalForStore._insightRunStore;

// Cleanup old runs after 1 hour (dev convenience)
const RUN_TTL_MS = 60 * 60 * 1000;

function cleanupOldRuns() {
    const now = Date.now();
    for (const [id, run] of runStore.entries()) {
        if (now - new Date(run.created_at).getTime() > RUN_TTL_MS) {
            runStore.delete(id);
        }
    }
}

export function createRun(input: InsightRunInput): InsightRun {
    cleanupOldRuns();

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

    runStore.set(id, run);
    return run;
}

export function getRun(id: string): InsightRun | null {
    return runStore.get(id) || null;
}

export function updateRun(id: string, updates: Partial<InsightRun>): InsightRun | null {
    const run = runStore.get(id);
    if (!run) return null;

    const updated = {
        ...run,
        ...updates,
        updated_at: new Date().toISOString(),
    };
    runStore.set(id, updated);
    return updated;
}

export function deleteRun(id: string): boolean {
    return runStore.delete(id);
}

// For debugging
export function getAllRuns(): InsightRun[] {
    return Array.from(runStore.values());
}
