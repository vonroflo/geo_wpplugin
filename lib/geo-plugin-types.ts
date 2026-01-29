// /lib/geo-plugin-types.ts
// Type definitions for the WordPress GEO Plugin API

export type SchemaType = "FAQPage" | "HowTo" | "Article" | "Product" | "LocalBusiness";
export type ContentType = "article" | "product" | "faq" | "howto" | "local_business" | "auto";
export type Grade = "A" | "B" | "C" | "D" | "F";
export type Impact = "high" | "medium" | "low";
export type Effort = "quick_win" | "moderate" | "significant";
export type RecommendationCategory = "schema" | "entity" | "readability" | "structure" | "authority";
export type EntityStatus = "found" | "missing" | "weak";
export type ValidationSeverity = "error" | "warning" | "info";
