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
 * Format a game date for display in multiple time zones
 * Shows date, Pacific time, and Eastern time
 *
 * @param dateString - ISO date string
 * @returns Object with formatted date and times
 */
function formatGameDateTime(dateString: string): {
    date: string;
    pacificTime: string;
    easternTime: string;
} {
    const date = new Date(dateString);

    // Format: "Sun, Dec 29"
    const dateFormatted = date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
    });

    // Pacific Time (PT)
    const pacificTime = date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "America/Los_Angeles",
    });

    // Eastern Time (ET)
    const easternTime = date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "America/New_York",
    });

    return { date: dateFormatted, pacificTime, easternTime };
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

/**
 * UpcomingMatchCard component
 *
 * Mobile-optimized card displaying an upcoming NFL game with:
 * - Away team on the left edge with their record
 * - Date and time (PT/ET) in the center
 * - Home team on the right edge with their record
 * - Click to navigate to matchup page
 *
 * Week information is displayed in a section header above the cards.
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
    const { date, pacificTime, easternTime } = formatGameDateTime(game.gameDate);
    const awayTeamName = getTeamName(game.awayTeam);
    const homeTeamName = getTeamName(game.homeTeam);
    const awayRecord = teamRecords?.get(game.awayTeam);
    const homeRecord = teamRecords?.get(game.homeTeam);

    return (
        <Link href={`/nfl/matchup/${game.id}`}>
            <Card
                className={cn(
                    "group cursor-pointer transition-all hover:bg-card/80 hover:border-border/80",
                    className
                )}
            >
                <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center gap-2">
                        {/* Away team (left side) - fixed width */}
                        <div className="w-[30%] min-w-0 text-left">
                            <div
                                className={cn(
                                    "font-semibold text-sm sm:text-base line-clamp-2 leading-tight",
                                    getTeamTextColor(game.awayTeam)
                                )}
                            >
                                {awayTeamName}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                                {formatRecord(awayRecord)}
                            </div>
                        </div>

                        {/* Center: Date and time info - fixed width */}
                        <div className="w-[30%] flex flex-col items-center px-1">
                            <div className="text-xs sm:text-sm font-medium text-foreground">
                                {date}
                            </div>
                            <div className="flex flex-col items-center gap-0.5 mt-1">
                                <div className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                                    <span className="font-medium">{pacificTime}</span>
                                    <span className="ml-1 text-muted-foreground/60">PT</span>
                                </div>
                                <div className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                                    <span className="font-medium">{easternTime}</span>
                                    <span className="ml-1 text-muted-foreground/60">ET</span>
                                </div>
                            </div>
                        </div>

                        {/* Home team (right side) - fixed width */}
                        <div className="w-[30%] min-w-0 text-right">
                            <div
                                className={cn(
                                    "font-semibold text-sm sm:text-base line-clamp-2 leading-tight",
                                    getTeamTextColor(game.homeTeam)
                                )}
                            >
                                {homeTeamName}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                                {formatRecord(homeRecord)}
                            </div>
                        </div>

                        {/* Arrow indicator */}
                        <svg
                            className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0 ml-1"
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
            <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between gap-2">
                    {/* Away team skeleton */}
                    <div className="flex-1 min-w-0">
                        <div className="h-5 w-24 bg-muted rounded animate-pulse" />
                        <div className="h-3 w-12 bg-muted rounded animate-pulse mt-1" />
                    </div>

                    {/* Center skeleton */}
                    <div className="flex flex-col items-center shrink-0 px-4">
                        <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                        <div className="h-3 w-16 bg-muted rounded animate-pulse mt-1" />
                        <div className="h-3 w-16 bg-muted rounded animate-pulse mt-0.5" />
                    </div>

                    {/* Home team skeleton */}
                    <div className="flex-1 min-w-0 flex flex-col items-end">
                        <div className="h-5 w-24 bg-muted rounded animate-pulse" />
                        <div className="h-3 w-12 bg-muted rounded animate-pulse mt-1" />
                    </div>

                    {/* Arrow skeleton */}
                    <div className="h-5 w-5 bg-muted rounded animate-pulse shrink-0 ml-1" />
                </div>
            </CardContent>
        </Card>
    );
}
