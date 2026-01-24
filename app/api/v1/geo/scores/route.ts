import { parseQuery, ok, notFound } from "@/lib/validators";
import { ScoresQueryZ } from "@/lib/geo-zod-requests";
import { ScoresResponseZ } from "@/lib/geo-zod-full";
import { getScoresService } from "@/lib/geo-services";
import { validateResponse } from "@/lib/validators";

export async function GET(req: Request) {
    const q = parseQuery(req, ScoresQueryZ);
    if (!q.ok) return q.response;

    const scores = await getScoresService(q.data.scan_id, q.data.include_breakdown);
    if (!scores) return notFound(`Scores not found for scan: ${q.data.scan_id}`);

    const v = validateResponse(scores, ScoresResponseZ);
    if (!v.ok) return v.response;

    return ok(v.data);
}
