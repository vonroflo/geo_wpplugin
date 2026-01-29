// /lib/ai/openai-client.ts
// OpenAI client singleton for the GEO Plugin API

import OpenAI from "openai";

const globalForOpenAI = globalThis as unknown as {
    _openaiClient: OpenAI | undefined;
};

export function getOpenAIClient(): OpenAI {
    if (globalForOpenAI._openaiClient) {
        return globalForOpenAI._openaiClient;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("Missing OPENAI_API_KEY environment variable");
    }

    globalForOpenAI._openaiClient = new OpenAI({ apiKey });
    return globalForOpenAI._openaiClient;
}

export function getOpenAIModel(): string {
    return process.env.OPENAI_MODEL || "gpt-4o-mini";
}
