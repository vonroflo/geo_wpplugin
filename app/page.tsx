import Link from "next/link";

export default function HomePage() {
    return (
        <div
            style={{
                minHeight: "100vh",
                backgroundColor: "#0a0a0a",
                color: "#e5e5e5",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "system-ui, -apple-system, sans-serif",
            }}
        >
            <h1 style={{ fontSize: "2rem", fontWeight: 600, marginBottom: "1rem" }}>
                GEO API v2
            </h1>
            <p style={{ color: "#a3a3a3", marginBottom: "2rem" }}>
                Competitive GEO Intelligence API
            </p>
            <Link
                href="/playground"
                style={{
                    padding: "0.75rem 1.5rem",
                    backgroundColor: "#3b82f6",
                    color: "#fff",
                    borderRadius: 6,
                    textDecoration: "none",
                    fontWeight: 500,
                }}
            >
                Open Playground
            </Link>
        </div>
    );
}
