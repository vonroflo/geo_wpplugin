// /lib/ai/geo-plugin-ai.ts
// OpenAI prompt functions for the GEO Plugin content analysis

import { getOpenAIClient, getOpenAIModel } from "./openai-client";

/**
 * Detect content type from page content and title
 */
export async function detectContentType(
    content: string,
    title: string
): Promise<"article" | "product" | "faq" | "howto" | "local_business"> {
    const client = getOpenAIClient();
    const model = getOpenAIModel();

    const response = await client.chat.completions.create({
        model,
        messages: [
            {
                role: "system",
                content: `You classify web page content into one of these types: article, product, faq, howto, local_business.

Rules:
- "faq" if the content primarily contains questions and answers
- "howto" if the content describes step-by-step instructions or a process
- "product" if it describes a product with features, pricing, or specifications
- "local_business" if it describes a local business with address, hours, or services
- "article" for general informational content, blog posts, news

Respond with ONLY the type name, nothing else.`,
            },
            {
                role: "user",
                content: `Title: ${title}\n\nContent (first 2000 chars): ${content.slice(0, 2000)}`,
            },
        ],
        temperature: 0,
        max_tokens: 20,
    });

    const detected = (response.choices[0]?.message?.content || "article").trim().toLowerCase();
    const valid = ["article", "product", "faq", "howto", "local_business"];
    return (valid.includes(detected) ? detected : "article") as "article" | "product" | "faq" | "howto" | "local_business";
}

/**
 * Extract FAQ question-answer pairs from content
 */
export async function extractFAQs(
    content: string,
    title: string
): Promise<Array<{ question: string; answer: string }>> {
    const client = getOpenAIClient();
    const model = getOpenAIModel();

    const response = await client.chat.completions.create({
        model,
        messages: [
            {
                role: "system",
                content: `Extract FAQ question-answer pairs from the given content. If the content contains explicit Q&A sections, extract those. If not, identify the key questions the content implicitly answers and formulate clear Q&A pairs.

Return a JSON array of objects with "question" and "answer" fields. Extract 3-8 pairs. Keep answers concise (1-3 sentences). Return ONLY valid JSON, no markdown.`,
            },
            {
                role: "user",
                content: `Title: ${title}\n\nContent:\n${content.slice(0, 4000)}`,
            },
        ],
        temperature: 0,
        max_tokens: 2000,
    });

    const text = response.choices[0]?.message?.content || "[]";
    try {
        const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        return JSON.parse(cleaned);
    } catch {
        return [];
    }
}

/**
 * Extract HowTo steps from content
 */
export async function extractHowToSteps(
    content: string,
    title: string
): Promise<{ name: string; description: string; steps: Array<{ name: string; text: string }> }> {
    const client = getOpenAIClient();
    const model = getOpenAIModel();

    const response = await client.chat.completions.create({
        model,
        messages: [
            {
                role: "system",
                content: `Extract a HowTo structure from the content. Identify:
1. A short name/title for the how-to
2. A brief description
3. Ordered steps with a short step name and step text

Return JSON with fields: "name" (string), "description" (string), "steps" (array of {name, text}).
Extract 3-10 steps. Return ONLY valid JSON, no markdown.`,
            },
            {
                role: "user",
                content: `Title: ${title}\n\nContent:\n${content.slice(0, 4000)}`,
            },
        ],
        temperature: 0,
        max_tokens: 2000,
    });

    const text = response.choices[0]?.message?.content || "{}";
    try {
        const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        return JSON.parse(cleaned);
    } catch {
        return { name: title, description: "", steps: [] };
    }
}

/**
 * Analyze content for entities, keywords, and optimization opportunities
 */
export async function analyzeContentEntities(
    content: string,
    title: string
): Promise<{
    entities: Array<{ name: string; type: string; status: "found" | "missing" | "weak"; suggestions: string[] }>;
    keywords: { primary: string[]; secondary: string[]; missing: string[] };
    about_suggestions: string[];
}> {
    const client = getOpenAIClient();
    const model = getOpenAIModel();

    const response = await client.chat.completions.create({
        model,
        messages: [
            {
                role: "system",
                content: `Analyze the web page content for entity optimization. Return JSON with:

1. "entities": Array of entities found or that should be present. Each has:
   - "name": entity name
   - "type": Schema.org type (Organization, Person, Product, Place, Event, etc.)
   - "status": "found" (clearly defined), "weak" (mentioned but not well-defined), "missing" (should be present but isn't)
   - "suggestions": array of improvement suggestions

2. "keywords": Object with:
   - "primary": top 3-5 keywords the content targets
   - "secondary": 3-5 related keywords present
   - "missing": 3-5 important keywords that should be added

3. "about_suggestions": 3-5 topic/category suggestions for schema "about" property

Return ONLY valid JSON, no markdown.`,
            },
            {
                role: "user",
                content: `Title: ${title}\n\nContent:\n${content.slice(0, 4000)}`,
            },
        ],
        temperature: 0,
        max_tokens: 2000,
    });

    const text = response.choices[0]?.message?.content || "{}";
    try {
        const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        return JSON.parse(cleaned);
    } catch {
        return { entities: [], keywords: { primary: [], secondary: [], missing: [] }, about_suggestions: [] };
    }
}

/**
 * Analyze content for AI readability and quotability
 */
export async function analyzeContentReadability(
    content: string,
    title: string,
    headings?: string[]
): Promise<{
    strengths: string[];
    weaknesses: string[];
    ai_snippet_candidates: Array<{ text: string; reason: string }>;
    missing_elements: string[];
}> {
    const client = getOpenAIClient();
    const model = getOpenAIModel();

    const headingsInfo = headings?.length ? `\n\nHeadings found: ${headings.join(", ")}` : "";

    const response = await client.chat.completions.create({
        model,
        messages: [
            {
                role: "system",
                content: `Analyze web content for AI search engine readability. AI models (ChatGPT, Google SGE, Perplexity) prefer content that is:
- Clear, factual, and concise
- Well-structured with headings and lists
- Contains direct answers to common questions
- Has authoritative signals (data, citations, expertise)
- Uses quotable sentence structures

Return JSON with:
1. "strengths": 2-4 things the content does well for AI readability
2. "weaknesses": 2-4 areas that need improvement
3. "ai_snippet_candidates": 2-3 sentences from the content that AI would likely quote, each with "text" and "reason"
4. "missing_elements": 3-5 elements that would improve AI visibility (e.g., "FAQ section", "structured data", "comparison table")

Return ONLY valid JSON, no markdown.`,
            },
            {
                role: "user",
                content: `Title: ${title}${headingsInfo}\n\nContent:\n${content.slice(0, 4000)}`,
            },
        ],
        temperature: 0,
        max_tokens: 1500,
    });

    const text = response.choices[0]?.message?.content || "{}";
    try {
        const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        return JSON.parse(cleaned);
    } catch {
        return { strengths: [], weaknesses: [], ai_snippet_candidates: [], missing_elements: [] };
    }
}
