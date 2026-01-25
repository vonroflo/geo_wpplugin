// /lib/ai/openai-client.ts
// OpenAI client for AI visibility scanning

import OpenAI from "openai";

// Singleton pattern for OpenAI client
const globalForOpenAI = globalThis as unknown as {
    _openaiClient: OpenAI | undefined;
};

export function getOpenAIClient(): OpenAI {
    if (globalForOpenAI._openaiClient) {
        return globalForOpenAI._openaiClient;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("Missing OPENAI_API_KEY environment variable");
    }

    globalForOpenAI._openaiClient = new OpenAI({ apiKey });
    return globalForOpenAI._openaiClient;
}

export function getOpenAIModel(): string {
    return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

export interface AIQueryResult {
    provider: "chatgpt" | "gemini" | "perplexity" | "claude";
    intent: string;
    response: string;
    mentionedBrands: string[];
    brandPresence: "recommended_top" | "mentioned" | "not_mentioned";
    position?: number; // 1-based position if mentioned
}

// Common words that are NOT business names
const NON_BUSINESS_WORDS = new Set([
    "phone",
    "website",
    "services",
    "service",
    "address",
    "hours",
    "location",
    "contact",
    "email",
    "call",
    "visit",
    "about",
    "home",
    "reviews",
    "rating",
    "ratings",
    "price",
    "prices",
    "pricing",
    "cost",
    "costs",
    "free",
    "available",
    "open",
    "closed",
    "hours",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
    "offers",
    "known for",
    "known for on",
    "specializes",
    "provides",
    "features",
    "includes",
    "benefits",
    "pros",
    "cons",
    "summary",
    "overview",
    "conclusion",
    "note",
    "important",
    "tip",
    "tips",
    "warning",
    "disclaimer",
    "nationwide company with local",
    "offers emergency plumbing repairs anytime",
]);

// Business name indicators (words that suggest it's a company name)
const BUSINESS_INDICATORS = [
    "plumbing",
    "plumber",
    "rooter",
    "services",
    "service",
    "company",
    "inc",
    "llc",
    "corp",
    "co",
    "group",
    "solutions",
    "pros",
    "pro",
    "experts",
    "expert",
    "specialists",
    "heating",
    "cooling",
    "hvac",
    "electric",
    "repair",
    "restoration",
    "construction",
];

/**
 * Query OpenAI (ChatGPT) with a search intent and analyze the response
 */
export async function queryOpenAI(
    intent: string,
    brandName: string,
    brandAliases: string[],
    market: { location: string; radius_miles?: number },
    category: string
): Promise<AIQueryResult> {
    const client = getOpenAIClient();
    const model = getOpenAIModel();

    // Build a realistic search query based on intent and market
    const locationContext = market.location ? ` in ${market.location}` : "";
    const prompt = `${intent}${locationContext}`;

    try {
        const response = await client.chat.completions.create({
            model,
            messages: [
                {
                    role: "system",
                    content: `You are a helpful assistant providing recommendations for ${category}. When asked about services or products, provide specific business name recommendations. List businesses by name with brief descriptions. Format each recommendation as "**Business Name** - description".`,
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
            temperature: 0.7,
            max_tokens: 1000,
        });

        const responseText = response.choices[0]?.message?.content || "";

        console.log(`[OpenAI] Response for "${intent}":\n${responseText.slice(0, 500)}...`);

        // Analyze response for brand mentions
        const { mentionedBrands, brandPresence, position } = analyzeMentions(
            responseText,
            brandName,
            brandAliases,
            category
        );

        console.log(`[OpenAI] Brand "${brandName}" presence: ${brandPresence}, position: ${position}`);
        console.log(`[OpenAI] Mentioned brands: ${mentionedBrands.join(", ")}`);

        return {
            provider: "chatgpt",
            intent,
            response: responseText,
            mentionedBrands,
            brandPresence,
            position,
        };
    } catch (error) {
        console.error("OpenAI query error:", error);
        return {
            provider: "chatgpt",
            intent,
            response: "",
            mentionedBrands: [],
            brandPresence: "not_mentioned",
        };
    }
}

/**
 * Check if a string looks like a business name
 */
function isLikelyBusinessName(name: string, category: string): boolean {
    const nameLower = name.toLowerCase().trim();

    // Filter out single common words
    if (NON_BUSINESS_WORDS.has(nameLower)) {
        return false;
    }

    // Filter out very short names (likely not a business)
    if (name.length < 3) {
        return false;
    }

    // Filter out names that start with common non-business phrases
    const nonBusinessPrefixes = [
        "offers ",
        "known for",
        "provides ",
        "available ",
        "open ",
        "call ",
        "visit ",
        "contact ",
        "nationwide ",
        "local ",
    ];
    for (const prefix of nonBusinessPrefixes) {
        if (nameLower.startsWith(prefix)) {
            return false;
        }
    }

    // Multi-word names are more likely to be businesses
    const words = name.split(/\s+/);
    if (words.length >= 2) {
        // Check if it contains business indicators
        for (const indicator of BUSINESS_INDICATORS) {
            if (nameLower.includes(indicator)) {
                return true;
            }
        }
        // Multi-word names starting with capital letter are likely businesses
        if (/^[A-Z]/.test(name)) {
            return true;
        }
    }

    // Single word names need to have business indicators or category terms
    const categoryLower = category.toLowerCase();
    if (nameLower.includes(categoryLower) || categoryLower.includes(nameLower)) {
        return false; // Generic category word, not a business name
    }

    // Check for business indicators in single-word names
    for (const indicator of BUSINESS_INDICATORS) {
        if (nameLower.includes(indicator)) {
            return true;
        }
    }

    // Proper nouns (capitalized) that are multi-word are more likely businesses
    if (words.length >= 2 && words.every((w) => /^[A-Z]/.test(w))) {
        return true;
    }

    return false;
}

/**
 * Analyze AI response text to find brand mentions
 */
function analyzeMentions(
    responseText: string,
    brandName: string,
    brandAliases: string[],
    category: string
): {
    mentionedBrands: string[];
    brandPresence: "recommended_top" | "mentioned" | "not_mentioned";
    position?: number;
} {
    const textLower = responseText.toLowerCase();
    const brandLower = brandName.toLowerCase();
    const aliasesLower = brandAliases.map((a) => a.toLowerCase());

    // Check if brand is mentioned anywhere in response
    const isBrandMentioned =
        textLower.includes(brandLower) ||
        aliasesLower.some((alias) => alias.length > 2 && textLower.includes(alias));

    // Extract all mentioned business names
    const mentionedBrands: string[] = [];
    const seenNames = new Set<string>();

    // Pattern 1: **Business Name** format (markdown bold)
    const boldPattern = /\*\*([A-Z][A-Za-z0-9\s&'.-]+?)\*\*/g;
    let match;
    while ((match = boldPattern.exec(responseText)) !== null) {
        const name = match[1].trim();
        const nameLower = name.toLowerCase();
        if (!seenNames.has(nameLower) && isLikelyBusinessName(name, category)) {
            seenNames.add(nameLower);
            mentionedBrands.push(name);
        }
    }

    // Pattern 2: Numbered list items "1. Business Name" or "1) Business Name"
    const numberedPattern = /(?:^|\n)\s*\d+[\.\)]\s*\**([A-Z][A-Za-z0-9\s&'.-]+?)\**(?:\s*[-–:]|\s*\n|\s*$)/gm;
    while ((match = numberedPattern.exec(responseText)) !== null) {
        const name = match[1].trim().replace(/\*+/g, "");
        const nameLower = name.toLowerCase();
        if (!seenNames.has(nameLower) && isLikelyBusinessName(name, category)) {
            seenNames.add(nameLower);
            mentionedBrands.push(name);
        }
    }

    // Pattern 3: Bullet list items "- Business Name" or "• Business Name"
    const bulletPattern = /(?:^|\n)\s*[-•]\s*\**([A-Z][A-Za-z0-9\s&'.-]+?)\**(?:\s*[-–:]|\s*\n|\s*$)/gm;
    while ((match = bulletPattern.exec(responseText)) !== null) {
        const name = match[1].trim().replace(/\*+/g, "");
        const nameLower = name.toLowerCase();
        if (!seenNames.has(nameLower) && isLikelyBusinessName(name, category)) {
            seenNames.add(nameLower);
            mentionedBrands.push(name);
        }
    }

    // Determine position of brand in the list
    let position: number | undefined;
    if (isBrandMentioned) {
        for (let i = 0; i < mentionedBrands.length; i++) {
            const mentioned = mentionedBrands[i].toLowerCase();
            if (
                mentioned.includes(brandLower) ||
                brandLower.includes(mentioned) ||
                aliasesLower.some((alias) => mentioned.includes(alias) || alias.includes(mentioned))
            ) {
                position = i + 1;
                break;
            }
        }

        // If brand is mentioned but not in extracted list, check raw text position
        if (position === undefined) {
            // Find where in the response the brand first appears
            const brandIndex = textLower.indexOf(brandLower);
            if (brandIndex !== -1) {
                // Count how many list items appear before this position
                const textBefore = responseText.slice(0, brandIndex);
                const listItemsBefore = (textBefore.match(/(?:^|\n)\s*(?:\d+[\.\)]|[-•])\s*/g) || []).length;
                position = listItemsBefore + 1;
            }
        }
    }

    // Determine brand presence level
    let brandPresence: "recommended_top" | "mentioned" | "not_mentioned";
    if (!isBrandMentioned) {
        brandPresence = "not_mentioned";
    } else if (position !== undefined && position <= 3) {
        brandPresence = "recommended_top";
    } else if (position !== undefined) {
        brandPresence = "mentioned";
    } else {
        // Brand found in text but position unclear - count as mentioned
        brandPresence = "mentioned";
    }

    return { mentionedBrands, brandPresence, position };
}

/**
 * Extract competitor names from AI response
 */
export function extractCompetitors(
    responses: AIQueryResult[],
    brandName: string
): Array<{ name: string; mentionCount: number }> {
    const competitorCounts = new Map<string, number>();
    const brandLower = brandName.toLowerCase();

    for (const result of responses) {
        for (const mentioned of result.mentionedBrands) {
            const mentionedLower = mentioned.toLowerCase();
            // Skip if it's the target brand
            if (mentionedLower.includes(brandLower) || brandLower.includes(mentionedLower)) {
                continue;
            }

            const count = competitorCounts.get(mentioned) || 0;
            competitorCounts.set(mentioned, count + 1);
        }
    }

    return Array.from(competitorCounts.entries())
        .map(([name, mentionCount]) => ({ name, mentionCount }))
        .sort((a, b) => b.mentionCount - a.mentionCount)
        .slice(0, 10); // Top 10 competitors
}
