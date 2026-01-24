// /lib/geo-zod-full.ts
import { z } from "zod";

/* -------------------------
   Enums
-------------------------- */
export const ProviderZ = z.enum(["chatgpt", "gemini", "perplexity", "claude"]);
export const FunnelStageZ = z.enum(["awareness", "consideration", "conversion"]);

export const EvidenceTypeZ = z.enum([
    "citation_url",
    "snippet",
    "structured_signal",
    "review_signal",
    "entity_signal",
]);

export const ScanStatusZ = z.enum(["queued", "running", "succeeded", "failed", "canceled"]);
export const MentionPresenceZ = z.enum(["not_mentioned", "mentioned", "recommended_top"]);

export const GapSeverityZ = z.enum(["low", "medium", "high", "critical"]);
export const GapTypeZ = z.enum([
    "coverage_gap",
    "entity_clarity_gap",
    "citation_gap",
    "local_signal_gap",
    "review_velocity_gap",
    "ai_quotable_gap",
    "technical_accessibility_gap",
]);

export const ActionGoalZ = z.enum([
    "increase_mentions",
    "increase_top_recommendations",
    "beat_competitor",
    "improve_sov",
]);

export const EffortZ = z.enum(["low", "medium", "high"]);
export const BriefTypeZ = z.enum(["landing_page", "blog_post", "faq_page", "comparison_page"]);
export const SortOrderZ = z.enum(["asc", "desc"]);

/* -------------------------
   Shared primitives
-------------------------- */
export const APIErrorResponseZ = z.object({
    error: z.object({
        code: z.enum(["invalid_request", "unauthorized", "not_found", "rate_limited", "internal"]),
        message: z.string(),
        details: z.record(z.unknown()).optional(),
    }),
});

export const EvidenceZ = z.object({
    type: EvidenceTypeZ,
    source_url: z.string().url().nullable().optional(),
    excerpt: z.string().nullable().optional(),
    provider_context: z.record(z.unknown()).nullable().optional(),
});

export const MarketZ = z.object({
    location: z.string(),
    radius_miles: z.number().int().min(1).max(200).optional(),
    language: z.string().optional(),
});

export const IntentZ = z.object({
    text: z.string(),
    funnel_stage: FunnelStageZ.optional(),
    priority: z.number().int().min(1).max(5).optional(),
});

export const BrandZ = z.object({
    id: z.string(),
    name: z.string(),
    domain: z.string().nullable().optional(),
    aliases: z.array(z.string()).default([]),
    created_at: z.string(),
    updated_at: z.string(),
});

export const CompetitorRefZ = z.object({
    name: z.string(),
    domain: z.string().nullable().optional(),
});

export const MentionZ = z.object({
    subject: z.string(),
    provider: ProviderZ,
    intent_text: z.string(),
    presence: MentionPresenceZ,
    rank_bucket: z.string().nullable().optional(),
    confidence: z.number().min(0).max(1).optional(),
    evidence: z.array(EvidenceZ).default([]),
});

/* -------------------------
   Core objects
-------------------------- */
export const ScanZ = z.object({
    id: z.string(),
    status: ScanStatusZ,
    brand: BrandZ,
    market: MarketZ,
    category: z.string(),
    intents: z.array(IntentZ),
    providers: z.array(ProviderZ),
    competitors: z.array(CompetitorRefZ).default([]),
    mentions: z.array(MentionZ).default([]),
    error: z.string().nullable().optional(),
    created_at: z.string(),
    completed_at: z.string().nullable().optional(),
});

/* -------------------------
   Pagination
-------------------------- */
export const PaginatedBrandsZ = z.object({
    items: z.array(BrandZ),
    next_cursor: z.string().nullable(),
});

export const PaginatedScansZ = z.object({
    items: z.array(ScanZ),
    next_cursor: z.string().nullable(),
});

/* -------------------------
   Brands endpoints
-------------------------- */
export const BrandResponseZ = BrandZ;
export const BrandsListResponseZ = PaginatedBrandsZ;

/* -------------------------
   Scans endpoints
-------------------------- */
export const ScanJobAcceptedZ = z.object({
    scan_id: z.string(),
    status: ScanStatusZ,
});

export const ScansListResponseZ = PaginatedScansZ;
export const ScanResponseZ = ScanZ;

/* -------------------------
   Scores
-------------------------- */
export const ScoreSummaryZ = z.object({
    scan_id: z.string(),
    brand: z.string(),
    visibility_score: z.number().int().min(0).max(100),
    share_of_voice: z.number().min(0).max(1),
    by_intent: z.array(
        z.object({
            intent: z.string(),
            score: z.number().int().min(0).max(100),
            sov: z.number().min(0).max(1),
            drivers: z.array(z.string()).default([]),
        })
    ),
    top_competitors: z.array(
        z.object({
            name: z.string(),
            visibility_score: z.number().int().min(0).max(100),
            share_of_voice: z.number().min(0).max(1),
        })
    ),
    breakdown: z.record(z.unknown()).nullable().optional(),
});
export const ScoresResponseZ = ScoreSummaryZ;

/* -------------------------
   Competitors
-------------------------- */
export const CompetitorWinnersZ = z.object({
    scan_id: z.string(),
    winners_by_intent: z.array(
        z.object({
            intent: z.string(),
            winners: z.array(
                z.object({
                    name: z.string(),
                    mention_rate: z.number().min(0).max(1),
                    evidence: z.array(EvidenceZ).default([]),
                })
            ),
        })
    ),
});
export const CompetitorWinnersResponseZ = CompetitorWinnersZ;

export const HeadToHeadResponseZ = z.object({
    scan_id: z.string(),
    brand: z.string(),
    competitor: z.string(),
    by_intent: z.array(
        z.object({
            intent: z.string(),
            winner: z.string(),
            why: z.array(z.string()),
            evidence: z.array(EvidenceZ).default([]),
        })
    ),
});

export const CompetitorPatternsResponseZ = z.object({
    scan_id: z.string(),
    competitor: z.string(),
    patterns: z.array(
        z.object({
            pattern: z.string(),
            why_it_matters: z.string(),
            evidence: z.array(EvidenceZ).default([]),
        })
    ),
});

/* -------------------------
   Diagnostics
-------------------------- */
export const GapZ = z.object({
    type: GapTypeZ,
    severity: GapSeverityZ,
    impact: z.string(),
    affected_intents: z.array(z.string()),
    competitor_examples: z.array(z.string()).default([]),
    evidence: z.array(EvidenceZ).default([]),
    recommended_actions: z.array(z.string()),
});

export const DiagnosticsZ = z.object({
    scan_id: z.string(),
    brand: z.string(),
    gaps: z.array(GapZ),
});
export const DiagnosticsResponseZ = DiagnosticsZ;

/* -------------------------
   Recommendations
-------------------------- */
export const ActionItemZ = z.object({
    priority: z.number().int().min(1).max(50),
    action: z.string(),
    why: z.string(),
    estimated_lift: z.object({
        visibility_score_delta: z.number().int(),
        share_of_voice_delta: z.number().nullable().optional(),
    }),
    effort: EffortZ,
    tasks: z.array(z.string()),
    affected_intents: z.array(z.string()).default([]),
    evidence: z.array(EvidenceZ).default([]),
});

export const ActionPlanResponseZ = z.object({
    scan_id: z.string(),
    brand: z.string(),
    priorities: z.array(ActionItemZ),
});
export const ActionPlanEndpointResponseZ = ActionPlanResponseZ;

export const ContentBriefZ = z.object({
    intent: z.string(),
    title: z.string(),
    outline: z.array(z.string()),
    faq: z.array(z.string()),
    schema_checklist: z.array(z.string()),
    internal_links: z.array(z.string()).default([]),
    quote_blocks: z.array(z.string()),
    evidence: z.array(EvidenceZ).default([]),
});

export const ContentBriefsResponseZ = z.object({
    scan_id: z.string(),
    briefs: z.array(ContentBriefZ),
});
export const ContentBriefsEndpointResponseZ = ContentBriefsResponseZ;

/* -------------------------
   Trends
-------------------------- */
export const TrendPointZ = z.object({
    date: z.string(),
    visibility_score: z.number().int().min(0).max(100),
    share_of_voice: z.number().min(0).max(1),
    notes: z.array(z.string()).default([]),
});

export const TrendsResponseZ = z.object({
    brand_id: z.string(),
    window: z.string(),
    market: z.string().nullable().optional(),
    series: z.array(TrendPointZ),
});

/* -------------------------
   Agency report
-------------------------- */
export const AgencyReportNarrativeZ = z.object({
    headline: z.string(),
    what_it_means: z.array(z.string()),
    quick_wins: z.array(z.string()),
});

export const SuggestedBriefZ = z.object({
    intent: z.string(),
    brief_type: BriefTypeZ,
    reason: z.string(),
});

export const AgencyReportZ = z.object({
    generated_at: z.string(),
    scan: ScanZ,
    score_summary: ScoreSummaryZ,
    competitor_winners: CompetitorWinnersZ,
    diagnostics: DiagnosticsZ,
    action_plan: ActionPlanResponseZ,
    narrative: AgencyReportNarrativeZ.optional(),
    suggested_briefs: z.array(SuggestedBriefZ).nullable().optional(),
    content_briefs: ContentBriefsResponseZ.nullable().optional(),
});

/* -------------------------
   Types
-------------------------- */
export type BrandParsed = z.infer<typeof BrandZ>;
export type ScanParsed = z.infer<typeof ScanZ>;
export type ScoreSummaryParsed = z.infer<typeof ScoreSummaryZ>;
export type CompetitorWinnersParsed = z.infer<typeof CompetitorWinnersZ>;
export type DiagnosticsParsed = z.infer<typeof DiagnosticsZ>;
export type ActionPlanParsed = z.infer<typeof ActionPlanResponseZ>;
export type ContentBriefsParsed = z.infer<typeof ContentBriefsResponseZ>;
export type TrendsParsed = z.infer<typeof TrendsResponseZ>;
export type AgencyReportParsed = z.infer<typeof AgencyReportZ>;
