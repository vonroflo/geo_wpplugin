import { parseParams, ok, notFound } from "@/lib/validators";
import { ScanIdParamZ } from "@/lib/geo-zod-requests";
import { ScanResponseZ } from "@/lib/geo-zod-full";
import { getScanService } from "@/lib/geo-services";
import { validateResponse } from "@/lib/validators";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ scan_id: string }> }
) {
    const resolvedParams = await params;
    const p = parseParams(resolvedParams, ScanIdParamZ);
    if (!p.ok) return p.response;

    const scan = await getScanService(p.data.scan_id);
    if (!scan) return notFound(`Scan not found: ${p.data.scan_id}`);

    const v = validateResponse(scan, ScanResponseZ);
    if (!v.ok) return v.response;

    return ok(v.data);
}
