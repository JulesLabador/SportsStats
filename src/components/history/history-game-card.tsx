"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { HistoricGameWithStats, NFLTeam } from "@/lib/types";
import { getTeamName, getTeamColor } from "@/lib/team-colors";
import { cn } from "@/lib/utils";

/**
 * Props for HistoryGameCard component
 */
interface HistoryGameCardProps {
    /** The game data with stats to display */
    game: HistoricGameWithStats;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Get the text color class for a team (without background)
 * @param team - Team abbreviation
 * @returns Tailwind text color class
 */
function getTeamTextColor(team: NFLTeam): string {
    const colorClass = getTeamColor(team);
    // Extract just the text color from the full class string
    const textMatch = colorClass.match(/text-[a-z]+-\d+/);
    return textMatch ? textMatch[0] : "text-foreground";
}

/**
 * Format a game date for display
 * @param dateString - ISO date string
 * @returns Formatted date (e.g., "Sun, Dec 29")
 */
function formatGameDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
    });
}

/**
 * Format game time for display
 * @param dateString - ISO date string
 * @returns Formatted time (e.g., "4:25 PM")
 */
function formatGameTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
}

/**
 * Determine the winner of a game
 * @param game - The game to check
 * @returns The winning team or null if tie
 */
function getWinner(game: HistoricGameWithStats): NFLTeam | null {
    if (game.homeScore > game.awayScore) {
        return game.homeTeam;
    } else if (game.awayScore > game.homeScore) {
        return game.awayTeam;
    }
    return null;
}

/**
 * HistoryGameCard component
 *
 * Displays a completed game with team stats:
 * - Winner/loser with scores highlighted
 * - Game date and time
 * - Passing stats (completions/attempts)
 * - Rushing yards
 * - Link to full matchup page
 */
export function HistoryGameCard({ game, className }: HistoryGameCardProps) {
    const winner = getWinner(game);
    const awayTeamName = getTeamName(game.awayTeam);
    const homeTeamName = getTeamName(game.homeTeam);
    const awayWon = winner === game.awayTeam;
    const homeWon = winner === game.homeTeam;
    const isTie = winner === null;

    return (
        <Link href={`/nfl/matchup/${game.id}`}>
            <Card
                className={cn(
                    "group cursor-pointer transition-all hover:bg-card/80 hover:border-border/80",
                    className
                )}
            >
                <CardContent className="p-4">
                    {/* Header: Date and Week */}
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-muted-foreground">
                            {formatGameDate(game.gameDate)} •{" "}
                            {formatGameTime(game.gameDate)}
                        </span>
                        <Badge variant="outline" className="text-xs font-normal">
                            {game.week > 18 ? "Playoff" : `Week ${game.week}`}
                        </Badge>
                    </div>

                    {/* Teams and Scores */}
                    <div className="space-y-2 mb-4">
                        {/* Away Team */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span
                                    className={cn(
                                        "font-medium text-sm truncate",
                                        awayWon
                                            ? getTeamTextColor(game.awayTeam)
                                            : "text-muted-foreground"
                                    )}
                                >
                                    {awayTeamName}
                                </span>
                                {awayWon && (
                                    <svg
                                        className="w-3 h-3 text-stat-positive shrink-0"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                )}
                            </div>
                            <span
                                className={cn(
                                    "font-bold text-lg tabular-nums",
                                    awayWon && "text-stat-positive",
                                    isTie && "text-stat-growth"
                                )}
                            >
                                {game.awayScore}
                            </span>
                        </div>

                        {/* Home Team */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span
                                    className={cn(
                                        "font-medium text-sm truncate",
                                        homeWon
                                            ? getTeamTextColor(game.homeTeam)
                                            : "text-muted-foreground"
                                    )}
                                >
                                    {homeTeamName}
                                </span>
                                {homeWon && (
                                    <svg
                                        className="w-3 h-3 text-stat-positive shrink-0"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                )}
                            </div>
                            <span
                                className={cn(
                                    "font-bold text-lg tabular-nums",
                                    homeWon && "text-stat-positive",
                                    isTie && "text-stat-growth"
                                )}
                            >
                                {game.homeScore}
                            </span>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-border/50 my-3" />

                    {/* Team Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                        {/* Header row */}
                        <div className="text-muted-foreground font-medium">
                            Team
                        </div>
                        <div className="text-muted-foreground font-medium text-center">
                            Passing
                        </div>
                        <div className="text-muted-foreground font-medium text-right">
                            Rush Yds
                        </div>

                        {/* Away team stats */}
                        <div
                            className={cn(
                                "truncate",
                                awayWon ? "text-foreground" : "text-muted-foreground"
                            )}
                        >
                            {game.awayTeam}
                        </div>
                        <div
                            className={cn(
                                "text-center tabular-nums",
                                awayWon ? "text-foreground" : "text-muted-foreground"
                            )}
                        >
                            {game.awayStats.completions}/{game.awayStats.attempts}
                        </div>
                        <div
                            className={cn(
                                "text-right tabular-nums",
                                awayWon ? "text-foreground" : "text-muted-foreground"
                            )}
                        >
                            {game.awayStats.rushingYards}
                        </div>

                        {/* Home team stats */}
                        <div
                            className={cn(
                                "truncate",
                                homeWon ? "text-foreground" : "text-muted-foreground"
                            )}
                        >
                            {game.homeTeam}
                        </div>
                        <div
                            className={cn(
                                "text-center tabular-nums",
                                homeWon ? "text-foreground" : "text-muted-foreground"
                            )}
                        >
                            {game.homeStats.completions}/{game.homeStats.attempts}
                        </div>
                        <div
                            className={cn(
                                "text-right tabular-nums",
                                homeWon ? "text-foreground" : "text-muted-foreground"
                            )}
                        >
                            {game.homeStats.rushingYards}
                        </div>
                    </div>

                    {/* View Details Arrow */}
                    <div className="flex justify-end mt-3">
                        <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors flex items-center gap-1">
                            View Details
                            <svg
                                className="w-3 h-3"
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
                        </span>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

/**
 * Skeleton loader for HistoryGameCard
 */
export function HistoryGameCardSkeleton() {
    return (
        <Card>
            <CardContent className="p-4">
                {/* Header skeleton */}
                <div className="flex items-center justify-between mb-3">
                    <div className="h-3 w-28 bg-muted rounded animate-pulse" />
                    <div className="h-5 w-14 bg-muted rounded animate-pulse" />
                </div>

                {/* Teams skeleton */}
                <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                        <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                        <div className="h-6 w-8 bg-muted rounded animate-pulse" />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                        <div className="h-6 w-8 bg-muted rounded animate-pulse" />
                    </div>
                </div>

                <div className="border-t border-border/50 my-3" />

                {/* Stats skeleton */}
                <div className="grid grid-cols-3 gap-2">
                    {[...Array(9)].map((_, i) => (
                        <div
                            key={i}
                            className="h-3 bg-muted rounded animate-pulse"
                        />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

