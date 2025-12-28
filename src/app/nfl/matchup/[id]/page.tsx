import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SearchWrapper } from "@/components/search/search-wrapper";
import { MatchupHeader } from "@/components/matchup/matchup-header";
import { TeamRosterTable } from "@/components/matchup/team-roster-table";
import { MatchupHistorySection } from "@/components/matchup/matchup-history-section";
import { getGameById, getTeamPlayers, getHeadToHeadHistory } from "@/lib/data";
import { getTeamFullName } from "@/lib/types";

/**
 * Page props with dynamic route params
 */
interface MatchupPageProps {
    params: Promise<{
        id: string;
    }>;
}

/**
 * Generate dynamic metadata for SEO based on game data
 */
export async function generateMetadata({
    params,
}: MatchupPageProps): Promise<Metadata> {
    const { id } = await params;
    const game = await getGameById(id);

    // Return default metadata if game not found
    if (!game) {
        return {
            title: "Matchup Not Found | NFL Stats",
            description: "The requested matchup could not be found.",
        };
    }

    const awayName = getTeamFullName(game.awayTeam);
    const homeName = getTeamFullName(game.homeTeam);
    const title = `${awayName} @ ${homeName} | Week ${game.week} | NFL Stats`;
    const description = `View the ${awayName} vs ${homeName} matchup for Week ${game.week}. See team rosters, player stats, and game details.`;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            type: "website",
        },
    };
}

/**
 * Matchup page (Server Component)
 *
 * Displays:
 * - Game header with teams, score (if available), date/time, venue
 * - Head-to-head history section with statistics and game history
 * - Two-column layout with team rosters
 * - Player links to individual player pages
 * - Team links to team pages
 */
export default async function MatchupPage({ params }: MatchupPageProps) {
    const { id: gameId } = await params;

    // Fetch game data
    const game = await getGameById(gameId);

    // If game not found, show 404
    if (!game) {
        notFound();
    }

    // Fetch rosters and head-to-head history in parallel
    // Away team is team1, home team is team2 for consistency
    const [homeRoster, awayRoster, recentHistory, allTimeHistory] =
        await Promise.all([
            getTeamPlayers(game.homeTeam, game.season),
            getTeamPlayers(game.awayTeam, game.season),
            getHeadToHeadHistory(game.awayTeam, game.homeTeam, 5), // Last 5 seasons
            getHeadToHeadHistory(game.awayTeam, game.homeTeam, null), // All-time
        ]);

    return (
        <main className="min-h-screen pb-16">
            <div className="max-w-6xl mx-auto px-4 py-6">
                {/* Search bar for quick navigation */}
                <SearchWrapper className="mb-6" />

                {/* Back button */}
                <Link href="/">
                    <Button
                        variant="secondary"
                        size="sm"
                        className="mb-6 hover:cursor-pointer"
                    >
                        <svg
                            className="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 19l-7-7 7-7"
                            />
                        </svg>
                        Back
                    </Button>
                </Link>

                {/* Matchup header */}
                <MatchupHeader game={game} className="mb-10" />

                {/* Head-to-head history section */}
                <MatchupHistorySection
                    stats={recentHistory}
                    allTimeStats={allTimeHistory}
                    className="mb-10"
                />

                {/* Team rosters - two column layout */}
                <section>
                    <h2 className="text-lg font-semibold mb-6 text-center">
                        Team Rosters
                    </h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Away team roster */}
                        <TeamRosterTable
                            team={game.awayTeam}
                            players={awayRoster}
                            isHome={false}
                        />

                        {/* Home team roster */}
                        <TeamRosterTable
                            team={game.homeTeam}
                            players={homeRoster}
                            isHome={true}
                        />
                    </div>
                </section>
            </div>
        </main>
    );
}

