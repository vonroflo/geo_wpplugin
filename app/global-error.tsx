"use client";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html lang="en">
            <body style={{ margin: 0 }}>
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
                        <span style={{ fontSize: "4rem", marginBottom: "1rem", display: "block" }}>💥</span>
                        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                            Critical Error
                        </h1>
                        <p style={{ color: "#71717a", marginBottom: "1.5rem" }}>
                            {error.message || "A critical error occurred"}
                        </p>
                        <button
                            onClick={reset}
                            style={{
                                padding: "0.75rem 1.5rem",
                                backgroundColor: "#3b82f6",
                                color: "#fff",
                                border: "none",
                                borderRadius: 8,
                                fontSize: "0.875rem",
                                fontWeight: 500,
                                cursor: "pointer",
                            }}
                        >
                            Try again
                        </button>
                    </div>
                </div>
            </body>
        </html>
    );
}
