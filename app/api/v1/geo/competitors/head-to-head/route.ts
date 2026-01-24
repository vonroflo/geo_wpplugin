import { parseBody, ok, notFound } from "@/lib/validators";
import { HeadToHeadRequestZ } from "@/lib/geo-zod-requests";
import { HeadToHeadResponseZ } from "@/lib/geo-zod-full";
import { headToHeadService } from "@/lib/geo-services";
import { validateResponse } from "@/lib/validators";

export async function POST(req: Request) {
    const b = await parseBody(req, HeadToHeadRequestZ);
    if (!b.ok) return b.response;

    const result = await headToHeadService(b.data);
    if (!result) return notFound("Head-to-head analysis not found");

    const v = validateResponse(result, HeadToHeadResponseZ);
    if (!v.ok) return v.response;

    return ok(v.data);
}
