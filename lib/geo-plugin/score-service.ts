// /lib/geo-plugin/score-service.ts
// Composite GEO score orchestrator for the WordPress GEO Plugin.
// Pure heuristic analysis -- no OpenAI calls -- designed for fast, deterministic scoring.

import type {
    GeoScoreRequest,
    GeoScoreResponse,
} from "@/lib/geo-plugin-zod";

/* =========================================================================
   Constants
   ========================================================================= */

/** Maximum points per dimension. */
const MAX_PER_DIMENSION = 20;

/** Hardcoded industry benchmark average (updated periodically from aggregate data). */
const BENCHMARK_AVERAGE = 42;

/** Standard deviation estimate for percentile calculation. */
const BENCHMARK_STDDEV = 18;

/** Grade thresholds. */
const GRADE_THRESHOLDS: Array<{ min: number; grade: "A" | "B" | "C" | "D" | "F" }> = [
    { min: 80, grade: "A" },
    { min: 65, grade: "B" },
    { min: 50, grade: "C" },
    { min: 35, grade: "D" },
    { min: 0, grade: "F" },
];

/** Recommendation category enum values matching the Zod schema. */
type RecommendationCategory = "schema" | "entity" | "readability" | "structure" | "authority";
type Impact = "high" | "medium" | "low";
type Effort = "quick_win" | "moderate" | "significant";

interface Recommendation {
    priority: number;
    category: RecommendationCategory;
    action: string;
    impact: Impact;
    effort: Effort;
    details: string;
}

/* =========================================================================
   Utility helpers
   ========================================================================= */

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

function round(value: number): number {
    return Math.round(value);
}

/** Split text into words (lowercased). */
function words(text: string): string[] {
    return text.toLowerCase().match(/\b[a-z']+\b/g) ?? [];
}

/** Split text into sentences. */
function sentences(text: string): string[] {
    return text
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
}

/** Split text into paragraphs (double-newline delimited). */
function paragraphs(text: string): string[] {
    return text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
}

/**
 * Approximate percentile from score using a cumulative normal distribution.
 * Uses the logistic approximation: CDF(x) ~ 1 / (1 + exp(-1.7 * z))
 */
function estimatePercentile(score: number, mean: number, stddev: number): number {
    const z = (score - mean) / stddev;
    const cdf = 1 / (1 + Math.exp(-1.7 * z));
    return round(clamp(cdf * 100, 1, 99));
}

/* =========================================================================
   Dimension scorers (each returns 0 - MAX_PER_DIMENSION)
   ========================================================================= */

/**
 * Schema Markup (max 20).
 * Based on presence and apparent completeness of existing JSON-LD schemas.
 */
function scoreSchemaMarkup(existingSchemas?: Record<string, unknown>[]): { score: number; details: string } {
    if (!existingSchemas || existingSchemas.length === 0) {
        return { score: 0, details: "No structured data (JSON-LD) detected." };
    }

    let score = 0;

    // Base points for having any schemas
    score += Math.min(existingSchemas.length * 4, 8);

    // Check quality of each schema
    let totalFields = 0;
    let presentFields = 0;
    const types: string[] = [];

    for (const schema of existingSchemas) {
        const schemaType = resolveType(schema);
        types.push(schemaType);

        // Count meaningful fields (skip @context, @type)
        const keys = Object.keys(schema).filter((k) => !k.startsWith("@"));
        totalFields += Math.max(keys.length, 5); // Assume at least 5 fields expected
        presentFields += keys.length;

        // Bonus for well-known types
        const wellKnown = ["Article", "FAQPage", "HowTo", "Product", "LocalBusiness", "Organization", "BreadcrumbList"];
        if (wellKnown.includes(schemaType)) {
            score += 2;
        }
    }

    // Completeness bonus
    const completenessRatio = totalFields > 0 ? presentFields / totalFields : 0;
    score += round(completenessRatio * 6);

    score = clamp(score, 0, MAX_PER_DIMENSION);

    const typeList = types.join(", ");
    if (score >= 16) {
        return { score, details: `Strong schema markup: ${typeList}. Well-structured with good field coverage.` };
    } else if (score >= 10) {
        return { score, details: `Schema markup present (${typeList}) but could be more complete.` };
    }
    return { score, details: `Basic schema markup found (${typeList}). Consider adding more fields and types.` };
}

/**
 * Entity Clarity (max 20).
 * Heuristic: proper nouns, defined terms, structured references to entities.
 */
function scoreEntityClarity(content: string, title: string): { score: number; details: string } {
    const text = `${title}\n${content}`;
    let score = 0;

    // 1. Proper noun density (capitalised words not at sentence start)
    const properNounPattern = /(?<=[.!?]\s+[A-Z][a-z]+\s)[A-Z][a-z]{2,}/g;
    const allCaps = text.match(/\b[A-Z][a-z]{2,}\b/g) ?? [];
    const properNouns = new Set(allCaps.filter((w) => !["The", "This", "That", "These", "Those", "When", "Where", "What", "Which", "How", "Here", "There"].includes(w)));
    const properNounCount = properNouns.size;
    score += clamp(properNounCount * 1.5, 0, 6);

    // 2. Defined terms / explicit definitions
    const definitionPatterns = [
        /\b\w+\s+is\s+(a|an|the)\b/gi,
        /\bdefined as\b/gi,
        /\brefers to\b/gi,
        /\bknown as\b/gi,
        /\balso called\b/gi,
    ];
    let defCount = 0;
    for (const pat of definitionPatterns) {
        const matches = text.match(pat);
        defCount += matches?.length ?? 0;
    }
    score += clamp(defCount * 2, 0, 5);

    // 3. Structured references (URLs, links, brand mentions)
    const urlPattern = /https?:\/\/[^\s)]+/g;
    const urlCount = (text.match(urlPattern) ?? []).length;
    score += clamp(urlCount * 1.5, 0, 3);

    // 4. Consistent entity usage (same proper noun appears 3+ times)
    const nounCounts = new Map<string, number>();
    for (const noun of allCaps) {
        nounCounts.set(noun, (nounCounts.get(noun) ?? 0) + 1);
    }
    const consistentEntities = [...nounCounts.values()].filter((c) => c >= 3).length;
    score += clamp(consistentEntities * 1.5, 0, 4);

    // 5. Title contains clear entity
    const titleWords = title.match(/\b[A-Z][a-z]{2,}\b/g) ?? [];
    const titleHasEntity = titleWords.length >= 1;
    score += titleHasEntity ? 2 : 0;

    score = round(clamp(score, 0, MAX_PER_DIMENSION));

    if (score >= 16) {
        return { score, details: "Entities are clearly defined, consistently referenced, and well-structured." };
    } else if (score >= 10) {
        return { score, details: "Some entities identified but could benefit from more explicit definitions and consistent referencing." };
    } else if (score >= 5) {
        return { score, details: "Weak entity clarity. Content lacks clear, defined entities that AI models can reference." };
    }
    return { score, details: "Very low entity clarity. Add explicit definitions, proper nouns, and structured references." };
}

/**
 * AI Readability (max 20).
 * Heuristic: sentence structure, headings, lists, direct answer patterns.
 */
function scoreAIReadability(content: string, headings: string[]): { score: number; details: string } {
    const sents = sentences(content);
    const wordList = words(content);
    let score = 0;

    // 1. Sentence length distribution (ideal 10-20 words)
    if (sents.length > 0) {
        const avgLen = wordList.length / sents.length;
        if (avgLen >= 10 && avgLen <= 20) {
            score += 5;
        } else if (avgLen >= 8 && avgLen <= 25) {
            score += 3;
        } else {
            score += 1;
        }
    }

    // 2. Heading presence and count
    const headingCount = headings.length;
    score += clamp(headingCount * 1.5, 0, 4);

    // 3. List presence (bullets or numbered)
    const listItems = content.match(/^[\s]*[-*\u2022]\s|^\s*\d+[.)]\s/gm);
    const listCount = listItems?.length ?? 0;
    score += clamp(listCount * 0.5, 0, 3);

    // 4. Direct / concise answer patterns
    const directPatterns = [
        /\bhere('s| is| are) (how|what|why|the)\b/i,
        /\bthe (best|top|most|fastest|easiest) way\b/i,
        /\bin short\b/i,
        /\bto summarize\b/i,
        /\bthe answer is\b/i,
        /\bstep \d+:/i,
    ];
    let directCount = 0;
    for (const pat of directPatterns) {
        if (pat.test(content)) directCount++;
    }
    score += clamp(directCount * 1.5, 0, 4);

    // 5. Content starts with a clear, informative statement (first 200 chars)
    const intro = content.slice(0, 200);
    const introHasDefinition = /\b\w+\s+is\s+(a|an|the)\b/i.test(intro);
    score += introHasDefinition ? 2 : 0;

    // 6. FAQ-like question patterns
    const questionMatches = content.match(/^(what|who|where|when|why|how|is|are|can|do|does|should)\b.+\?$/gim);
    score += clamp((questionMatches?.length ?? 0) * 0.5, 0, 2);

    score = round(clamp(score, 0, MAX_PER_DIMENSION));

    if (score >= 16) {
        return { score, details: "Excellent AI readability. Content is well-structured with clear, direct language." };
    } else if (score >= 10) {
        return { score, details: "Good readability for AI. Consider adding more direct answers and structured elements." };
    } else if (score >= 5) {
        return { score, details: "Moderate readability. Content could be more concise and better structured for AI extraction." };
    }
    return { score, details: "Low AI readability. Restructure content with shorter sentences, headings, and direct answers." };
}

/**
 * Content Structure (max 20).
 * Based on heading hierarchy, paragraph count, list presence, and content length.
 */
function scoreContentStructure(content: string, headings: string[]): { score: number; details: string } {
    const paras = paragraphs(content);
    const wordCount = words(content).length;
    let score = 0;

    // 1. Heading hierarchy (ideally 3+ headings)
    const headingCount = headings.length;
    if (headingCount >= 5) {
        score += 5;
    } else if (headingCount >= 3) {
        score += 4;
    } else if (headingCount >= 1) {
        score += 2;
    }

    // 2. Paragraph count and length
    const paraCount = paras.length;
    if (paraCount >= 5) {
        score += 4;
    } else if (paraCount >= 3) {
        score += 3;
    } else if (paraCount >= 1) {
        score += 1;
    }

    // Average paragraph length (penalise walls of text)
    if (paraCount > 0) {
        const avgParaWords = wordCount / paraCount;
        if (avgParaWords >= 30 && avgParaWords <= 150) {
            score += 3;
        } else if (avgParaWords >= 20 && avgParaWords <= 200) {
            score += 2;
        } else {
            score += 1;
        }
    }

    // 3. List presence
    const listItems = content.match(/^[\s]*[-*\u2022]\s|^\s*\d+[.)]\s/gm);
    const listItemCount = listItems?.length ?? 0;
    if (listItemCount >= 5) {
        score += 4;
    } else if (listItemCount >= 2) {
        score += 3;
    } else if (listItemCount >= 1) {
        score += 1;
    }

    // 4. Content length (too short = low value, too long = less focused)
    if (wordCount >= 300 && wordCount <= 3000) {
        score += 4;
    } else if (wordCount >= 150 && wordCount <= 5000) {
        score += 3;
    } else if (wordCount >= 50) {
        score += 1;
    }

    score = round(clamp(score, 0, MAX_PER_DIMENSION));

    if (score >= 16) {
        return { score, details: "Excellent structure with good heading hierarchy, balanced paragraphs, and supporting lists." };
    } else if (score >= 10) {
        return { score, details: "Decent structure. Consider adding more headings, lists, or breaking up long paragraphs." };
    } else if (score >= 5) {
        return { score, details: "Weak structure. Add headings, bullet lists, and organize content into focused paragraphs." };
    }
    return { score, details: "Poor content structure. Major restructuring needed: add headings, lists, and split into paragraphs." };
}

/**
 * Authority Signals (max 20).
 * Based on statistics, citations, expert quotes, and data references.
 */
function scoreAuthoritySignals(
    content: string,
    meta?: GeoScoreRequest["meta"],
): { score: number; details: string } {
    let score = 0;

    // 1. Statistics and numbers
    const percentages = content.match(/\d+(\.\d+)?%/g);
    const currencyRefs = content.match(/\$[\d,]+(\.\d{2})?/g);
    const multipliers = content.match(/\b\d+(\.\d+)?x\b/gi);
    const statCount = (percentages?.length ?? 0) + (currencyRefs?.length ?? 0) + (multipliers?.length ?? 0);
    score += clamp(statCount * 1.5, 0, 5);

    // 2. Citations and source attributions
    const citationPatterns = [
        /\b(according to|as reported by|as noted by|as stated by)\b/gi,
        /\[([\d,;\s]+)\]/g,
        /\(\d{4}\)/g,
        /\bet al\.\b/gi,
        /\bsource:/gi,
    ];
    let citationCount = 0;
    for (const pat of citationPatterns) {
        const matches = content.match(pat);
        citationCount += matches?.length ?? 0;
    }
    score += clamp(citationCount * 2, 0, 5);

    // 3. Expert quotes (quotation marks followed by attribution)
    const quotePatterns = content.match(/[""][^""]{20,}[""][\s,]*(?:said|says|notes|explains|according)/gi);
    const quoteCount = quotePatterns?.length ?? 0;
    score += clamp(quoteCount * 2, 0, 4);

    // 4. Data references and research mentions
    const dataPatterns = [
        /\b(study|survey|report|research|analysis|findings|data)\b/gi,
        /\b(published|conducted|revealed|demonstrated|confirmed)\b/gi,
        /\b(peer[- ]reviewed|empirical|longitudinal|meta[- ]analysis)\b/gi,
    ];
    let dataRefCount = 0;
    for (const pat of dataPatterns) {
        const matches = content.match(pat);
        dataRefCount += matches?.length ?? 0;
    }
    score += clamp(dataRefCount * 0.5, 0, 3);

    // 5. Author / metadata signals
    if (meta?.author) score += 1;
    if (meta?.published_date) score += 1;
    if (meta?.word_count && meta.word_count >= 500) score += 1;

    score = round(clamp(score, 0, MAX_PER_DIMENSION));

    if (score >= 16) {
        return { score, details: "Strong authority signals with data, citations, and expert references." };
    } else if (score >= 10) {
        return { score, details: "Some authority signals present. Add more statistics, citations, or expert quotes." };
    } else if (score >= 5) {
        return { score, details: "Weak authority signals. Content needs data points, source attributions, and expert backing." };
    }
    return { score, details: "Minimal authority signals. Include statistics, cite sources, and reference expert opinions." };
}

/* =========================================================================
   Grade assignment
   ========================================================================= */

function assignGrade(score: number): "A" | "B" | "C" | "D" | "F" {
    for (const threshold of GRADE_THRESHOLDS) {
        if (score >= threshold.min) return threshold.grade;
    }
    return "F";
}

/* =========================================================================
   Recommendation generation
   ========================================================================= */

interface DimensionEntry {
    key: RecommendationCategory;
    score: number;
    max: number;
}

/**
 * Recommendation templates keyed by category.
 * Each category has multiple recommendations ordered by expected impact.
 */
const RECOMMENDATION_TEMPLATES: Record<RecommendationCategory, Array<{
    action: string;
    impact: Impact;
    effort: Effort;
    details: string;
    /** Minimum gap (max - score) to trigger this recommendation. */
    minGap: number;
}>> = {
    schema: [
        {
            action: "Add JSON-LD structured data markup",
            impact: "high",
            effort: "moderate",
            details: "Implement Article, FAQPage, or HowTo schema to help AI engines understand your content type and structure.",
            minGap: 12,
        },
        {
            action: "Expand existing schema with recommended fields",
            impact: "medium",
            effort: "quick_win",
            details: "Add missing recommended fields (image, dateModified, author details) to improve schema completeness.",
            minGap: 6,
        },
        {
            action: "Add BreadcrumbList schema for navigation clarity",
            impact: "low",
            effort: "quick_win",
            details: "Breadcrumb schema helps AI models understand your site hierarchy and page context.",
            minGap: 3,
        },
    ],
    entity: [
        {
            action: "Define key entities explicitly in your content",
            impact: "high",
            effort: "moderate",
            details: "Clearly introduce and define the main people, organizations, products, or concepts your content discusses.",
            minGap: 10,
        },
        {
            action: "Add sameAs links to authoritative sources",
            impact: "medium",
            effort: "quick_win",
            details: "Link entities to their Wikipedia, Wikidata, or official pages so AI models can verify identity.",
            minGap: 6,
        },
        {
            action: "Use consistent entity naming throughout content",
            impact: "medium",
            effort: "quick_win",
            details: "Avoid switching between abbreviations and full names. Pick one canonical form and use it consistently.",
            minGap: 3,
        },
    ],
    readability: [
        {
            action: "Restructure content with direct, concise answers",
            impact: "high",
            effort: "significant",
            details: "Lead sections with clear answer statements. Use the inverted pyramid: conclusion first, then supporting details.",
            minGap: 10,
        },
        {
            action: "Add a FAQ section with common questions",
            impact: "high",
            effort: "moderate",
            details: "FAQ sections directly match how users query AI assistants, dramatically increasing snippet selection likelihood.",
            minGap: 6,
        },
        {
            action: "Shorten sentences and reduce filler words",
            impact: "medium",
            effort: "quick_win",
            details: "AI models prefer concise, factual statements. Aim for 10-20 word sentences and remove hedge words.",
            minGap: 3,
        },
    ],
    structure: [
        {
            action: "Add descriptive headings to create clear content hierarchy",
            impact: "high",
            effort: "quick_win",
            details: "Use H2/H3 headings that describe the section content. This helps AI models navigate and extract information.",
            minGap: 10,
        },
        {
            action: "Break content into focused, scannable paragraphs",
            impact: "medium",
            effort: "quick_win",
            details: "Keep paragraphs to 3-5 sentences. Each paragraph should cover one specific point.",
            minGap: 6,
        },
        {
            action: "Add bullet or numbered lists for key points",
            impact: "medium",
            effort: "quick_win",
            details: "Lists are highly extractable by AI. Convert run-on enumerations into structured list elements.",
            minGap: 3,
        },
    ],
    authority: [
        {
            action: "Include specific data points and statistics",
            impact: "high",
            effort: "moderate",
            details: "Add percentages, monetary figures, timeframes, and measurable outcomes. Cite the source of each data point.",
            minGap: 10,
        },
        {
            action: "Add source citations and expert attributions",
            impact: "high",
            effort: "moderate",
            details: "Reference studies, reports, or expert opinions with proper attribution. This builds AI trust in your content.",
            minGap: 6,
        },
        {
            action: "Include author credentials and publication date",
            impact: "medium",
            effort: "quick_win",
            details: "Display author expertise and keep content dated. AI models weigh recency and author authority.",
            minGap: 3,
        },
    ],
};

/**
 * Generate prioritised recommendations from dimension scores.
 * Focus on the weakest dimensions first.
 */
function generateRecommendations(dimensions: DimensionEntry[]): Recommendation[] {
    // Sort dimensions by gap (largest gap = most room for improvement)
    const sorted = [...dimensions].sort((a, b) => (b.max - b.score) - (a.max - a.score));

    const recommendations: Recommendation[] = [];
    let priority = 1;

    for (const dim of sorted) {
        const gap = dim.max - dim.score;
        if (gap <= 0) continue;

        const templates = RECOMMENDATION_TEMPLATES[dim.key];
        for (const tpl of templates) {
            if (gap >= tpl.minGap) {
                recommendations.push({
                    priority: priority++,
                    category: dim.key,
                    action: tpl.action,
                    impact: tpl.impact,
                    effort: tpl.effort,
                    details: tpl.details,
                });
                break; // One recommendation per dimension pass
            }
        }
    }

    // Second pass: add secondary recommendations for the weakest areas
    for (const dim of sorted.slice(0, 3)) {
        const gap = dim.max - dim.score;
        const templates = RECOMMENDATION_TEMPLATES[dim.key];

        for (const tpl of templates) {
            if (gap >= tpl.minGap && !recommendations.some((r) => r.action === tpl.action)) {
                recommendations.push({
                    priority: priority++,
                    category: dim.key,
                    action: tpl.action,
                    impact: tpl.impact,
                    effort: tpl.effort,
                    details: tpl.details,
                });
            }
        }
    }

    // Sort final list by priority
    recommendations.sort((a, b) => a.priority - b.priority);

    return recommendations;
}

/* =========================================================================
   Internal helpers
   ========================================================================= */

/** Resolve @type from a JSON-LD object. */
function resolveType(schema: Record<string, unknown>): string {
    const raw = schema["@type"];
    if (typeof raw === "string") return raw;
    if (Array.isArray(raw)) {
        const meaningful = raw.find((t) => typeof t === "string" && t !== "Thing");
        return typeof meaningful === "string" ? meaningful : String(raw[0] ?? "Unknown");
    }
    return "Unknown";
}

/* =========================================================================
   Public API
   ========================================================================= */

/**
 * Compute a composite GEO score for a page.
 *
 * Evaluates five dimensions (each 0-20, total max 100) using only heuristic
 * analysis for speed. No AI/LLM calls are made.
 *
 *   1. Schema Markup    -- presence and quality of JSON-LD structured data
 *   2. Entity Clarity   -- how clearly entities are defined and referenced
 *   3. AI Readability   -- sentence structure, headings, directness
 *   4. Content Structure-- heading hierarchy, paragraphs, lists, length
 *   5. Authority Signals-- stats, citations, expert quotes, data references
 *
 * Returns a graded score, dimensional breakdown, prioritised recommendations,
 * and a benchmark comparison.
 */
export async function computeGeoScore(
    input: GeoScoreRequest,
): Promise<GeoScoreResponse> {
    const { content, title, headings = [], existing_schemas, meta } = input;

    // ---------- Score each dimension ----------
    const schema_markup = scoreSchemaMarkup(existing_schemas);
    const entity_clarity = scoreEntityClarity(content, title);
    const ai_readability = scoreAIReadability(content, headings);
    const content_structure = scoreContentStructure(content, headings);
    const authority_signals = scoreAuthoritySignals(content, meta);

    const geo_score = schema_markup.score
        + entity_clarity.score
        + ai_readability.score
        + content_structure.score
        + authority_signals.score;

    const grade = assignGrade(geo_score);

    // ---------- Build breakdown ----------
    const breakdown = {
        schema_markup: { score: schema_markup.score, max: MAX_PER_DIMENSION, details: schema_markup.details },
        entity_clarity: { score: entity_clarity.score, max: MAX_PER_DIMENSION, details: entity_clarity.details },
        ai_readability: { score: ai_readability.score, max: MAX_PER_DIMENSION, details: ai_readability.details },
        content_structure: { score: content_structure.score, max: MAX_PER_DIMENSION, details: content_structure.details },
        authority_signals: { score: authority_signals.score, max: MAX_PER_DIMENSION, details: authority_signals.details },
    };

    // ---------- Generate recommendations ----------
    const dimensions: DimensionEntry[] = [
        { key: "schema", score: schema_markup.score, max: MAX_PER_DIMENSION },
        { key: "entity", score: entity_clarity.score, max: MAX_PER_DIMENSION },
        { key: "readability", score: ai_readability.score, max: MAX_PER_DIMENSION },
        { key: "structure", score: content_structure.score, max: MAX_PER_DIMENSION },
        { key: "authority", score: authority_signals.score, max: MAX_PER_DIMENSION },
    ];

    const recommendations = generateRecommendations(dimensions);

    // ---------- Benchmark comparison ----------
    const percentile = estimatePercentile(geo_score, BENCHMARK_AVERAGE, BENCHMARK_STDDEV);

    return {
        geo_score,
        grade,
        breakdown,
        recommendations,
        comparison: {
            average_score: BENCHMARK_AVERAGE,
            percentile,
        },
        scored_at: new Date().toISOString(),
    };
}
