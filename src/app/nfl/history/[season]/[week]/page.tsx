import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SearchWrapper } from "@/components/search/search-wrapper";
import { BackButton } from "@/components/ui/back-button";
import {
    HistoryGameCard,
    HistoryGameCardSkeleton,
    HistoryPagination,
    HistoryFilters,
} from "@/components/history";
import {
    getHistoricGamesWithStats,
    getAvailableHistoricSeasons,
    getAvailableWeeksForSeason,
} from "@/lib/data";

/**
 * Page props with dynamic route params
 */
interface HistoryPageProps {
    params: Promise<{
        season: string;
        week: string;
    }>;
}

/**
 * Generate static params for all season/week combinations
 * This pre-renders every possible page at build time for SEO
 *
 * @returns Array of all season/week param combinations
 */
export async function generateStaticParams(): Promise<
    { season: string; week: string }[]
> {
    const seasons = await getAvailableHistoricSeasons();
    const params: { season: string; week: string }[] = [];

    // Generate params for each season and its weeks
    for (const season of seasons) {
        const weeks = await getAvailableWeeksForSeason(season);
        for (const week of weeks) {
            params.push({
                season: season.toString(),
                week: week.toString(),
            });
        }
    }

    return params;
}

/**
 * Get week label for SEO metadata
 * @param week - Week number
 * @returns Formatted week label
 */
function getWeekLabel(week: number): string {
    if (week > 18) {
        switch (week) {
            case 19:
                return "Wild Card";
            case 20:
                return "Divisional Round";
            case 21:
                return "Conference Championships";
            case 22:
                return "Super Bowl";
            default:
                return `Playoff Week ${week - 18}`;
        }
    }
    return `Week ${week}`;
}

/**
 * Generate dynamic metadata for SEO
 * Creates unique, descriptive titles and descriptions for each season/week
 */
export async function generateMetadata({
    params,
}: HistoryPageProps): Promise<Metadata> {
    const { season: seasonStr, week: weekStr } = await params;
    const season = parseInt(seasonStr, 10);
    const week = parseInt(weekStr, 10);

    // Validate params
    if (isNaN(season) || isNaN(week)) {
        return {
            title: "Game History | SportsStats",
            description: "Browse NFL game history by season and week.",
        };
    }

    const weekLabel = getWeekLabel(week);
    const isPlayoff = week > 18;

    const title = `NFL ${weekLabel} ${season} Game Results | SportsStats`;
    const description = isPlayoff
        ? `View all NFL ${weekLabel} ${season} playoff game results, scores, passing stats, and rushing yards. Complete game history and statistics.`
        : `View all NFL ${weekLabel} ${season} game results, scores, passing stats, and rushing yards. Complete regular season game history.`;

    // Canonical URL for SEO
    const canonicalUrl = `/nfl/history/${season}/${week}`;

    return {
        title,
        description,
        keywords: [
            `NFL ${season}`,
            `${weekLabel} ${season}`,
            "NFL game results",
            "NFL scores",
            "NFL statistics",
            isPlayoff ? "NFL playoffs" : "NFL regular season",
        ],
        openGraph: {
            title,
            description,
            type: "website",
            url: canonicalUrl,
            siteName: "SportsStats",
        },
        twitter: {
            card: "summary",
            title,
            description,
        },
        alternates: {
            canonical: canonicalUrl,
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
}

/**
 * NFL Game History Browser Page
 *
 * Server Component that displays historic NFL game results:
 * - Statically generated for all season/week combinations
 * - Previous/Next pagination for navigation
 * - Game cards with scores and team stats
 * - SEO-optimized metadata for each season/week
 *
 * URL: /nfl/history/2024/15
 */
export default async function HistoryPage({ params }: HistoryPageProps) {
    const { season: seasonStr, week: weekStr } = await params;
    const season = parseInt(seasonStr, 10);
    const week = parseInt(weekStr, 10);

    // Validate params
    if (isNaN(season) || isNaN(week)) {
        notFound();
    }

    // Get available seasons and weeks for navigation
    const [availableSeasons, availableWeeks] = await Promise.all([
        getAvailableHistoricSeasons(),
        getAvailableWeeksForSeason(season),
    ]);

    // Validate that this season/week exists
    if (!availableSeasons.includes(season) || !availableWeeks.includes(week)) {
        notFound();
    }

    // Fetch games with stats for the selected season/week
    const games = await getHistoricGamesWithStats(season, week);

    return (
        <main className="min-h-screen pb-16">
            <div className="max-w-6xl mx-auto px-4 py-6">
                {/* Search bar for quick navigation */}
                <SearchWrapper className="mb-6" />

                {/* Back button */}
                <BackButton className="mb-6" />

                {/* Page header with filters */}
                <HistoryFilters
                    season={season}
                    week={week}
                    gameCount={games.length}
                    className="mb-6"
                />

                {/* Pagination */}
                <HistoryPagination
                    season={season}
                    week={week}
                    availableWeeks={availableWeeks}
                    availableSeasons={availableSeasons}
                    className="mb-8"
                />

                {/* Games grid */}
                {games.length === 0 ? (
                    <EmptyState message="No games found for this week." />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {games.map((game) => (
                            <HistoryGameCard key={game.id} game={game} />
                        ))}
                    </div>
                )}

                {/* Bottom pagination for long lists */}
                {games.length > 6 && (
                    <HistoryPagination
                        season={season}
                        week={week}
                        availableWeeks={availableWeeks}
                        availableSeasons={availableSeasons}
                        className="mt-8"
                    />
                )}
            </div>
        </main>
    );
}

/**
 * Empty state component for when no games are found
 */
function EmptyState({ message }: { message: string }) {
    return (
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
            <h3 className="text-lg font-medium mb-2">No Games Found</h3>
            <p className="text-muted-foreground">{message}</p>
        </div>
    );
}

/**
 * Loading skeleton for the history page
 * Used during Suspense fallback
 */
export function HistoryPageSkeleton() {
    return (
        <main className="min-h-screen pb-16">
            <div className="max-w-6xl mx-auto px-4 py-6">
                {/* Search skeleton */}
                <div className="h-10 w-full bg-muted rounded-lg animate-pulse mb-6" />

                {/* Back button skeleton */}
                <div className="h-9 w-20 bg-muted rounded animate-pulse mb-6" />

                {/* Header skeleton */}
                <div className="space-y-2 mb-6">
                    <div className="h-8 w-40 bg-muted rounded animate-pulse" />
                    <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                </div>

                {/* Pagination skeleton */}
                <div className="flex justify-between items-center mb-8">
                    <div className="h-9 w-24 bg-muted rounded animate-pulse" />
                    <div className="h-10 w-32 bg-muted rounded animate-pulse" />
                    <div className="h-9 w-24 bg-muted rounded animate-pulse" />
                </div>

                {/* Games grid skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <HistoryGameCardSkeleton key={i} />
                    ))}
                </div>
            </div>
        </main>
    );
}

