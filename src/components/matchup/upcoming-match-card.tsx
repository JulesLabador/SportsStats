import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import type { NFLGame, NFLTeam, TeamRecord } from "@/lib/types";
import { getTeamName, getTeamColor } from "@/lib/team-colors";
import { cn } from "@/lib/utils";

/**
 * Props for UpcomingMatchCard component
 */
interface UpcomingMatchCardProps {
    /** The game data to display */
    game: NFLGame;
    /** Map of team abbreviations to their records */
    teamRecords?: Map<NFLTeam, TeamRecord>;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Get the text color class for a team (without background)
 */
function getTeamTextColor(team: NFLTeam): string {
    const colorClass = getTeamColor(team);
    // Extract just the text color from the full class string
    const textMatch = colorClass.match(/text-[a-z]+-\d+/);
    return textMatch ? textMatch[0] : "text-foreground";
}

/**
 * Format a team record as a string (e.g., "10-4" or "10-4-1")
 * @param record - The team&apos;s win/loss/tie record
 * @returns Formatted record string
 */
function formatRecord(record: TeamRecord | undefined): string {
    if (!record) return "";
    const { wins, losses, ties } = record;
    if (ties > 0) {
        return `${wins}-${losses}-${ties}`;
    }
    return `${wins}-${losses}`;
}

/** Average NFL game duration in milliseconds (3.5 hours) */
const NFL_GAME_DURATION_MS = 3.5 * 60 * 60 * 1000;

/**
 * Check if a game is currently live based on start time
 * A game is considered live if:
 * - Current time is after the game start time
 * - Current time is within the expected game duration (3.5 hours)
 *
 * @param gameDate - ISO date string of game start time
 * @returns true if the game is likely in progress
 */
function isGameLive(gameDate: string): boolean {
    const now = new Date();
    const gameStart = new Date(gameDate);
    const gameEnd = new Date(gameStart.getTime() + NFL_GAME_DURATION_MS);

    return now >= gameStart && now <= gameEnd;
}

/**
 * UpcomingMatchCard component
 *
 * Compact card displaying an upcoming NFL game for use in timeline view:
 * - Away team on the left with their record
 * - "@" symbol in the center
 * - Home team on the right with their record
 * - LIVE indicator when game is in progress
 * - Click to navigate to matchup page
 *
 * Time information is displayed in the parent timeline header.
 *
 * @example
 * ```tsx
 * <UpcomingMatchCard game={game} teamRecords={recordsMap} />
 * ```
 */
export function UpcomingMatchCard({
    game,
    teamRecords,
    className,
}: UpcomingMatchCardProps) {
    const awayTeamName = getTeamName(game.awayTeam);
    const homeTeamName = getTeamName(game.homeTeam);
    const awayRecord = teamRecords?.get(game.awayTeam);
    const homeRecord = teamRecords?.get(game.homeTeam);
    const isLive = isGameLive(game.gameDate);

    return (
        <Link href={`/nfl/matchup/${game.id}`}>
            <Card
                className={cn(
                    "group cursor-pointer transition-all hover:bg-card/80 hover:border-border/80",
                    className
                )}
            >
                <CardContent className="p-2 sm:p-4">
                    <div className="flex items-center gap-1.5 sm:gap-3">
                        {/* Away team (left side) */}
                        <div className="flex-1 min-w-0 text-left">
                            <div
                                className={cn(
                                    "font-semibold text-xs sm:text-base leading-tight",
                                    getTeamTextColor(game.awayTeam)
                                )}
                            >
                                {awayTeamName}
                            </div>
                            <div className="text-[10px] sm:text-xs text-muted-foreground">
                                {formatRecord(awayRecord)}
                            </div>
                        </div>

                        {/* Center: @ symbol or LIVE indicator */}
                        <div className="shrink-0 flex flex-col items-center justify-center w-6 sm:w-12">
                            {isLive ? (
                                <div className="flex items-center gap-0.5 sm:gap-1">
                                    <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-red-500" />
                                    </span>
                                    <span className="text-[8px] sm:text-xs font-bold text-red-500 uppercase tracking-wide">
                                        Live
                                    </span>
                                </div>
                            ) : (
                                <span className="text-xs sm:text-sm text-muted-foreground font-medium">
                                    @
                                </span>
                            )}
                        </div>

                        {/* Home team (right side) */}
                        <div className="flex-1 min-w-0 text-right">
                            <div
                                className={cn(
                                    "font-semibold text-xs sm:text-base leading-tight",
                                    getTeamTextColor(game.homeTeam)
                                )}
                            >
                                {homeTeamName}
                            </div>
                            <div className="text-[10px] sm:text-xs text-muted-foreground">
                                {formatRecord(homeRecord)}
                            </div>
                        </div>

                        {/* Arrow indicator */}
                        <svg
                            className="w-3 h-3 sm:w-5 sm:h-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0"
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
        </Link>
    );
}

/**
 * Skeleton loader for UpcomingMatchCard
 */
export function UpcomingMatchCardSkeleton() {
    return (
        <Card>
            <CardContent className="p-2 sm:p-4">
                <div className="flex items-center gap-1.5 sm:gap-3">
                    {/* Away team skeleton */}
                    <div className="flex-1 min-w-0">
                        <div className="h-4 sm:h-5 w-16 sm:w-24 bg-muted rounded animate-pulse" />
                        <div className="h-2.5 sm:h-3 w-8 sm:w-12 bg-muted rounded animate-pulse mt-0.5" />
                    </div>

                    {/* Center @ skeleton */}
                    <div className="shrink-0 w-6 sm:w-12 flex justify-center">
                        <div className="h-3 w-3 sm:h-4 sm:w-4 bg-muted rounded animate-pulse" />
                    </div>

                    {/* Home team skeleton */}
                    <div className="flex-1 min-w-0 flex flex-col items-end">
                        <div className="h-4 sm:h-5 w-16 sm:w-24 bg-muted rounded animate-pulse" />
                        <div className="h-2.5 sm:h-3 w-8 sm:w-12 bg-muted rounded animate-pulse mt-0.5" />
                    </div>

                    {/* Arrow skeleton */}
                    <div className="h-3 w-3 sm:h-5 sm:w-5 bg-muted rounded animate-pulse shrink-0" />
                </div>
            </CardContent>
        </Card>
    );
}
