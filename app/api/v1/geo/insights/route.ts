// POST /api/v1/geo/insights
// Unified orchestration endpoint for starting insight runs

import { parseBody, created, badRequest } from "@/lib/validators";
import { InsightsRequestZ, InsightRunResponseZ } from "@/lib/insights-zod";
import { startInsightRun } from "@/lib/insights-service";
import { validateResponse } from "@/lib/validators";

export async function POST(req: Request) {
    const b = await parseBody(req, InsightsRequestZ);
    if (!b.ok) return b.response;

    try {
        const run = await startInsightRun(b.data);

        const response = {
            run_id: run.id,
            status: run.status,
            result: run.result,
            error: run.error,
            created_at: run.created_at,
            updated_at: run.updated_at,
            poll_count: run.poll_count,
        };

        const v = validateResponse(response, InsightRunResponseZ);
        if (!v.ok) return v.response;

        return created(v.data);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to start insight run";
        return badRequest(message);
    }
}
