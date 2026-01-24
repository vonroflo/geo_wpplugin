// /lib/geo-zod-requests.ts
import { z } from "zod";
import {
    ProviderZ,
    FunnelStageZ,
    MarketZ,
    IntentZ,
    CompetitorRefZ,
    ActionGoalZ,
    BriefTypeZ,
} from "./geo-zod-full";

/* -------------------------
   Shared helpers
-------------------------- */
const DomainLikeZ = z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i, "Invalid domain format (e.g. acme.com)")
    .optional();

const LocationLikeZ = z.string().trim().min(2, "Location must be provided (e.g. Austin, TX)");
const OptionsZ = z.record(z.unknown()).optional();

/* -------------------------
   Brands
-------------------------- */
export const BrandCreateRequestZ = z.object({
    name: z.string().trim().min(2),
    domain: DomainLikeZ.nullable().optional(),
    aliases: z.array(z.string().trim().min(1)).optional().default([]),
});

export const BrandUpdateRequestZ = z
    .object({
        name: z.string().trim().min(2).optional(),
        domain: DomainLikeZ.nullable().optional(),
        aliases: z.array(z.string().trim().min(1)).optional(),
    })
    .refine((v) => Object.keys(v).length > 0, "At least one field is required to update.");

export const ListBrandsQueryZ = z.object({
    limit: z.coerce.number().int().min(1).max(200).optional(),
    cursor: z.string().optional(),
    sort_by: z.string().optional(),
    sort_order: z.enum(["asc", "desc"]).optional(),
});

/* -------------------------
   Scans
-------------------------- */
export const BrandRefByIdZ = z.object({
    brand_id: z.string().trim().min(1),
});

export const BrandRefByObjectZ = z.object({
    name: z.string().trim().min(2),
    domain: DomainLikeZ.nullable().optional(),
    aliases: z.array(z.string().trim().min(1)).optional().default([]),
});

export const BrandRefZ = z.union([BrandRefByIdZ, BrandRefByObjectZ]);

export const MarketRequestZ = MarketZ.extend({
    location: LocationLikeZ,
});

export const IntentRequestZ = IntentZ.extend({
    text: z.string().trim().min(2),
    funnel_stage: FunnelStageZ.optional(),
    priority: z.coerce.number().int().min(1).max(5).optional(),
});

export const ScanCreateRequestZ = z.object({
    brand: BrandRefZ,
    market: MarketRequestZ,
    category: z.string().trim().min(2),
    intents: z.array(IntentRequestZ).min(1),
    ai_sources: z.array(ProviderZ).optional().default(["chatgpt", "gemini", "perplexity"]),
    competitors: z.array(CompetitorRefZ).optional().default([]),
    options: OptionsZ,
});

export const ListScansQueryZ = z.object({
    brand_id: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
    cursor: z.string().optional(),
    sort_by: z.string().optional(),
    sort_order: z.enum(["asc", "desc"]).optional(),
});

export const ScanIdParamZ = z.object({
    scan_id: z.string().trim().min(1),
});

export const ScoresQueryZ = z.object({
    scan_id: z.string().trim().min(1),
    include_breakdown: z.coerce.boolean().optional(),
});

/* -------------------------
   Competitors
-------------------------- */
export const WinnersQueryZ = z.object({
    scan_id: z.string().trim().min(1),
});

export const HeadToHeadRequestZ = z.object({
    scan_id: z.string().trim().min(1),
    competitor: CompetitorRefZ,
    intents: z.array(z.string().trim().min(1)).optional(),
});

export const CompetitorPatternsRequestZ = z.object({
    scan_id: z.string().trim().min(1),
    competitor: CompetitorRefZ,
    focus: z
        .array(z.enum(["content", "schema", "reviews", "local_signals", "entities", "citations"]))
        .optional()
        .default(["content", "entities", "citations"]),
});

/* -------------------------
   Diagnostics + Recommendations
-------------------------- */
export const DiagnosticsQueryZ = z.object({
    scan_id: z.string().trim().min(1),
});

export const ActionPlanRequestZ = z.object({
    scan_id: z.string().trim().min(1),
    goal: ActionGoalZ,
    time_horizon_days: z.coerce.number().int().min(7).max(180).optional().default(30),
    constraints: z.record(z.unknown()).optional(),
});

export const ContentBriefsRequestZ = z.object({
    scan_id: z.string().trim().min(1),
    intents: z.array(z.string().trim().min(1)).optional(),
    brief_type: BriefTypeZ.optional().default("landing_page"),
});

/* -------------------------
   Trends + Reports
-------------------------- */
export const TrendsQueryZ = z.object({
    brand_id: z.string().trim().min(1),
    window: z.enum(["7d", "30d", "90d", "180d", "365d"]).optional(),
    location: z.string().optional(),
});

export const AgencyReportQueryZ = z.object({
    include_content_briefs: z.coerce.boolean().optional().default(false),
    goal: ActionGoalZ.optional().default("increase_top_recommendations"),
    time_horizon_days: z.coerce.number().int().min(7).max(180).optional().default(30),
});

/* -------------------------
   Types
-------------------------- */
export type BrandCreateRequest = z.infer<typeof BrandCreateRequestZ>;
export type BrandUpdateRequest = z.infer<typeof BrandUpdateRequestZ>;
export type ScanCreateRequest = z.infer<typeof ScanCreateRequestZ>;
export type HeadToHeadRequest = z.infer<typeof HeadToHeadRequestZ>;
export type CompetitorPatternsRequest = z.infer<typeof CompetitorPatternsRequestZ>;
export type ActionPlanRequest = z.infer<typeof ActionPlanRequestZ>;
export type ContentBriefsRequest = z.infer<typeof ContentBriefsRequestZ>;
