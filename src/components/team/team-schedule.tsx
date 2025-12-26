import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TeamBadge } from "@/components/player/team-badge";
import type { NFLGame, NFLTeam } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Props for TeamSchedule component
 */
interface TeamScheduleProps {
    /** The team to show schedule for */
    team: NFLTeam;
    /** Recent completed games */
    recentGames: NFLGame[];
    /** Upcoming scheduled games */
    upcomingGames: NFLGame[];
    /** Additional CSS classes */
    className?: string;
}

/**
 * Format game date for schedule display
 */
function formatScheduleDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
    });
}

/**
 * Determine if team won the game
 */
function didTeamWin(game: NFLGame, team: NFLTeam): boolean | null {
    if (game.status !== "final" || game.homeScore === null || game.awayScore === null) {
        return null;
    }

    const isHome = game.homeTeam === team;
    const teamScore = isHome ? game.homeScore : game.awayScore;
    const oppScore = isHome ? game.awayScore : game.homeScore;

    return teamScore > oppScore;
}

/**
 * Get opponent team from game
 */
function getOpponent(game: NFLGame, team: NFLTeam): NFLTeam {
    return game.homeTeam === team ? game.awayTeam : game.homeTeam;
}

/**
 * Check if team is home
 */
function isHomeGame(game: NFLGame, team: NFLTeam): boolean {
    return game.homeTeam === team;
}

/**
 * TeamSchedule component
 *
 * Displays recent results and upcoming games for a team with:
 * - Recent games with win/loss indicators
 * - Upcoming games with date and opponent
 * - Links to matchup pages
 *
 * @example
 * ```tsx
 * <TeamSchedule
 *   team="KC"
 *   recentGames={recentGames}
 *   upcomingGames={upcomingGames}
 * />
 * ```
 */
export function TeamSchedule({
    team,
    recentGames,
    upcomingGames,
    className,
}: TeamScheduleProps) {
    return (
        <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-6", className)}>
            {/* Recent Results */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Recent Results</CardTitle>
                </CardHeader>
                <CardContent>
                    {recentGames.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            No recent games
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {recentGames.map((game) => (
                                <GameRow
                                    key={game.id}
                                    game={game}
                                    team={team}
                                    showResult={true}
                                />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Upcoming Games */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Upcoming Games</CardTitle>
                </CardHeader>
                <CardContent>
                    {upcomingGames.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            No upcoming games scheduled
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {upcomingGames.map((game) => (
                                <GameRow
                                    key={game.id}
                                    game={game}
                                    team={team}
                                    showResult={false}
                                />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

/**
 * Individual game row component
 */
interface GameRowProps {
    game: NFLGame;
    team: NFLTeam;
    showResult: boolean;
}

function GameRow({ game, team, showResult }: GameRowProps) {
    const opponent = getOpponent(game, team);
    const isHome = isHomeGame(game, team);
    const won = didTeamWin(game, team);

    return (
        <Link
            href={`/matchup/${game.id}`}
            className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors group"
        >
            <div className="flex items-center gap-3">
                {/* Week */}
                <span className="text-xs text-muted-foreground w-10">
                    Wk {game.week}
                </span>

                {/* Home/Away indicator */}
                <span className="text-xs text-muted-foreground w-4">
                    {isHome ? "vs" : "@"}
                </span>

                {/* Opponent */}
                <TeamBadge team={opponent} />
            </div>

            <div className="flex items-center gap-3">
                {showResult && won !== null ? (
                    <>
                        {/* Score */}
                        <span className="text-sm font-medium">
                            {isHome
                                ? `${game.homeScore}-${game.awayScore}`
                                : `${game.awayScore}-${game.homeScore}`}
                        </span>
                        {/* Win/Loss badge */}
                        <Badge
                            variant={won ? "default" : "secondary"}
                            className={cn(
                                "w-6 text-center",
                                won
                                    ? "bg-stat-positive/20 text-stat-positive"
                                    : "bg-stat-negative/20 text-stat-negative"
                            )}
                        >
                            {won ? "W" : "L"}
                        </Badge>
                    </>
                ) : (
                    /* Date for upcoming games */
                    <span className="text-sm text-muted-foreground">
                        {formatScheduleDate(game.gameDate)}
                    </span>
                )}

                {/* Arrow indicator */}
                <svg
                    className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors"
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
        </Link>
    );
}

/**
 * Skeleton loader for TeamSchedule
 */
export function TeamScheduleSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((card) => (
                <Card key={card}>
                    <CardHeader>
                        <div className="h-6 w-32 bg-muted rounded animate-pulse" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {[1, 2, 3].map((row) => (
                                <div
                                    key={row}
                                    className="flex items-center justify-between py-2 px-3"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-4 w-10 bg-muted rounded animate-pulse" />
                                        <div className="h-4 w-4 bg-muted rounded animate-pulse" />
                                        <div className="h-5 w-10 bg-muted rounded animate-pulse" />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

