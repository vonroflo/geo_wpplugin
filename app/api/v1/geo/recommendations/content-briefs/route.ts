import { parseBody, accepted, ok } from "@/lib/validators";
import { ContentBriefsRequestZ } from "@/lib/geo-zod-requests";
import { ContentBriefsEndpointResponseZ } from "@/lib/geo-zod-full";
import { generateContentBriefsService } from "@/lib/geo-services";
import { validateResponse } from "@/lib/validators";

export async function POST(req: Request) {
    const b = await parseBody(req, ContentBriefsRequestZ);
    if (!b.ok) return b.response;

    const result = await generateContentBriefsService(b.data);

    if (!result) {
        return accepted({ message: "Content briefs generation started" });
    }

    const v = validateResponse(result, ContentBriefsEndpointResponseZ);
    if (!v.ok) return v.response;

    return ok(v.data);
}
