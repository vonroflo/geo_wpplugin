// /lib/geo-plugin/entity-service.ts
// Entity optimization service for the WordPress GEO Plugin.
// Analyzes page content for named entities, generates sameAs link suggestions,
// scores entity optimization quality, and produces actionable recommendations.

import { analyzeContentEntities } from "@/lib/ai/geo-plugin-ai";
import type {
  EntityOptimizeRequest,
  EntityOptimizeResponse,
} from "@/lib/geo-plugin-zod";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Canonical entity types we recognize for sameAs link generation. */
type KnownEntityType =
  | "Organization"
  | "Person"
  | "Product"
  | "Place"
  | "Event";

/** Internal representation of a scored entity before final mapping. */
interface ScoredEntity {
  name: string;
  type: string;
  status: "found" | "missing" | "weak";
  suggestions: string[];
  same_as_links: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Average number of meaningful entities expected per 1 000 characters of
 * well-optimized content. Used as a baseline when scoring entity density.
 */
const EXPECTED_ENTITIES_PER_1K_CHARS = 2;

/** Maximum content length we use for the entity-per-char expectation calc. */
const MAX_CONTENT_LENGTH_FOR_DENSITY = 20_000;

/** Status weights used when calculating the entity quality ratio score. */
const STATUS_WEIGHTS: Record<"found" | "weak" | "missing", number> = {
  found: 1.0,
  weak: 0.4,
  missing: 0.0,
};

/**
 * Weight distribution for the four sub-scores that compose the overall
 * entity score. Values must sum to 1.
 */
const SCORE_WEIGHTS = {
  density: 0.25,
  quality: 0.35,
  keywords: 0.25,
  sameAs: 0.15,
} as const;

// ---------------------------------------------------------------------------
// sameAs link helpers
// ---------------------------------------------------------------------------

/**
 * URL-encode an entity name for use inside template URLs.
 * Spaces are replaced with underscores for Wikipedia-style URLs.
 */
function wikiSlug(name: string): string {
  return encodeURIComponent(name.replace(/\s+/g, "_"));
}

/**
 * URL-encode an entity name for generic query-string or path usage.
 */
function uriSlug(name: string): string {
  return encodeURIComponent(name);
}

/**
 * Return a set of suggested sameAs URLs for a given entity based on its
 * Schema.org type. These are template suggestions -- the URLs are plausible
 * but not verified to exist.
 */
function generateSameAsLinks(name: string, type: string): string[] {
  const normalizedType = type as KnownEntityType;

  switch (normalizedType) {
    case "Organization":
      return [
        `https://en.wikipedia.org/wiki/${wikiSlug(name)}`,
        `https://www.linkedin.com/company/${uriSlug(name.toLowerCase().replace(/\s+/g, "-"))}`,
        `https://www.crunchbase.com/organization/${uriSlug(name.toLowerCase().replace(/\s+/g, "-"))}`,
      ];

    case "Person":
      return [
        `https://en.wikipedia.org/wiki/${wikiSlug(name)}`,
        `https://www.linkedin.com/in/${uriSlug(name.toLowerCase().replace(/\s+/g, "-"))}`,
      ];

    case "Product":
      return [
        `https://www.google.com/search?q=${uriSlug(name)}+official+site`,
        `https://www.g2.com/products/${uriSlug(name.toLowerCase().replace(/\s+/g, "-"))}`,
        `https://www.trustpilot.com/review/${uriSlug(name.toLowerCase().replace(/\s+/g, "-"))}`,
      ];

    case "Place":
      return [
        `https://www.google.com/maps/search/${uriSlug(name)}`,
        `https://en.wikipedia.org/wiki/${wikiSlug(name)}`,
      ];

    case "Event":
      return [
        `https://en.wikipedia.org/wiki/${wikiSlug(name)}`,
        `https://www.google.com/search?q=${uriSlug(name)}+event`,
      ];

    default:
      // For any other Schema.org type, provide a generic Wikipedia suggestion.
      return [`https://en.wikipedia.org/wiki/${wikiSlug(name)}`];
  }
}

// ---------------------------------------------------------------------------
// Scoring helpers
// ---------------------------------------------------------------------------

/**
 * Calculate how well the number of detected entities matches expectations
 * for the given content length. Returns a value in [0, 1].
 */
function computeDensityScore(
  entityCount: number,
  contentLength: number,
): number {
  const clampedLength = Math.min(contentLength, MAX_CONTENT_LENGTH_FOR_DENSITY);
  const expected = Math.max(
    1,
    Math.round((clampedLength / 1000) * EXPECTED_ENTITIES_PER_1K_CHARS),
  );

  // Ratio of found entities to expected. Cap at 1 so having *more* entities
  // than expected does not inflate the score beyond the maximum.
  return Math.min(entityCount / expected, 1);
}

/**
 * Score the quality ratio across all entities based on their status.
 * Returns a value in [0, 1].
 */
function computeQualityScore(
  entities: Array<{ status: "found" | "missing" | "weak" }>,
): number {
  if (entities.length === 0) return 0;

  const total = entities.reduce(
    (sum, e) => sum + STATUS_WEIGHTS[e.status],
    0,
  );
  return total / entities.length;
}

/**
 * Score keyword coverage. We consider the ratio of primary + secondary
 * keywords to the total pool (primary + secondary + missing). Returns [0, 1].
 */
function computeKeywordScore(keywords: {
  primary: string[];
  secondary: string[];
  missing: string[];
}): number {
  const covered = keywords.primary.length + keywords.secondary.length;
  const total = covered + keywords.missing.length;
  if (total === 0) return 1; // nothing expected, nothing missing
  return covered / total;
}

/**
 * Score how many entities already have sameAs links vs how many could.
 * Returns [0, 1].
 */
function computeSameAsScore(entities: ScoredEntity[]): number {
  if (entities.length === 0) return 0;
  const withLinks = entities.filter((e) => e.same_as_links.length > 0).length;
  return withLinks / entities.length;
}

/**
 * Combine sub-scores into a single overall score on a 0-100 scale.
 */
function computeOverallScore(
  densityScore: number,
  qualityScore: number,
  keywordScore: number,
  sameAsScore: number,
): number {
  const raw =
    densityScore * SCORE_WEIGHTS.density +
    qualityScore * SCORE_WEIGHTS.quality +
    keywordScore * SCORE_WEIGHTS.keywords +
    sameAsScore * SCORE_WEIGHTS.sameAs;

  return Math.round(raw * 100);
}

// ---------------------------------------------------------------------------
// Recommendation generation
// ---------------------------------------------------------------------------

/**
 * Produce human-readable recommendations based on detected weaknesses.
 */
function generateRecommendations(
  entities: ScoredEntity[],
  keywords: { primary: string[]; secondary: string[]; missing: string[] },
  densityScore: number,
  qualityScore: number,
): string[] {
  const recommendations: string[] = [];

  // -- Entity density issues ------------------------------------------------
  if (densityScore < 0.5) {
    recommendations.push(
      "Your content references fewer entities than expected for its length. " +
        "Consider mentioning relevant organizations, people, products, or " +
        "places to strengthen topical relevance.",
    );
  }

  // -- Missing entities -----------------------------------------------------
  const missingEntities = entities.filter((e) => e.status === "missing");
  if (missingEntities.length > 0) {
    const names = missingEntities.map((e) => e.name).join(", ");
    recommendations.push(
      `The following entities are expected but missing from your content: ${names}. ` +
        "Add clear mentions and context for each to improve entity clarity.",
    );
  }

  // -- Weak entities --------------------------------------------------------
  const weakEntities = entities.filter((e) => e.status === "weak");
  if (weakEntities.length > 0) {
    const names = weakEntities.map((e) => e.name).join(", ");
    recommendations.push(
      `These entities are mentioned but not well-defined: ${names}. ` +
        "Provide additional context, descriptions, or structured data to " +
        "strengthen their presence.",
    );
  }

  // -- sameAs / structured data links ---------------------------------------
  const entitiesWithoutLinks = entities.filter(
    (e) => e.status !== "missing" && e.same_as_links.length > 0,
  );
  if (entitiesWithoutLinks.length > 0) {
    recommendations.push(
      "Add sameAs links to your structured data for key entities. " +
        "Linking to authoritative profiles (Wikipedia, LinkedIn, etc.) " +
        "helps search engines and AI models disambiguate entities.",
    );
  }

  // -- Missing keywords -----------------------------------------------------
  if (keywords.missing.length > 0) {
    const kws = keywords.missing.join(", ");
    recommendations.push(
      `Consider incorporating these missing keywords naturally into your ` +
        `content: ${kws}. They are topically relevant and can improve ` +
        "discoverability in AI-generated answers.",
    );
  }

  // -- Overall quality ------------------------------------------------------
  if (qualityScore < 0.6) {
    recommendations.push(
      "Overall entity quality is low. Focus on clearly defining your " +
        "primary entities with proper nouns, descriptions, and contextual " +
        "information that AI models can extract.",
    );
  }

  // -- Fallback if everything looks good ------------------------------------
  if (recommendations.length === 0) {
    recommendations.push(
      "Entity optimization looks strong. Continue monitoring as you " +
        "update content and ensure new entities are properly defined with " +
        "structured data and sameAs links.",
    );
  }

  return recommendations;
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

/**
 * Analyze a page's content for entity optimization opportunities.
 *
 * 1. Calls the AI analysis layer to extract entities and keywords.
 * 2. Enriches each entity with suggested sameAs links.
 * 3. Computes an overall entity optimization score (0-100).
 * 4. Generates actionable recommendations.
 *
 * @param input - Validated EntityOptimizeRequest from the API route.
 * @returns A fully populated EntityOptimizeResponse.
 */
export async function analyzeEntities(
  input: EntityOptimizeRequest,
): Promise<EntityOptimizeResponse> {
  const { content, title } = input;

  // Step 1 -- AI analysis
  const aiResult = await analyzeContentEntities(content, title);

  // Step 2 -- Enrich entities with sameAs link suggestions
  const enrichedEntities: ScoredEntity[] = aiResult.entities.map((entity) => ({
    name: entity.name,
    type: entity.type,
    status: entity.status,
    suggestions: entity.suggestions,
    same_as_links:
      entity.status !== "missing"
        ? generateSameAsLinks(entity.name, entity.type)
        : [],
  }));

  // Step 3 -- Compute sub-scores
  const densityScore = computeDensityScore(
    aiResult.entities.length,
    content.length,
  );
  const qualityScore = computeQualityScore(aiResult.entities);
  const keywordScore = computeKeywordScore(aiResult.keywords);
  const sameAsScore = computeSameAsScore(enrichedEntities);

  const overallEntityScore = computeOverallScore(
    densityScore,
    qualityScore,
    keywordScore,
    sameAsScore,
  );

  // Step 4 -- Generate recommendations
  const recommendations = generateRecommendations(
    enrichedEntities,
    aiResult.keywords,
    densityScore,
    qualityScore,
  );

  // Step 5 -- Assemble response
  return {
    entities: enrichedEntities,
    keywords: aiResult.keywords,
    about_suggestions: aiResult.about_suggestions,
    overall_entity_score: overallEntityScore,
    recommendations,
    analyzed_at: new Date().toISOString(),
  };
}
