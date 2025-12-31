import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchWrapper } from "@/components/search/search-wrapper";
import {
    getFeaturedPlayers,
    getUpcomingGames,
    getTeamRecords,
} from "@/lib/data";
import type { Player, NFLGame, NFLTeam } from "@/lib/types";
import { TeamBadge } from "@/components/player/team-badge";
import { PositionBadge } from "@/components/player/position-badge";
import { UpcomingMatchCard } from "@/components/matchup/upcoming-match-card";

/**
 * SEO metadata for the home page
 */
export const metadata: Metadata = {
    title: "StatLine | Player Statistics for Smarter Betting",
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
        title: "StatLine | Player Statistics for Smarter Betting",
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
 * - Upcoming matches section with vertical timeline display
 * - Static hero section and footer
 */

/**
 * Get the date string (YYYY-MM-DD) in Eastern timezone for grouping
 * Uses Intl.DateTimeFormat for reliable server-side timezone handling
 *
 * @param dateString - ISO date string
 * @returns Date string in YYYY-MM-DD format (Eastern timezone)
 */
function getEasternDateKey(dateString: string): string {
    const date = new Date(dateString);

    // Use Intl.DateTimeFormat for reliable timezone conversion
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });

    const parts = formatter.formatToParts(date);
    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;

    return `${year}-${month}-${day}`;
}

/**
 * Get the hour (0-23) in Eastern timezone for grouping
 * Uses Intl.DateTimeFormat for reliable server-side timezone handling
 *
 * @param dateString - ISO date string
 * @returns Hour number (0-23) in Eastern timezone
 */
function getEasternHour(dateString: string): number {
    const date = new Date(dateString);

    // Use Intl.DateTimeFormat for reliable timezone conversion
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour: "numeric",
        hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const hourPart = parts.find((p) => p.type === "hour")?.value ?? "0";

    return parseInt(hourPart, 10);
}

/**
 * Format a date key for display as a day header
 * @param dateKey - Date string in YYYY-MM-DD format
 * @returns Formatted date string (e.g., "Sunday, December 29")
 */
function formatDayHeader(dateKey: string): string {
    // Parse the date key and create a date at noon to avoid timezone issues
    const [year, month, day] = dateKey.split("-").map(Number);
    const date = new Date(year, month - 1, day, 12, 0, 0);
    return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
    });
}

/**
 * Format time for display in both ET and PT
 * Uses the first game in the time slot to get the exact time
 * @param games - Array of games in this time slot
 * @returns Object with formatted Eastern and Pacific times
 */
function formatTimeSlotHeader(games: NFLGame[]): {
    easternTime: string;
    pacificTime: string;
} {
    // Use the first game&apos;s time for the header
    const date = new Date(games[0].gameDate);

    const easternTime = date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "America/New_York",
    });

    const pacificTime = date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "America/Los_Angeles",
    });

    return { easternTime, pacificTime };
}

/**
 * Group games by day (date string) and then by hour within each day
 * Games within the same hour are grouped together regardless of exact minute
 *
 * @param games - Array of NFL games
 * @returns Nested Map: day (YYYY-MM-DD) -> hour (0-23) -> games
 */
function groupGamesByDayAndHour(
    games: NFLGame[]
): Map<string, Map<number, NFLGame[]>> {
    const grouped = new Map<string, Map<number, NFLGame[]>>();

    games.forEach((game) => {
        const dateKey = getEasternDateKey(game.gameDate);
        const hour = getEasternHour(game.gameDate);

        // Get or create the day map
        if (!grouped.has(dateKey)) {
            grouped.set(dateKey, new Map<number, NFLGame[]>());
        }
        const dayMap = grouped.get(dateKey)!;

        // Get or create the hour array
        if (!dayMap.has(hour)) {
            dayMap.set(hour, []);
        }
        dayMap.get(hour)!.push(game);
    });

    // Sort days chronologically and hours within each day
    const sortedResult = new Map<string, Map<number, NFLGame[]>>();
    const sortedDays = Array.from(grouped.keys()).sort();

    sortedDays.forEach((day) => {
        const dayMap = grouped.get(day)!;
        const sortedHours = Array.from(dayMap.keys()).sort((a, b) => a - b);
        const sortedDayMap = new Map<number, NFLGame[]>();

        sortedHours.forEach((hour) => {
            sortedDayMap.set(hour, dayMap.get(hour)!);
        });

        sortedResult.set(day, sortedDayMap);
    });

    return sortedResult;
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

    // Group games by day and hour for timeline display
    const gamesByDayAndHour = groupGamesByDayAndHour(upcomingGames);

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
                    // Games grouped by day and time in timeline format
                    <div className="flex flex-col gap-6 sm:gap-8">
                        {Array.from(gamesByDayAndHour.entries()).map(
                            ([dateKey, hourMap]) => (
                                <div key={dateKey}>
                                    {/* Day header with decorative lines */}
                                    <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
                                        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-border" />
                                        <h3 className="text-xs sm:text-sm font-semibold text-foreground tracking-wide uppercase whitespace-nowrap">
                                            {formatDayHeader(dateKey)}
                                        </h3>
                                        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-border" />
                                    </div>

                                    {/* Time slots within this day */}
                                    <div className="flex flex-col gap-4 sm:gap-6">
                                        {Array.from(hourMap.entries()).map(
                                            ([hour, games]) => {
                                                const {
                                                    easternTime,
                                                    pacificTime,
                                                } = formatTimeSlotHeader(games);
                                                return (
                                                    <div
                                                        key={hour}
                                                        className="flex gap-2 sm:gap-4"
                                                    >
                                                        {/* Time column (left side - y-axis header) */}
                                                        <div className="w-16 sm:w-28 shrink-0 pt-0.5 sm:pt-1">
                                                            <div className="text-[11px] sm:text-sm font-semibold text-foreground leading-tight">
                                                                {easternTime}{" "}
                                                                <span className="text-muted-foreground font-normal">
                                                                    ET
                                                                </span>
                                                            </div>
                                                            <div className="text-[10px] sm:text-xs text-muted-foreground leading-tight">
                                                                {pacificTime}{" "}
                                                                <span className="text-muted-foreground/60">
                                                                    PT
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Vertical line separator */}
                                                        <div className="w-px bg-border relative">
                                                            {/* Dot at the top */}
                                                            <div className="absolute -left-0.5 sm:-left-1 top-1.5 sm:top-2 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-muted-foreground/40" />
                                                        </div>

                                                        {/* Games column */}
                                                        <div className="flex-1 flex flex-col gap-1.5 sm:gap-2 min-w-0">
                                                            {games.map(
                                                                (game) => (
                                                                    <UpcomingMatchCard
                                                                        key={
                                                                            game.id
                                                                        }
                                                                        game={
                                                                            game
                                                                        }
                                                                        teamRecords={
                                                                            teamRecords
                                                                        }
                                                                    />
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            }
                                        )}
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
