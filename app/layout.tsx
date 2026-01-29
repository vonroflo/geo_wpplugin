import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "AI Generative Search Optimizer | Free WordPress Plugin",
    description:
        "Free WordPress plugin that optimizes your content for AI search engines like Google SGE, ChatGPT, Perplexity, and DeepSeek with structured data, entity optimization, and GEO scoring.",
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
