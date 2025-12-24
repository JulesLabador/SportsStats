import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "NFL Stats | Data-Driven Betting Insights",
    description:
        "Fast, visual NFL player statistics for sports bettors. Search players, analyze trends, and make informed betting decisions.",
    keywords: ["NFL", "stats", "betting", "player statistics", "football"],
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    themeColor: "#0B0B0C",
};

/**
 * Root layout component
 * Sets up dark mode as default, applies system fonts, and provides base structure
 */
export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        // Dark mode is the default and primary experience (PRD Section 4.2)
        <html lang="en" className="dark">
            <body
                className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased min-h-screen`}
            >
                {children}
            </body>
        </html>
    );
}
