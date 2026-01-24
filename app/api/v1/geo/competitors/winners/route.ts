import { parseQuery, ok, notFound } from "@/lib/validators";
import { WinnersQueryZ } from "@/lib/geo-zod-requests";
import { CompetitorWinnersResponseZ } from "@/lib/geo-zod-full";
import { getCompetitorWinnersService } from "@/lib/geo-services";
import { validateResponse } from "@/lib/validators";

export async function GET(req: Request) {
    const q = parseQuery(req, WinnersQueryZ);
    if (!q.ok) return q.response;

    const winners = await getCompetitorWinnersService(q.data.scan_id);
    if (!winners) return notFound(`Winners not found for scan: ${q.data.scan_id}`);

    const v = validateResponse(winners, CompetitorWinnersResponseZ);
    if (!v.ok) return v.response;

    return ok(v.data);
}
