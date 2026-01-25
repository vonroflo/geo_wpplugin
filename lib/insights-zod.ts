// /lib/insights-zod.ts
// Zod schemas for the unified insights endpoint

import { z } from "zod";

// Request schema for POST /api/v1/geo/insights
export const InsightsRequestZ = z.object({
    brand: z.object({
        name: z.string().trim().min(2, "Brand name is required"),
        domain: z.string().trim().optional().nullable(),
        aliases: z.array(z.string().trim()).optional().default([]),
    }),
    market: z.object({
        location: z.string().trim().min(2, "Location is required (e.g., Austin, TX)"),
        radius_miles: z.number().int().min(1).max(200).optional().default(50),
    }),
    category: z.string().trim().min(2, "Business category is required"),
    intents: z
        .array(
            z.object({
                text: z.string().trim().min(2, "Intent text is required"),
                funnel_stage: z.enum(["awareness", "consideration", "conversion"]).optional().default("awareness"),
            })
        )
        .min(1, "At least one search intent is required"),
    competitors: z
        .array(
            z.object({
                name: z.string().trim().min(1),
                domain: z.string().trim().optional().nullable(),
            })
        )
        .optional()
        .default([]),
    ai_sources: z
        .array(z.enum(["chatgpt", "gemini", "perplexity", "claude"]))
        .optional()
        .default(["chatgpt", "gemini", "perplexity"]),
    report_options: z
        .object({
            goal: z
                .enum(["complete_report", "increase_mentions", "increase_top_recommendations", "beat_competitor", "improve_sov"])
                .optional()
                .default("complete_report"),
            time_horizon_days: z.number().int().min(7).max(180).optional().default(30),
        })
        .optional()
        .default({}),
});

export type InsightsRequest = z.infer<typeof InsightsRequestZ>;

// Response schema for run status
export const InsightRunStatusZ = z.enum(["processing", "completed", "failed"]);

export const InsightScoresZ = z.object({
    visibility_score: z.number(),
    share_of_voice: z.number(),
    by_intent: z.array(
        z.object({
            intent: z.string(),
            score: z.number(),
            sov: z.number(),
        })
    ),
});

export const InsightMentionZ = z.object({
    subject: z.string(),
    provider: z.string(),
    intent_text: z.string(),
    presence: z.string(),
    evidence: z.array(z.object({
        type: z.string(),
        excerpt: z.string().optional().nullable(),
        source_url: z.string().optional().nullable(),
    })).optional(),
});

export const InsightCompetitorsZ = z.object({
    winners_by_intent: z.array(
        z.object({
            intent: z.string(),
            winners: z.array(
                z.object({
                    name: z.string(),
                    mention_rate: z.number(),
                })
            ),
        })
    ),
});

export const InsightDiagnosticsZ = z.object({
    gaps: z.array(
        z.object({
            type: z.string(),
            severity: z.string(),
            impact: z.string(),
            affected_intents: z.array(z.string()).optional(),
            recommended_actions: z.array(z.string()),
        })
    ),
});

export const InsightRecommendationsZ = z.object({
    priorities: z.array(
        z.object({
            priority: z.number(),
            action: z.string(),
            why: z.string(),
            effort: z.string(),
        })
    ),
});

export const InsightResultZ = z.object({
    brand: z.object({
        id: z.string(),
        name: z.string(),
        domain: z.string().nullable(),
    }),
    scan: z.object({
        id: z.string(),
        status: z.string(),
        created_at: z.string(),
        completed_at: z.string().nullable(),
    }),
    scores: InsightScoresZ.nullable(),
    mentions: z.array(InsightMentionZ),
    competitors: InsightCompetitorsZ.nullable(),
    diagnostics: InsightDiagnosticsZ.nullable(),
    recommendations: InsightRecommendationsZ.nullable(),
});

export const InsightRunResponseZ = z.object({
    run_id: z.string(),
    status: InsightRunStatusZ,
    result: InsightResultZ.nullable(),
    error: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    poll_count: z.number().optional(),
});

export type InsightRunResponse = z.infer<typeof InsightRunResponseZ>;

// Path params
export const RunIdParamZ = z.object({
    run_id: z.string().trim().min(1, "Run ID is required"),
});
