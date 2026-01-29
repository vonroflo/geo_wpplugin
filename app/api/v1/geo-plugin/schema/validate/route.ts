// POST /api/v1/geo-plugin/schema/validate
import { parseBody, ok, badRequest } from "@/lib/validators";
import { SchemaValidateRequestZ } from "@/lib/geo-plugin-zod";
import { validateSchemas } from "@/lib/geo-plugin/validation-service";

export async function POST(req: Request) {
    const b = await parseBody(req, SchemaValidateRequestZ);
    if (!b.ok) return b.response;

    try {
        const result = await validateSchemas(b.data);
        return ok(result);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Schema validation failed";
        return badRequest(message);
    }
}
