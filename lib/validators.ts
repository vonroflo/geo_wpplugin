// /lib/validators.ts
import { NextResponse } from "next/server";
import { z } from "zod";

type ErrorCode = "invalid_request" | "unauthorized" | "not_found" | "rate_limited" | "internal";

type ApiErrorShape = {
    error: {
        code: ErrorCode;
        message: string;
        details?: Record<string, unknown>;
    };
};

type OkOptions = {
    status?: number;
    headers?: Record<string, string>;
};

type ErrOptions = {
    status?: number;
    code?: ErrorCode;
    details?: Record<string, unknown>;
    headers?: Record<string, string>;
};

function json(data: unknown, opts?: OkOptions) {
    return NextResponse.json(data, {
        status: opts?.status ?? 200,
        headers: opts?.headers,
    });
}

export function ok<T>(data: T, opts?: OkOptions) {
    return json(data, opts);
}

export function accepted<T>(data: T, opts?: OkOptions) {
    return json(data, { status: 202, ...opts });
}

export function created<T>(data: T, opts?: OkOptions) {
    return json(data, { status: 201, ...opts });
}

export function err(message: string, opts?: ErrOptions) {
    const payload: ApiErrorShape = {
        error: {
            code: opts?.code ?? "internal",
            message,
            ...(opts?.details ? { details: opts.details } : {}),
        },
    };

    return NextResponse.json(payload, {
        status: opts?.status ?? 500,
        headers: opts?.headers,
    });
}

export function badRequest(message = "Invalid request", details?: Record<string, unknown>) {
    return err(message, { status: 400, code: "invalid_request", details });
}

export function unauthorized(message = "Unauthorized", details?: Record<string, unknown>) {
    return err(message, { status: 401, code: "unauthorized", details });
}

export function notFound(message = "Not found", details?: Record<string, unknown>) {
    return err(message, { status: 404, code: "not_found", details });
}

export function rateLimited(message = "Rate limited", details?: Record<string, unknown>) {
    return err(message, { status: 429, code: "rate_limited", details });
}

/**
 * Parse JSON body with Zod schema
 */
export async function parseBody<TSchema extends z.ZodTypeAny>(
    req: Request,
    schema: TSchema
): Promise<{ ok: true; data: z.infer<TSchema> } | { ok: false; response: NextResponse }> {
    let body: unknown;

    try {
        body = await req.json();
    } catch {
        return { ok: false, response: badRequest("Body must be valid JSON") };
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        return {
            ok: false,
            response: badRequest("Invalid request body", { issues: parsed.error.issues }),
        };
    }

    return { ok: true, data: parsed.data };
}

/**
 * Parse query params with Zod schema
 */
export function parseQuery<TSchema extends z.ZodTypeAny>(
    req: Request,
    schema: TSchema
): { ok: true; data: z.infer<TSchema> } | { ok: false; response: NextResponse } {
    const url = new URL(req.url);
    const obj = Object.fromEntries(url.searchParams.entries());

    const parsed = schema.safeParse(obj);
    if (!parsed.success) {
        return {
            ok: false,
            response: badRequest("Invalid query parameters", { issues: parsed.error.issues }),
        };
    }

    return { ok: true, data: parsed.data };
}

/**
 * Parse path params (from Next.js route handler context)
 */
export function parseParams<TSchema extends z.ZodTypeAny>(
    params: unknown,
    schema: TSchema
): { ok: true; data: z.infer<TSchema> } | { ok: false; response: NextResponse } {
    const parsed = schema.safeParse(params);
    if (!parsed.success) {
        return {
            ok: false,
            response: badRequest("Invalid path parameters", { issues: parsed.error.issues }),
        };
    }
    return { ok: true, data: parsed.data };
}

/**
 * Validate outgoing response payloads (server-side contract enforcement)
 */
export function validateResponse<TSchema extends z.ZodTypeAny>(
    payload: unknown,
    schema: TSchema
): { ok: true; data: z.infer<TSchema> } | { ok: false; response: NextResponse } {
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
        return {
            ok: false,
            response: err("Response contract validation failed", {
                status: 500,
                code: "internal",
                details: { issues: parsed.error.issues },
            }),
        };
    }
    return { ok: true, data: parsed.data };
}
