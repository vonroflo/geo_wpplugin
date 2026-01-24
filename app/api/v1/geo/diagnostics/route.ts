import { parseQuery, ok, notFound } from "@/lib/validators";
import { DiagnosticsQueryZ } from "@/lib/geo-zod-requests";
import { DiagnosticsResponseZ } from "@/lib/geo-zod-full";
import { getDiagnosticsService } from "@/lib/geo-services";
import { validateResponse } from "@/lib/validators";

export async function GET(req: Request) {
    const q = parseQuery(req, DiagnosticsQueryZ);
    if (!q.ok) return q.response;

    const diagnostics = await getDiagnosticsService(q.data.scan_id);
    if (!diagnostics) return notFound(`Diagnostics not found for scan: ${q.data.scan_id}`);

    const v = validateResponse(diagnostics, DiagnosticsResponseZ);
    if (!v.ok) return v.response;

    return ok(v.data);
}
