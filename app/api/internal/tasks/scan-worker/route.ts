import { NextResponse } from "next/server";
import { getFirestore } from "@/lib/gcp/firestore";
import { z } from "zod";
import { queryOpenAI, type AIQueryResult } from "@/lib/ai/openai-client";

const PayloadZ = z.object({
    scan_id: z.string(),
});

export async function POST(req: Request) {
    const secret = req.headers.get("X-Task-Secret");
    if (secret !== process.env.TASK_SECRET) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    let body;
    try {
        body = await req.json();
    } catch {
        return new NextResponse("Invalid JSON", { status: 400 });
    }

    const parsed = PayloadZ.safeParse(body);
    if (!parsed.success) {
        return new NextResponse("Invalid Payload", { status: 400 });
    }

    const { scan_id } = parsed.data;
    const db = getFirestore();

    try {
        // Fetch the scan document
        const scanRef = db.collection("scans").doc(scan_id);
        const scanSnap = await scanRef.get();

        if (!scanSnap.exists) {
            return new NextResponse("Scan not found", { status: 404 });
        }

        const scanData = scanSnap.data() as {
            brand: { id: string; name: string; domain?: string | null; aliases?: string[] };
            market: { location: string; radius_miles?: number };
            category: string;
            intents: Array<{ text: string; funnel_stage?: string }>;
            providers: string[];
            competitors: Array<{ name: string; domain?: string | null }>;
        };

        // Update status to running
        await scanRef.update({
            status: "running",
            started_at: new Date().toISOString(),
        });

        console.log(`[scan-worker] Starting scan for brand: ${scanData.brand.name}`);

        // Query AI for each intent in parallel
        console.log(`[scan-worker] Querying ${scanData.intents.length} intents in parallel`);

        const intentResults = await Promise.all(scanData.intents.map(async (intent, index) => {
            console.log(`[scan-worker] Starting intent: "${intent.text}"`);
            try {
                const result = await queryOpenAI(
                    intent.text,
                    scanData.brand.name,
                    scanData.brand.aliases || [],
                    scanData.market,
                    scanData.category
                );

                // Create mention record for the brand
                const mention = {
                    subject: scanData.brand.name,
                    provider: result.provider,
                    intent_text: intent.text,
                    presence: result.brandPresence,
                    rank_bucket: result.position ? `top_${Math.min(result.position, 10)}` : null,
                    confidence: result.brandPresence === "not_mentioned" ? 0.9 : 0.85,
                    evidence: result.response
                        ? [{ type: "snippet", excerpt: result.response.slice(0, 500) }]
                        : [],
                };

                // Store brand mention in sub-collection
                await scanRef.collection("mentions").add(mention);

                // Update status detail periodically
                if ((index + 1) % 2 === 0 || index === scanData.intents.length - 1) {
                    await scanRef.update({
                        status_detail: `Processed ${index + 1} of ${scanData.intents.length} intents...`
                    });
                }

                return { result, mention };
            } catch (intentError) {
                console.error(`[scan-worker] Error querying intent "${intent.text}":`, intentError);
                return null;
            }
        }));

        const completedIntents = intentResults.filter(Boolean) as Array<{ result: AIQueryResult, mention: any }>;
        const allResults = completedIntents.map(c => c.result);
        const mentions = completedIntents.map(c => c.mention);

        console.log(`[scan-worker] Completed ${allResults.length} queries, found ${mentions.length} mentions`);

        // Generate and store scores
        const scores = generateScores(scanData, allResults, mentions);
        await db.collection("scan_scores").doc(scan_id).set(scores);

        // Generate and store competitor winners
        const winnersData = generateCompetitorWinners(scan_id, scanData.intents, allResults, scanData.brand.name);
        await db.collection("scan_winners").doc(scan_id).set(winnersData);

        // Generate and store diagnostics
        const diagnostics = generateDiagnostics(scan_id, scanData.brand.name, allResults, mentions);
        await db.collection("scan_diagnostics").doc(scan_id).set(diagnostics);

        // Generate action plan
        const actionPlan = generateActionPlan(scan_id, scanData.brand.name, diagnostics, scores);
        const planId = `plan_${scan_id}_increase_mentions_30`;
        await db.collection("scan_action_plans").doc(planId).set(actionPlan);

        // Update scan as completed with mentions array
        await scanRef.update({
            status: "succeeded",
            status_detail: "Analysis complete",
            completed_at: new Date().toISOString(),
            mentions: mentions,
        });

        console.log(`[scan-worker] Scan ${scan_id} completed successfully`);

        return new NextResponse("OK");
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        console.error("Scan worker error:", err);
        await db.collection("scans").doc(scan_id).update({
            status: "failed",
            error: errorMessage,
        });
        return new NextResponse(`Internal Error: ${errorMessage}`, { status: 500 });
    }
}

/**
 * Generate visibility scores from AI query results
 */
function generateScores(
    scanData: {
        brand: { id: string; name: string };
        intents: Array<{ text: string; funnel_stage?: string }>;
    },
    results: AIQueryResult[],
    mentions: Array<{ presence: string; intent_text: string }>
): {
    scan_id: string;
    brand: string;
    visibility_score: number;
    share_of_voice: number;
    by_intent: Array<{ intent: string; score: number; sov: number; drivers: string[] }>;
    top_competitors: Array<{ name: string; visibility_score: number; share_of_voice: number }>;
    breakdown: null;
} {
    // Calculate scores per intent
    const byIntent = scanData.intents.map((intent) => {
        const intentMentions = mentions.filter((m) => m.intent_text === intent.text);
        const topMentions = intentMentions.filter((m) => m.presence === "recommended_top").length;
        const anyMentions = intentMentions.filter((m) => m.presence !== "not_mentioned").length;
        const totalQueries = intentMentions.length || 1;

        // Score: 100 if recommended_top, 50 if mentioned, 0 if not_mentioned
        const score = Math.round(((topMentions * 100 + (anyMentions - topMentions) * 50) / totalQueries));
        const sov = anyMentions / totalQueries;

        const drivers: string[] = [];
        if (topMentions > 0) drivers.push("Top recommendation in AI responses");
        if (anyMentions > topMentions) drivers.push("Mentioned in AI responses");
        if (anyMentions === 0) drivers.push("Not appearing in AI responses for this intent");

        return { intent: intent.text, score, sov, drivers };
    });

    // Overall scores
    const avgScore = byIntent.length > 0
        ? Math.round(byIntent.reduce((sum, i) => sum + i.score, 0) / byIntent.length)
        : 0;
    const avgSov = byIntent.length > 0
        ? byIntent.reduce((sum, i) => sum + i.sov, 0) / byIntent.length
        : 0;

    // Extract top competitors from results
    const competitorCounts = new Map<string, { mentions: number; topMentions: number }>();
    for (const result of results) {
        for (let i = 0; i < result.mentionedBrands.length; i++) {
            const name = result.mentionedBrands[i];
            if (name.toLowerCase() === scanData.brand.name.toLowerCase()) continue;

            const existing = competitorCounts.get(name) || { mentions: 0, topMentions: 0 };
            existing.mentions++;
            if (i < 3) existing.topMentions++;
            competitorCounts.set(name, existing);
        }
    }

    const topCompetitors = Array.from(competitorCounts.entries())
        .map(([name, stats]) => ({
            name,
            visibility_score: Math.round((stats.topMentions * 100 + (stats.mentions - stats.topMentions) * 50) / results.length),
            share_of_voice: stats.mentions / results.length,
        }))
        .sort((a, b) => b.visibility_score - a.visibility_score)
        .slice(0, 5);

    return {
        scan_id: scanData.brand.id,
        brand: scanData.brand.name,
        visibility_score: avgScore,
        share_of_voice: avgSov,
        by_intent: byIntent,
        top_competitors: topCompetitors,
        breakdown: null,
    };
}

/**
 * Generate competitor winners data
 */
function generateCompetitorWinners(
    scanId: string,
    intents: Array<{ text: string }>,
    results: AIQueryResult[],
    brandName: string
): {
    scan_id: string;
    winners_by_intent: Array<{
        intent: string;
        winners: Array<{ name: string; mention_rate: number; evidence: never[] }>;
    }>;
} {
    const winnersByIntent = intents.map((intent) => {
        const intentResults = results.filter((r) => r.intent === intent.text);
        const totalResults = intentResults.length || 1;

        // Count mentions per brand for this intent
        const brandCounts = new Map<string, number>();
        for (const result of intentResults) {
            for (const mentioned of result.mentionedBrands) {
                const count = brandCounts.get(mentioned) || 0;
                brandCounts.set(mentioned, count + 1);
            }
        }

        // Add brand if mentioned
        const brandMention = intentResults.find(
            (r) => r.brandPresence !== "not_mentioned"
        );
        if (brandMention) {
            const count = brandCounts.get(brandName) || 0;
            brandCounts.set(brandName, count + 1);
        }

        const winners = Array.from(brandCounts.entries())
            .map(([name, count]) => ({
                name,
                mention_rate: count / totalResults,
                evidence: [] as never[],
            }))
            .sort((a, b) => b.mention_rate - a.mention_rate)
            .slice(0, 5);

        return { intent: intent.text, winners };
    });

    return { scan_id: scanId, winners_by_intent: winnersByIntent };
}

/**
 * Generate diagnostics from scan results
 */
function generateDiagnostics(
    scanId: string,
    brandName: string,
    results: AIQueryResult[],
    mentions: Array<{ presence: string; intent_text: string }>
): {
    scan_id: string;
    brand: string;
    gaps: Array<{
        type: string;
        severity: string;
        impact: string;
        affected_intents: string[];
        competitor_examples: string[];
        evidence: never[];
        recommended_actions: string[];
    }>;
} {
    const gaps: Array<{
        type: string;
        severity: string;
        impact: string;
        affected_intents: string[];
        competitor_examples: string[];
        evidence: never[];
        recommended_actions: string[];
    }> = [];

    // Find intents where brand is not mentioned
    const notMentionedIntents = mentions
        .filter((m) => m.presence === "not_mentioned")
        .map((m) => m.intent_text);

    if (notMentionedIntents.length > 0) {
        gaps.push({
            type: "coverage_gap",
            severity: notMentionedIntents.length > 2 ? "high" : "medium",
            impact: `${brandName} is not appearing in AI responses for ${notMentionedIntents.length} search intent(s)`,
            affected_intents: notMentionedIntents,
            competitor_examples: extractTopCompetitors(results, brandName, 3),
            evidence: [],
            recommended_actions: [
                "Create dedicated content pages targeting these intents",
                "Optimize existing pages with relevant keywords and entities",
                "Build authoritative backlinks from industry sources",
            ],
        });
    }

    // Find intents where brand is mentioned but not top
    const mentionedNotTopIntents = mentions
        .filter((m) => m.presence === "mentioned")
        .map((m) => m.intent_text);

    if (mentionedNotTopIntents.length > 0) {
        gaps.push({
            type: "entity_clarity_gap",
            severity: "medium",
            impact: `${brandName} is mentioned but not recommended as a top choice for ${mentionedNotTopIntents.length} intent(s)`,
            affected_intents: mentionedNotTopIntents,
            competitor_examples: extractTopCompetitors(results, brandName, 3),
            evidence: [],
            recommended_actions: [
                "Add structured data (Schema.org) to clarify entity relationships",
                "Create comparison content showcasing unique value propositions",
                "Gather and highlight customer reviews and testimonials",
            ],
        });
    }

    // Check for citation gaps
    const totalQueries = results.length;
    const topMentions = mentions.filter((m) => m.presence === "recommended_top").length;

    if (topMentions < totalQueries * 0.3) {
        gaps.push({
            type: "citation_gap",
            severity: topMentions === 0 ? "high" : "medium",
            impact: "Limited citations and references from authoritative sources",
            affected_intents: mentions.map((m) => m.intent_text),
            competitor_examples: [],
            evidence: [],
            recommended_actions: [
                "Get listed on industry directories and review sites",
                "Pursue PR mentions and guest posts on authoritative sites",
                "Create quotable content that AI models can reference",
            ],
        });
    }

    return { scan_id: scanId, brand: brandName, gaps };
}

/**
 * Extract top competitor names from results
 */
function extractTopCompetitors(results: AIQueryResult[], brandName: string, limit: number): string[] {
    const counts = new Map<string, number>();
    for (const result of results) {
        for (const name of result.mentionedBrands) {
            if (name.toLowerCase() !== brandName.toLowerCase()) {
                counts.set(name, (counts.get(name) || 0) + 1);
            }
        }
    }
    return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([name]) => name);
}

/**
 * Generate action plan recommendations
 */
function generateActionPlan(
    scanId: string,
    brandName: string,
    diagnostics: { gaps: Array<{ type: string; severity: string; affected_intents: string[] }> },
    scores: { visibility_score: number; share_of_voice: number }
): {
    scan_id: string;
    brand: string;
    priorities: Array<{
        priority: number;
        action: string;
        why: string;
        estimated_lift: { visibility_score_delta: number; share_of_voice_delta: number | null };
        effort: string;
        tasks: string[];
        affected_intents: string[];
        evidence: never[];
    }>;
} {
    const priorities: Array<{
        priority: number;
        action: string;
        why: string;
        estimated_lift: { visibility_score_delta: number; share_of_voice_delta: number | null };
        effort: string;
        tasks: string[];
        affected_intents: string[];
        evidence: never[];
    }> = [];

    let priorityNum = 1;

    // Generate actions based on gaps
    for (const gap of diagnostics.gaps) {
        if (gap.type === "coverage_gap") {
            priorities.push({
                priority: priorityNum++,
                action: "Create targeted content for missing intents",
                why: `AI models are not finding ${brandName} for these search queries`,
                estimated_lift: {
                    visibility_score_delta: Math.min(20, 100 - scores.visibility_score),
                    share_of_voice_delta: 0.1,
                },
                effort: "medium",
                tasks: [
                    "Research top-ranking content for each missing intent",
                    "Create comprehensive guides or landing pages",
                    "Optimize for featured snippets and FAQ content",
                    "Build internal links to new content",
                ],
                affected_intents: gap.affected_intents,
                evidence: [],
            });
        }

        if (gap.type === "entity_clarity_gap") {
            priorities.push({
                priority: priorityNum++,
                action: "Improve entity recognition and brand authority",
                why: `${brandName} is being mentioned but not recommended as a top choice`,
                estimated_lift: {
                    visibility_score_delta: 15,
                    share_of_voice_delta: 0.08,
                },
                effort: "medium",
                tasks: [
                    "Add Organization and LocalBusiness schema markup",
                    "Create About and Team pages with proper entity connections",
                    "Build Wikipedia/Wikidata presence if applicable",
                    "Get mentions on authoritative industry resources",
                ],
                affected_intents: gap.affected_intents,
                evidence: [],
            });
        }

        if (gap.type === "citation_gap") {
            priorities.push({
                priority: priorityNum++,
                action: "Build authoritative citations and references",
                why: "AI models rely on citations from trusted sources when making recommendations",
                estimated_lift: {
                    visibility_score_delta: 10,
                    share_of_voice_delta: 0.05,
                },
                effort: "high",
                tasks: [
                    "Get listed on industry directories (Capterra, G2, etc.)",
                    "Pursue guest posts on industry publications",
                    "Encourage customer reviews on Google and industry sites",
                    "Create research reports or data studies that get cited",
                ],
                affected_intents: gap.affected_intents,
                evidence: [],
            });
        }
    }

    // Add a quick win if score is low
    if (scores.visibility_score < 50) {
        priorities.push({
            priority: priorityNum++,
            action: "Add FAQ schema to key pages",
            why: "AI models frequently pull answers from FAQ content",
            estimated_lift: {
                visibility_score_delta: 5,
                share_of_voice_delta: null,
            },
            effort: "low",
            tasks: [
                "Identify top 5 questions your customers ask",
                "Add FAQ sections to relevant pages",
                "Implement FAQPage schema markup",
                "Test with Google's Rich Results tester",
            ],
            affected_intents: [],
            evidence: [],
        });
    }

    return { scan_id: scanId, brand: brandName, priorities };
}
