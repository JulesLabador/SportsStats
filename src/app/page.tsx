import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchWrapper } from "@/components/search/search-wrapper";
import {
    getFeaturedPlayers,
    getUpcomingGames,
    getTeamRecords,
} from "@/lib/data";
import { getTeamColor, getPositionColor } from "@/lib/team-colors";
import { cn } from "@/lib/utils";
import type { Player, NFLGame, NFLTeam, TeamRecord } from "@/lib/types";
import { TeamBadge } from "@/components/player/team-badge";
import { PositionBadge } from "@/components/player/position-badge";
import { UpcomingMatchCard } from "@/components/matchup/upcoming-match-card";

/**
 * SEO metadata for the home page
 */
export const metadata: Metadata = {
    title: "NFL Stats | Player Statistics for Smarter Betting",
    description:
        "Search NFL player statistics, analyze performance trends, and make data-driven betting decisions. Fast, visual stats for QBs, RBs, WRs, and TEs.",
    keywords: [
        "NFL",
        "stats",
        "betting",
        "player statistics",
        "football",
        "fantasy football",
    ],
    openGraph: {
        title: "NFL Stats | Player Statistics for Smarter Betting",
        description:
            "Search NFL player statistics, analyze performance trends, and make data-driven betting decisions.",
        type: "website",
    },
};

/**
 * Home page component (Server Component)
 *
 * Features:
 * - Server-side data fetching for featured players and upcoming games (SEO-friendly)
 * - Client-side search via SearchWrapper component
 * - Upcoming matches section
 * - Static hero section and footer
 */
/**
 * Group games by week number for section display
 * @param games - Array of NFL games
 * @returns Map of week number to games in that week
 */
function groupGamesByWeek(games: NFLGame[]): Map<number, NFLGame[]> {
    const grouped = new Map<number, NFLGame[]>();

    games.forEach((game) => {
        const existing = grouped.get(game.week) || [];
        existing.push(game);
        grouped.set(game.week, existing);
    });

    return grouped;
}

/**
 * Extract unique teams from games for record fetching
 * @param games - Array of NFL games
 * @returns Array of unique team abbreviations
 */
function getUniqueTeams(games: NFLGame[]): NFLTeam[] {
    const teams = new Set<NFLTeam>();
    games.forEach((game) => {
        teams.add(game.homeTeam);
        teams.add(game.awayTeam);
    });
    return Array.from(teams);
}

export default async function HomePage() {
    // Fetch data server-side for SEO
    const [featuredPlayers, upcomingGames] = await Promise.all([
        getFeaturedPlayers(),
        getUpcomingGames(12),
    ]);

    // Get unique teams from upcoming games and fetch their records
    // Use the season from the first game (all games should be same season)
    const uniqueTeams = getUniqueTeams(upcomingGames);
    const currentSeason = upcomingGames[0]?.season ?? new Date().getFullYear();
    const teamRecords = await getTeamRecords(uniqueTeams, currentSeason);

    // Group games by week for section headers
    const gamesByWeek = groupGamesByWeek(upcomingGames);

    return (
        <main className="min-h-screen">
            {/* Hero section with search */}
            <section className="relative">
                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-stat-neutral/5 to-transparent pointer-events-none" />

                <div className="relative max-w-3xl mx-auto px-4 pt-8 pb-12 sm:pt-12 sm:pb-16">
                    {/* Tagline */}
                    <div className="text-center mb-8">
                        <p className="text-lg text-muted-foreground max-w-md mx-auto">
                            Fast, visual player statistics for smarter betting
                            decisions
                        </p>
                    </div>

                    {/* Search input (client component) */}
                    <SearchWrapper className="max-w-xl mx-auto" />
                </div>
            </section>

            {/* Upcoming matches section */}
            <section className="max-w-5xl mx-auto px-4 pb-12">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-muted-foreground">
                        Upcoming Matches
                    </h2>
                    <Badge variant="secondary" className="text-xs">
                        NFL
                    </Badge>
                </div>

                {upcomingGames.length === 0 ? (
                    // Empty state
                    <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
                        <p>
                            No upcoming games scheduled. Check back later for
                            the latest matchups.
                        </p>
                    </div>
                ) : (
                    // Games grouped by week
                    <div className="flex flex-col gap-6">
                        {Array.from(gamesByWeek.entries()).map(
                            ([week, games]) => (
                                <div key={week}>
                                    {/* Week section header */}
                                    <div className="flex items-center gap-3 mb-3">
                                        <Badge
                                            variant="outline"
                                            className="text-xs font-semibold px-3 py-1"
                                        >
                                            Week {week}
                                        </Badge>
                                        <div className="flex-1 h-px bg-border" />
                                    </div>

                                    {/* Games in this week */}
                                    <div className="flex flex-col gap-2">
                                        {games.map((game) => (
                                            <UpcomingMatchCard
                                                key={game.id}
                                                game={game}
                                                teamRecords={teamRecords}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                )}
            </section>

            {/* Featured players section */}
            <section className="max-w-5xl mx-auto px-4 pb-16">
                <div className="mb-6">
                    <h2 className="text-lg font-semibold text-muted-foreground">
                        Popular Players
                    </h2>
                </div>

                {featuredPlayers.length === 0 ? (
                    // Empty state
                    <div className="text-center py-12 text-muted-foreground">
                        <p>
                            No players found. Run the ETL pipeline to populate
                            the database.
                        </p>
                    </div>
                ) : (
                    // Player grid
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {featuredPlayers.map((player) => (
                            <PlayerCard key={player.id} player={player} />
                        ))}
                    </div>
                )}
            </section>

            {/* Footer */}
            <footer className="border-t border-border py-8">
                <div className="max-w-5xl mx-auto px-4 text-center text-sm text-muted-foreground">
                    <p>
                        Data for informational purposes only. Not financial
                        advice.
                    </p>
                </div>
            </footer>
        </main>
    );
}

/**
 * Player card component for featured players grid
 *
 * This is a pure component (no hooks) that renders a clickable card
 * linking to the player's detail page.
 */
interface PlayerCardProps {
    player: Player;
}

function PlayerCard({ player }: PlayerCardProps) {
    // Get team and position colors for badges

    return (
        <a href={`/nfl/player/${player.id}`}>
            <Card className="group cursor-pointer transition-colors hover:bg-card/80">
                <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                        {/* Avatar placeholder */}
                        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center shrink-0 group-hover:bg-muted/80 transition-colors">
                            <span className="text-xl font-bold text-muted-foreground">
                                {player.name.charAt(0)}
                            </span>
                        </div>

                        {/* Player info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                                <span className="text-sm text-muted-foreground font-medium">
                                    #{player.jerseyNumber}
                                </span>
                                <h3 className="font-semibold truncate">
                                    {player.name}
                                </h3>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <TeamBadge team={player.team} />
                                <PositionBadge
                                    playerPosition={player.position}
                                />
                            </div>
                        </div>

                        {/* Arrow indicator */}
                        <svg
                            className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                            />
                        </svg>
                    </div>
                </CardContent>
            </Card>
        </a>
    );
}
