// /lib/geo-plugin/schema-service.ts
// Schema markup generation service for the WordPress GEO Plugin.
// Produces JSON-LD structured data based on page content and metadata.

import {
  detectContentType,
  extractFAQs,
  extractHowToSteps,
} from "@/lib/ai/geo-plugin-ai";

import type {
  SchemaGenerateRequest,
  SchemaGenerateResponse,
} from "@/lib/geo-plugin-zod";

/* ------------------------------------------------------------------ */
/*  Internal types                                                     */
/* ------------------------------------------------------------------ */

/** Resolved content type (never "auto"). */
type ResolvedContentType = "article" | "product" | "faq" | "howto" | "local_business";

/** A single schema entry before final serialisation. */
interface SchemaEntry {
  type: string;
  json_ld: Record<string, unknown>;
  json_ld_string: string;
  confidence: number;
  notes: string[];
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SCHEMA_CONTEXT = "https://schema.org" as const;

/** Confidence assigned when the user explicitly chose the content type. */
const EXPLICIT_CONFIDENCE = 0.95;

/** Confidence assigned when the type was auto-detected by the AI. */
const AUTO_DETECTED_CONFIDENCE = 0.75;

/** Lower confidence for fallback Article schemas appended alongside
 *  a primary non-article schema. */
const FALLBACK_CONFIDENCE = 0.5;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Wrap a JSON-LD object in a `<script>` tag ready for injection into a page.
 */
function wrapJsonLd(jsonLd: Record<string, unknown>): string {
  return `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>`;
}

/**
 * Safely retrieve a nested meta value, returning `undefined` when the
 * field is absent or blank.
 */
function meta(
  input: SchemaGenerateRequest,
  field: keyof NonNullable<SchemaGenerateRequest["meta"]>,
): string | undefined {
  const value = input.meta?.[field];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

/* ------------------------------------------------------------------ */
/*  Schema builders                                                    */
/* ------------------------------------------------------------------ */

function buildArticleSchema(
  input: SchemaGenerateRequest,
  confidence: number,
): SchemaEntry {
  const notes: string[] = [];

  const jsonLd: Record<string, unknown> = {
    "@context": SCHEMA_CONTEXT,
    "@type": "Article",
    headline: input.title,
    url: input.url,
  };

  const author = meta(input, "author");
  if (author) {
    jsonLd.author = { "@type": "Person", name: author };
  } else {
    notes.push("No author provided -- consider adding one for richer results.");
  }

  const published = meta(input, "published_date");
  if (published) {
    jsonLd.datePublished = published;
  }

  const modified = meta(input, "modified_date");
  if (modified) {
    jsonLd.dateModified = modified;
  }

  const image = meta(input, "featured_image");
  if (image) {
    jsonLd.image = image;
  } else {
    notes.push("No featured image provided -- adding an image improves search appearance.");
  }

  // Use the first 200 characters of the content as a description fallback.
  jsonLd.description = input.content.slice(0, 200).trim();

  return {
    type: "Article",
    json_ld: jsonLd,
    json_ld_string: wrapJsonLd(jsonLd),
    confidence,
    notes,
  };
}

async function buildFAQSchema(
  input: SchemaGenerateRequest,
  confidence: number,
): Promise<SchemaEntry> {
  const notes: string[] = [];

  const faqs = await extractFAQs(input.content, input.title);

  if (faqs.length === 0) {
    notes.push("No FAQ pairs could be extracted -- the generated schema may be empty.");
  }

  const jsonLd: Record<string, unknown> = {
    "@context": SCHEMA_CONTEXT,
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  if (faqs.length > 0) {
    notes.push(`Extracted ${faqs.length} FAQ pair(s) from the content.`);
  }

  return {
    type: "FAQPage",
    json_ld: jsonLd,
    json_ld_string: wrapJsonLd(jsonLd),
    confidence,
    notes,
  };
}

async function buildHowToSchema(
  input: SchemaGenerateRequest,
  confidence: number,
): Promise<SchemaEntry> {
  const notes: string[] = [];

  const howTo = await extractHowToSteps(input.content, input.title);

  const jsonLd: Record<string, unknown> = {
    "@context": SCHEMA_CONTEXT,
    "@type": "HowTo",
    name: howTo.name || input.title,
    description: howTo.description || input.content.slice(0, 200).trim(),
    step: howTo.steps.map((step, idx) => ({
      "@type": "HowToStep",
      position: idx + 1,
      name: step.name,
      text: step.text,
    })),
  };

  const image = meta(input, "featured_image");
  if (image) {
    jsonLd.image = image;
  }

  if (howTo.steps.length === 0) {
    notes.push("No steps could be extracted -- consider restructuring the content with clearer instructions.");
  } else {
    notes.push(`Extracted ${howTo.steps.length} step(s) from the content.`);
  }

  return {
    type: "HowTo",
    json_ld: jsonLd,
    json_ld_string: wrapJsonLd(jsonLd),
    confidence,
    notes,
  };
}

function buildProductSchema(
  input: SchemaGenerateRequest,
  confidence: number,
): SchemaEntry {
  const notes: string[] = [];

  const jsonLd: Record<string, unknown> = {
    "@context": SCHEMA_CONTEXT,
    "@type": "Product",
    name: input.title,
    url: input.url,
    description: input.content.slice(0, 200).trim(),
  };

  const image = meta(input, "featured_image");
  if (image) {
    jsonLd.image = image;
  } else {
    notes.push("No featured image provided -- product images strongly improve click-through rates.");
  }

  const brand = meta(input, "brand_name");
  if (brand) {
    jsonLd.brand = { "@type": "Brand", name: brand };
  } else {
    notes.push("No brand name provided -- adding a brand improves product rich results.");
  }

  const price = meta(input, "price");
  const currency = meta(input, "currency") ?? "USD";
  if (price) {
    jsonLd.offers = {
      "@type": "Offer",
      price,
      priceCurrency: currency,
      url: input.url,
      availability: "https://schema.org/InStock",
    };
  } else {
    notes.push("No price provided -- an Offer with price is recommended for Product schema.");
  }

  return {
    type: "Product",
    json_ld: jsonLd,
    json_ld_string: wrapJsonLd(jsonLd),
    confidence,
    notes,
  };
}

function buildLocalBusinessSchema(
  input: SchemaGenerateRequest,
  confidence: number,
): SchemaEntry {
  const notes: string[] = [];

  const businessName = meta(input, "business_name") ?? input.title;

  const jsonLd: Record<string, unknown> = {
    "@context": SCHEMA_CONTEXT,
    "@type": "LocalBusiness",
    name: businessName,
    url: input.url,
    description: input.content.slice(0, 200).trim(),
  };

  const address = meta(input, "business_address");
  if (address) {
    jsonLd.address = {
      "@type": "PostalAddress",
      streetAddress: address,
    };
  } else {
    notes.push("No business address provided -- a physical address is required for LocalBusiness schema.");
  }

  const phone = meta(input, "business_phone");
  if (phone) {
    jsonLd.telephone = phone;
  } else {
    notes.push("No business phone provided -- adding a phone number improves local search visibility.");
  }

  const image = meta(input, "featured_image");
  if (image) {
    jsonLd.image = image;
  }

  return {
    type: "LocalBusiness",
    json_ld: jsonLd,
    json_ld_string: wrapJsonLd(jsonLd),
    confidence,
    notes,
  };
}

/* ------------------------------------------------------------------ */
/*  Main entry point                                                   */
/* ------------------------------------------------------------------ */

/**
 * Generate one or more JSON-LD schema objects for a given page.
 *
 * The function resolves the content type (either from the explicit request
 * field or via AI auto-detection), builds the primary schema for that type,
 * and -- when the primary type is not Article -- appends a fallback Article
 * schema so there is always at least one Article markup present.
 */
export async function generateSchemas(
  input: SchemaGenerateRequest,
): Promise<SchemaGenerateResponse> {
  // 1. Resolve content type ------------------------------------------------
  const isAutoDetected = !input.content_type || input.content_type === "auto";

  let resolvedType: ResolvedContentType;

  if (isAutoDetected) {
    resolvedType = await detectContentType(input.content, input.title);
  } else {
    resolvedType = input.content_type as ResolvedContentType;
  }

  const primaryConfidence = isAutoDetected
    ? AUTO_DETECTED_CONFIDENCE
    : EXPLICIT_CONFIDENCE;

  // 2. Build the primary schema -------------------------------------------
  const schemas: SchemaEntry[] = [];

  switch (resolvedType) {
    case "faq": {
      schemas.push(await buildFAQSchema(input, primaryConfidence));
      break;
    }
    case "howto": {
      schemas.push(await buildHowToSchema(input, primaryConfidence));
      break;
    }
    case "product": {
      schemas.push(buildProductSchema(input, primaryConfidence));
      break;
    }
    case "local_business": {
      schemas.push(buildLocalBusinessSchema(input, primaryConfidence));
      break;
    }
    case "article": {
      schemas.push(buildArticleSchema(input, primaryConfidence));
      break;
    }
    default: {
      // Exhaustiveness guard -- treat any unknown type as article.
      const _exhaustive: never = resolvedType;
      void _exhaustive;
      schemas.push(buildArticleSchema(input, primaryConfidence));
    }
  }

  // 3. Append fallback Article when the primary type differs ---------------
  if (resolvedType !== "article") {
    const fallback = buildArticleSchema(input, FALLBACK_CONFIDENCE);
    fallback.notes.push("Fallback Article schema included alongside the primary schema.");
    schemas.push(fallback);
  }

  // 4. Return response -----------------------------------------------------
  return {
    schemas: schemas.map((s) => ({
      type: s.type,
      json_ld: s.json_ld,
      json_ld_string: s.json_ld_string,
      confidence: s.confidence,
      notes: s.notes,
    })),
    detected_type: resolvedType,
    generated_at: new Date().toISOString(),
  };
}
