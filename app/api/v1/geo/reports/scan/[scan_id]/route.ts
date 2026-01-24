import { parseParams, parseQuery, ok, notFound } from "@/lib/validators";
import { ScanIdParamZ, AgencyReportQueryZ } from "@/lib/geo-zod-requests";
import { AgencyReportZ } from "@/lib/geo-zod-full";
import { getAgencyReportService } from "@/lib/geo-services";
import { validateResponse } from "@/lib/validators";

export async function GET(req: Request, ctx: { params: any }) {
    const p = parseParams(ctx.params, ScanIdParamZ);
    if (!p.ok) return p.response;

    const q = parseQuery(req, AgencyReportQueryZ);
    if (!q.ok) return q.response;

    const report = await getAgencyReportService({
        scan_id: p.data.scan_id,
        ...q.data,
    });

    if (!report) return notFound("Report not ready or scan not found");

    const v = validateResponse(report, AgencyReportZ);
    if (!v.ok) return v.response;

    return ok(v.data);
}
