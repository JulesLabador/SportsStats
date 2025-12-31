import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
    getMostRecentCompletedWeek,
    getAvailableHistoricSeasons,
} from "@/lib/data";

/**
 * Static metadata for the history index page
 * This page redirects but still needs SEO metadata for crawlers
 */
export const metadata: Metadata = {
    title: "NFL Game History | Browse All Seasons & Weeks | SportsStats",
    description:
        "Browse complete NFL game history by season and week. View scores, passing stats, rushing yards, and detailed game results from every NFL matchup.",
    keywords: [
        "NFL game history",
        "NFL scores",
        "NFL results",
        "NFL statistics",
        "NFL season history",
        "NFL weekly results",
    ],
    openGraph: {
        title: "NFL Game History | Browse All Seasons & Weeks | SportsStats",
        description:
            "Browse complete NFL game history by season and week. View scores, passing stats, rushing yards, and detailed game results from every NFL matchup.",
        type: "website",
        url: "/nfl/history",
        siteName: "SportsStats",
    },
    twitter: {
        card: "summary",
        title: "NFL Game History | SportsStats",
        description:
            "Browse complete NFL game history by season and week. View scores and detailed game results.",
    },
    alternates: {
        canonical: "/nfl/history",
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
        },
    },
};

/**
 * History Index Page
 *
 * Redirects to the most recent completed week&apos;s history page.
 * This ensures users always land on a page with content.
 */
export default async function HistoryIndexPage() {
    // Get the most recent completed week
    const mostRecent = await getMostRecentCompletedWeek();

    if (mostRecent) {
        redirect(`/nfl/history/${mostRecent.season}/${mostRecent.week}`);
    }

    // Fallback: try to get any available season
    const seasons = await getAvailableHistoricSeasons();
    if (seasons.length > 0) {
        // Redirect to season's week 1 as fallback
        redirect(`/nfl/history/${seasons[0]}/1`);
    }

    // If no data at all, show empty state
    return (
        <main className="min-h-screen pb-16">
            <div className="max-w-6xl mx-auto px-4 py-6">
                <div className="text-center py-16">
                    <svg
                        className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                    </svg>
                    <h3 className="text-lg font-medium mb-2">
                        No Game History
                    </h3>
                    <p className="text-muted-foreground">
                        No game history is available yet. Check back after games
                        have been played.
                    </p>
                </div>
            </div>
        </main>
    );
}
