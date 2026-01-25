"use client";

import { useState, useCallback, useEffect, useMemo } from "react";

// ============================================================================
// CATEGORY SUGGESTION ENGINE
// ============================================================================

const CATEGORY_OPTIONS = [
    { value: "Real Estate", label: "Real Estate" },
    { value: "Home Services", label: "Home Services" },
    { value: "Legal", label: "Legal" },
    { value: "Healthcare", label: "Healthcare" },
    { value: "Finance", label: "Finance" },
    { value: "Software", label: "Software" },
    { value: "Food & Beverage", label: "Food & Beverage" },
    { value: "Fitness", label: "Fitness" },
    { value: "Beauty", label: "Beauty" },
    { value: "Automotive", label: "Automotive" },
    { value: "Education", label: "Education" },
    { value: "Travel", label: "Travel" },
    { value: "E-commerce", label: "E-commerce" },
    { value: "Marketing", label: "Marketing" },
] as const;

const KEYWORD_TO_CATEGORY: Record<string, string> = {
    // Real Estate
    property: "Real Estate", apartment: "Real Estate", rentals: "Real Estate", leasing: "Real Estate",
    realtor: "Real Estate", mortgage: "Real Estate", housing: "Real Estate", condo: "Real Estate",
    // Home Services
    plumber: "Home Services", hvac: "Home Services", electrician: "Home Services", roofing: "Home Services",
    contractor: "Home Services", renovation: "Home Services", handyman: "Home Services", cleaning: "Home Services",
    // Legal
    law: "Legal", attorney: "Legal", dui: "Legal", lawyer: "Legal", litigation: "Legal",
    divorce: "Legal", immigration: "Legal", criminal: "Legal",
    // Healthcare
    dentist: "Healthcare", clinic: "Healthcare", medspa: "Healthcare", doctor: "Healthcare",
    therapy: "Healthcare", hospital: "Healthcare", medical: "Healthcare", health: "Healthcare",
    // Finance
    accounting: "Finance", bookkeeping: "Finance", tax: "Finance", cpa: "Finance",
    financial: "Finance", investment: "Finance", banking: "Finance", loan: "Finance",
    // Software
    crm: "Software", automation: "Software", api: "Software", saas: "Software",
    software: "Software", developer: "Software", app: "Software", tech: "Software", platform: "Software",
    // Food & Beverage
    restaurant: "Food & Beverage", cafe: "Food & Beverage", catering: "Food & Beverage",
    bakery: "Food & Beverage", food: "Food & Beverage", bar: "Food & Beverage", coffee: "Food & Beverage",
    // Fitness
    gym: "Fitness", trainer: "Fitness", yoga: "Fitness", fitness: "Fitness",
    workout: "Fitness", crossfit: "Fitness", pilates: "Fitness", personal: "Fitness",
    // Beauty
    salon: "Beauty", barber: "Beauty", skincare: "Beauty", spa: "Beauty",
    nail: "Beauty", hair: "Beauty", beauty: "Beauty", cosmetic: "Beauty",
    // Automotive
    "car repair": "Automotive", mechanic: "Automotive", detailing: "Automotive", auto: "Automotive",
    tire: "Automotive", body: "Automotive", collision: "Automotive", dealer: "Automotive",
    // Education
    tutoring: "Education", school: "Education", course: "Education", training: "Education",
    learning: "Education", teaching: "Education", education: "Education",
    // Travel
    hotel: "Travel", travel: "Travel", vacation: "Travel", tour: "Travel", flight: "Travel",
    // E-commerce
    shop: "E-commerce", store: "E-commerce", ecommerce: "E-commerce", online: "E-commerce", retail: "E-commerce",
    // Marketing
    marketing: "Marketing", seo: "Marketing", advertising: "Marketing", agency: "Marketing", digital: "Marketing",
};

/**
 * Suggests categories based on intent keywords.
 * Designed to be swappable for an API/LLM call later.
 */
function suggestCategories(intents: string[]): string[] {
    const scores: Record<string, number> = {};

    const intentText = intents.join(" ").toLowerCase();

    for (const [keyword, category] of Object.entries(KEYWORD_TO_CATEGORY)) {
        if (intentText.includes(keyword.toLowerCase())) {
            scores[category] = (scores[category] || 0) + 1;
        }
    }

    // Sort by score descending, return top 5
    return Object.entries(scores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([cat]) => cat);
}

// ============================================================================
// TYPES
// ============================================================================

type PlaygroundMode = "real" | "dev";

type EndpointCategory = {
    name: string;
    icon: string;
    description: string;
    endpoints: Endpoint[];
};

type Endpoint = {
    method: "GET" | "POST" | "PATCH";
    path: string;
    name: string;
    description: string;
    fields?: Field[];
    queryFields?: Field[];
};

type Field = {
    key: string;
    label: string;
    type: "text" | "textarea" | "select" | "number" | "array";
    placeholder?: string;
    required?: boolean;
    options?: { value: string; label: string }[];
    helpText?: string;
    defaultValue?: string | number;
};

type InsightRunResponse = {
    run_id: string;
    status: "processing" | "completed" | "failed";
    result: InsightResult | null;
    error: string | null;
    created_at: string;
    updated_at: string;
    poll_count?: number;
};

type InsightResult = {
    brand: { id: string; name: string; domain: string | null };
    scan: { id: string; status: string; created_at: string; completed_at: string | null };
    scores: { visibility_score: number; share_of_voice: number; by_intent: Array<{ intent: string; score: number; sov: number }> } | null;
    mentions: Array<{ subject: string; provider: string; intent_text: string; presence: string }>;
    competitors: { winners_by_intent: Array<{ intent: string; winners: Array<{ name: string; mention_rate: number }> }> } | null;
    diagnostics: { gaps: Array<{ type: string; severity: string; impact: string; recommended_actions: string[] }> } | null;
    recommendations: { priorities: Array<{ priority: number; action: string; why: string; effort: string }> } | null;
};

type ApiResponse = {
    url: string;
    method: string;
    status: number;
    statusText: string;
    time: number;
    data: unknown;
    raw: string;
};

// ============================================================================
// DEV MODE ENDPOINT CONFIG
// ============================================================================

const ENDPOINT_CATEGORIES: EndpointCategory[] = [
    {
        name: "Brands",
        icon: "🏢",
        description: "Manage brand profiles",
        endpoints: [
            { method: "GET", path: "/api/v1/brands", name: "List Brands", description: "View all brands", queryFields: [{ key: "limit", label: "Limit", type: "number", placeholder: "50" }] },
            { method: "POST", path: "/api/v1/brands", name: "Create Brand", description: "Add a new brand", fields: [{ key: "name", label: "Brand Name", type: "text", placeholder: "Acme Corp", required: true }, { key: "domain", label: "Domain", type: "text", placeholder: "acme.com" }] },
            { method: "GET", path: "/api/v1/brands/{brand_id}", name: "Get Brand", description: "View brand details", fields: [{ key: "brand_id", label: "Brand ID", type: "text", required: true }] },
        ],
    },
    {
        name: "Scans",
        icon: "🔍",
        description: "AI visibility scans",
        endpoints: [
            { method: "GET", path: "/api/v1/geo/scans", name: "List Scans", description: "View all scans", queryFields: [{ key: "brand_id", label: "Brand ID", type: "text" }, { key: "limit", label: "Limit", type: "number" }] },
            { method: "GET", path: "/api/v1/geo/scans/{scan_id}", name: "Get Scan", description: "View scan details", fields: [{ key: "scan_id", label: "Scan ID", type: "text", required: true }] },
        ],
    },
    {
        name: "Insights",
        icon: "✨",
        description: "Unified insights endpoint",
        endpoints: [
            { method: "POST", path: "/api/v1/geo/insights", name: "Start Insights", description: "Start a new insight run", fields: [] },
            { method: "GET", path: "/api/v1/geo/insights/{run_id}", name: "Get Run Status", description: "Check run status", fields: [{ key: "run_id", label: "Run ID", type: "text", required: true }] },
        ],
    },
    {
        name: "Scores",
        icon: "📊",
        description: "Visibility scores",
        endpoints: [
            { method: "GET", path: "/api/v1/geo/scores", name: "Get Scores", description: "Get visibility scores", queryFields: [{ key: "scan_id", label: "Scan ID", type: "text", required: true }] },
            { method: "GET", path: "/api/v1/geo/diagnostics", name: "Get Diagnostics", description: "Get diagnostics", queryFields: [{ key: "scan_id", label: "Scan ID", type: "text", required: true }] },
        ],
    },
    {
        name: "Competitors",
        icon: "⚔️",
        description: "Competitive analysis",
        endpoints: [
            { method: "GET", path: "/api/v1/geo/competitors/winners", name: "Top Competitors", description: "See winners", queryFields: [{ key: "scan_id", label: "Scan ID", type: "text", required: true }] },
        ],
    },
];

const METHOD_STYLES: Record<string, { bg: string; text: string }> = {
    GET: { bg: "bg-green-500/10", text: "text-green-400" },
    POST: { bg: "bg-blue-500/10", text: "text-blue-400" },
    PATCH: { bg: "bg-amber-500/10", text: "text-amber-400" },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PlaygroundPage() {
    const [mode, setMode] = useState<PlaygroundMode>("real");

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100">
            {/* Header */}
            <header className="border-b border-zinc-800 px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-xl sm:text-2xl">🌍</span>
                    <div>
                        <h1 className="text-base sm:text-lg font-semibold">GEO API Playground</h1>
                        <p className="text-xs text-zinc-500 hidden sm:block">Test your AI visibility</p>
                    </div>
                </div>

                {/* Mode Toggle */}
                <div className="flex items-center gap-1 sm:gap-2 bg-zinc-900 rounded-lg p-1 order-last sm:order-none w-full sm:w-auto justify-center">
                    <button
                        onClick={() => setMode("real")}
                        className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${mode === "real" ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-white"}`}
                    >
                        🚀 Real Test
                    </button>
                    <button
                        onClick={() => setMode("dev")}
                        className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${mode === "dev" ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"}`}
                    >
                        🔧 Dev Mode
                    </button>
                </div>

                <a href="/" className="text-sm text-zinc-500 hover:text-white">← Home</a>
            </header>

            {/* Content */}
            {mode === "real" ? <RealTestMode /> : <DevMode />}
        </div>
    );
}

// ============================================================================
// REAL TEST MODE
// ============================================================================

const OTHER_CUSTOM_VALUE = "__other__";

function RealTestMode() {
    const [formData, setFormData] = useState({
        brandName: "",
        brandDomain: "",
        location: "",
        radiusMiles: "50",
        selectedCategory: "", // dropdown value
        customCategory: "",   // custom input when "Other" selected
        intents: "",
        competitors: "",
        aiSources: "chatgpt,gemini,perplexity",
        goal: "increase_mentions",
        timeHorizonDays: "30",
    });

    const [runId, setRunId] = useState<string | null>(null);
    const [response, setResponse] = useState<ApiResponse | null>(null);
    const [insightData, setInsightData] = useState<InsightRunResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [polling, setPolling] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"insights" | "raw">("insights");

    const handleChange = (key: string, value: string) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
    };

    // Parse intents for suggestions
    const parsedIntents = useMemo(() => {
        return formData.intents
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean);
    }, [formData.intents]);

    // Get category suggestions based on intents
    const categorySuggestions = useMemo(() => {
        if (parsedIntents.length === 0) return [];
        return suggestCategories(parsedIntents);
    }, [parsedIntents]);

    // Handle suggestion click
    const handleSuggestionClick = (suggestion: string) => {
        const isInDropdown = CATEGORY_OPTIONS.some((opt) => opt.value === suggestion);
        if (isInDropdown) {
            setFormData((prev) => ({ ...prev, selectedCategory: suggestion, customCategory: "" }));
        } else {
            setFormData((prev) => ({ ...prev, selectedCategory: OTHER_CUSTOM_VALUE, customCategory: suggestion }));
        }
    };

    // Compute final category for submission
    const getFinalCategory = (): string => {
        if (formData.selectedCategory === OTHER_CUSTOM_VALUE) {
            return formData.customCategory.trim();
        }
        return formData.selectedCategory;
    };

    const buildRequestBody = () => {
        // Parse and clean intents
        const intents = formData.intents
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((text) => ({ text, funnel_stage: "awareness" }));

        // Parse competitors
        const competitors = formData.competitors
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((line) => {
                const [name, domain] = line.split(",").map((s) => s.trim());
                return { name, domain: domain || null };
            });

        return {
            brand: {
                name: formData.brandName.trim(),
                domain: formData.brandDomain.trim() || null,
            },
            market: {
                location: formData.location.trim(),
                radius_miles: parseInt(formData.radiusMiles) || 50,
            },
            category: getFinalCategory(),
            intents,
            competitors,
            ai_sources: formData.aiSources.split(",").map((s) => s.trim()),
            report_options: {
                goal: formData.goal,
                time_horizon_days: parseInt(formData.timeHorizonDays) || 30,
            },
        };
    };

    const makeRequest = async (url: string, method: string, body?: unknown): Promise<ApiResponse> => {
        const startTime = performance.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

        const options: RequestInit = {
            method,
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
        };
        if (body) options.body = JSON.stringify(body);

        try {
            const res = await fetch(url, options);
            clearTimeout(timeoutId);
            const raw = await res.text();
            const endTime = performance.now();

            let data: unknown;
            try {
                data = JSON.parse(raw);
            } catch {
                data = { _parseError: true, raw };
            }

            return {
                url,
                method,
                status: res.status,
                statusText: res.statusText,
                time: Math.round(endTime - startTime),
                data,
                raw,
            };
        } catch (err) {
            clearTimeout(timeoutId);
            if (err instanceof Error && err.name === "AbortError") {
                throw new Error("Request timed out after 30 seconds");
            }
            throw err;
        }
    };

    const startInsightRun = async () => {
        setLoading(true);
        setError(null);
        setRunId(null);
        setInsightData(null);
        setResponse(null);

        try {
            const body = buildRequestBody();
            console.log("[Playground] Sending request:", JSON.stringify(body, null, 2));

            const resp = await makeRequest("/api/v1/geo/insights", "POST", body);
            setResponse(resp);

            console.log("[Playground] Response:", resp.status, resp.data);

            if (resp.status >= 400) {
                // Extract error message from structured response { error: { message: "...", details: ... } }
                const errData = resp.data as any;
                let message = "";

                if (errData?.error?.message) {
                    message = errData.error.message;
                } else if (errData?.message) {
                    message = errData.message;
                } else if (typeof errData?.error === 'string') {
                    message = errData.error;
                } else if (typeof errData === 'string') {
                    message = errData;
                } else {
                    message = `${resp.status} ${resp.statusText}`;
                }

                // If there are validation details, append them
                if (errData?.error?.details?.issues) {
                    const issues = errData.error.details.issues.map((i: any) => `${i.path.join('.')}: ${i.message}`).join(', ');
                    message += ` (Validation: ${issues})`;
                } else if (typeof errData?.error === 'object' && errData?.error !== null) {
                    // Final fallback to stringify the object if we still don't have a good message
                    if (message.includes(resp.statusText) || message === `${resp.status} ${resp.statusText}`) {
                        try { message = JSON.stringify(errData.error); } catch { }
                    }
                }

                setError(`Request failed: ${message}`);
                return;
            }

            const data = resp.data as InsightRunResponse;

            // Check if the response indicates an immediate failure
            if (data.status === "failed") {
                setError(data.error || "Analysis failed");
                setInsightData(data);
                return;
            }

            setInsightData(data);
            setRunId(data.run_id);

            if (data.status === "processing") {
                pollForCompletion(data.run_id);
            }
        } catch (err) {
            console.error("[Playground] Error:", err);
            setError(err instanceof Error ? err.message : "Request failed");
        } finally {
            setLoading(false);
        }
    };

    const pollForCompletion = async (id: string) => {
        setPolling(true);
        let attempts = 0;
        const maxAttempts = 60; // 5 minutes with 5s intervals

        const poll = async () => {
            if (attempts >= maxAttempts) {
                setPolling(false);
                setError("Polling timeout - run may still be processing");
                return;
            }

            attempts++;
            try {
                const resp = await makeRequest(`/api/v1/geo/insights/${id}`, "GET");
                setResponse(resp);

                if (resp.status >= 400) {
                    setPolling(false);
                    setError(`Poll failed: ${resp.status}`);
                    return;
                }

                const data = resp.data as InsightRunResponse;
                setInsightData(data);

                if (data.status === "completed" || data.status === "failed") {
                    setPolling(false);
                    if (data.status === "failed") {
                        setError(data.error || "Run failed");
                    }
                } else {
                    setTimeout(poll, 5000);
                }
            } catch (err) {
                setPolling(false);
                const msg = err instanceof Error ? err.message : String(err);
                setError(`Poll failed: ${msg}`);
            }
        };

        poll();
    };

    // Validation: if "Other" selected, customCategory must be filled
    const finalCategory = getFinalCategory();
    const isValid = formData.brandName && formData.location && finalCategory && formData.intents;

    return (
        <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-73px)]">
            {/* Form Panel */}
            <div className="w-full lg:w-[480px] border-b lg:border-b-0 lg:border-r border-zinc-800 p-4 sm:p-6 overflow-y-auto">
                <h2 className="text-lg font-semibold mb-1">Run AI Visibility Analysis</h2>
                <p className="text-sm text-zinc-500 mb-6">Enter your brand details to get comprehensive insights</p>

                <div className="space-y-5">
                    {/* Brand Section */}
                    <fieldset className="space-y-3">
                        <legend className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Brand Information</legend>
                        <FormField label="Brand Name" required value={formData.brandName} onChange={(v) => handleChange("brandName", v)} placeholder="Acme Corp" />
                        <FormField label="Website Domain" value={formData.brandDomain} onChange={(v) => handleChange("brandDomain", v)} placeholder="acme.com" helpText="Optional - helps with attribution" />
                    </fieldset>

                    {/* Market Section */}
                    <fieldset className="space-y-3">
                        <legend className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Target Market</legend>
                        <FormField label="Location" required value={formData.location} onChange={(v) => handleChange("location", v)} placeholder="Austin, TX" helpText="City, State format" />
                        <FormField label="Radius (miles)" value={formData.radiusMiles} onChange={(v) => handleChange("radiusMiles", v)} type="number" placeholder="50" />
                    </fieldset>

                    {/* Intents Section */}
                    <fieldset className="space-y-3">
                        <legend className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Search Intents</legend>
                        <FormField
                            label="What would customers search?"
                            required
                            value={formData.intents}
                            onChange={(v) => handleChange("intents", v)}
                            type="textarea"
                            placeholder={"best software development companies\nhire developers near me\ntop tech agencies"}
                            helpText="One search query per line"
                        />
                    </fieldset>

                    {/* Business Category - below intents so suggestions work */}
                    <fieldset className="space-y-3">
                        <legend className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Business Category</legend>
                        <div>
                            <label className="flex items-center gap-1 text-sm font-medium text-zinc-300 mb-1.5">
                                Category
                                <span className="text-red-400">*</span>
                            </label>
                            <select
                                value={formData.selectedCategory}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setFormData((prev) => ({
                                        ...prev,
                                        selectedCategory: val,
                                        customCategory: val === OTHER_CUSTOM_VALUE ? prev.customCategory : "",
                                    }));
                                }}
                                className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="">Select a category...</option>
                                {CATEGORY_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                                <option value={OTHER_CUSTOM_VALUE}>Other / Custom</option>
                            </select>

                            {/* Custom category input */}
                            {formData.selectedCategory === OTHER_CUSTOM_VALUE && (
                                <input
                                    type="text"
                                    value={formData.customCategory}
                                    onChange={(e) => handleChange("customCategory", e.target.value)}
                                    placeholder="Enter custom category..."
                                    className="w-full mt-2 px-3 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                            )}

                            {/* Category suggestions from intents */}
                            {categorySuggestions.length > 0 && !formData.selectedCategory && (
                                <div className="mt-2">
                                    <p className="text-xs text-zinc-500 mb-1.5">Suggested based on your intents:</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {categorySuggestions.map((suggestion) => (
                                            <button
                                                key={suggestion}
                                                type="button"
                                                onClick={() => handleSuggestionClick(suggestion)}
                                                className="px-2.5 py-1 text-xs rounded-full bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/30 transition-colors"
                                            >
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </fieldset>

                    {/* Competitors Section */}
                    <fieldset className="space-y-3">
                        <legend className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Competitors (Optional)</legend>
                        <FormField
                            label="Competitor Names"
                            value={formData.competitors}
                            onChange={(v) => handleChange("competitors", v)}
                            type="textarea"
                            placeholder={"TechCorp, techcorp.com\nDevHub, devhub.io"}
                            helpText="One per line: Name, domain (optional)"
                        />
                    </fieldset>

                    {/* Options Section */}
                    <fieldset className="space-y-3">
                        <legend className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Analysis Options</legend>
                        <FormField
                            label="AI Sources"
                            value={formData.aiSources}
                            onChange={(v) => handleChange("aiSources", v)}
                            type="select"
                            options={[
                                { value: "chatgpt,gemini,perplexity", label: "All Sources" },
                                { value: "chatgpt", label: "ChatGPT Only" },
                                { value: "gemini", label: "Gemini Only" },
                                { value: "perplexity", label: "Perplexity Only" },
                            ]}
                        />
                        <FormField
                            label="Report Goal"
                            value={formData.goal}
                            onChange={(v) => handleChange("goal", v)}
                            type="select"
                            options={[
                                { value: "increase_mentions", label: "Get mentioned more often" },
                                { value: "increase_top_recommendations", label: "Become top recommendation" },
                                { value: "beat_competitor", label: "Beat a competitor" },
                                { value: "improve_sov", label: "Improve share of voice" },
                            ]}
                        />
                    </fieldset>

                    {/* Submit */}
                    <button
                        onClick={startInsightRun}
                        disabled={!isValid || loading || polling}
                        className={`w-full py-3 rounded-lg font-semibold text-white transition-colors ${!isValid || loading || polling ? "bg-zinc-700 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500"}`}
                    >
                        {loading ? "Starting..." : polling ? `Analyzing... (poll #${insightData?.poll_count || 0})` : "🚀 Start Analysis"}
                    </button>

                    {runId && (
                        <p className="text-xs text-zinc-500 text-center">
                            Run ID: <code className="text-zinc-400">{runId}</code>
                        </p>
                    )}
                </div>
            </div>

            {/* Results Panel */}
            <div className="flex-1 flex flex-col min-h-[50vh] lg:min-h-0 overflow-hidden bg-zinc-900/50">
                {/* Tabs */}
                <div className="border-b border-zinc-800 px-4 sm:px-6 flex items-center gap-1 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab("insights")}
                        className={`px-3 sm:px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === "insights" ? "border-blue-500 text-white" : "border-transparent text-zinc-500 hover:text-white"}`}
                    >
                        📊 Insights
                    </button>
                    <button
                        onClick={() => setActiveTab("raw")}
                        className={`px-3 sm:px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === "raw" ? "border-blue-500 text-white" : "border-transparent text-zinc-500 hover:text-white"}`}
                    >
                        {"</>"} Raw JSON
                    </button>
                    {response && (
                        <div className="ml-auto hidden sm:flex items-center gap-3 text-xs">
                            <span className={response.status < 400 ? "text-green-400" : "text-red-400"}>
                                {response.status} {response.statusText}
                            </span>
                            <span className="text-zinc-500">{response.time}ms</span>
                            <span className="text-zinc-600 hidden md:inline">{response.method} {response.url}</span>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                    {error && (
                        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
                            <strong>Error:</strong> {error}
                        </div>
                    )}

                    {!insightData && !error && (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                            <span className="text-5xl mb-4">🔍</span>
                            <p className="text-lg">Ready to analyze</p>
                            <p className="text-sm mt-1">Fill in the form and click Start Analysis</p>
                        </div>
                    )}

                    {insightData && activeTab === "insights" && <InsightsDisplay data={insightData} />}
                    {activeTab === "raw" && response && <RawJsonDisplay response={response} />}
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// INSIGHTS DISPLAY COMPONENTS
// ============================================================================

function InsightsDisplay({ data }: { data: InsightRunResponse }) {
    if (data.status === "processing") {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <div className="animate-spin text-4xl mb-4">⏳</div>
                <p className="text-lg text-zinc-400">Analysis in progress...</p>
                <p className="text-sm text-zinc-600 mt-1">Poll count: {data.poll_count}</p>
            </div>
        );
    }

    if (data.status === "failed") {
        return (
            <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-lg">
                <h3 className="text-lg font-semibold text-red-400 mb-2">Analysis Failed</h3>
                <p className="text-red-300">{data.error}</p>
            </div>
        );
    }

    const result = data.result;
    if (!result) return <p className="text-zinc-500">No results available</p>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-semibold">{result.brand.name}</h3>
                    <p className="text-sm text-zinc-500">{result.brand.domain || "No domain"}</p>
                </div>
                <div className="text-right text-sm text-zinc-500">
                    <p>Scan: {result.scan.id}</p>
                    <p>Status: <span className="text-green-400">{result.scan.status}</span></p>
                </div>
            </div>

            {/* Scores */}
            {result.scores && (
                <InsightCard title="📊 Visibility Scores" icon="scores">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <ScoreBox label="Visibility Score" value={result.scores.visibility_score} max={100} />
                        <ScoreBox label="Share of Voice" value={Math.round(result.scores.share_of_voice * 100)} max={100} suffix="%" />
                    </div>
                    {result.scores.by_intent.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-zinc-400 uppercase">By Intent</p>
                            {result.scores.by_intent.map((intent, i) => (
                                <div key={i} className="flex items-center justify-between text-sm">
                                    <span className="text-zinc-300 truncate flex-1">{intent.intent}</span>
                                    <span className="text-zinc-400 ml-4">Score: {intent.score}</span>
                                    <span className="text-zinc-500 ml-4">SoV: {Math.round(intent.sov * 100)}%</span>
                                </div>
                            ))}
                        </div>
                    )}
                </InsightCard>
            )}

            {/* Mentions */}
            {result.mentions.length > 0 && (
                <InsightCard title="💬 Mentions" icon="mentions">
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {result.mentions.map((m, i) => (
                            <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-zinc-800 last:border-0">
                                <span className="text-zinc-300">{m.subject}</span>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">{m.provider}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded ${m.presence === "recommended_top" ? "bg-green-500/20 text-green-400" : m.presence === "mentioned" ? "bg-blue-500/20 text-blue-400" : "bg-zinc-800 text-zinc-500"}`}>
                                        {m.presence.replace("_", " ")}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </InsightCard>
            )}

            {/* Competitors */}
            {result.competitors && result.competitors.winners_by_intent.length > 0 && (
                <InsightCard title="⚔️ Competitor Winners" icon="competitors">
                    <div className="space-y-4">
                        {result.competitors.winners_by_intent.map((intent, i) => (
                            <div key={i}>
                                <p className="text-sm font-medium text-zinc-300 mb-2">{intent.intent}</p>
                                <div className="flex flex-wrap gap-2">
                                    {intent.winners.map((w, j) => (
                                        <span key={j} className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-400">
                                            {w.name} ({Math.round(w.mention_rate * 100)}%)
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </InsightCard>
            )}

            {/* Diagnostics */}
            {result.diagnostics && result.diagnostics.gaps.length > 0 && (
                <InsightCard title="🔍 Diagnostics" icon="diagnostics">
                    <div className="space-y-3">
                        {result.diagnostics.gaps.map((gap, i) => (
                            <div key={i} className="p-3 bg-zinc-800/50 rounded-lg">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium text-zinc-200">{gap.type.replace(/_/g, " ")}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded ${gap.severity === "critical" ? "bg-red-500/20 text-red-400" : gap.severity === "high" ? "bg-orange-500/20 text-orange-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                                        {gap.severity}
                                    </span>
                                </div>
                                <p className="text-xs text-zinc-400">{gap.impact}</p>
                            </div>
                        ))}
                    </div>
                </InsightCard>
            )}

            {/* Recommendations */}
            {result.recommendations && result.recommendations.priorities.length > 0 && (
                <InsightCard title="💡 Recommendations" icon="recommendations">
                    <div className="space-y-3">
                        {result.recommendations.priorities.slice(0, 5).map((rec, i) => (
                            <div key={i} className="p-3 bg-zinc-800/50 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center font-semibold">
                                        {rec.priority}
                                    </span>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-zinc-200">{rec.action}</p>
                                        <p className="text-xs text-zinc-500 mt-1">{rec.why}</p>
                                        <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded ${rec.effort === "low" ? "bg-green-500/20 text-green-400" : rec.effort === "medium" ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`}>
                                            {rec.effort} effort
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </InsightCard>
            )}
        </div>
    );
}

function InsightCard({ title, children }: { title: string; icon: string; children: React.ReactNode }) {
    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-zinc-300 mb-3">{title}</h4>
            {children}
        </div>
    );
}

function ScoreBox({ label, value, max, suffix = "" }: { label: string; value: number; max: number; suffix?: string }) {
    const pct = Math.min(100, (value / max) * 100);
    return (
        <div className="bg-zinc-800 rounded-lg p-4">
            <p className="text-xs text-zinc-500 mb-1">{label}</p>
            <p className="text-2xl font-bold text-white">{value}{suffix}</p>
            <div className="mt-2 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

function RawJsonDisplay({ response }: { response: ApiResponse }) {
    const [copied, setCopied] = useState(false);

    const copy = () => {
        navigator.clipboard.writeText(JSON.stringify(response.data, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <div className="text-xs text-zinc-500">
                    {response.method} {response.url} • {response.status} • {response.time}ms
                </div>
                <button onClick={copy} className="text-xs px-3 py-1 rounded bg-zinc-800 text-zinc-400 hover:text-white">
                    {copied ? "✓ Copied" : "📋 Copy"}
                </button>
            </div>
            <pre className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-sm text-zinc-300 overflow-auto max-h-[600px] font-mono">
                {JSON.stringify(response.data, null, 2)}
            </pre>
        </div>
    );
}

// ============================================================================
// FORM COMPONENTS
// ============================================================================

function FormField({
    label,
    value,
    onChange,
    type = "text",
    placeholder,
    helpText,
    required,
    options,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    type?: "text" | "textarea" | "number" | "select";
    placeholder?: string;
    helpText?: string;
    required?: boolean;
    options?: { value: string; label: string }[];
}) {
    const baseClass = "w-full px-3 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

    return (
        <div>
            <label className="flex items-center gap-1 text-sm font-medium text-zinc-300 mb-1.5">
                {label}
                {required && <span className="text-red-400">*</span>}
            </label>
            {type === "select" ? (
                <select value={value} onChange={(e) => onChange(e.target.value)} className={baseClass}>
                    {options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            ) : type === "textarea" ? (
                <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={4} className={baseClass + " resize-y"} />
            ) : (
                <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={baseClass} />
            )}
            {helpText && <p className="mt-1 text-xs text-zinc-500">{helpText}</p>}
        </div>
    );
}

// ============================================================================
// DEV MODE
// ============================================================================

function DevMode() {
    const [selectedCategory, setSelectedCategory] = useState(0);
    const [selectedEndpoint, setSelectedEndpoint] = useState(0);
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [response, setResponse] = useState<ApiResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [origin, setOrigin] = useState("");

    useEffect(() => {
        setOrigin(window.location.origin);
    }, []);

    const category = ENDPOINT_CATEGORIES[selectedCategory];
    const endpoint = category.endpoints[selectedEndpoint];

    const handleCategoryChange = (index: number) => {
        setSelectedCategory(index);
        setSelectedEndpoint(0);
        setFormData({});
        setResponse(null);
    };

    const handleEndpointChange = (index: number) => {
        setSelectedEndpoint(index);
        setFormData({});
        setResponse(null);
    };

    const buildUrl = useCallback(() => {
        let url = endpoint.path;
        endpoint.fields?.forEach((f) => {
            if (url.includes(`{${f.key}}`)) {
                url = url.replace(`{${f.key}}`, encodeURIComponent(formData[f.key] || ""));
            }
        });
        const queryParts: string[] = [];
        endpoint.queryFields?.forEach((f) => {
            if (formData[f.key]) queryParts.push(`${f.key}=${encodeURIComponent(formData[f.key])}`);
        });
        if (queryParts.length) url += "?" + queryParts.join("&");
        return url;
    }, [endpoint, formData]);

    const handleSubmit = async () => {
        setLoading(true);
        setResponse(null);
        const startTime = performance.now();

        try {
            const url = buildUrl();
            const res = await fetch(url, { method: endpoint.method, headers: { "Content-Type": "application/json" } });
            const raw = await res.text();
            const endTime = performance.now();

            let data: unknown;
            try {
                data = JSON.parse(raw);
            } catch {
                data = { _parseError: true, raw };
            }

            setResponse({ url, method: endpoint.method, status: res.status, statusText: res.statusText, time: Math.round(endTime - startTime), data, raw });
        } catch (err) {
            setResponse({ url: buildUrl(), method: endpoint.method, status: 0, statusText: "Network Error", time: 0, data: { error: err instanceof Error ? err.message : "Unknown error" }, raw: "" });
        } finally {
            setLoading(false);
        }
    };

    const generateCurl = () => {
        const url = buildUrl();
        return `curl "${origin}${url}"`;
    };

    return (
        <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-73px)]">
            {/* Sidebar - horizontal scroll on mobile, vertical on desktop */}
            <nav className="w-full lg:w-56 border-b lg:border-b-0 lg:border-r border-zinc-800 p-3 lg:p-4 overflow-x-auto lg:overflow-y-auto">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2 lg:mb-3 hidden lg:block">Endpoints</p>
                <div className="flex lg:flex-col gap-1">
                    {ENDPOINT_CATEGORIES.map((cat, i) => (
                        <button
                            key={cat.name}
                            onClick={() => handleCategoryChange(i)}
                            className={`whitespace-nowrap lg:w-full text-left px-3 py-2 rounded-lg transition-colors ${selectedCategory === i ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"}`}
                        >
                            <span className="mr-2">{cat.icon}</span>
                            <span className="hidden sm:inline">{cat.name}</span>
                        </button>
                    ))}
                </div>
            </nav>

            {/* Main */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Endpoint tabs */}
                <div className="border-b border-zinc-800 px-3 sm:px-4 flex gap-1 overflow-x-auto">
                    {category.endpoints.map((ep, i) => (
                        <button
                            key={ep.path + ep.method}
                            onClick={() => handleEndpointChange(i)}
                            className={`px-2 sm:px-3 py-3 text-xs sm:text-sm flex items-center gap-1 sm:gap-2 border-b-2 transition-colors whitespace-nowrap ${selectedEndpoint === i ? "border-blue-500 text-white" : "border-transparent text-zinc-500 hover:text-white"}`}
                        >
                            <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${METHOD_STYLES[ep.method].bg} ${METHOD_STYLES[ep.method].text}`}>{ep.method}</span>
                            <span className="hidden sm:inline">{ep.name}</span>
                        </button>
                    ))}
                </div>

                {/* Request/Response */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
                    {/* Request */}
                    <div className="border-b lg:border-b-0 lg:border-r border-zinc-800 p-4 sm:p-6 overflow-y-auto">
                        <h3 className="font-semibold mb-1">{endpoint.name}</h3>
                        <p className="text-sm text-zinc-500 mb-4">{endpoint.description}</p>

                        <div className="bg-zinc-900 rounded-lg p-3 mb-4 flex items-center gap-2 overflow-x-auto">
                            <span className={`flex-shrink-0 px-2 py-1 rounded text-xs font-semibold ${METHOD_STYLES[endpoint.method].bg} ${METHOD_STYLES[endpoint.method].text}`}>{endpoint.method}</span>
                            <code className="text-xs sm:text-sm text-zinc-400 whitespace-nowrap">{buildUrl()}</code>
                        </div>

                        <div className="space-y-4">
                            {endpoint.fields?.map((f) => (
                                <FormField key={f.key} label={f.label} value={formData[f.key] || ""} onChange={(v) => setFormData((p) => ({ ...p, [f.key]: v }))} required={f.required} placeholder={f.placeholder} />
                            ))}
                            {endpoint.queryFields?.map((f) => (
                                <FormField key={f.key} label={f.label} value={formData[f.key] || ""} onChange={(v) => setFormData((p) => ({ ...p, [f.key]: v }))} required={f.required} placeholder={f.placeholder} type={f.type === "number" ? "number" : "text"} />
                            ))}
                        </div>

                        <button onClick={handleSubmit} disabled={loading} className={`w-full mt-6 py-3 rounded-lg font-semibold text-white ${loading ? "bg-zinc-700" : "bg-blue-600 hover:bg-blue-500"}`}>
                            {loading ? "Sending..." : "Send Request"}
                        </button>

                        <div className="mt-4">
                            <p className="text-xs text-zinc-500 mb-1">cURL</p>
                            <pre className="bg-zinc-900 rounded p-2 text-xs text-zinc-400 overflow-x-auto">{generateCurl()}</pre>
                        </div>
                    </div>

                    {/* Response */}
                    <div className="p-4 sm:p-6 overflow-y-auto bg-zinc-900/50 min-h-[300px] lg:min-h-0">
                        <h3 className="font-semibold mb-4">Response</h3>
                        {response ? (
                            <>
                                <div className="flex items-center gap-3 mb-4">
                                    <span className={`px-2 py-1 rounded text-sm font-semibold ${response.status < 400 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                                        {response.status} {response.statusText}
                                    </span>
                                    <span className="text-sm text-zinc-500">{response.time}ms</span>
                                </div>
                                <pre className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 sm:p-4 text-xs sm:text-sm text-zinc-300 overflow-auto max-h-96 font-mono">
                                    {JSON.stringify(response.data, null, 2)}
                                </pre>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-48 text-zinc-600">
                                <span className="text-3xl mb-2">📬</span>
                                <p>Send a request to see the response</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
