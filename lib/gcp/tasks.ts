// /lib/gcp/tasks.ts
import { CloudTasksClient } from "@google-cloud/tasks";

export type EnqueueTaskArgs = {
    queue: string;
    location: string;
    url: string;
    payload: Record<string, unknown>;
    taskSecret: string;
    projectId?: string;
    scheduleTimeSecondsFromNow?: number;
};

const tasksClient = new CloudTasksClient();

export async function enqueueHttpTask(args: EnqueueTaskArgs) {
    const projectId = args.projectId ?? process.env.GCP_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT;
    if (!projectId) throw new Error("Missing GCP project id (set GCP_PROJECT or GOOGLE_CLOUD_PROJECT)");

    const parent = tasksClient.queuePath(projectId, args.location, args.queue);
    const body = Buffer.from(JSON.stringify(args.payload)).toString("base64");

    const task: any = {
        httpRequest: {
            httpMethod: "POST",
            url: args.url,
            headers: {
                "Content-Type": "application/json",
                "X-Task-Secret": args.taskSecret,
            },
            body,
        },
    };

    if (args.scheduleTimeSecondsFromNow && args.scheduleTimeSecondsFromNow > 0) {
        task.scheduleTime = {
            seconds: Math.floor(Date.now() / 1000) + args.scheduleTimeSecondsFromNow,
        };
    }

    const [response] = await tasksClient.createTask({ parent, task });
    return response;
}
