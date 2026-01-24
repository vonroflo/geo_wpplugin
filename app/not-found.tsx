import Link from "next/link";

export default function NotFound() {
    return (
        <div
            style={{
                minHeight: "100vh",
                backgroundColor: "#09090b",
                color: "#fafafa",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "system-ui, -apple-system, sans-serif",
                padding: "2rem",
            }}
        >
            <div style={{ textAlign: "center", maxWidth: 500 }}>
                <span style={{ fontSize: "4rem", marginBottom: "1rem", display: "block" }}>🔍</span>
                <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                    Page Not Found
                </h1>
                <p style={{ color: "#71717a", marginBottom: "1.5rem" }}>
                    The page you're looking for doesn't exist.
                </p>
                <Link
                    href="/"
                    style={{
                        display: "inline-block",
                        padding: "0.75rem 1.5rem",
                        backgroundColor: "#3b82f6",
                        color: "#fff",
                        borderRadius: 8,
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        textDecoration: "none",
                    }}
                >
                    Go Home
                </Link>
            </div>
        </div>
    );
}
