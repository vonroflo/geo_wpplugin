"use client";

import { useState, useCallback } from "react";

const ENDPOINTS = [
    { method: "GET", path: "/api/v1/brands", description: "List brands" },
    { method: "POST", path: "/api/v1/brands", description: "Create brand" },
    { method: "GET", path: "/api/v1/brands/{brand_id}", description: "Get brand" },
    { method: "PATCH", path: "/api/v1/brands/{brand_id}", description: "Update brand" },
    { method: "GET", path: "/api/v1/geo/scans", description: "List scans" },
    { method: "POST", path: "/api/v1/geo/scans", description: "Create scan" },
    { method: "GET", path: "/api/v1/geo/scans/{scan_id}", description: "Get scan" },
    { method: "GET", path: "/api/v1/geo/scores", description: "Get scores" },
    { method: "GET", path: "/api/v1/geo/diagnostics", description: "Get diagnostics" },
    { method: "GET", path: "/api/v1/geo/competitors/winners", description: "Get competitor winners" },
    { method: "POST", path: "/api/v1/geo/competitors/head-to-head", description: "Head-to-head comparison" },
    { method: "POST", path: "/api/v1/geo/competitors/patterns", description: "Competitor patterns" },
    { method: "POST", path: "/api/v1/geo/recommendations/action-plan", description: "Generate action plan" },
    { method: "POST", path: "/api/v1/geo/recommendations/content-briefs", description: "Generate content briefs" },
    { method: "GET", path: "/api/v1/geo/trends", description: "Get trends" },
    { method: "GET", path: "/api/v1/geo/reports/scan/{scan_id}", description: "Get agency report" },
];

const EXAMPLE_BODIES: Record<string, object> = {
    "POST /api/v1/brands": {
        name: "Acme Corp",
        domain: "acme.com",
        aliases: ["Acme", "ACME Inc"],
    },
    "PATCH /api/v1/brands/{brand_id}": {
        name: "Acme Corporation",
    },
    "POST /api/v1/geo/scans": {
        brand: { name: "Acme Corp", domain: "acme.com" },
        market: { location: "Austin, TX", radius_miles: 50 },
        category: "Software Development",
        intents: [
            { text: "best software development companies", funnel_stage: "awareness" },
            { text: "hire software developers near me", funnel_stage: "consideration" },
        ],
        competitors: [{ name: "TechCorp", domain: "techcorp.com" }],
    },
    "POST /api/v1/geo/competitors/head-to-head": {
        scan_id: "scan_abc123",
        competitor: { name: "TechCorp", domain: "techcorp.com" },
    },
    "POST /api/v1/geo/competitors/patterns": {
        scan_id: "scan_abc123",
        competitor: { name: "TechCorp" },
        focus: ["content", "entities", "citations"],
    },
    "POST /api/v1/geo/recommendations/action-plan": {
        scan_id: "scan_abc123",
        goal: "increase_mentions",
        time_horizon_days: 30,
    },
    "POST /api/v1/geo/recommendations/content-briefs": {
        scan_id: "scan_abc123",
        brief_type: "landing_page",
    },
};

const METHOD_COLORS: Record<string, string> = {
    GET: "#22c55e",
    POST: "#3b82f6",
    PATCH: "#f59e0b",
    DELETE: "#ef4444",
};

export default function PlaygroundPage() {
    const [selectedEndpoint, setSelectedEndpoint] = useState(ENDPOINTS[0]);
    const [pathParams, setPathParams] = useState<Record<string, string>>({});
    const [queryParams, setQueryParams] = useState("");
    const [body, setBody] = useState("");
    const [response, setResponse] = useState<{ status: number; data: unknown; time: number } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const extractPathParams = (path: string): string[] => {
        const matches = path.match(/\{([^}]+)\}/g);
        return matches ? matches.map((m) => m.slice(1, -1)) : [];
    };

    const buildUrl = useCallback(() => {
        let url = selectedEndpoint.path;
        for (const [key, value] of Object.entries(pathParams)) {
            url = url.replace(`{${key}}`, encodeURIComponent(value));
        }
        if (queryParams.trim()) {
            url += (url.includes("?") ? "&" : "?") + queryParams.trim();
        }
        return url;
    }, [selectedEndpoint.path, pathParams, queryParams]);

    const handleEndpointChange = (index: number) => {
        const endpoint = ENDPOINTS[index];
        setSelectedEndpoint(endpoint);
        setPathParams({});
        setQueryParams("");
        setResponse(null);
        setError(null);

        const exampleKey = `${endpoint.method} ${endpoint.path}`;
        if (EXAMPLE_BODIES[exampleKey]) {
            setBody(JSON.stringify(EXAMPLE_BODIES[exampleKey], null, 2));
        } else {
            setBody("");
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);
        setResponse(null);

        const startTime = performance.now();

        try {
            const url = buildUrl();
            const options: RequestInit = {
                method: selectedEndpoint.method,
                headers: { "Content-Type": "application/json" },
            };

            if (["POST", "PATCH", "PUT"].includes(selectedEndpoint.method) && body.trim()) {
                options.body = body;
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

    const pathParamKeys = extractPathParams(selectedEndpoint.path);
    const showBody = ["POST", "PATCH", "PUT"].includes(selectedEndpoint.method);

    return (
        <div style={{ minHeight: "100vh", backgroundColor: "#0a0a0a", color: "#e5e5e5", fontFamily: "system-ui, -apple-system, sans-serif" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem" }}>
                <header style={{ marginBottom: "2rem" }}>
                    <h1 style={{ fontSize: "1.75rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                        GEO API Playground
                    </h1>
                    <p style={{ color: "#a3a3a3" }}>Test API endpoints interactively</p>
                </header>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                    {/* Request Panel */}
                    <div style={{ backgroundColor: "#171717", borderRadius: 8, padding: "1.5rem", border: "1px solid #262626" }}>
                        <h2 style={{ fontSize: "1rem", fontWeight: 500, marginBottom: "1rem" }}>Request</h2>

                        {/* Endpoint Selector */}
                        <div style={{ marginBottom: "1rem" }}>
                            <label style={{ display: "block", fontSize: "0.875rem", color: "#a3a3a3", marginBottom: "0.5rem" }}>
                                Endpoint
                            </label>
                            <select
                                value={ENDPOINTS.indexOf(selectedEndpoint)}
                                onChange={(e) => handleEndpointChange(Number(e.target.value))}
                                style={{
                                    width: "100%",
                                    padding: "0.625rem",
                                    backgroundColor: "#262626",
                                    border: "1px solid #404040",
                                    borderRadius: 6,
                                    color: "#e5e5e5",
                                    fontSize: "0.875rem",
                                }}
                            >
                                {ENDPOINTS.map((ep, i) => (
                                    <option key={i} value={i}>
                                        {ep.method} {ep.path} — {ep.description}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Method + URL Preview */}
                        <div style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", backgroundColor: "#262626", borderRadius: 6 }}>
                            <span
                                style={{
                                    padding: "0.25rem 0.5rem",
                                    borderRadius: 4,
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                    backgroundColor: METHOD_COLORS[selectedEndpoint.method] + "20",
                                    color: METHOD_COLORS[selectedEndpoint.method],
                                }}
                            >
                                {selectedEndpoint.method}
                            </span>
                            <code style={{ fontSize: "0.875rem", color: "#d4d4d4", wordBreak: "break-all" }}>
                                {buildUrl()}
                            </code>
                        </div>

                        {/* Path Parameters */}
                        {pathParamKeys.length > 0 && (
                            <div style={{ marginBottom: "1rem" }}>
                                <label style={{ display: "block", fontSize: "0.875rem", color: "#a3a3a3", marginBottom: "0.5rem" }}>
                                    Path Parameters
                                </label>
                                {pathParamKeys.map((key) => (
                                    <div key={key} style={{ marginBottom: "0.5rem" }}>
                                        <input
                                            type="text"
                                            placeholder={key}
                                            value={pathParams[key] || ""}
                                            onChange={(e) => setPathParams({ ...pathParams, [key]: e.target.value })}
                                            style={{
                                                width: "100%",
                                                padding: "0.625rem",
                                                backgroundColor: "#262626",
                                                border: "1px solid #404040",
                                                borderRadius: 6,
                                                color: "#e5e5e5",
                                                fontSize: "0.875rem",
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Query Parameters */}
                        <div style={{ marginBottom: "1rem" }}>
                            <label style={{ display: "block", fontSize: "0.875rem", color: "#a3a3a3", marginBottom: "0.5rem" }}>
                                Query Parameters
                            </label>
                            <input
                                type="text"
                                placeholder="limit=10&cursor=abc"
                                value={queryParams}
                                onChange={(e) => setQueryParams(e.target.value)}
                                style={{
                                    width: "100%",
                                    padding: "0.625rem",
                                    backgroundColor: "#262626",
                                    border: "1px solid #404040",
                                    borderRadius: 6,
                                    color: "#e5e5e5",
                                    fontSize: "0.875rem",
                                }}
                            />
                        </div>

                        {/* Request Body */}
                        {showBody && (
                            <div style={{ marginBottom: "1rem" }}>
                                <label style={{ display: "block", fontSize: "0.875rem", color: "#a3a3a3", marginBottom: "0.5rem" }}>
                                    Request Body (JSON)
                                </label>
                                <textarea
                                    value={body}
                                    onChange={(e) => setBody(e.target.value)}
                                    rows={12}
                                    style={{
                                        width: "100%",
                                        padding: "0.75rem",
                                        backgroundColor: "#262626",
                                        border: "1px solid #404040",
                                        borderRadius: 6,
                                        color: "#e5e5e5",
                                        fontSize: "0.8125rem",
                                        fontFamily: "ui-monospace, monospace",
                                        resize: "vertical",
                                    }}
                                />
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            style={{
                                width: "100%",
                                padding: "0.75rem",
                                backgroundColor: loading ? "#404040" : "#3b82f6",
                                color: "#fff",
                                border: "none",
                                borderRadius: 6,
                                fontSize: "0.875rem",
                                fontWeight: 500,
                                cursor: loading ? "not-allowed" : "pointer",
                            }}
                        >
                            {loading ? "Sending..." : "Send Request"}
                        </button>
                    </div>

                    {/* Response Panel */}
                    <div style={{ backgroundColor: "#171717", borderRadius: 8, padding: "1.5rem", border: "1px solid #262626" }}>
                        <h2 style={{ fontSize: "1rem", fontWeight: 500, marginBottom: "1rem" }}>Response</h2>

                        {error && (
                            <div style={{ padding: "1rem", backgroundColor: "#7f1d1d20", border: "1px solid #991b1b", borderRadius: 6, color: "#fca5a5", marginBottom: "1rem" }}>
                                {error}
                            </div>
                        )}

                        {response && (
                            <>
                                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
                                    <span
                                        style={{
                                            padding: "0.25rem 0.75rem",
                                            borderRadius: 4,
                                            fontSize: "0.875rem",
                                            fontWeight: 500,
                                            backgroundColor: response.status < 400 ? "#16a34a20" : "#dc262620",
                                            color: response.status < 400 ? "#4ade80" : "#f87171",
                                        }}
                                    >
                                        {response.status}
                                    </span>
                                    <span style={{ fontSize: "0.875rem", color: "#a3a3a3" }}>
                                        {response.time}ms
                                    </span>
                                </div>

                                <pre
                                    style={{
                                        backgroundColor: "#262626",
                                        padding: "1rem",
                                        borderRadius: 6,
                                        overflow: "auto",
                                        maxHeight: 500,
                                        fontSize: "0.8125rem",
                                        fontFamily: "ui-monospace, monospace",
                                        lineHeight: 1.5,
                                        color: "#d4d4d4",
                                    }}
                                >
                                    {JSON.stringify(response.data, null, 2)}
                                </pre>
                            </>
                        )}

                        {!response && !error && (
                            <div style={{ padding: "3rem", textAlign: "center", color: "#525252" }}>
                                Send a request to see the response
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
