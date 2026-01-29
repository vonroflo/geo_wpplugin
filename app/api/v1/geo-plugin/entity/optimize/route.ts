// POST /api/v1/geo-plugin/entity/optimize
import { parseBody, ok, badRequest } from "@/lib/validators";
import { EntityOptimizeRequestZ } from "@/lib/geo-plugin-zod";
import { analyzeEntities } from "@/lib/geo-plugin/entity-service";

export async function POST(req: Request) {
    const b = await parseBody(req, EntityOptimizeRequestZ);
    if (!b.ok) return b.response;

    try {
        const result = await analyzeEntities(b.data);
        return ok(result);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Entity analysis failed";
        return badRequest(message);
    }
}
