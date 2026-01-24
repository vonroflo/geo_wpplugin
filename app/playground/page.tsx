"use client";

import { useState, useCallback, useEffect } from "react";

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
    nested?: Field[];
};

const ENDPOINT_CATEGORIES: EndpointCategory[] = [
    {
        name: "Brands",
        icon: "🏢",
        description: "Manage your brand profiles",
        endpoints: [
            {
                method: "GET",
                path: "/api/v1/brands",
                name: "List Brands",
                description: "View all your brand profiles",
                queryFields: [
                    { key: "limit", label: "Results per page", type: "number", placeholder: "50", helpText: "Max 200" },
                    { key: "cursor", label: "Page cursor", type: "text", placeholder: "For pagination" },
                ],
            },
            {
                method: "POST",
                path: "/api/v1/brands",
                name: "Create Brand",
                description: "Add a new brand to track",
                fields: [
                    { key: "name", label: "Brand Name", type: "text", placeholder: "Acme Corp", required: true },
                    { key: "domain", label: "Website Domain", type: "text", placeholder: "acme.com", helpText: "Main website domain" },
                    { key: "aliases", label: "Brand Aliases", type: "text", placeholder: "Acme, ACME Inc", helpText: "Comma-separated alternative names" },
                ],
            },
            {
                method: "GET",
                path: "/api/v1/brands/{brand_id}",
                name: "Get Brand",
                description: "View a specific brand's details",
                fields: [
                    { key: "brand_id", label: "Brand ID", type: "text", placeholder: "brand_abc123", required: true },
                ],
            },
            {
                method: "PATCH",
                path: "/api/v1/brands/{brand_id}",
                name: "Update Brand",
                description: "Modify brand information",
                fields: [
                    { key: "brand_id", label: "Brand ID", type: "text", placeholder: "brand_abc123", required: true },
                    { key: "name", label: "New Name", type: "text", placeholder: "Updated name" },
                    { key: "domain", label: "New Domain", type: "text", placeholder: "newdomain.com" },
                ],
            },
        ],
    },
    {
        name: "Scans",
        icon: "🔍",
        description: "Run AI visibility scans",
        endpoints: [
            {
                method: "GET",
                path: "/api/v1/geo/scans",
                name: "List Scans",
                description: "View all scan results",
                queryFields: [
                    { key: "brand_id", label: "Filter by Brand", type: "text", placeholder: "brand_abc123" },
                    { key: "limit", label: "Results per page", type: "number", placeholder: "50" },
                ],
            },
            {
                method: "POST",
                path: "/api/v1/geo/scans",
                name: "Create Scan",
                description: "Start a new AI visibility scan for your brand",
                fields: [
                    { key: "brand_name", label: "Brand Name", type: "text", placeholder: "Acme Corp", required: true, helpText: "The brand you want to analyze" },
                    { key: "brand_domain", label: "Brand Website", type: "text", placeholder: "acme.com" },
                    { key: "location", label: "Target Market", type: "text", placeholder: "Austin, TX", required: true, helpText: "Geographic location to analyze" },
                    { key: "radius_miles", label: "Radius (miles)", type: "number", placeholder: "50", defaultValue: 50 },
                    { key: "category", label: "Business Category", type: "text", placeholder: "Software Development", required: true, helpText: "Your industry or service category" },
                    { key: "intents", label: "Search Intents", type: "textarea", placeholder: "best software companies\nhire developers near me", required: true, helpText: "One search query per line - what would customers search?" },
                    { key: "competitors", label: "Competitors", type: "textarea", placeholder: "TechCorp, techcorp.com\nDevHub, devhub.io", helpText: "One per line: Name, domain (optional)" },
                    {
                        key: "ai_sources", label: "AI Sources", type: "select", options: [
                            { value: "chatgpt,gemini,perplexity", label: "All Sources (Recommended)" },
                            { value: "chatgpt", label: "ChatGPT Only" },
                            { value: "gemini", label: "Gemini Only" },
                            { value: "perplexity", label: "Perplexity Only" },
                        ], defaultValue: "chatgpt,gemini,perplexity"
                    },
                ],
            },
            {
                method: "GET",
                path: "/api/v1/geo/scans/{scan_id}",
                name: "Get Scan",
                description: "View detailed scan results",
                fields: [
                    { key: "scan_id", label: "Scan ID", type: "text", placeholder: "scan_abc123", required: true },
                ],
            },
        ],
    },
    {
        name: "Scores & Insights",
        icon: "📊",
        description: "Visibility scores and diagnostics",
        endpoints: [
            {
                method: "GET",
                path: "/api/v1/geo/scores",
                name: "Get Visibility Scores",
                description: "See your brand's AI visibility score breakdown",
                queryFields: [
                    { key: "scan_id", label: "Scan ID", type: "text", placeholder: "scan_abc123", required: true },
                    { key: "include_breakdown", label: "Include Breakdown", type: "select", options: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }] },
                ],
            },
            {
                method: "GET",
                path: "/api/v1/geo/diagnostics",
                name: "Get Diagnostics",
                description: "Identify gaps and issues affecting your visibility",
                queryFields: [
                    { key: "scan_id", label: "Scan ID", type: "text", placeholder: "scan_abc123", required: true },
                ],
            },
            {
                method: "GET",
                path: "/api/v1/geo/trends",
                name: "Get Trends",
                description: "Track your visibility over time",
                queryFields: [
                    { key: "brand_id", label: "Brand ID", type: "text", placeholder: "brand_abc123", required: true },
                    {
                        key: "window", label: "Time Window", type: "select", options: [
                            { value: "7d", label: "Last 7 days" },
                            { value: "30d", label: "Last 30 days" },
                            { value: "90d", label: "Last 90 days" },
                            { value: "180d", label: "Last 6 months" },
                            { value: "365d", label: "Last year" },
                        ]
                    },
                ],
            },
        ],
    },
    {
        name: "Competitors",
        icon: "⚔️",
        description: "Competitive intelligence",
        endpoints: [
            {
                method: "GET",
                path: "/api/v1/geo/competitors/winners",
                name: "Top Competitors",
                description: "See who's winning in AI recommendations",
                queryFields: [
                    { key: "scan_id", label: "Scan ID", type: "text", placeholder: "scan_abc123", required: true },
                ],
            },
            {
                method: "POST",
                path: "/api/v1/geo/competitors/head-to-head",
                name: "Head-to-Head",
                description: "Compare your brand directly against a competitor",
                fields: [
                    { key: "scan_id", label: "Scan ID", type: "text", placeholder: "scan_abc123", required: true },
                    { key: "competitor_name", label: "Competitor Name", type: "text", placeholder: "TechCorp", required: true },
                    { key: "competitor_domain", label: "Competitor Domain", type: "text", placeholder: "techcorp.com" },
                ],
            },
            {
                method: "POST",
                path: "/api/v1/geo/competitors/patterns",
                name: "Competitor Patterns",
                description: "Discover what makes competitors successful",
                fields: [
                    { key: "scan_id", label: "Scan ID", type: "text", placeholder: "scan_abc123", required: true },
                    { key: "competitor_name", label: "Competitor Name", type: "text", placeholder: "TechCorp", required: true },
                    {
                        key: "focus", label: "Analysis Focus", type: "select", options: [
                            { value: "content,entities,citations", label: "All Areas (Recommended)" },
                            { value: "content", label: "Content Strategy" },
                            { value: "entities", label: "Entity Signals" },
                            { value: "citations", label: "Citations & Reviews" },
                        ], defaultValue: "content,entities,citations"
                    },
                ],
            },
        ],
    },
    {
        name: "Recommendations",
        icon: "💡",
        description: "AI-powered action plans",
        endpoints: [
            {
                method: "POST",
                path: "/api/v1/geo/recommendations/action-plan",
                name: "Generate Action Plan",
                description: "Get prioritized steps to improve visibility",
                fields: [
                    { key: "scan_id", label: "Scan ID", type: "text", placeholder: "scan_abc123", required: true },
                    {
                        key: "goal", label: "Your Goal", type: "select", required: true, options: [
                            { value: "increase_mentions", label: "Get mentioned more often" },
                            { value: "increase_top_recommendations", label: "Become a top recommendation" },
                            { value: "beat_competitor", label: "Beat a specific competitor" },
                            { value: "improve_sov", label: "Increase share of voice" },
                        ]
                    },
                    { key: "time_horizon_days", label: "Timeline (days)", type: "number", placeholder: "30", defaultValue: 30, helpText: "7-180 days" },
                ],
            },
            {
                method: "POST",
                path: "/api/v1/geo/recommendations/content-briefs",
                name: "Generate Content Briefs",
                description: "Get ready-to-use content outlines",
                fields: [
                    { key: "scan_id", label: "Scan ID", type: "text", placeholder: "scan_abc123", required: true },
                    {
                        key: "brief_type", label: "Content Type", type: "select", options: [
                            { value: "landing_page", label: "Landing Page" },
                            { value: "blog_post", label: "Blog Post" },
                            { value: "faq_page", label: "FAQ Page" },
                            { value: "comparison_page", label: "Comparison Page" },
                        ], defaultValue: "landing_page"
                    },
                ],
            },
        ],
    },
    {
        name: "Reports",
        icon: "📑",
        description: "Comprehensive reports",
        endpoints: [
            {
                method: "GET",
                path: "/api/v1/geo/reports/scan/{scan_id}",
                name: "Agency Report",
                description: "Full analysis report with scores, competitors, and recommendations",
                fields: [
                    { key: "scan_id", label: "Scan ID", type: "text", placeholder: "scan_abc123", required: true },
                ],
                queryFields: [
                    {
                        key: "goal", label: "Report Goal", type: "select", options: [
                            { value: "increase_top_recommendations", label: "Become top recommendation" },
                            { value: "increase_mentions", label: "Increase mentions" },
                            { value: "beat_competitor", label: "Beat competitor" },
                            { value: "improve_sov", label: "Improve share of voice" },
                        ]
                    },
                    { key: "time_horizon_days", label: "Timeline (days)", type: "number", placeholder: "30" },
                ],
            },
        ],
    },
];

const METHOD_STYLES: Record<string, { bg: string; text: string; border: string }> = {
    GET: { bg: "rgba(34, 197, 94, 0.1)", text: "#4ade80", border: "rgba(34, 197, 94, 0.3)" },
    POST: { bg: "rgba(59, 130, 246, 0.1)", text: "#60a5fa", border: "rgba(59, 130, 246, 0.3)" },
    PATCH: { bg: "rgba(245, 158, 11, 0.1)", text: "#fbbf24", border: "rgba(245, 158, 11, 0.3)" },
};

export default function PlaygroundPage() {
    const [selectedCategory, setSelectedCategory] = useState(0);
    const [selectedEndpoint, setSelectedEndpoint] = useState(0);
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [response, setResponse] = useState<{ status: number; data: unknown; time: number } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<"form" | "json">("form");
    const [jsonBody, setJsonBody] = useState("");
    const [copied, setCopied] = useState(false);
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
        setError(null);
    };

    const handleEndpointChange = (index: number) => {
        setSelectedEndpoint(index);
        setFormData({});
        setResponse(null);
        setError(null);
    };

    const handleFieldChange = (key: string, value: string) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
    };

    const buildRequestBody = useCallback(() => {
        if (viewMode === "json" && jsonBody.trim()) {
            return JSON.parse(jsonBody);
        }

        if (endpoint.path === "/api/v1/geo/scans" && endpoint.method === "POST") {
            const intents = (formData.intents || "").split("\n").filter(Boolean).map((text) => ({
                text: text.trim(),
                funnel_stage: "awareness",
            }));
            const competitors = (formData.competitors || "").split("\n").filter(Boolean).map((line) => {
                const [name, domain] = line.split(",").map((s) => s.trim());
                return { name, domain: domain || null };
            });
            return {
                brand: { name: formData.brand_name, domain: formData.brand_domain || null },
                market: { location: formData.location, radius_miles: Number(formData.radius_miles) || 50 },
                category: formData.category,
                intents,
                competitors,
                ai_sources: (formData.ai_sources || "chatgpt,gemini,perplexity").split(","),
            };
        }

        if (endpoint.path.includes("head-to-head")) {
            return {
                scan_id: formData.scan_id,
                competitor: { name: formData.competitor_name, domain: formData.competitor_domain || null },
            };
        }

        if (endpoint.path.includes("patterns")) {
            return {
                scan_id: formData.scan_id,
                competitor: { name: formData.competitor_name },
                focus: (formData.focus || "content,entities,citations").split(","),
            };
        }

        if (endpoint.path.includes("action-plan")) {
            return {
                scan_id: formData.scan_id,
                goal: formData.goal,
                time_horizon_days: Number(formData.time_horizon_days) || 30,
            };
        }

        if (endpoint.path.includes("content-briefs")) {
            return {
                scan_id: formData.scan_id,
                brief_type: formData.brief_type || "landing_page",
            };
        }

        // Generic body builder for simple endpoints
        const body: Record<string, unknown> = {};
        endpoint.fields?.forEach((field) => {
            if (formData[field.key]) {
                if (field.key === "aliases") {
                    body[field.key] = formData[field.key].split(",").map((s) => s.trim());
                } else {
                    body[field.key] = formData[field.key];
                }
            }
        });
        return body;
    }, [endpoint, formData, viewMode, jsonBody]);

    const buildUrl = useCallback(() => {
        let url = endpoint.path;

        // Replace path params
        endpoint.fields?.forEach((field) => {
            if (url.includes(`{${field.key}}`)) {
                url = url.replace(`{${field.key}}`, encodeURIComponent(formData[field.key] || ""));
            }
        });

        // Add query params
        const queryParts: string[] = [];
        endpoint.queryFields?.forEach((field) => {
            if (formData[field.key]) {
                queryParts.push(`${field.key}=${encodeURIComponent(formData[field.key])}`);
            }
        });
        if (queryParts.length) {
            url += "?" + queryParts.join("&");
        }

        return url;
    }, [endpoint, formData]);

    const generateCurl = useCallback(() => {
        const url = buildUrl();
        const fullUrl = `${origin}${url}`;

        if (endpoint.method === "GET") {
            return `curl "${fullUrl}"`;
        }

        const body = buildRequestBody();
        return `curl -X ${endpoint.method} "${fullUrl}" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(body, null, 2)}'`;
    }, [endpoint, buildUrl, buildRequestBody, origin]);

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);
        setResponse(null);

        const startTime = performance.now();

        try {
            const url = buildUrl();
            const options: RequestInit = {
                method: endpoint.method,
                headers: { "Content-Type": "application/json" },
            };

            if (endpoint.method !== "GET") {
                options.body = JSON.stringify(buildRequestBody());
            }

            const res = await fetch(url, options);
            const data = await res.json();
            const endTime = performance.now();

            setResponse({
                status: res.status,
                data,
                time: Math.round(endTime - startTime),
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Request failed");
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const isPathParam = (key: string) => endpoint.path.includes(`{${key}}`);

    return (
        <div style={{ minHeight: "100vh", backgroundColor: "#09090b", color: "#fafafa", fontFamily: "system-ui, -apple-system, sans-serif" }}>
            {/* Header */}
            <header style={{ borderBottom: "1px solid #27272a", padding: "1rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span style={{ fontSize: "1.5rem" }}>🌍</span>
                    <div>
                        <h1 style={{ fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>GEO API Playground</h1>
                        <p style={{ fontSize: "0.75rem", color: "#71717a", margin: 0 }}>Test endpoints interactively</p>
                    </div>
                </div>
                <a href="/" style={{ fontSize: "0.875rem", color: "#a1a1aa", textDecoration: "none" }}>← Back to Home</a>
            </header>

            <div style={{ display: "flex", height: "calc(100vh - 73px)" }}>
                {/* Sidebar - Categories */}
                <nav style={{ width: 240, borderRight: "1px solid #27272a", padding: "1rem", overflowY: "auto" }}>
                    <p style={{ fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#71717a", marginBottom: "0.75rem" }}>
                        Categories
                    </p>
                    {ENDPOINT_CATEGORIES.map((cat, i) => (
                        <button
                            key={cat.name}
                            onClick={() => handleCategoryChange(i)}
                            style={{
                                width: "100%",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.625rem",
                                padding: "0.625rem 0.75rem",
                                marginBottom: "0.25rem",
                                backgroundColor: selectedCategory === i ? "#27272a" : "transparent",
                                border: "none",
                                borderRadius: 6,
                                cursor: "pointer",
                                textAlign: "left",
                            }}
                        >
                            <span style={{ fontSize: "1rem" }}>{cat.icon}</span>
                            <div>
                                <div style={{ fontSize: "0.875rem", fontWeight: 500, color: selectedCategory === i ? "#fafafa" : "#a1a1aa" }}>{cat.name}</div>
                                <div style={{ fontSize: "0.6875rem", color: "#52525b" }}>{cat.description}</div>
                            </div>
                        </button>
                    ))}
                </nav>

                {/* Main Content */}
                <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                    {/* Endpoint Tabs */}
                    <div style={{ borderBottom: "1px solid #27272a", padding: "0 1.5rem", display: "flex", gap: "0.25rem", overflowX: "auto" }}>
                        {category.endpoints.map((ep, i) => (
                            <button
                                key={ep.path + ep.method}
                                onClick={() => handleEndpointChange(i)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    padding: "0.875rem 1rem",
                                    backgroundColor: "transparent",
                                    border: "none",
                                    borderBottom: selectedEndpoint === i ? "2px solid #3b82f6" : "2px solid transparent",
                                    cursor: "pointer",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                <span
                                    style={{
                                        padding: "0.125rem 0.375rem",
                                        borderRadius: 4,
                                        fontSize: "0.625rem",
                                        fontWeight: 600,
                                        backgroundColor: METHOD_STYLES[ep.method].bg,
                                        color: METHOD_STYLES[ep.method].text,
                                        border: `1px solid ${METHOD_STYLES[ep.method].border}`,
                                    }}
                                >
                                    {ep.method}
                                </span>
                                <span style={{ fontSize: "0.875rem", fontWeight: 500, color: selectedEndpoint === i ? "#fafafa" : "#a1a1aa" }}>
                                    {ep.name}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Request/Response Area */}
                    <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", overflow: "hidden" }}>
                        {/* Request Panel */}
                        <div style={{ borderRight: "1px solid #27272a", padding: "1.5rem", overflowY: "auto" }}>
                            <div style={{ marginBottom: "1.5rem" }}>
                                <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.25rem" }}>{endpoint.name}</h2>
                                <p style={{ fontSize: "0.875rem", color: "#71717a", marginBottom: "1rem" }}>{endpoint.description}</p>

                                {/* URL Preview */}
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem", backgroundColor: "#18181b", borderRadius: 8, marginBottom: "1rem" }}>
                                    <span
                                        style={{
                                            padding: "0.25rem 0.5rem",
                                            borderRadius: 4,
                                            fontSize: "0.75rem",
                                            fontWeight: 600,
                                            backgroundColor: METHOD_STYLES[endpoint.method].bg,
                                            color: METHOD_STYLES[endpoint.method].text,
                                        }}
                                    >
                                        {endpoint.method}
                                    </span>
                                    <code style={{ fontSize: "0.8125rem", color: "#a1a1aa", wordBreak: "break-all" }}>{buildUrl()}</code>
                                </div>

                                {/* Mode Toggle for POST/PATCH */}
                                {endpoint.method !== "GET" && (
                                    <div style={{ display: "flex", marginBottom: "1rem", backgroundColor: "#18181b", borderRadius: 6, padding: "0.25rem" }}>
                                        <button
                                            onClick={() => setViewMode("form")}
                                            style={{
                                                flex: 1,
                                                padding: "0.5rem",
                                                backgroundColor: viewMode === "form" ? "#27272a" : "transparent",
                                                border: "none",
                                                borderRadius: 4,
                                                color: viewMode === "form" ? "#fafafa" : "#71717a",
                                                fontSize: "0.8125rem",
                                                fontWeight: 500,
                                                cursor: "pointer",
                                            }}
                                        >
                                            📝 Form View
                                        </button>
                                        <button
                                            onClick={() => {
                                                setViewMode("json");
                                                if (!jsonBody) {
                                                    try {
                                                        setJsonBody(JSON.stringify(buildRequestBody(), null, 2));
                                                    } catch {
                                                        setJsonBody("{}");
                                                    }
                                                }
                                            }}
                                            style={{
                                                flex: 1,
                                                padding: "0.5rem",
                                                backgroundColor: viewMode === "json" ? "#27272a" : "transparent",
                                                border: "none",
                                                borderRadius: 4,
                                                color: viewMode === "json" ? "#fafafa" : "#71717a",
                                                fontSize: "0.8125rem",
                                                fontWeight: 500,
                                                cursor: "pointer",
                                            }}
                                        >
                                            {"</>"} JSON View
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Form Fields */}
                            {viewMode === "form" ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                    {/* Path param fields */}
                                    {endpoint.fields?.filter((f) => isPathParam(f.key)).map((field) => (
                                        <FieldInput key={field.key} field={field} value={formData[field.key] || ""} onChange={handleFieldChange} />
                                    ))}

                                    {/* Query param fields */}
                                    {endpoint.queryFields?.map((field) => (
                                        <FieldInput key={field.key} field={field} value={formData[field.key] || ""} onChange={handleFieldChange} />
                                    ))}

                                    {/* Body fields */}
                                    {endpoint.method !== "GET" && endpoint.fields?.filter((f) => !isPathParam(f.key)).map((field) => (
                                        <FieldInput key={field.key} field={field} value={formData[field.key] || field.defaultValue?.toString() || ""} onChange={handleFieldChange} />
                                    ))}
                                </div>
                            ) : (
                                <textarea
                                    value={jsonBody}
                                    onChange={(e) => setJsonBody(e.target.value)}
                                    rows={16}
                                    style={{
                                        width: "100%",
                                        padding: "1rem",
                                        backgroundColor: "#18181b",
                                        border: "1px solid #27272a",
                                        borderRadius: 8,
                                        color: "#fafafa",
                                        fontSize: "0.8125rem",
                                        fontFamily: "ui-monospace, monospace",
                                        resize: "vertical",
                                    }}
                                />
                            )}

                            {/* Submit Button */}
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                style={{
                                    width: "100%",
                                    marginTop: "1.5rem",
                                    padding: "0.875rem",
                                    backgroundColor: loading ? "#27272a" : "#3b82f6",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: 8,
                                    fontSize: "0.9375rem",
                                    fontWeight: 600,
                                    cursor: loading ? "not-allowed" : "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "0.5rem",
                                }}
                            >
                                {loading ? (
                                    <>
                                        <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⏳</span>
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <span>🚀</span>
                                        Send Request
                                    </>
                                )}
                            </button>

                            {/* cURL Command */}
                            <div style={{ marginTop: "1.5rem" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                                    <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "#71717a" }}>cURL Command</span>
                                    <button
                                        onClick={() => copyToClipboard(generateCurl())}
                                        style={{
                                            padding: "0.25rem 0.5rem",
                                            backgroundColor: "transparent",
                                            border: "1px solid #27272a",
                                            borderRadius: 4,
                                            color: "#a1a1aa",
                                            fontSize: "0.6875rem",
                                            cursor: "pointer",
                                        }}
                                    >
                                        {copied ? "✓ Copied" : "Copy"}
                                    </button>
                                </div>
                                <pre
                                    style={{
                                        padding: "0.75rem",
                                        backgroundColor: "#18181b",
                                        borderRadius: 6,
                                        fontSize: "0.75rem",
                                        fontFamily: "ui-monospace, monospace",
                                        color: "#a1a1aa",
                                        overflow: "auto",
                                        whiteSpace: "pre-wrap",
                                        wordBreak: "break-all",
                                    }}
                                >
                                    {generateCurl()}
                                </pre>
                            </div>
                        </div>

                        {/* Response Panel */}
                        <div style={{ padding: "1.5rem", overflowY: "auto", backgroundColor: "#0c0c0e" }}>
                            <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>Response</h2>

                            {error && (
                                <div style={{ padding: "1rem", backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: 8, color: "#fca5a5", marginBottom: "1rem" }}>
                                    <div style={{ fontWeight: 500, marginBottom: "0.25rem" }}>Request Failed</div>
                                    <div style={{ fontSize: "0.875rem" }}>{error}</div>
                                </div>
                            )}

                            {response && (
                                <>
                                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
                                        <span
                                            style={{
                                                padding: "0.375rem 0.75rem",
                                                borderRadius: 6,
                                                fontSize: "0.875rem",
                                                fontWeight: 600,
                                                backgroundColor: response.status < 400 ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
                                                color: response.status < 400 ? "#4ade80" : "#f87171",
                                            }}
                                        >
                                            {response.status} {response.status < 400 ? "OK" : "Error"}
                                        </span>
                                        <span style={{ fontSize: "0.875rem", color: "#71717a" }}>
                                            ⏱️ {response.time}ms
                                        </span>
                                        <button
                                            onClick={() => copyToClipboard(JSON.stringify(response.data, null, 2))}
                                            style={{
                                                marginLeft: "auto",
                                                padding: "0.375rem 0.75rem",
                                                backgroundColor: "transparent",
                                                border: "1px solid #27272a",
                                                borderRadius: 6,
                                                color: "#a1a1aa",
                                                fontSize: "0.75rem",
                                                cursor: "pointer",
                                            }}
                                        >
                                            📋 Copy
                                        </button>
                                    </div>

                                    <pre
                                        style={{
                                            backgroundColor: "#18181b",
                                            padding: "1rem",
                                            borderRadius: 8,
                                            overflow: "auto",
                                            maxHeight: "calc(100vh - 280px)",
                                            fontSize: "0.8125rem",
                                            fontFamily: "ui-monospace, monospace",
                                            lineHeight: 1.6,
                                            color: "#e4e4e7",
                                        }}
                                    >
                                        {JSON.stringify(response.data, null, 2)}
                                    </pre>
                                </>
                            )}

                            {!response && !error && (
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 300, color: "#52525b" }}>
                                    <span style={{ fontSize: "3rem", marginBottom: "1rem", opacity: 0.5 }}>📬</span>
                                    <p style={{ fontSize: "0.9375rem" }}>Send a request to see the response</p>
                                    <p style={{ fontSize: "0.8125rem", marginTop: "0.5rem" }}>Fill in the fields and click Send Request</p>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

function FieldInput({ field, value, onChange }: { field: Field; value: string; onChange: (key: string, value: string) => void }) {
    const baseStyle = {
        width: "100%",
        padding: "0.75rem",
        backgroundColor: "#18181b",
        border: "1px solid #27272a",
        borderRadius: 8,
        color: "#fafafa",
        fontSize: "0.875rem",
    };

    return (
        <div>
            <label style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "#e4e4e7" }}>{field.label}</span>
                {field.required && <span style={{ color: "#f87171", fontSize: "0.75rem" }}>*</span>}
            </label>

            {field.type === "select" ? (
                <select
                    value={value || field.defaultValue?.toString() || ""}
                    onChange={(e) => onChange(field.key, e.target.value)}
                    style={{ ...baseStyle, cursor: "pointer" }}
                >
                    <option value="">Select...</option>
                    {field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            ) : field.type === "textarea" ? (
                <textarea
                    value={value}
                    onChange={(e) => onChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    rows={4}
                    style={{ ...baseStyle, resize: "vertical", fontFamily: "inherit" }}
                />
            ) : (
                <input
                    type={field.type === "number" ? "number" : "text"}
                    value={value}
                    onChange={(e) => onChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    style={baseStyle}
                />
            )}

            {field.helpText && (
                <p style={{ marginTop: "0.375rem", fontSize: "0.75rem", color: "#71717a" }}>
                    💡 {field.helpText}
                </p>
            )}
        </div>
    );
}
