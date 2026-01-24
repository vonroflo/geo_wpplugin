// GET /api/v1/geo/insights/[run_id]
// Poll for insight run status and results

import { parseParams, ok, notFound } from "@/lib/validators";
import { RunIdParamZ, InsightRunResponseZ } from "@/lib/insights-zod";
import { getInsightRunStatus } from "@/lib/insights-service";
import { validateResponse } from "@/lib/validators";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ run_id: string }> }
) {
    const resolvedParams = await params;
    const p = parseParams(resolvedParams, RunIdParamZ);
    if (!p.ok) return p.response;

    const run = await getInsightRunStatus(p.data.run_id);
    if (!run) {
        return notFound(`Run not found: ${p.data.run_id}`);
    }

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

    return ok(v.data);
}
