import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "GEO API",
    description: "Competitive GEO Intelligence API",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className="m-0">{children}</body>
        </html>
    );
}
