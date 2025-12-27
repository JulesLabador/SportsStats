import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { NFLGame, NFLTeam } from "@/lib/types";
import { getTeamName, getTeamColor } from "@/lib/team-colors";
import { cn } from "@/lib/utils";

/**
 * Props for UpcomingMatchCard component
 */
interface UpcomingMatchCardProps {
    /** The game data to display */
    game: NFLGame;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Format a game date for display
 * Shows day of week, month/day, and time
 *
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
function formatGameDate(dateString: string): { date: string; time: string } {
    const date = new Date(dateString);

    // Format: "Sun, Dec 29"
    const dateFormatted = date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
    });

    // Format: "1:00 PM"
    const timeFormatted = date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });

    return { date: dateFormatted, time: timeFormatted };
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
 * UpcomingMatchCard component
 *
 * Displays an upcoming NFL game in a horizontal layout with:
 * - Full team names in medium/large format
 * - Game date, time, and week
 * - Venue information
 * - Click to navigate to matchup page
 *
 * Uses full-width single-column layout to differentiate from PlayerCard.
 *
 * @example
 * ```tsx
 * <UpcomingMatchCard game={game} />
 * ```
 */
export function UpcomingMatchCard({ game, className }: UpcomingMatchCardProps) {
    const { date, time } = formatGameDate(game.gameDate);
    const awayTeamName = getTeamName(game.awayTeam);
    const homeTeamName = getTeamName(game.homeTeam);

    return (
        <Link href={`/matchup/${game.id}`}>
            <Card
                className={cn(
                    "group cursor-pointer transition-all hover:bg-card/80 hover:border-border/80",
                    className
                )}
            >
                <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center gap-4">
                        {/* Week badge */}
                        <Badge
                            variant="outline"
                            className="shrink-0 text-xs font-medium"
                        >
                            Wk {game.week}
                        </Badge>

                        <div className="flex-1">
                            {/* Teams matchup - full names */}
                            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                {/* Away team */}
                                <span
                                    className={cn(
                                        "font-semibold text-sm sm:text-base truncate",
                                        getTeamTextColor(game.awayTeam)
                                    )}
                                >
                                    {awayTeamName}
                                </span>

                                {/* @ symbol */}
                                <span className="text-sm text-muted-foreground shrink-0">
                                    @
                                </span>

                                {/* Home team */}
                                <span
                                    className={cn(
                                        "font-semibold text-sm sm:text-base truncate",
                                        getTeamTextColor(game.homeTeam)
                                    )}
                                >
                                    {homeTeamName}
                                </span>
                            </div>

                            {/* Venue (shown on larger screens) */}
                            {game.venue && (
                                <div className="hidden sm:block text-sm text-muted-foreground">
                                    {game.venue.name}
                                    {game.venue.city &&
                                        game.venue.state &&
                                        ` • ${game.venue.city}, ${game.venue.state}`}
                                </div>
                            )}
                        </div>

                        {/* Date and time */}
                        <div className="text-right shrink-0 ">
                            <div className="text-sm font-medium">{date}</div>
                            <div className="text-xs text-muted-foreground">
                                {time}
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
        </Link>
    );
}

/**
 * Skeleton loader for UpcomingMatchCard
 */
export function UpcomingMatchCardSkeleton() {
    return (
        <Card>
            <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-4">
                    <div className="h-5 w-12 bg-muted rounded animate-pulse shrink-0" />
                    <div className="flex items-center gap-3 flex-1">
                        <div className="h-5 w-32 bg-muted rounded animate-pulse" />
                        <div className="h-4 w-4 bg-muted rounded animate-pulse" />
                        <div className="h-5 w-32 bg-muted rounded animate-pulse" />
                    </div>
                    <div className="text-right shrink-0">
                        <div className="h-4 w-20 bg-muted rounded animate-pulse mb-1" />
                        <div className="h-3 w-14 bg-muted rounded animate-pulse" />
                    </div>
                    <div className="h-5 w-5 bg-muted rounded animate-pulse shrink-0" />
                </div>
            </CardContent>
        </Card>
    );
}
