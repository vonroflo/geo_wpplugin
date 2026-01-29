// POST /api/v1/geo-plugin/schema/generate
import { parseBody, ok, badRequest } from "@/lib/validators";
import { SchemaGenerateRequestZ } from "@/lib/geo-plugin-zod";
import { generateSchemas } from "@/lib/geo-plugin/schema-service";

export async function POST(req: Request) {
    const b = await parseBody(req, SchemaGenerateRequestZ);
    if (!b.ok) return b.response;

    try {
        const result = await generateSchemas(b.data);
        return ok(result);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Schema generation failed";
        return badRequest(message);
    }
}
