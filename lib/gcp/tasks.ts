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

// Lazy-init Cloud Tasks client (only in production)
let _tasksClient: CloudTasksClient | null = null;
function getTasksClient(): CloudTasksClient {
    if (!_tasksClient) {
        _tasksClient = new CloudTasksClient();
    }
    return _tasksClient;
}

/**
 * Check if running in local dev mode (Firestore emulator)
 */
function isLocalDev(): boolean {
    return !!process.env.FIRESTORE_EMULATOR_HOST;
}

/**
 * In local dev, call the worker endpoint directly instead of using Cloud Tasks
 */
async function callWorkerDirectly(args: EnqueueTaskArgs): Promise<{ name: string }> {
    console.log(`[DEV] Calling worker directly: ${args.url}`);

    // Fire-and-forget: don't await the worker response
    // This simulates async task behavior
    fetch(args.url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Task-Secret": args.taskSecret,
        },
        body: JSON.stringify(args.payload),
    }).catch((err) => {
        console.error(`[DEV] Worker call failed:`, err);
    });

    return { name: `dev-task-${Date.now()}` };
}

export async function enqueueHttpTask(args: EnqueueTaskArgs) {
    // DEV MODE: Call worker directly instead of using Cloud Tasks
    if (isLocalDev()) {
        return callWorkerDirectly(args);
    }

    // PRODUCTION: Use Cloud Tasks
    const projectId = args.projectId ?? process.env.GCP_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT;
    if (!projectId) throw new Error("Missing GCP project id (set GCP_PROJECT or GOOGLE_CLOUD_PROJECT)");

    const tasksClient = getTasksClient();
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
