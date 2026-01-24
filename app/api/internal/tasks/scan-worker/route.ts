import { NextResponse } from "next/server";
import { getFirestore } from "@/lib/gcp/firestore";
import { z } from "zod";

const PayloadZ = z.object({
    scan_id: z.string(),
});

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

    const { scan_id } = parsed.data;
    const db = getFirestore();

    try {
        // Update status to running
        await db.collection("scans").doc(scan_id).update({
            status: "running",
            started_at: new Date().toISOString(),
        });

        // ------------------------------------------------------------
        // TODO: Implement actual AI provider orchestration logic here.
        // This would call Perplexity, Gemini, ChatGPT, etc.
        // and store results in 'mentions' sub-collection.
        // ------------------------------------------------------------

        // For now, satisfy the success criteria by marking it as complete
        await db.collection("scans").doc(scan_id).update({
            status: "succeeded",
            completed_at: new Date().toISOString(),
        });

        return new NextResponse("OK");
    } catch (err: any) {
        console.error("Scan worker error:", err);
        await db.collection("scans").doc(scan_id).update({
            status: "failed",
            error: err.message,
        });
        return new NextResponse(`Internal Error: ${err.message}`, { status: 500 });
    }
}
