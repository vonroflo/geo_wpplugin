// GET /api/v1/geo-plugin/health
import { ok } from "@/lib/validators";

export async function GET() {
    return ok({
        status: "ok" as const,
        version: "1.0.0",
        timestamp: new Date().toISOString(),
    });
}
