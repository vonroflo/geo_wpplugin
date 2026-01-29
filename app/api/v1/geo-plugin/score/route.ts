// POST /api/v1/geo-plugin/score
import { parseBody, ok, badRequest } from "@/lib/validators";
import { GeoScoreRequestZ } from "@/lib/geo-plugin-zod";
import { computeGeoScore } from "@/lib/geo-plugin/score-service";

export async function POST(req: Request) {
    const b = await parseBody(req, GeoScoreRequestZ);
    if (!b.ok) return b.response;

    try {
        const result = await computeGeoScore(b.data);
        return ok(result);
    } catch (err) {
        const message = err instanceof Error ? err.message : "GEO scoring failed";
        return badRequest(message);
    }
}
