"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";

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
    status_detail?: string | null;
    created_at: string;
    updated_at: string;
    poll_count?: number;
};

type InsightResult = {
    brand: { id: string; name: string; domain: string | null };
    scan: { id: string; status: string; created_at: string; completed_at: string | null };
    scores: { visibility_score: number; share_of_voice: number; by_intent: Array<{ intent: string; score: number; sov: number }> } | null;
    mentions: Array<{ subject: string; provider: string; intent_text: string; presence: string; evidence?: Array<{ type: string; excerpt: string }> }>;
    competitors: { winners_by_intent: Array<{ intent: string; winners: Array<{ name: string; mention_rate: number }> }> } | null;
    diagnostics: { gaps: Array<{ type: string; severity: string; impact: string; affected_intents: string[]; recommended_actions: string[] }> } | null;
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
    const [theme, setTheme] = useState<"light" | "dark">("dark");
    const [mounted, setMounted] = useState(false);

    // Load theme from localStorage on initial mount
    useEffect(() => {
        const saved = localStorage.getItem("playground_theme");
        if (saved === "light" || saved === "dark") {
            setTheme(saved);
        }
        setMounted(true);
    }, []);

    // Apply theme whenever it changes
    useEffect(() => {
        if (!mounted) return;

        const root = document.documentElement;
        if (theme === "dark") {
            root.classList.add("dark");
            root.style.colorScheme = "dark";
        } else {
            root.classList.remove("dark");
            root.style.colorScheme = "light";
        }
        localStorage.setItem("playground_theme", theme);
    }, [theme, mounted]);

    const toggleTheme = () => {
        console.log("[Theme] Toggling from:", theme);
        setTheme((prev) => (prev === "dark" ? "light" : "dark"));
    };

    // Prevent hydration flicker
    if (!mounted) {
        return <div className="min-h-screen bg-zinc-950" />;
    }

    return (
        <div className="min-h-screen transition-colors duration-300 bg-zinc-50 dark:bg-zinc-950">
            <div className="min-h-screen text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
                {/* Header */}
                <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50 px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <span className="text-xl sm:text-2xl">🌍</span>
                        <div>
                            <h1 className="text-base sm:text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">GEO API Playground</h1>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:block">Test your AI visibility</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 order-last sm:order-none w-full sm:w-auto">
                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-zinc-800 transition-all shadow-sm"
                            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                        >
                            {theme === "dark" ? "☀️" : "🌙"}
                        </button>

                        {/* Mode Toggle */}
                        <div className="flex-1 sm:flex-none flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg p-1 border border-zinc-200 dark:border-zinc-800 shadow-inner">
                            <button
                                onClick={() => setMode("real")}
                                className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${mode === "real" ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-white shadow-sm" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"}`}
                            >
                                🚀 Real Test
                            </button>
                            <button
                                onClick={() => setMode("dev")}
                                className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${mode === "dev" ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"}`}
                            >
                                🔧 Dev Mode
                            </button>
                        </div>
                    </div>

                    <a href="/" className="text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">← Home</a>
                </header>

                {/* Content */}
                {mode === "real" ? <RealTestMode /> : <DevMode />}
            </div>
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
        selectedCategory: "",
        customCategory: "",
        intents: "",
        competitors: "",
        aiSources: "chatgpt,gemini,perplexity",
        goal: "complete_report",
        timeHorizonDays: "30",
    });

    // Restore from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem("playground_form_data");
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setFormData((prev) => ({ ...prev, ...parsed }));
            } catch (e) {
                console.error("Failed to restore from localStorage", e);
            }
        }
    }, []);

    // Save to localStorage on change
    useEffect(() => {
        localStorage.setItem("playground_form_data", JSON.stringify(formData));
    }, [formData]);

    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [geoLoading, setGeoLoading] = useState(false);

    const [runId, setRunId] = useState<string | null>(null);
    const [response, setResponse] = useState<ApiResponse | null>(null);
    const [insightData, setInsightData] = useState<InsightRunResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [polling, setPolling] = useState(false);
    const pollingRef = useRef(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"insights" | "raw">("insights");

    const handleChange = (key: string, value: string) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
    };

    // Get user's current location via browser geolocation API
    const handleUseMyLocation = async () => {
        if (!navigator.geolocation) {
            setFormErrors((prev) => ({ ...prev, location: "Geolocation is not supported by your browser" }));
            return;
        }

        setGeoLoading(true);
        setFormErrors((prev) => ({ ...prev, location: "" }));

        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000, // Cache for 5 minutes
                });
            });

            const { latitude, longitude } = position.coords;

            // Reverse geocode using OpenStreetMap Nominatim (free, no API key)
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`,
                { headers: { "User-Agent": "GEO-API-Playground/1.0" } }
            );

            if (!response.ok) {
                throw new Error("Failed to get location name");
            }

            const data = await response.json();
            const address = data.address || {};

            // Build location string (City, State format)
            const city = address.city || address.town || address.village || address.municipality || address.county || "";
            const state = address.state || address.region || "";
            const country = address.country_code?.toUpperCase() || "";

            let locationString = "";
            if (city && state) {
                locationString = `${city}, ${state}`;
            } else if (city) {
                locationString = city;
            } else if (state) {
                locationString = state;
            } else if (data.display_name) {
                // Fallback to display name parts
                const parts = data.display_name.split(",").slice(0, 2).map((s: string) => s.trim());
                locationString = parts.join(", ");
            }

            // Add country code if not US
            if (country && country !== "US" && locationString) {
                locationString += `, ${country}`;
            }

            if (locationString) {
                setFormData((prev) => ({ ...prev, location: locationString }));
            } else {
                setFormErrors((prev) => ({ ...prev, location: "Could not determine your location" }));
            }
        } catch (err) {
            const error = err as GeolocationPositionError | Error;
            let message = "Failed to get your location";

            if ("code" in error) {
                switch (error.code) {
                    case 1: message = "Location access denied. Please enable location permissions."; break;
                    case 2: message = "Location unavailable. Please try again."; break;
                    case 3: message = "Location request timed out. Please try again."; break;
                }
            }

            setFormErrors((prev) => ({ ...prev, location: message }));
        } finally {
            setGeoLoading(false);
        }
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

    const validateForm = () => {
        const errors: Record<string, string> = {};

        if (!formData.brandName.trim()) errors.brandName = "Brand name is required";

        if (formData.brandDomain) {
            const domainRegex = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
            if (!domainRegex.test(formData.brandDomain.trim())) {
                errors.brandDomain = "Invalid domain format (e.g., example.com)";
            }
        }

        if (!formData.location.trim()) errors.location = "Location is required";

        const radius = parseInt(formData.radiusMiles);
        if (isNaN(radius) || radius < 1 || radius > 200) {
            errors.radiusMiles = "Radius must be between 1 and 200 miles";
        }

        if (!getFinalCategory()) errors.selectedCategory = "Category is required";

        const intentsCount = formData.intents.split("\n").filter(Boolean).length;
        if (intentsCount === 0) errors.intents = "At least one intent is required";
        if (intentsCount > 10) errors.intents = "Maximum 10 intents allowed";

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
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
        if (!validateForm()) return;
        setLoading(true);
        setError(null);
        setRunId(null);
        setInsightData(null);
        setResponse(null);
        setFormErrors({});

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

    const stopAnalysis = () => {
        pollingRef.current = false;
        setPolling(false);
        setError("Analysis stopped by user");
    };

    const pollForCompletion = async (id: string) => {
        pollingRef.current = true;
        setPolling(true);
        let attempts = 0;
        const maxAttempts = 120; // 10 minutes with 5s intervals

        const poll = async () => {
            if (!pollingRef.current) return; // Exit if user stopped
            if (attempts >= maxAttempts) {
                pollingRef.current = false;
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

    return (
        <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-73px)] overflow-hidden bg-white dark:bg-zinc-950">
            {/* Form Panel */}
            <div className="w-full lg:w-[480px] border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-zinc-800 p-4 sm:p-6 overflow-y-auto lg:max-h-full">
                <h2 className="text-lg font-bold tracking-tight mb-1 text-zinc-900 dark:text-zinc-100">Run AI Visibility Analysis</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">Enter your brand details to get comprehensive insights</p>

                <div className="space-y-5">
                    {/* Brand Section */}
                    <fieldset className="space-y-3">
                        <legend className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Brand Information</legend>
                        <FormField label="Brand Name" required value={formData.brandName} onChange={(v) => handleChange("brandName", v)} placeholder="Acme Corp" error={formErrors.brandName} />
                        <FormField label="Website Domain" value={formData.brandDomain} onChange={(v) => handleChange("brandDomain", v)} placeholder="acme.com" helpText="Optional - helps with attribution" error={formErrors.brandDomain} />
                    </fieldset>

                    {/* Market Section */}
                    <fieldset className="space-y-3">
                        <legend className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Target Market</legend>
                        <div>
                            <label className="flex items-center gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                                Location
                                <span className="text-red-400">*</span>
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => handleChange("location", e.target.value)}
                                    placeholder="Austin, TX"
                                    className={`flex-1 px-3 py-2.5 bg-white dark:bg-zinc-900 border ${formErrors.location ? 'border-red-500' : 'border-zinc-200 dark:border-zinc-700'} rounded-lg text-zinc-900 dark:text-zinc-100 text-sm placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm transition-all`}
                                />
                                <button
                                    type="button"
                                    onClick={handleUseMyLocation}
                                    disabled={geoLoading}
                                    className="flex items-center gap-1.5 px-3 py-2.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Use my current location"
                                >
                                    {geoLoading ? (
                                        <span className="animate-spin">⏳</span>
                                    ) : (
                                        <span>📍</span>
                                    )}
                                    <span className="hidden sm:inline">{geoLoading ? "Locating..." : "Nearby"}</span>
                                </button>
                            </div>
                            <div className="min-h-[1.25rem] mt-1">
                                {formErrors.location ? (
                                    <p className="text-xs font-medium text-red-500 dark:text-red-400">{formErrors.location}</p>
                                ) : (
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">City, State format or use 📍 for current location</p>
                                )}
                            </div>
                        </div>
                        <FormField label="Radius (miles)" value={formData.radiusMiles} onChange={(v) => handleChange("radiusMiles", v)} type="number" placeholder="50" error={formErrors.radiusMiles} />
                    </fieldset>

                    {/* Intents Section */}
                    <fieldset className="space-y-3">
                        <legend className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Search Intents</legend>
                        <FormField
                            label="What would customers search?"
                            required
                            value={formData.intents}
                            onChange={(v) => handleChange("intents", v)}
                            type="textarea"
                            placeholder={"best software development companies\nhire developers near me\ntop tech agencies"}
                            helpText="One search query per line"
                            error={formErrors.intents}
                        />
                    </fieldset>

                    {/* Business Category - below intents so suggestions work */}
                    <fieldset className="space-y-3">
                        <legend className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Business Category</legend>
                        <div>
                            <label className="flex items-center gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
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
                                className="w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                                    className="w-full mt-2 px-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 text-sm placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                            )}

                            {/* Category suggestions with stable height area */}
                            <div className="min-h-[3.5rem] mt-2">
                                {categorySuggestions.length > 0 && !formData.selectedCategory && (
                                    <>
                                        <p className="text-xs text-zinc-500 mb-1.5">Suggested based on your intents:</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {categorySuggestions.map((suggestion) => (
                                                <button
                                                    key={suggestion}
                                                    type="button"
                                                    onClick={() => handleSuggestionClick(suggestion)}
                                                    className="px-2.5 py-1 text-xs rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border border-blue-500/30 transition-colors"
                                                >
                                                    {suggestion}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </fieldset>

                    {/* Competitors Section */}
                    <fieldset className="space-y-3">
                        <legend className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Competitors (Optional)</legend>
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
                        <legend className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Analysis Options</legend>
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
                                { value: "complete_report", label: "Full detailed report" },
                                { value: "increase_mentions", label: "Get mentioned more often" },
                                { value: "increase_top_recommendations", label: "Become top recommendation" },
                                { value: "beat_competitor", label: "Beat a competitor" },
                                { value: "improve_sov", label: "Improve share of voice" },
                            ]}
                        />
                    </fieldset>

                    {/* Submit */}
                    {!polling ? (
                        <button
                            onClick={startInsightRun}
                            disabled={loading}
                            className={`w-full py-3 rounded-lg font-semibold text-white transition-colors ${loading ? "bg-zinc-700 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500"}`}
                        >
                            {loading ? "Starting..." : "🚀 Start Analysis"}
                        </button>
                    ) : (
                        <button
                            onClick={stopAnalysis}
                            className="w-full py-3 rounded-lg font-semibold text-white bg-red-600 hover:bg-red-500 transition-colors text-sm"
                        >
                            🛑 Stop Analysis
                            <span className="block text-[10px] opacity-80 font-normal mt-0.5">
                                {insightData?.status_detail || "Analyzing..."} (poll #{insightData?.poll_count || 0})
                            </span>
                        </button>
                    )}

                    {runId && (
                        <p className="text-xs text-zinc-500 text-center">
                            Run ID: <code className="text-zinc-400">{runId}</code>
                        </p>
                    )}
                </div>
            </div>

            {/* Results Panel */}
            <div className="flex-1 flex flex-col min-h-[50vh] lg:min-h-0 overflow-hidden bg-zinc-50 dark:bg-zinc-900/50">
                {/* Tabs */}
                <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-transparent px-4 sm:px-6 flex items-center gap-1 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab("insights")}
                        className={`px-3 sm:px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${activeTab === "insights" ? "border-blue-500 text-blue-600 dark:text-white" : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-white"}`}
                    >
                        📊 Insights
                    </button>
                    <button
                        onClick={() => setActiveTab("raw")}
                        className={`px-3 sm:px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${activeTab === "raw" ? "border-blue-500 text-blue-600 dark:text-white" : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-white"}`}
                    >
                        {"</>"} Raw JSON
                    </button>
                    {response && (
                        <div className="ml-auto hidden sm:flex items-center gap-3 text-xs font-medium">
                            <span className={response.status < 400 ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}>
                                {response.status} {response.statusText}
                            </span>
                            <span className="text-zinc-400 dark:text-zinc-500">{response.time}ms</span>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                    {/* Progress Header - only while polling */}
                    {polling && (
                        <div className="mb-6 p-4 bg-blue-600/10 border border-blue-600/20 rounded-xl flex items-center justify-between animate-pulse">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{insightData?.status_detail || "Gathering AI insights..."}</span>
                            </div>
                            <span className="text-[10px] text-blue-600/70 dark:text-blue-500/70 font-mono">Poll #{insightData?.poll_count}</span>
                        </div>
                    )}

                    {error && (
                        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600 dark:text-red-400">
                            <strong>Error:</strong> {error}
                        </div>
                    )}

                    {!insightData && !error && (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-500 dark:text-zinc-600">
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
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="animate-spin text-4xl mb-4">⏳</div>
                <p className="text-lg text-zinc-500 dark:text-zinc-400 font-medium">Analysis in progress...</p>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-2 px-6 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full">
                    {data.status_detail || "Gathering AI insights"}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-600 mt-4 underline decoration-zinc-300 dark:decoration-zinc-800">Poll count: {data.poll_count}</p>
            </div>
        );
    }

    if (data.status === "failed") {
        return (
            <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-lg">
                <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">Analysis Failed</h3>
                <p className="text-red-500 dark:text-red-300">{data.error}</p>
            </div>
        );
    }

    const result = data.result;
    if (!result) return <p className="text-zinc-500">No results available</p>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 mb-2">
                <div>
                    <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">{result.brand.name}</h3>
                    {result.brand.domain && (
                        <p className="text-sm text-zinc-500 font-medium">{result.brand.domain}</p>
                    )}
                </div>
                <CopyResultsButton data={data} />
            </div>

            {/* Scores */}
            {result.scores && (
                <InsightCard title="Visibility Scores" icon="scores">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <ScoreBox label="Visibility Score" value={result.scores.visibility_score} max={100} />
                        <ScoreBox label="Share of Voice" value={Math.round(result.scores.share_of_voice * 100)} max={100} suffix="%" />
                    </div>
                    {result.scores.by_intent.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">By Intent</p>
                            {result.scores.by_intent.map((intent, i) => (
                                <div key={i} className="flex items-center justify-between text-sm">
                                    <span className="text-zinc-700 dark:text-zinc-300 truncate flex-1">{intent.intent}</span>
                                    <span className="text-zinc-500 dark:text-zinc-400 ml-4">Score: {intent.score}</span>
                                    <span className="text-zinc-400 dark:text-zinc-500 ml-4">SoV: {Math.round(intent.sov * 100)}%</span>
                                </div>
                            ))}
                        </div>
                    )}
                </InsightCard>
            )}

            {/* Mentions */}
            {result.mentions.length > 0 && (
                <InsightCard title="Brand Mentions & Evidence" icon="mentions">
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {result.mentions.map((m, i) => (
                            <div key={i} className="pb-4 border-b border-zinc-200 dark:border-zinc-800 last:border-0 last:pb-0">
                                <div className="flex items-center justify-between text-sm mb-2">
                                    <span className="text-zinc-800 dark:text-zinc-200 font-medium">{m.intent_text}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-500 uppercase font-bold tracking-wider">{m.provider}</span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${m.presence === "recommended_top" ? "bg-green-500/20 text-green-600 dark:text-green-400" : m.presence === "mentioned" ? "bg-blue-500/20 text-blue-600 dark:text-blue-400" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-500"}`}>
                                            {m.presence.replace("_", " ")}
                                        </span>
                                    </div>
                                </div>
                                {(m as any).evidence && (m as any).evidence.length > 0 && (
                                    <div className="bg-zinc-100 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/50 rounded-lg p-3 text-xs text-zinc-600 dark:text-zinc-400 italic leading-relaxed relative">
                                        <span className="absolute top-2 left-2 text-zinc-400 dark:text-zinc-600 text-base opacity-20">"</span>
                                        <p className="pl-3 pr-2">{(m as any).evidence[0].excerpt}</p>
                                        <span className="absolute bottom-1 right-2 text-zinc-400 dark:text-zinc-600 text-base opacity-20">"</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </InsightCard>
            )}

            {/* Competitors */}
            {result.competitors && result.competitors.winners_by_intent.length > 0 && (
                <InsightCard title="Competitor Winners" icon="competitors">
                    <div className="space-y-4">
                        {result.competitors.winners_by_intent.map((intent, i) => (
                            <div key={i}>
                                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">{intent.intent}</p>
                                <div className="flex flex-wrap gap-2">
                                    {intent.winners.map((w, j) => (
                                        <span key={j} className="text-xs px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
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
                <InsightCard title="Diagnostics" icon="diagnostics">
                    <div className="space-y-3">
                        {result.diagnostics.gaps.map((gap, i) => (
                            <div key={i} className="p-3 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{gap.type.replace(/_/g, " ")}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded ${gap.severity === "critical" ? "bg-red-500/20 text-red-600 dark:text-red-400" : gap.severity === "high" ? "bg-orange-500/20 text-orange-600 dark:text-orange-400" : "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"}`}>
                                        {gap.severity}
                                    </span>
                                </div>
                                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-3">{gap.impact}</p>
                                {gap.affected_intents?.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {gap.affected_intents.map((intent, j) => (
                                            <span key={j} className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-500 border border-zinc-300 dark:border-zinc-800">
                                                {intent}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </InsightCard>
            )}

            {/* Recommendations */}
            {result.recommendations && result.recommendations.priorities.length > 0 && (
                <InsightCard title="Recommendations" icon="recommendations">
                    <div className="space-y-3">
                        {result.recommendations.priorities.slice(0, 5).map((rec, i) => (
                            <div key={i} className="p-3 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs flex items-center justify-center font-semibold">
                                        {rec.priority}
                                    </span>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{rec.action}</p>
                                        <p className="text-xs text-zinc-500 mt-1">{rec.why}</p>
                                        <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded ${rec.effort === "low" ? "bg-green-500/20 text-green-600 dark:text-green-400" : rec.effort === "medium" ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400" : "bg-red-500/20 text-red-600 dark:text-red-400"}`}>
                                            {rec.effort} effort
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </InsightCard>
            )}
            {/* Footer Details */}
            <div className="pt-8 pb-4 border-t border-zinc-200 dark:border-zinc-800 mt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-zinc-500 dark:text-zinc-600 font-mono uppercase tracking-widest">
                <div className="flex gap-4">
                    <span>Scan ID: {result.scan.id}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    <span>Status: {result.scan.status} • {result.scan.completed_at ? new Date(result.scan.completed_at).toLocaleDateString() : 'Processing'}</span>
                </div>
            </div>
        </div>
    );
}

function CopyResultsButton({ data }: { data: InsightRunResponse }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(JSON.stringify(data, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button
            onClick={copy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors text-xs font-medium border border-zinc-300 dark:border-zinc-700/50"
        >
            {copied ? "✓ Copied" : "📋 Copy Results"}
        </button>
    );
}

function InsightCard({ title, children, icon }: { title: string; icon: string; children: React.ReactNode }) {
    const iconMap: Record<string, string> = {
        scores: "📊",
        mentions: "💬",
        competitors: "⚔️",
        diagnostics: "🔍",
        recommendations: "💡"
    };

    return (
        <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/60 rounded-2xl overflow-hidden shadow-sm backdrop-blur-sm">
            <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800/60 flex items-center gap-2.5 bg-zinc-50/50 dark:bg-transparent">
                <span className="text-base">{iconMap[icon] || "✨"}</span>
                <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 tracking-tight uppercase">{title}</h4>
            </div>
            <div className="p-5">
                {children}
            </div>
        </div>
    );
}

function ScoreBox({ label, value, max, suffix = "" }: { label: string; value: number; max: number; suffix?: string }) {
    const pct = Math.min(100, (value / max) * 100);
    return (
        <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4 border border-zinc-100 dark:border-zinc-700/50">
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1 uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white">{value}{suffix}</p>
            <div className="mt-2 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
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
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">{response.method}</span>
                    <span>{response.url}</span>
                    <span className="mx-1 opacity-30">•</span>
                    <span className={response.status < 400 ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}>{response.status}</span>
                </div>
                <button
                    onClick={copy}
                    className="text-xs px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-white border border-zinc-200 dark:border-zinc-700 transition-all shadow-sm"
                >
                    {copied ? "✓ Copied" : "📋 Copy JSON"}
                </button>
            </div>
            <pre className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-sm text-zinc-700 dark:text-zinc-300 overflow-auto max-h-[600px] font-mono shadow-inner">
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
    error,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    type?: "text" | "textarea" | "number" | "select";
    placeholder?: string;
    helpText?: string;
    required?: boolean;
    options?: { value: string; label: string }[];
    error?: string;
}) {
    const baseClass = `w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border ${error ? 'border-red-500' : 'border-zinc-200 dark:border-zinc-700'} rounded-lg text-zinc-900 dark:text-zinc-100 text-sm placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm transition-all`;

    return (
        <div>
            <label className="flex items-center gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
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

            {/* Stable area for error/help text to prevent shifting */}
            <div className="min-h-[1.25rem] mt-1">
                {error ? (
                    <p className="text-xs font-medium text-red-500 dark:text-red-400">{error}</p>
                ) : helpText ? (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{helpText}</p>
                ) : null}
            </div>
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
        <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-73px)] bg-white dark:bg-zinc-950">
            {/* Sidebar - horizontal scroll on mobile, vertical on desktop */}
            <nav className="w-full lg:w-56 border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-zinc-800 p-3 lg:p-4 overflow-x-auto lg:overflow-y-auto bg-zinc-50/50 dark:bg-transparent">
                <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2 lg:mb-3 hidden lg:block">Endpoints</p>
                <div className="flex lg:flex-col gap-1">
                    {ENDPOINT_CATEGORIES.map((cat, i) => (
                        <button
                            key={cat.name}
                            onClick={() => handleCategoryChange(i)}
                            className={`whitespace-nowrap lg:w-full text-left px-3 py-2 rounded-lg transition-all ${selectedCategory === i ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-white shadow-sm border border-zinc-200 dark:border-zinc-700" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/50"}`}
                        >
                            <span className="mr-2">{cat.icon}</span>
                            <span className="text-sm font-medium">{cat.name}</span>
                        </button>
                    ))}
                </div>
            </nav>

            {/* Main */}
            <div className="flex-1 flex flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-900/50">
                {/* Endpoint tabs */}
                <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-transparent px-3 sm:px-4 flex gap-1 overflow-x-auto">
                    {category.endpoints.map((ep, i) => (
                        <button
                            key={ep.path + ep.method}
                            onClick={() => handleEndpointChange(i)}
                            className={`px-2 sm:px-3 py-3 text-xs sm:text-sm flex items-center gap-1 sm:gap-2 border-b-2 transition-all whitespace-nowrap ${selectedEndpoint === i ? "border-blue-500 text-blue-600 dark:text-white" : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-white"}`}
                        >
                            <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-tight ${METHOD_STYLES[ep.method].bg} ${METHOD_STYLES[ep.method].text}`}>{ep.method}</span>
                            <span className="font-semibold">{ep.name}</span>
                        </button>
                    ))}
                </div>

                {/* Request/Response */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
                    {/* Request */}
                    <div className="border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-zinc-800 p-4 sm:p-6 overflow-y-auto bg-white dark:bg-transparent">
                        <h3 className="font-bold text-zinc-900 dark:text-white mb-1">{endpoint.name}</h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">{endpoint.description}</p>

                        <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl p-3 mb-6 flex items-center gap-2 overflow-x-auto shadow-inner">
                            <span className={`flex-shrink-0 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-tight ${METHOD_STYLES[endpoint.method].bg} ${METHOD_STYLES[endpoint.method].text}`}>{endpoint.method}</span>
                            <code className="text-xs sm:text-sm font-mono text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{buildUrl()}</code>
                        </div>

                        <div className="space-y-5">
                            {endpoint.fields?.map((f) => (
                                <FormField key={f.key} label={f.label} value={formData[f.key] || ""} onChange={(v) => setFormData((p) => ({ ...p, [f.key]: v }))} required={f.required} placeholder={f.placeholder} />
                            ))}
                            {endpoint.queryFields?.map((f) => (
                                <FormField key={f.key} label={f.label} value={formData[f.key] || ""} onChange={(v) => setFormData((p) => ({ ...p, [f.key]: v }))} required={f.required} placeholder={f.placeholder} type={f.type === "number" ? "number" : "text"} />
                            ))}
                        </div>

                        <button onClick={handleSubmit} disabled={loading} className={`w-full mt-8 py-3 rounded-xl font-bold text-white transition-all shadow-lg shadow-blue-500/20 ${loading ? "bg-zinc-300 dark:bg-zinc-700 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500 hover:-translate-y-0.5 active:translate-y-0"}`}>
                            {loading ? "🚀 Sending..." : "Send Request"}
                        </button>

                        <div className="mt-8">
                            <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2 text-center">cURL Command</p>
                            <pre className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-600 dark:text-zinc-400 overflow-x-auto shadow-inner">{generateCurl()}</pre>
                        </div>
                    </div>

                    {/* Response */}
                    <div className="p-4 sm:p-6 overflow-y-auto bg-zinc-50 dark:bg-zinc-900/50 min-h-[300px] lg:min-h-0">
                        <h3 className="font-bold text-zinc-900 dark:text-white mb-4 uppercase text-xs tracking-widest pl-1">Response</h3>
                        {response ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <span className={`px-2 py-1 rounded-lg text-sm font-bold shadow-sm ${response.status < 400 ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"}`}>
                                        {response.status} {response.statusText}
                                    </span>
                                    <span className="text-sm font-medium text-zinc-400 dark:text-zinc-500">{response.time}ms</span>
                                </div>
                                <pre className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 overflow-auto max-h-[500px] font-mono shadow-inner">
                                    {JSON.stringify(response.data, null, 2)}
                                </pre>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-zinc-500 dark:text-zinc-500">
                                <span className="text-5xl mb-4 opacity-50">📬</span>
                                <p className="font-medium tracking-tight">Send a request to see the response</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
