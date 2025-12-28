"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { HeadToHeadStats, NFLTeam } from "@/lib/types";
import { getTeamFullName } from "@/lib/types";
import { getTeamColor } from "@/lib/team-colors";
import { cn } from "@/lib/utils";

/**
 * Props for HeadToHeadStatsCards component
 */
interface HeadToHeadStatsCardsProps {
    /** Head-to-head statistics data */
    stats: HeadToHeadStats;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Format a record as a string (e.g., "12-8-0" or "12-8")
 */
function formatRecord(wins: number, losses: number, ties: number): string {
    if (ties > 0) {
        return `${wins}-${losses}-${ties}`;
    }
    return `${wins}-${losses}`;
}

/**
 * Calculate win percentage
 */
function calculateWinPercentage(wins: number, totalGames: number): number {
    if (totalGames === 0) return 0;
    return Math.round((wins / totalGames) * 100);
}

/**
 * Get the team that leads the series or null if tied
 */
function getSeriesLeader(
    stats: HeadToHeadStats
): { team: NFLTeam; lead: number } | null {
    if (stats.team1Wins > stats.team2Wins) {
        return { team: stats.team1, lead: stats.team1Wins - stats.team2Wins };
    } else if (stats.team2Wins > stats.team1Wins) {
        return { team: stats.team2, lead: stats.team2Wins - stats.team1Wins };
    }
    return null;
}

/**
 * HeadToHeadStatsCards component
 *
 * Displays key head-to-head statistics in a responsive card grid:
 * - Overall series record with visual win percentage bar
 * - Average points per game for each team
 * - Highest/lowest scores
 * - Current streak indicator
 * - Home/away splits
 * - Biggest margin of victory
 */
export function HeadToHeadStatsCards({
    stats,
    className,
}: HeadToHeadStatsCardsProps) {
    const team1WinPct = calculateWinPercentage(stats.team1Wins, stats.totalGames);
    const team2WinPct = calculateWinPercentage(stats.team2Wins, stats.totalGames);
    const seriesLeader = getSeriesLeader(stats);

    return (
        <div className={cn("space-y-6", className)}>
            {/* Series Record Header */}
            <Card className="overflow-hidden">
                <CardContent className="pt-6">
                    {/* Series leader headline */}
                    <div className="text-center mb-4">
                        {seriesLeader ? (
                            <p className="text-lg font-semibold">
                                <span className={cn(getTeamColor(seriesLeader.team), "px-2 py-1 rounded")}>
                                    {getTeamFullName(seriesLeader.team)}
                                </span>
                                {" "}leads the all-time series
                            </p>
                        ) : (
                            <p className="text-lg font-semibold text-muted-foreground">
                                Series is tied
                            </p>
                        )}
                    </div>

                    {/* Win percentage bar */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className={cn(getTeamColor(stats.team1), "px-2 py-0.5 rounded")}>
                                {stats.team1} ({stats.team1Wins})
                            </span>
                            <span className="text-muted-foreground">
                                {stats.totalGames} games
                            </span>
                            <span className={cn(getTeamColor(stats.team2), "px-2 py-0.5 rounded")}>
                                ({stats.team2Wins}) {stats.team2}
                            </span>
                        </div>

                        {/* Visual bar showing win distribution */}
                        <div className="h-3 rounded-full overflow-hidden bg-muted flex">
                            {stats.team1Wins > 0 && (
                                <div
                                    className="bg-chart-1 transition-all duration-500"
                                    style={{ width: `${team1WinPct}%` }}
                                />
                            )}
                            {stats.ties > 0 && (
                                <div
                                    className="bg-muted-foreground/50 transition-all duration-500"
                                    style={{
                                        width: `${Math.round((stats.ties / stats.totalGames) * 100)}%`,
                                    }}
                                />
                            )}
                            {stats.team2Wins > 0 && (
                                <div
                                    className="bg-chart-2 transition-all duration-500"
                                    style={{ width: `${team2WinPct}%` }}
                                />
                            )}
                        </div>

                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{team1WinPct}%</span>
                            {stats.ties > 0 && <span>{stats.ties} ties</span>}
                            <span>{team2WinPct}%</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* Average Points */}
                <StatCard
                    title="Avg Points/Game"
                    team1Value={stats.team1AvgPoints.toFixed(1)}
                    team2Value={stats.team2AvgPoints.toFixed(1)}
                    team1={stats.team1}
                    team2={stats.team2}
                    highlightHigher
                />

                {/* Highest Score */}
                <StatCard
                    title="Highest Score"
                    team1Value={stats.team1HighestScore.toString()}
                    team2Value={stats.team2HighestScore.toString()}
                    team1={stats.team1}
                    team2={stats.team2}
                    highlightHigher
                />

                {/* Lowest Score */}
                <StatCard
                    title="Lowest Score"
                    team1Value={stats.team1LowestScore.toString()}
                    team2Value={stats.team2LowestScore.toString()}
                    team1={stats.team1}
                    team2={stats.team2}
                    highlightLower
                />

                {/* Current Streak */}
                <Card>
                    <CardContent className="pt-4 pb-4">
                        <h4 className="text-xs text-muted-foreground mb-2 text-center">
                            Current Streak
                        </h4>
                        {stats.currentStreak.team ? (
                            <div className="text-center">
                                <Badge
                                    variant="secondary"
                                    className={cn(getTeamColor(stats.currentStreak.team))}
                                >
                                    {stats.currentStreak.team}
                                </Badge>
                                <p className="text-2xl font-bold mt-1">
                                    {stats.currentStreak.count}W
                                </p>
                            </div>
                        ) : (
                            <p className="text-center text-muted-foreground">
                                No streak
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Home/Away Record for Team1 */}
                <Card>
                    <CardContent className="pt-4 pb-4">
                        <h4 className="text-xs text-muted-foreground mb-2 text-center">
                            {stats.team1} Home/Away
                        </h4>
                        <div className="flex justify-center gap-4 text-sm">
                            <div className="text-center">
                                <p className="text-muted-foreground text-xs">Home</p>
                                <p className="font-semibold">
                                    {formatRecord(
                                        stats.team1HomeRecord.wins,
                                        stats.team1HomeRecord.losses,
                                        stats.team1HomeRecord.ties
                                    )}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-muted-foreground text-xs">Away</p>
                                <p className="font-semibold">
                                    {formatRecord(
                                        stats.team1AwayRecord.wins,
                                        stats.team1AwayRecord.losses,
                                        stats.team1AwayRecord.ties
                                    )}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Biggest Margin of Victory */}
                <Card>
                    <CardContent className="pt-4 pb-4">
                        <h4 className="text-xs text-muted-foreground mb-2 text-center">
                            Biggest Win
                        </h4>
                        {stats.biggestMarginOfVictory ? (
                            <div className="text-center">
                                <Badge
                                    variant="secondary"
                                    className={cn(getTeamColor(stats.biggestMarginOfVictory.team))}
                                >
                                    {stats.biggestMarginOfVictory.team}
                                </Badge>
                                <p className="text-2xl font-bold mt-1">
                                    +{stats.biggestMarginOfVictory.margin}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {stats.biggestMarginOfVictory.game.season} Week{" "}
                                    {stats.biggestMarginOfVictory.game.week}
                                </p>
                            </div>
                        ) : (
                            <p className="text-center text-muted-foreground">N/A</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

/**
 * Props for individual stat card
 */
interface StatCardProps {
    title: string;
    team1Value: string;
    team2Value: string;
    team1: NFLTeam;
    team2: NFLTeam;
    highlightHigher?: boolean;
    highlightLower?: boolean;
}

/**
 * Individual stat comparison card
 */
function StatCard({
    title,
    team1Value,
    team2Value,
    team1,
    team2,
    highlightHigher,
    highlightLower,
}: StatCardProps) {
    const val1 = parseFloat(team1Value);
    const val2 = parseFloat(team2Value);

    // Determine which value to highlight
    let team1Highlight = false;
    let team2Highlight = false;

    if (highlightHigher) {
        team1Highlight = val1 > val2;
        team2Highlight = val2 > val1;
    } else if (highlightLower) {
        team1Highlight = val1 < val2;
        team2Highlight = val2 < val1;
    }

    return (
        <Card>
            <CardContent className="pt-4 pb-4">
                <h4 className="text-xs text-muted-foreground mb-3 text-center">
                    {title}
                </h4>
                <div className="flex justify-between items-center">
                    <div className="text-center flex-1">
                        <p className="text-xs text-muted-foreground mb-1">{team1}</p>
                        <p
                            className={cn(
                                "text-xl font-bold",
                                team1Highlight && "text-stat-positive"
                            )}
                        >
                            {team1Value}
                        </p>
                    </div>
                    <div className="text-muted-foreground text-xs px-2">vs</div>
                    <div className="text-center flex-1">
                        <p className="text-xs text-muted-foreground mb-1">{team2}</p>
                        <p
                            className={cn(
                                "text-xl font-bold",
                                team2Highlight && "text-stat-positive"
                            )}
                        >
                            {team2Value}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}


