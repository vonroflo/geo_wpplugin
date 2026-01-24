import { parseBody, accepted, ok } from "@/lib/validators";
import { ActionPlanRequestZ } from "@/lib/geo-zod-requests";
import { ActionPlanEndpointResponseZ } from "@/lib/geo-zod-full";
import { generateActionPlanService } from "@/lib/geo-services";
import { validateResponse } from "@/lib/validators";

export async function POST(req: Request) {
    const b = await parseBody(req, ActionPlanRequestZ);
    if (!b.ok) return b.response;

    const result = await generateActionPlanService(b.data);

    // If null, it means it's being generated async
    if (!result) {
        return accepted({ message: "Action plan generation started" });
    }

    const v = validateResponse(result, ActionPlanEndpointResponseZ);
    if (!v.ok) return v.response;

    return ok(v.data);
}
