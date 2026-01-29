// /lib/geo-plugin-zod.ts
// Zod request/response schemas for the WordPress GEO Plugin API

import { z } from "zod";

/* -------------------------
   Shared enums
-------------------------- */
const ContentTypeZ = z.enum(["article", "product", "faq", "howto", "local_business", "auto"]);
const GradeZ = z.enum(["A", "B", "C", "D", "F"]);
const ImpactZ = z.enum(["high", "medium", "low"]);
const EffortZ = z.enum(["quick_win", "moderate", "significant"]);
const RecommendationCategoryZ = z.enum(["schema", "entity", "readability", "structure", "authority"]);
const EntityStatusZ = z.enum(["found", "missing", "weak"]);
const ValidationSeverityZ = z.enum(["error", "warning", "info"]);

const SiteKeyZ = z.string().trim().min(1).optional();

/* -------------------------
   Schema Generate
-------------------------- */
export const SchemaGenerateRequestZ = z.object({
    url: z.string().url("A valid URL is required"),
    title: z.string().trim().min(1, "Page title is required"),
    content: z.string().trim().min(10, "Page content must be at least 10 characters"),
    content_type: ContentTypeZ.default("auto"),
    meta: z
        .object({
            author: z.string().optional(),
            published_date: z.string().optional(),
            modified_date: z.string().optional(),
            featured_image: z.string().optional(),
            price: z.string().optional(),
            currency: z.string().optional(),
            brand_name: z.string().optional(),
            business_name: z.string().optional(),
            business_address: z.string().optional(),
            business_phone: z.string().optional(),
        })
        .optional(),
    site_key: SiteKeyZ,
});

export const SchemaGenerateResponseZ = z.object({
    schemas: z.array(
        z.object({
            type: z.string(),
            json_ld: z.record(z.unknown()),
            json_ld_string: z.string(),
            confidence: z.number().min(0).max(1),
            notes: z.array(z.string()),
        })
    ),
    detected_type: z.string(),
    generated_at: z.string(),
});

/* -------------------------
   Entity Optimize
-------------------------- */
export const EntityOptimizeRequestZ = z.object({
    url: z.string().url("A valid URL is required"),
    title: z.string().trim().min(1, "Page title is required"),
    content: z.string().trim().min(10, "Page content must be at least 10 characters"),
    existing_schemas: z.array(z.record(z.unknown())).optional(),
    site_key: SiteKeyZ,
});

export const EntityOptimizeResponseZ = z.object({
    entities: z.array(
        z.object({
            name: z.string(),
            type: z.string(),
            status: EntityStatusZ,
            suggestions: z.array(z.string()),
            same_as_links: z.array(z.string()).optional(),
        })
    ),
    keywords: z.object({
        primary: z.array(z.string()),
        secondary: z.array(z.string()),
        missing: z.array(z.string()),
    }),
    about_suggestions: z.array(z.string()),
    overall_entity_score: z.number().int().min(0).max(100),
    recommendations: z.array(z.string()),
    analyzed_at: z.string(),
});

/* -------------------------
   Readability Analyze
-------------------------- */
export const ReadabilityAnalyzeRequestZ = z.object({
    url: z.string().url("A valid URL is required"),
    title: z.string().trim().min(1, "Page title is required"),
    content: z.string().trim().min(10, "Page content must be at least 10 characters"),
    headings: z.array(z.string()).optional(),
    has_faq_section: z.boolean().optional(),
    has_schema_markup: z.boolean().optional(),
    word_count: z.number().int().positive().optional(),
    site_key: SiteKeyZ,
});

export const ReadabilityAnalyzeResponseZ = z.object({
    scores: z.object({
        overall: z.number().min(0).max(100),
        quotability: z.number().min(0).max(100),
        answer_readiness: z.number().min(0).max(100),
        structure: z.number().min(0).max(100),
        conciseness: z.number().min(0).max(100),
        authority_signals: z.number().min(0).max(100),
    }),
    analysis: z.object({
        strengths: z.array(z.string()),
        weaknesses: z.array(z.string()),
        ai_snippet_candidates: z.array(
            z.object({
                text: z.string(),
                reason: z.string(),
            })
        ),
        missing_elements: z.array(z.string()),
    }),
    analyzed_at: z.string(),
});

/* -------------------------
   GEO Score
-------------------------- */
export const GeoScoreRequestZ = z.object({
    url: z.string().url("A valid URL is required"),
    title: z.string().trim().min(1, "Page title is required"),
    content: z.string().trim().min(10, "Page content must be at least 10 characters"),
    headings: z.array(z.string()).optional(),
    existing_schemas: z.array(z.record(z.unknown())).optional(),
    meta: z
        .object({
            description: z.string().optional(),
            author: z.string().optional(),
            published_date: z.string().optional(),
            word_count: z.number().int().positive().optional(),
        })
        .optional(),
    site_key: SiteKeyZ,
});

export const GeoScoreResponseZ = z.object({
    geo_score: z.number().int().min(0).max(100),
    grade: GradeZ,
    breakdown: z.object({
        schema_markup: z.object({ score: z.number(), max: z.number(), details: z.string() }),
        entity_clarity: z.object({ score: z.number(), max: z.number(), details: z.string() }),
        ai_readability: z.object({ score: z.number(), max: z.number(), details: z.string() }),
        content_structure: z.object({ score: z.number(), max: z.number(), details: z.string() }),
        authority_signals: z.object({ score: z.number(), max: z.number(), details: z.string() }),
    }),
    recommendations: z.array(
        z.object({
            priority: z.number().int().min(1),
            category: RecommendationCategoryZ,
            action: z.string(),
            impact: ImpactZ,
            effort: EffortZ,
            details: z.string(),
        })
    ),
    comparison: z.object({
        average_score: z.number(),
        percentile: z.number(),
    }),
    scored_at: z.string(),
});

/* -------------------------
   Schema Validate
-------------------------- */
export const SchemaValidateRequestZ = z.object({
    url: z.string().url("A valid URL is required"),
    schemas: z.array(z.record(z.unknown())).min(1, "At least one schema is required"),
    site_key: SiteKeyZ,
});

export const SchemaValidateResponseZ = z.object({
    results: z.array(
        z.object({
            schema_type: z.string(),
            valid: z.boolean(),
            errors: z.array(
                z.object({
                    field: z.string(),
                    message: z.string(),
                    severity: ValidationSeverityZ,
                })
            ),
            warnings: z.array(
                z.object({
                    field: z.string(),
                    message: z.string(),
                    suggestion: z.string(),
                })
            ),
            completeness_score: z.number().min(0).max(100),
            missing_recommended: z.array(z.string()),
        })
    ),
    overall_valid: z.boolean(),
    total_errors: z.number(),
    total_warnings: z.number(),
    validated_at: z.string(),
});

/* -------------------------
   Health
-------------------------- */
export const HealthResponseZ = z.object({
    status: z.literal("ok"),
    version: z.string(),
    timestamp: z.string(),
});

/* -------------------------
   Inferred Types
-------------------------- */
export type SchemaGenerateRequest = z.infer<typeof SchemaGenerateRequestZ>;
export type SchemaGenerateResponse = z.infer<typeof SchemaGenerateResponseZ>;
export type EntityOptimizeRequest = z.infer<typeof EntityOptimizeRequestZ>;
export type EntityOptimizeResponse = z.infer<typeof EntityOptimizeResponseZ>;
export type ReadabilityAnalyzeRequest = z.infer<typeof ReadabilityAnalyzeRequestZ>;
export type ReadabilityAnalyzeResponse = z.infer<typeof ReadabilityAnalyzeResponseZ>;
export type GeoScoreRequest = z.infer<typeof GeoScoreRequestZ>;
export type GeoScoreResponse = z.infer<typeof GeoScoreResponseZ>;
export type SchemaValidateRequest = z.infer<typeof SchemaValidateRequestZ>;
export type SchemaValidateResponse = z.infer<typeof SchemaValidateResponseZ>;
