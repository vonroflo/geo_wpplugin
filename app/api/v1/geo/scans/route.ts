import { parseBody, parseQuery, created, ok } from "@/lib/validators";
import { ScanCreateRequestZ, ListScansQueryZ } from "@/lib/geo-zod-requests";
import { ScanJobAcceptedZ, ScansListResponseZ } from "@/lib/geo-zod-full";
import { createScanService, listScansService } from "@/lib/geo-services";
import { validateResponse } from "@/lib/validators";

export async function POST(req: Request) {
    const b = await parseBody(req, ScanCreateRequestZ);
    if (!b.ok) return b.response;

    const result = await createScanService(b.data);

    const v = validateResponse(result, ScanJobAcceptedZ);
    if (!v.ok) return v.response;

    return created(v.data);
}

export async function GET(req: Request) {
    const q = parseQuery(req, ListScansQueryZ);
    if (!q.ok) return q.response;

    const result = await listScansService(q.data);

    const v = validateResponse(result, ScansListResponseZ);
    if (!v.ok) return v.response;

    return ok(v.data);
}
