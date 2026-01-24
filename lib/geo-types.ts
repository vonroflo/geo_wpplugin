// /lib/geo-types.ts
export type Provider = "chatgpt" | "gemini" | "perplexity" | "claude";
export type FunnelStage = "awareness" | "consideration" | "conversion";
export type EvidenceType =
    | "citation_url"
    | "snippet"
    | "structured_signal"
    | "review_signal"
    | "entity_signal";

export type ScanStatus = "queued" | "running" | "succeeded" | "failed" | "canceled";
export type MentionPresence = "not_mentioned" | "mentioned" | "recommended_top";

export type GapSeverity = "low" | "medium" | "high" | "critical";
export type GapType =
    | "coverage_gap"
    | "entity_clarity_gap"
    | "citation_gap"
    | "local_signal_gap"
    | "review_velocity_gap"
    | "ai_quotable_gap"
    | "technical_accessibility_gap";

export type ActionGoal =
    | "increase_mentions"
    | "increase_top_recommendations"
    | "beat_competitor"
    | "improve_sov";

export type Effort = "low" | "medium" | "high";
export type BriefType = "landing_page" | "blog_post" | "faq_page" | "comparison_page";
export type SortOrder = "asc" | "desc";

export type APIErrorResponse = {
    error: {
        code: "invalid_request" | "unauthorized" | "not_found" | "rate_limited" | "internal";
        message: string;
        details?: Record<string, unknown>;
    };
};
