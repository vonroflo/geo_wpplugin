// /lib/insights-service.ts
// Orchestration service that composes atomic services into unified insights

import {
    createBrandService,
    getBrandService,
    createScanService,
    getScanService,
    getScoresService,
    getCompetitorWinnersService,
    getDiagnosticsService,
    getActionPlanService,
} from "./geo-services";

import {
    createRun,
    getRun,
    updateRun,
    type InsightRun,
    type InsightRunInput,
    type InsightRunResult,
} from "./insights-store";

/**
 * Check if running in mock mode (no Firestore needed)
 */
function isMockMode(): boolean {
    return process.env.MOCK_MODE === "true";
}

/**
 * Generate mock result data for testing
 */
function generateMockResult(input: InsightRunInput): InsightRunResult {
    const brandId = `brand_mock_${Date.now()}`;
    const scanId = `scan_mock_${Date.now()}`;

    return {
        brand: {
            id: brandId,
            name: input.brand.name,
            domain: input.brand.domain ?? null,
        },
        scan: {
            id: scanId,
            status: "succeeded",
            created_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
        },
        scores: {
            visibility_score: Math.floor(Math.random() * 40) + 30, // 30-70
            share_of_voice: Math.random() * 0.3 + 0.1, // 0.1-0.4
            by_intent: input.intents.map((intent) => ({
                intent: intent.text,
                score: Math.floor(Math.random() * 50) + 25,
                sov: Math.random() * 0.4 + 0.05,
            })),
        },
        mentions: input.intents.flatMap((intent) => [
            {
                subject: input.brand.name,
                provider: "chatgpt",
                intent_text: intent.text,
                presence: Math.random() > 0.5 ? "mentioned" : "not_mentioned",
            },
            {
                subject: input.brand.name,
                provider: "gemini",
                intent_text: intent.text,
                presence: Math.random() > 0.6 ? "recommended_top" : "mentioned",
            },
        ]),
        competitors: {
            winners_by_intent: input.intents.map((intent) => ({
                intent: intent.text,
                winners: [
                    { name: "Competitor A", mention_rate: 0.7 },
                    { name: "Competitor B", mention_rate: 0.5 },
                    { name: input.brand.name, mention_rate: 0.3 },
                ],
            })),
        },
        diagnostics: {
            gaps: [
                {
                    type: "entity_clarity_gap",
                    severity: "medium",
                    impact: `${input.brand.name} is not strongly associated with ${input.category}`,
                    recommended_actions: [
                        "Create dedicated service pages for each offering",
                        "Add structured data markup (LocalBusiness schema)",
                        "Build topical authority through content",
                    ],
                },
                {
                    type: "citation_gap",
                    severity: "high",
                    impact: "Limited third-party citations and reviews",
                    recommended_actions: [
                        "Get listed on industry directories",
                        "Encourage customer reviews on Google",
                        "Pursue PR mentions and guest posts",
                    ],
                },
            ],
        },
        recommendations: {
            priorities: [
                {
                    priority: 1,
                    action: "Create location-specific landing pages",
                    why: "Competitors with local pages are getting 2x more mentions",
                    effort: "medium",
                },
                {
                    priority: 2,
                    action: "Add FAQ schema to key service pages",
                    why: "AI models frequently cite FAQ content in responses",
                    effort: "low",
                },
                {
                    priority: 3,
                    action: "Build comparison content",
                    why: "Users searching for comparisons often see competitors first",
                    effort: "medium",
                },
            ],
        },
    };
}

/**
 * Start a new insights run
 * Creates brand (if needed), starts scan, returns run_id for polling
 */
export async function startInsightRun(input: InsightRunInput): Promise<InsightRun> {
    // Create the run record (always use in-memory store)
    const run = createRun(input);

    // MOCK MODE: Skip Firestore, return immediately with mock data
    if (isMockMode()) {
        console.log("[MOCK MODE] Generating mock insights for:", input.brand.name);

        const mockResult = generateMockResult(input);

        updateRun(run.id, {
            brand_id: `brand_mock_${Date.now()}`,
            scan_id: `scan_mock_${Date.now()}`,
            status: "completed",
            result: mockResult,
        });

        return getRun(run.id)!;
    }

    // REAL MODE: Use Firestore
    try {
        // Step 1: Create or find brand
        const brand = await createBrandService({
            name: input.brand.name,
            domain: input.brand.domain ?? undefined,
            aliases: input.brand.aliases ?? [],
        });

        updateRun(run.id, { brand_id: brand.id });

        // Step 2: Start scan (this is async - enqueues to Cloud Tasks)
        const scanResult = await createScanService({
            brand: { brand_id: brand.id },
            market: {
                location: input.market.location,
                radius_miles: input.market.radius_miles,
            },
            category: input.category,
            intents: input.intents.map((i) => ({
                text: i.text,
                funnel_stage: (i.funnel_stage as "awareness" | "consideration" | "conversion") ?? "awareness",
            })),
            competitors: input.competitors ?? [],
            ai_sources: (input.ai_sources as Array<"chatgpt" | "gemini" | "perplexity" | "claude">) ?? [
                "chatgpt",
                "gemini",
                "perplexity",
            ],
        });

        updateRun(run.id, { scan_id: scanResult.scan_id });

        return getRun(run.id)!;
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error starting insight run";
        updateRun(run.id, {
            status: "failed",
            error: errorMessage,
        });
        return getRun(run.id)!;
    }
}

/**
 * Check status and gather results for an insight run
 * Call this to poll for completion
 */
export async function getInsightRunStatus(runId: string): Promise<InsightRun | null> {
    const run = getRun(runId);
    if (!run) return null;

    // Already completed or failed - return cached result
    if (run.status === "completed" || run.status === "failed") {
        return run;
    }

    // Increment poll count
    updateRun(runId, { poll_count: run.poll_count + 1 });

    // No scan_id yet - still initializing
    if (!run.scan_id) {
        return getRun(runId);
    }

    try {
        // Check scan status
        const scan = await getScanService(run.scan_id);
        if (!scan) {
            updateRun(runId, {
                status: "failed",
                error: "Scan not found",
            });
            return getRun(runId);
        }

        // Scan still running
        if (scan.status === "queued" || scan.status === "running") {
            return getRun(runId);
        }

        // Scan failed
        if (scan.status === "failed" || scan.status === "canceled") {
            updateRun(runId, {
                status: "failed",
                error: scan.error || "Scan failed",
            });
            return getRun(runId);
        }

        // Scan completed - gather all insights
        if (scan.status === "succeeded") {
            const result = await gatherInsights(run, scan);
            updateRun(runId, {
                status: "completed",
                result,
            });
            return getRun(runId);
        }

        return getRun(runId);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Error checking run status";
        updateRun(runId, {
            status: "failed",
            error: errorMessage,
        });
        return getRun(runId);
    }
}

/**
 * Gather all insights from a completed scan
 */
async function gatherInsights(run: InsightRun, scan: Awaited<ReturnType<typeof getScanService>>): Promise<InsightRunResult> {
    if (!scan) throw new Error("Scan is null");

    const scanId = run.scan_id!;
    const goal = (run.input.report_options?.goal as "increase_mentions" | "increase_top_recommendations" | "beat_competitor" | "improve_sov") ?? "increase_mentions";
    const timeHorizon = run.input.report_options?.time_horizon_days ?? 30;

    // Fetch all data in parallel (some may not exist yet)
    const [scores, competitors, diagnostics, recommendations] = await Promise.all([
        getScoresService(scanId).catch(() => null),
        getCompetitorWinnersService(scanId).catch(() => null),
        getDiagnosticsService(scanId).catch(() => null),
        getActionPlanService({ scan_id: scanId, goal, time_horizon_days: timeHorizon }).catch(() => null),
    ]);

    return {
        brand: {
            id: scan.brand.id,
            name: scan.brand.name,
            domain: scan.brand.domain ?? null,
        },
        scan: {
            id: scan.id,
            status: scan.status,
            created_at: scan.created_at,
            completed_at: scan.completed_at ?? null,
        },
        scores: scores
            ? {
                  visibility_score: scores.visibility_score,
                  share_of_voice: scores.share_of_voice,
                  by_intent: scores.by_intent.map((i) => ({
                      intent: i.intent,
                      score: i.score,
                      sov: i.sov,
                  })),
              }
            : null,
        mentions: scan.mentions.map((m) => ({
            subject: m.subject,
            provider: m.provider,
            intent_text: m.intent_text,
            presence: m.presence,
        })),
        competitors: competitors
            ? {
                  winners_by_intent: competitors.winners_by_intent.map((w) => ({
                      intent: w.intent,
                      winners: w.winners.map((win) => ({
                          name: win.name,
                          mention_rate: win.mention_rate,
                      })),
                  })),
              }
            : null,
        diagnostics: diagnostics
            ? {
                  gaps: diagnostics.gaps.map((g) => ({
                      type: g.type,
                      severity: g.severity,
                      impact: g.impact,
                      recommended_actions: g.recommended_actions,
                  })),
              }
            : null,
        recommendations: recommendations
            ? {
                  priorities: recommendations.priorities.map((p) => ({
                      priority: p.priority,
                      action: p.action,
                      why: p.why,
                      effort: p.effort,
                  })),
              }
            : null,
    };
}

/**
 * For simple/fast scans in dev mode - attempt to complete synchronously
 * This is a convenience for local testing where Cloud Tasks may not be configured
 */
export async function runInsightsSynchronously(input: InsightRunInput): Promise<InsightRun> {
    const run = await startInsightRun(input);

    // In dev, we might want to simulate completion
    // For now, just return the run - caller should poll
    return run;
}
