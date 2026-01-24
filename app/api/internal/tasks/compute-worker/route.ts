import { NextResponse } from "next/server";
import { getFirestore } from "@/lib/gcp/firestore";
import { z } from "zod";

const PayloadZ = z.discriminatedUnion("mode", [
    z.object({
        mode: z.literal("action_plan"),
        scan_id: z.string(),
        goal: z.string(),
        horizon: z.number(),
    }),
    z.object({
        mode: z.literal("content_briefs"),
        scan_id: z.string(),
        brief_type: z.string(),
        intents: z.array(z.string()).nullable(),
    }),
]);

export async function POST(req: Request) {
    const secret = req.headers.get("X-Task-Secret");
    if (secret !== process.env.TASK_SECRET) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    let body;
    try {
        body = await req.json();
    } catch {
        return new NextResponse("Invalid JSON", { status: 400 });
    }

    const parsed = PayloadZ.safeParse(body);
    if (!parsed.success) {
        return new NextResponse("Invalid Payload", { status: 400 });
    }

    const data = parsed.data;
    // const db = getFirestore();

    try {
        // ------------------------------------------------------------
        // TODO: Implement actual compute logic here.
        // This would generate diagnostics, scores, action plans, etc.
        // and store them in their respective Firestore collections.
        // ------------------------------------------------------------

        if (data.mode === "action_plan") {
            // Logic for action plan...
        } else if (data.mode === "content_briefs") {
            // Logic for content briefs...
        }

        return new NextResponse("OK");
    } catch (err: any) {
        console.error("Compute worker error:", err);
        return new NextResponse(`Internal Error: ${err.message}`, { status: 500 });
    }
}
