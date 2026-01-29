// /lib/geo-plugin/validation-service.ts
// Deterministic Schema.org JSON-LD validation service for the WordPress GEO Plugin.
// No external AI calls -- all logic is rule-based for speed and predictability.

import type {
    SchemaValidateRequest,
    SchemaValidateResponse,
} from "@/lib/geo-plugin-zod";

/* =========================================================================
   Type definitions (internal)
   ========================================================================= */

interface ValidationError {
    field: string;
    message: string;
    severity: "error" | "warning" | "info";
}

interface ValidationWarning {
    field: string;
    message: string;
    suggestion: string;
}

interface SchemaResult {
    schema_type: string;
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
    completeness_score: number;
    missing_recommended: string[];
}

/* =========================================================================
   Schema.org field requirements per type
   ========================================================================= */

/** Fields that MUST be present for each schema type. */
const REQUIRED_FIELDS: Record<string, string[]> = {
    Article: [
        "@type",
        "headline",
        "author",
    ],
    NewsArticle: [
        "@type",
        "headline",
        "author",
        "datePublished",
    ],
    BlogPosting: [
        "@type",
        "headline",
        "author",
    ],
    FAQPage: [
        "@type",
        "mainEntity",
    ],
    HowTo: [
        "@type",
        "name",
        "step",
    ],
    Product: [
        "@type",
        "name",
    ],
    LocalBusiness: [
        "@type",
        "name",
        "address",
    ],
    Organization: [
        "@type",
        "name",
    ],
    Person: [
        "@type",
        "name",
    ],
    Event: [
        "@type",
        "name",
        "startDate",
        "location",
    ],
    Recipe: [
        "@type",
        "name",
        "recipeIngredient",
        "recipeInstructions",
    ],
    WebPage: [
        "@type",
        "name",
    ],
    BreadcrumbList: [
        "@type",
        "itemListElement",
    ],
};

/** Fields that are recommended (not strictly required) per type. */
const RECOMMENDED_FIELDS: Record<string, string[]> = {
    Article: [
        "datePublished",
        "dateModified",
        "image",
        "publisher",
        "description",
        "mainEntityOfPage",
        "wordCount",
    ],
    NewsArticle: [
        "dateModified",
        "image",
        "publisher",
        "description",
        "mainEntityOfPage",
    ],
    BlogPosting: [
        "datePublished",
        "dateModified",
        "image",
        "publisher",
        "description",
        "mainEntityOfPage",
        "wordCount",
    ],
    FAQPage: [
        "name",
        "description",
        "mainEntityOfPage",
    ],
    HowTo: [
        "description",
        "image",
        "totalTime",
        "estimatedCost",
        "supply",
        "tool",
    ],
    Product: [
        "description",
        "image",
        "brand",
        "offers",
        "sku",
        "gtin",
        "review",
        "aggregateRating",
    ],
    LocalBusiness: [
        "telephone",
        "openingHoursSpecification",
        "url",
        "image",
        "geo",
        "priceRange",
        "description",
        "sameAs",
        "review",
        "aggregateRating",
    ],
    Organization: [
        "url",
        "logo",
        "description",
        "sameAs",
        "contactPoint",
        "address",
    ],
    Person: [
        "url",
        "image",
        "jobTitle",
        "sameAs",
        "affiliation",
    ],
    Event: [
        "endDate",
        "description",
        "image",
        "offers",
        "performer",
        "organizer",
    ],
    Recipe: [
        "image",
        "author",
        "datePublished",
        "description",
        "prepTime",
        "cookTime",
        "totalTime",
        "nutrition",
        "recipeYield",
        "recipeCategory",
    ],
    WebPage: [
        "description",
        "url",
        "mainEntity",
        "breadcrumb",
    ],
    BreadcrumbList: [],
};

/* =========================================================================
   Helpers
   ========================================================================= */

/**
 * Resolve the @type from a JSON-LD object.
 * Handles both string values and arrays (picks the first non-"Thing" entry).
 */
function resolveSchemaType(schema: Record<string, unknown>): string {
    const raw = schema["@type"];
    if (typeof raw === "string") return raw;
    if (Array.isArray(raw)) {
        const meaningful = raw.find((t) => typeof t === "string" && t !== "Thing");
        return typeof meaningful === "string" ? meaningful : String(raw[0] ?? "Unknown");
    }
    return "Unknown";
}

/**
 * Check whether a field is meaningfully present in the schema.
 * A field is considered present if it is not null, not undefined,
 * not an empty string, and not an empty array.
 */
function fieldPresent(schema: Record<string, unknown>, field: string): boolean {
    const value = schema[field];
    if (value === undefined || value === null) return false;
    if (typeof value === "string" && value.trim() === "") return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
}

/**
 * Validate the @context field.
 * Returns errors if @context is missing or not a recognised Schema.org URL.
 */
function validateContext(schema: Record<string, unknown>): ValidationError[] {
    const errors: ValidationError[] = [];
    const ctx = schema["@context"];

    if (!ctx) {
        errors.push({
            field: "@context",
            message: "Missing @context -- should be \"https://schema.org\" or \"http://schema.org\".",
            severity: "error",
        });
    } else if (typeof ctx === "string") {
        const normalised = ctx.toLowerCase().replace(/\/+$/, "");
        if (normalised !== "https://schema.org" && normalised !== "http://schema.org") {
            errors.push({
                field: "@context",
                message: `Unexpected @context value "${ctx}". Expected "https://schema.org".`,
                severity: "warning",
            });
        }
    }

    return errors;
}

/**
 * Run type-specific structural validations (beyond simple field presence).
 */
function validateTypeSpecific(
    schema: Record<string, unknown>,
    schemaType: string,
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    switch (schemaType) {
        case "FAQPage": {
            const mainEntity = schema["mainEntity"];
            if (Array.isArray(mainEntity)) {
                if (mainEntity.length === 0) {
                    errors.push({
                        field: "mainEntity",
                        message: "mainEntity array is empty -- at least one Question is required.",
                        severity: "error",
                    });
                }
                for (let i = 0; i < mainEntity.length; i++) {
                    const item = mainEntity[i] as Record<string, unknown> | undefined;
                    if (!item || typeof item !== "object") continue;
                    const itemType = resolveSchemaType(item);
                    if (itemType !== "Question") {
                        errors.push({
                            field: `mainEntity[${i}].@type`,
                            message: `Expected @type "Question" but found "${itemType}".`,
                            severity: "error",
                        });
                    }
                    if (!fieldPresent(item, "name")) {
                        errors.push({
                            field: `mainEntity[${i}].name`,
                            message: "Question is missing the \"name\" (question text) field.",
                            severity: "error",
                        });
                    }
                    if (!fieldPresent(item, "acceptedAnswer")) {
                        errors.push({
                            field: `mainEntity[${i}].acceptedAnswer`,
                            message: "Question is missing the \"acceptedAnswer\" field.",
                            severity: "error",
                        });
                    }
                }
            }
            break;
        }

        case "HowTo": {
            const steps = schema["step"];
            if (Array.isArray(steps)) {
                if (steps.length === 0) {
                    errors.push({
                        field: "step",
                        message: "step array is empty -- at least one HowToStep is required.",
                        severity: "error",
                    });
                }
                for (let i = 0; i < steps.length; i++) {
                    const step = steps[i] as Record<string, unknown> | undefined;
                    if (!step || typeof step !== "object") continue;
                    if (!fieldPresent(step, "text") && !fieldPresent(step, "name")) {
                        warnings.push({
                            field: `step[${i}]`,
                            message: `Step ${i + 1} has neither "name" nor "text".`,
                            suggestion: "Add at least a \"text\" field describing what to do in this step.",
                        });
                    }
                }
            }
            break;
        }

        case "Product": {
            const offers = schema["offers"];
            if (fieldPresent(schema, "offers")) {
                const offerObj = (Array.isArray(offers) ? offers[0] : offers) as Record<string, unknown> | undefined;
                if (offerObj && typeof offerObj === "object") {
                    if (!fieldPresent(offerObj, "price") && !fieldPresent(offerObj, "priceRange")) {
                        warnings.push({
                            field: "offers.price",
                            message: "Offer is missing a price or priceRange.",
                            suggestion: "Include a \"price\" and \"priceCurrency\" in the offers object.",
                        });
                    }
                    if (!fieldPresent(offerObj, "availability")) {
                        warnings.push({
                            field: "offers.availability",
                            message: "Offer is missing availability status.",
                            suggestion: "Add an \"availability\" field (e.g. \"https://schema.org/InStock\").",
                        });
                    }
                }
            }
            break;
        }

        case "LocalBusiness": {
            const address = schema["address"];
            if (fieldPresent(schema, "address") && typeof address === "object" && address !== null) {
                const addr = address as Record<string, unknown>;
                const recommended = ["streetAddress", "addressLocality", "addressRegion", "postalCode", "addressCountry"];
                for (const field of recommended) {
                    if (!fieldPresent(addr, field)) {
                        warnings.push({
                            field: `address.${field}`,
                            message: `Address is missing "${field}".`,
                            suggestion: `Add "${field}" to the address for better local search visibility.`,
                        });
                    }
                }
            }
            break;
        }

        case "Article":
        case "NewsArticle":
        case "BlogPosting": {
            // Author should be an object with name, not just a string
            const author = schema["author"];
            if (typeof author === "string") {
                warnings.push({
                    field: "author",
                    message: "author is a plain string instead of a Person/Organization object.",
                    suggestion: "Use { \"@type\": \"Person\", \"name\": \"...\" } for the author field.",
                });
            }

            // Publisher should have a logo
            if (fieldPresent(schema, "publisher")) {
                const pub = schema["publisher"] as Record<string, unknown>;
                if (typeof pub === "object" && pub !== null && !fieldPresent(pub, "logo")) {
                    warnings.push({
                        field: "publisher.logo",
                        message: "Publisher is missing a logo.",
                        suggestion: "Add a \"logo\" ImageObject to the publisher for Rich Results eligibility.",
                    });
                }
            }
            break;
        }

        default:
            break;
    }

    return { errors, warnings };
}

/**
 * Calculate a completeness score (0-100) for a single schema.
 * Based on the ratio of present required + recommended fields.
 */
function calculateCompleteness(
    schema: Record<string, unknown>,
    schemaType: string,
    errorCount: number,
): number {
    const required = REQUIRED_FIELDS[schemaType] ?? ["@type"];
    const recommended = RECOMMENDED_FIELDS[schemaType] ?? [];
    const allFields = [...required, ...recommended];

    if (allFields.length === 0) return 100;

    let presentCount = 0;
    for (const field of allFields) {
        if (fieldPresent(schema, field)) {
            presentCount++;
        }
    }

    // Required fields are weighted 2x, recommended 1x
    const requiredWeight = 2;
    const recommendedWeight = 1;
    const totalWeight = required.length * requiredWeight + recommended.length * recommendedWeight;

    let weightedPresent = 0;
    for (const field of required) {
        if (fieldPresent(schema, field)) weightedPresent += requiredWeight;
    }
    for (const field of recommended) {
        if (fieldPresent(schema, field)) weightedPresent += recommendedWeight;
    }

    let score = totalWeight > 0 ? Math.round((weightedPresent / totalWeight) * 100) : 0;

    // Penalise for structural errors (beyond missing fields)
    score = Math.max(0, score - errorCount * 5);

    return Math.min(100, Math.max(0, score));
}

/* =========================================================================
   Public API
   ========================================================================= */

/**
 * Validate an array of JSON-LD schemas against Schema.org requirements.
 *
 * For each schema the service checks:
 *   - @context presence and value
 *   - Required fields per detected @type
 *   - Recommended fields per detected @type
 *   - Type-specific structural rules (e.g. FAQPage Question structure)
 *
 * Returns per-schema results and aggregate totals.
 */
export async function validateSchemas(
    input: SchemaValidateRequest,
): Promise<SchemaValidateResponse> {
    const results: SchemaResult[] = [];

    for (const schema of input.schemas) {
        const schemaType = resolveSchemaType(schema);

        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        // ---------- @context ----------
        errors.push(...validateContext(schema));

        // ---------- Required fields ----------
        const required = REQUIRED_FIELDS[schemaType] ?? ["@type"];
        for (const field of required) {
            if (field === "@type") continue; // Already resolved successfully
            if (!fieldPresent(schema, field)) {
                errors.push({
                    field,
                    message: `Required field "${field}" is missing for ${schemaType}.`,
                    severity: "error",
                });
            }
        }

        // ---------- Recommended fields ----------
        const recommended = RECOMMENDED_FIELDS[schemaType] ?? [];
        const missingRecommended: string[] = [];
        for (const field of recommended) {
            if (!fieldPresent(schema, field)) {
                missingRecommended.push(field);
                warnings.push({
                    field,
                    message: `Recommended field "${field}" is missing for ${schemaType}.`,
                    suggestion: `Adding "${field}" improves Rich Results eligibility and AI discoverability.`,
                });
            }
        }

        // ---------- Type-specific validations ----------
        const typeSpecific = validateTypeSpecific(schema, schemaType);
        errors.push(...typeSpecific.errors);
        warnings.push(...typeSpecific.warnings);

        // ---------- Unknown type info ----------
        if (!REQUIRED_FIELDS[schemaType]) {
            errors.push({
                field: "@type",
                message: `Schema type "${schemaType}" is not in the known validation ruleset. Basic checks only.`,
                severity: "info",
            });
        }

        // ---------- Completeness ----------
        const structuralErrorCount = typeSpecific.errors.length;
        const completeness_score = calculateCompleteness(schema, schemaType, structuralErrorCount);

        const valid = errors.filter((e) => e.severity === "error").length === 0;

        results.push({
            schema_type: schemaType,
            valid,
            errors,
            warnings,
            completeness_score,
            missing_recommended: missingRecommended,
        });
    }

    // ---------- Aggregates ----------
    const overall_valid = results.every((r) => r.valid);
    const total_errors = results.reduce(
        (sum, r) => sum + r.errors.filter((e) => e.severity === "error").length,
        0,
    );
    const total_warnings = results.reduce((sum, r) => sum + r.warnings.length, 0);

    return {
        results,
        overall_valid,
        total_errors,
        total_warnings,
        validated_at: new Date().toISOString(),
    };
}
