"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HeadToHeadStatsCards } from "./head-to-head-stats";
import { HistoricalGamesTable } from "./historical-games-table";
import type { HeadToHeadStats } from "@/lib/types";
import { getTeamFullName } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Props for MatchupHistorySection component
 */
interface MatchupHistorySectionProps {
    /** Head-to-head statistics with limited seasons (default 5) */
    stats: HeadToHeadStats;
    /** Head-to-head statistics with all available seasons */
    allTimeStats: HeadToHeadStats;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Default number of games to show before expanding
 */
const DEFAULT_GAMES_SHOWN = 10;

/**
 * MatchupHistorySection component
 *
 * Container component that combines:
 * - Head-to-head stats cards
 * - Historical games table
 * - "Show more" toggle for viewing all seasons
 *
 * Handles state for:
 * - Toggling between recent (5 seasons) and all-time stats
 * - Expanding/collapsing the games table
 */
export function MatchupHistorySection({
    stats,
    allTimeStats,
    className,
}: MatchupHistorySectionProps) {
    // State for showing all seasons vs recent
    const [showAllSeasons, setShowAllSeasons] = useState(false);

    // State for expanding games table
    const [showAllGames, setShowAllGames] = useState(false);

    // Use appropriate stats based on toggle
    const currentStats = showAllSeasons ? allTimeStats : stats;

    // Determine games to show
    const gamesToShow = showAllGames
        ? currentStats.games
        : currentStats.games.slice(0, DEFAULT_GAMES_SHOWN);

    const hasMoreGames = currentStats.games.length > DEFAULT_GAMES_SHOWN;
    const hasAnyHistory = currentStats.totalGames > 0;

    // Calculate season range for display
    const seasons = currentStats.games.map((g) => g.season);
    const minSeason = seasons.length > 0 ? Math.min(...seasons) : null;
    const maxSeason = seasons.length > 0 ? Math.max(...seasons) : null;
    const seasonRangeText =
        minSeason && maxSeason
            ? minSeason === maxSeason
                ? `${minSeason}`
                : `${minSeason}-${maxSeason}`
            : "";

    // Check if all-time has more data than recent
    const hasMoreAllTimeData = allTimeStats.totalGames > stats.totalGames;

    return (
        <section className={cn("space-y-6", className)}>
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-semibold">
                        Head-to-Head History
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {getTeamFullName(currentStats.team1)} vs{" "}
                        {getTeamFullName(currentStats.team2)}
                        {seasonRangeText && (
                            <span className="ml-2">({seasonRangeText})</span>
                        )}
                    </p>
                </div>

                {/* Season toggle button */}
                {hasMoreAllTimeData && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAllSeasons(!showAllSeasons)}
                        className="hover:cursor-pointer"
                    >
                        {showAllSeasons ? (
                            <>
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
                                        d="M19 9l-7 7-7-7"
                                    />
                                </svg>
                                Show Recent (5 seasons)
                            </>
                        ) : (
                            <>
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
                                        d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                                    />
                                </svg>
                                Show All-Time ({allTimeStats.totalGames} games)
                            </>
                        )}
                    </Button>
                )}
            </div>

            {/* Empty state */}
            {!hasAnyHistory && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <svg
                            className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4"
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
                            No Historical Data
                        </h3>
                        <p className="text-muted-foreground">
                            No completed games found between these teams in our
                            database.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Stats Cards */}
            {hasAnyHistory && <HeadToHeadStatsCards stats={currentStats} />}

            {/* Games Table */}
            {hasAnyHistory && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-medium">
                            Game History
                            <span className="text-muted-foreground font-normal ml-2">
                                ({currentStats.totalGames} games)
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <HistoricalGamesTable
                            games={gamesToShow}
                            team1={currentStats.team1}
                            team2={currentStats.team2}
                        />

                        {/* Show more/less button */}
                        {hasMoreGames && (
                            <div className="mt-4 text-center">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowAllGames(!showAllGames)}
                                    className="hover:cursor-pointer"
                                >
                                    {showAllGames ? (
                                        <>
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
                                                    d="M5 15l7-7 7 7"
                                                />
                                            </svg>
                                            Show Less
                                        </>
                                    ) : (
                                        <>
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
                                                    d="M19 9l-7 7-7-7"
                                                />
                                            </svg>
                                            Show All ({currentStats.games.length} games)
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </section>
    );
}


