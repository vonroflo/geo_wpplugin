import { parseBody, ok, notFound } from "@/lib/validators";
import { CompetitorPatternsRequestZ } from "@/lib/geo-zod-requests";
import { CompetitorPatternsResponseZ } from "@/lib/geo-zod-full";
import { competitorPatternsService } from "@/lib/geo-services";
import { validateResponse } from "@/lib/validators";

export async function POST(req: Request) {
    const b = await parseBody(req, CompetitorPatternsRequestZ);
    if (!b.ok) return b.response;

    const result = await competitorPatternsService(b.data);
    if (!result) return notFound("Competitor patterns not found");

    const v = validateResponse(result, CompetitorPatternsResponseZ);
    if (!v.ok) return v.response;

    return ok(v.data);
}
