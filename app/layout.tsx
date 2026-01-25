import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "GeoRank | The GEO API for AI Search Optimization",
    description:
        "The GEO API that tracks your brand across ChatGPT, Claude, Perplexity, and Google AI Overview—then optimizes your content to get cited more.",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <link
                    href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&f[]=cabinet-grotesk@700,800,900&display=swap"
                    rel="stylesheet"
                />
                <link
                    href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body className="m-0">{children}</body>
        </html>
    );
}
