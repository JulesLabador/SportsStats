"use client";

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type {
    HistoricalMatchupStats as HistoricalMatchupStatsType,
    HistoricalGame,
    NFLTeam,
} from "@/lib/types";
import { getTeamFullName } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Props for HistoricalMatchupStats component
 */
interface HistoricalMatchupStatsProps {
    /** Historical matchup statistics data */
    stats: HistoricalMatchupStatsType;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Format a game date for display
 * @param dateString - ISO date string
 * @returns Formatted date string (e.g., "Dec 29, 2024")
 */
function formatGameDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

/**
 * Format the streak text
 * @param streak - The current streak (positive = wins, negative = losses)
 * @returns Formatted streak string
 */
function formatStreak(streak: number): string {
    if (streak === 0) return "No streak";
    if (streak > 0) return `${streak}W`;
    return `${Math.abs(streak)}L`;
}

/**
 * Get streak badge color
 */
function getStreakColor(streak: number): string {
    if (streak > 0) return "bg-green-900/30 text-green-400";
    if (streak < 0) return "bg-red-900/30 text-red-400";
    return "bg-gray-800/50 text-gray-300";
}

/**
 * Format record string (W-L-T)
 */
function formatRecord(wins: number, losses: number, ties: number): string {
    if (ties > 0) {
        return `${wins}-${losses}-${ties}`;
    }
    return `${wins}-${losses}`;
}

/**
 * Single stat row component
 */
function StatRow({
    label,
    team1Value,
    team2Value,
    highlight = "none",
}: {
    label: string;
    team1Value: string | number;
    team2Value: string | number;
    highlight?: "team1" | "team2" | "none";
}) {
    return (
        <div className="grid grid-cols-3 gap-4 items-center py-2 border-b border-border/50 last:border-0">
            <span
                className={cn(
                    "text-right font-medium",
                    highlight === "team1" && "text-green-400"
                )}
            >
                {team1Value}
            </span>
            <span className="text-center text-sm text-muted-foreground">
                {label}
            </span>
            <span
                className={cn(
                    "text-left font-medium",
                    highlight === "team2" && "text-green-400"
                )}
            >
                {team2Value}
            </span>
        </div>
    );
}

/**
 * Notable game card component
 */
function NotableGame({
    title,
    game,
}: {
    title: string;
    game: HistoricalGame | null;
}) {
    if (!game) return null;

    const score = `${game.awayTeam} ${game.awayScore} @ ${game.homeTeam} ${game.homeScore}`;

    return (
        <div className="p-3 bg-muted/30 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">{title}</div>
            <div className="font-medium text-sm">{score}</div>
            <div className="text-xs text-muted-foreground mt-1">
                {formatGameDate(game.gameDate)} · Week {game.week},{" "}
                {game.season}
            </div>
        </div>
    );
}

/**
 * Recent games list component
 */
function RecentGamesList({
    games,
    team1,
    team2,
    limit = 5,
}: {
    games: HistoricalGame[];
    team1: NFLTeam;
    team2: NFLTeam;
    limit?: number;
}) {
    const recentGames = games.slice(0, limit);

    if (recentGames.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-4">
                No recent meetings
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {recentGames.map((game) => {
                const winner =
                    game.homeScore > game.awayScore
                        ? game.homeTeam
                        : game.homeScore < game.awayScore
                          ? game.awayTeam
                          : null;

                return (
                    <div
                        key={game.id}
                        className="flex items-center justify-between p-2 bg-muted/20 rounded-md"
                    >
                        <div className="flex items-center gap-2">
                            <Badge
                                variant={
                                    winner === team1
                                        ? "default"
                                        : winner === team2
                                          ? "destructive"
                                          : "secondary"
                                }
                                className="text-xs"
                            >
                                {winner === team1
                                    ? `${team1} W`
                                    : winner === team2
                                      ? `${team2} W`
                                      : "TIE"}
                            </Badge>
                            <span className="text-sm font-medium">
                                {game.awayScore} - {game.homeScore}
                            </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            Week {game.week}, {game.season}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/**
 * HistoricalMatchupStats Component
 *
 * Displays comprehensive historical statistics for matchups between two NFL teams:
 * - Overall head-to-head record
 * - Scoring statistics
 * - Notable games (highest scoring, closest, etc.)
 * - Recent meeting history
 * - Current streak information
 *
 * @example
 * ```tsx
 * <HistoricalMatchupStats stats={matchupStats} />
 * ```
 */
export function HistoricalMatchupStats({
    stats,
    className,
}: HistoricalMatchupStatsProps) {
    const { team1, team2, team1Stats, team2Stats, totalGames } = stats;

    // If no games have been played, show a message
    if (totalGames === 0) {
        return (
            <Card className={className}>
                <CardHeader>
                    <CardTitle className="text-center">
                        Historical Matchup
                    </CardTitle>
                    <CardDescription className="text-center">
                        {getTeamFullName(team1)} vs {getTeamFullName(team2)}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center text-muted-foreground py-8">
                        No historical data available for this matchup
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className={cn("space-y-6", className)}>
            {/* Main stats card */}
            <Card>
                <CardHeader className="text-center">
                    <CardTitle>Historical Matchup</CardTitle>
                    <CardDescription>
                        All-time head-to-head record ({totalGames}{" "}
                        {totalGames === 1 ? "game" : "games"})
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Team headers */}
                    <div className="grid grid-cols-3 gap-4 mb-4 pb-4 border-b border-border">
                        <div className="text-right">
                            <div className="font-bold text-lg">{team1}</div>
                            <div className="text-xs text-muted-foreground">
                                {getTeamFullName(team1)}
                            </div>
                        </div>
                        <div className="text-center text-muted-foreground text-sm self-center">
                            vs
                        </div>
                        <div className="text-left">
                            <div className="font-bold text-lg">{team2}</div>
                            <div className="text-xs text-muted-foreground">
                                {getTeamFullName(team2)}
                            </div>
                        </div>
                    </div>

                    {/* Head-to-head record */}
                    <StatRow
                        label="Overall Record"
                        team1Value={formatRecord(
                            team1Stats.wins,
                            team1Stats.losses,
                            team1Stats.ties
                        )}
                        team2Value={formatRecord(
                            team2Stats.wins,
                            team2Stats.losses,
                            team2Stats.ties
                        )}
                        highlight={
                            team1Stats.wins > team2Stats.wins
                                ? "team1"
                                : team2Stats.wins > team1Stats.wins
                                  ? "team2"
                                  : "none"
                        }
                    />

                    {/* Win percentage - calculated inline */}
                    <StatRow
                        label="Win %"
                        team1Value={
                            totalGames > 0
                                ? `${Math.round((team1Stats.wins / totalGames) * 100)}%`
                                : "0%"
                        }
                        team2Value={
                            totalGames > 0
                                ? `${Math.round((team2Stats.wins / totalGames) * 100)}%`
                                : "0%"
                        }
                        highlight={
                            team1Stats.wins > team2Stats.wins
                                ? "team1"
                                : team2Stats.wins > team1Stats.wins
                                  ? "team2"
                                  : "none"
                        }
                    />

                    {/* Average points scored */}
                    <StatRow
                        label="Avg Points"
                        team1Value={team1Stats.avgPointsScored}
                        team2Value={team2Stats.avgPointsScored}
                        highlight={
                            team1Stats.avgPointsScored >
                            team2Stats.avgPointsScored
                                ? "team1"
                                : team2Stats.avgPointsScored >
                                    team1Stats.avgPointsScored
                                  ? "team2"
                                  : "none"
                        }
                    />

                    {/* Total points scored */}
                    <StatRow
                        label="Total Points"
                        team1Value={team1Stats.totalPointsScored}
                        team2Value={team2Stats.totalPointsScored}
                        highlight={
                            team1Stats.totalPointsScored >
                            team2Stats.totalPointsScored
                                ? "team1"
                                : team2Stats.totalPointsScored >
                                    team1Stats.totalPointsScored
                                  ? "team2"
                                  : "none"
                        }
                    />

                    {/* Point differential */}
                    <StatRow
                        label="Point Diff"
                        team1Value={
                            team1Stats.totalPointsScored -
                            team1Stats.totalPointsAllowed >
                            0
                                ? `+${team1Stats.totalPointsScored - team1Stats.totalPointsAllowed}`
                                : team1Stats.totalPointsScored -
                                  team1Stats.totalPointsAllowed
                        }
                        team2Value={
                            team2Stats.totalPointsScored -
                            team2Stats.totalPointsAllowed >
                            0
                                ? `+${team2Stats.totalPointsScored - team2Stats.totalPointsAllowed}`
                                : team2Stats.totalPointsScored -
                                  team2Stats.totalPointsAllowed
                        }
                        highlight={
                            team1Stats.totalPointsScored -
                                team1Stats.totalPointsAllowed >
                            team2Stats.totalPointsScored -
                                team2Stats.totalPointsAllowed
                                ? "team1"
                                : team2Stats.totalPointsScored -
                                        team2Stats.totalPointsAllowed >
                                    team1Stats.totalPointsScored -
                                        team1Stats.totalPointsAllowed
                                  ? "team2"
                                  : "none"
                        }
                    />

                    {/* Current streak */}
                    <div className="grid grid-cols-3 gap-4 items-center py-2 mt-2">
                        <div className="text-right">
                            <Badge className={getStreakColor(team1Stats.currentStreak)}>
                                {formatStreak(team1Stats.currentStreak)}
                            </Badge>
                        </div>
                        <span className="text-center text-sm text-muted-foreground">
                            Current Streak
                        </span>
                        <div className="text-left">
                            <Badge className={getStreakColor(team2Stats.currentStreak)}>
                                {formatStreak(team2Stats.currentStreak)}
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Notable games grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Highest scoring games by team */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">
                            Highest Scoring Wins
                        </CardTitle>
                        <CardDescription>
                            Most points scored in a victory
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {team1Stats.highestScoringWin && (
                            <NotableGame
                                title={`${team1}&apos;s Best`}
                                game={team1Stats.highestScoringWin}
                            />
                        )}
                        {team2Stats.highestScoringWin && (
                            <NotableGame
                                title={`${team2}&apos;s Best`}
                                game={team2Stats.highestScoringWin}
                            />
                        )}
                        {!team1Stats.highestScoringWin &&
                            !team2Stats.highestScoringWin && (
                                <div className="text-muted-foreground text-sm text-center py-2">
                                    No wins recorded
                                </div>
                            )}
                    </CardContent>
                </Card>

                {/* Highest scoring losses by team */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">
                            Highest Scoring Losses
                        </CardTitle>
                        <CardDescription>
                            Most points scored in a defeat
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {team1Stats.highestScoringLoss && (
                            <NotableGame
                                title={`${team1}&apos;s Heartbreak`}
                                game={team1Stats.highestScoringLoss}
                            />
                        )}
                        {team2Stats.highestScoringLoss && (
                            <NotableGame
                                title={`${team2}&apos;s Heartbreak`}
                                game={team2Stats.highestScoringLoss}
                            />
                        )}
                        {!team1Stats.highestScoringLoss &&
                            !team2Stats.highestScoringLoss && (
                                <div className="text-muted-foreground text-sm text-center py-2">
                                    No losses recorded
                                </div>
                            )}
                    </CardContent>
                </Card>

                {/* Largest victories */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">
                            Largest Blowouts
                        </CardTitle>
                        <CardDescription>
                            Biggest margin of victory
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {team1Stats.largestVictory && (
                            <NotableGame
                                title={`${team1}&apos;s Biggest Win`}
                                game={team1Stats.largestVictory}
                            />
                        )}
                        {team2Stats.largestVictory && (
                            <NotableGame
                                title={`${team2}&apos;s Biggest Win`}
                                game={team2Stats.largestVictory}
                            />
                        )}
                        {!team1Stats.largestVictory &&
                            !team2Stats.largestVictory && (
                                <div className="text-muted-foreground text-sm text-center py-2">
                                    No victories recorded
                                </div>
                            )}
                    </CardContent>
                </Card>

                {/* Memorable games */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">
                            Memorable Games
                        </CardTitle>
                        <CardDescription>
                            Notable matchups in series history
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {stats.highestScoringGame && (
                            <NotableGame
                                title="Highest Combined Score"
                                game={stats.highestScoringGame}
                            />
                        )}
                        {stats.closestGame && (
                            <NotableGame
                                title="Closest Game"
                                game={stats.closestGame}
                            />
                        )}
                        {stats.lowestScoringGame && (
                            <NotableGame
                                title="Defensive Battle"
                                game={stats.lowestScoringGame}
                            />
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Recent meetings */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Recent Meetings</CardTitle>
                    <CardDescription>
                        Last {Math.min(5, stats.games.length)} games between
                        these teams
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <RecentGamesList
                        games={stats.games}
                        team1={team1}
                        team2={team2}
                        limit={5}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
