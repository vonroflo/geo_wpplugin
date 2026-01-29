// POST /api/v1/geo-plugin/readability/analyze
import { parseBody, ok, badRequest } from "@/lib/validators";
import { ReadabilityAnalyzeRequestZ } from "@/lib/geo-plugin-zod";
import { analyzeReadability } from "@/lib/geo-plugin/readability-service";

export async function POST(req: Request) {
    const b = await parseBody(req, ReadabilityAnalyzeRequestZ);
    if (!b.ok) return b.response;

    try {
        const result = await analyzeReadability(b.data);
        return ok(result);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Readability analysis failed";
        return badRequest(message);
    }
}
