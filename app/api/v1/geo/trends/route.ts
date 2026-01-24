import { parseQuery, ok } from "@/lib/validators";
import { TrendsQueryZ } from "@/lib/geo-zod-requests";
import { TrendsResponseZ } from "@/lib/geo-zod-full";
import { getTrendsService } from "@/lib/geo-services";
import { validateResponse } from "@/lib/validators";

export async function GET(req: Request) {
    const q = parseQuery(req, TrendsQueryZ);
    if (!q.ok) return q.response;

    const result = await getTrendsService(q.data);

    const v = validateResponse(result, TrendsResponseZ);
    if (!v.ok) return v.response;

    return ok(v.data);
}
