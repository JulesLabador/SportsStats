import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { TeamBadge } from "@/components/player/team-badge";
import type { NFLGame, NFLTeam } from "@/lib/types";
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
 * UpcomingMatchCard component
 *
 * Displays an upcoming NFL game with:
 * - Away team @ Home team
 * - Game date and time
 * - Venue information
 * - Click to navigate to matchup page
 *
 * @example
 * ```tsx
 * <UpcomingMatchCard game={game} />
 * ```
 */
export function UpcomingMatchCard({ game, className }: UpcomingMatchCardProps) {
    const { date, time } = formatGameDate(game.gameDate);

    return (
        <Link href={`/matchup/${game.id}`}>
            <Card
                className={cn(
                    "group cursor-pointer transition-colors hover:bg-card/80",
                    className
                )}
            >
                <CardContent className="p-4">
                    {/* Week indicator */}
                    <div className="text-xs text-muted-foreground mb-3">
                        Week {game.week}
                    </div>

                    {/* Teams matchup */}
                    <div className="flex items-center justify-between mb-4">
                        {/* Away team */}
                        <div className="flex flex-col items-center gap-1 flex-1">
                            <TeamBadge team={game.awayTeam} />
                            <span className="text-xs text-muted-foreground">
                                Away
                            </span>
                        </div>

                        {/* VS indicator */}
                        <div className="px-3">
                            <span className="text-sm font-medium text-muted-foreground">
                                @
                            </span>
                        </div>

                        {/* Home team */}
                        <div className="flex flex-col items-center gap-1 flex-1">
                            <TeamBadge team={game.homeTeam} />
                            <span className="text-xs text-muted-foreground">
                                Home
                            </span>
                        </div>
                    </div>

                    {/* Date and time */}
                    <div className="text-center mb-2">
                        <div className="text-sm font-medium">{date}</div>
                        <div className="text-xs text-muted-foreground">
                            {time}
                        </div>
                    </div>

                    {/* Venue (if available) */}
                    {game.venue && (
                        <div className="text-center text-xs text-muted-foreground truncate">
                            {game.venue.name}
                        </div>
                    )}

                    {/* Hover indicator */}
                    <div className="mt-3 flex justify-center">
                        <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                            View Matchup →
                        </span>
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
            <CardContent className="p-4">
                <div className="h-3 w-12 bg-muted rounded animate-pulse mb-3" />
                <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col items-center gap-1 flex-1">
                        <div className="h-5 w-10 bg-muted rounded animate-pulse" />
                        <div className="h-3 w-8 bg-muted rounded animate-pulse" />
                    </div>
                    <div className="px-3">
                        <div className="h-4 w-4 bg-muted rounded animate-pulse" />
                    </div>
                    <div className="flex flex-col items-center gap-1 flex-1">
                        <div className="h-5 w-10 bg-muted rounded animate-pulse" />
                        <div className="h-3 w-8 bg-muted rounded animate-pulse" />
                    </div>
                </div>
                <div className="flex flex-col items-center gap-1 mb-2">
                    <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                </div>
                <div className="h-3 w-32 mx-auto bg-muted rounded animate-pulse" />
            </CardContent>
        </Card>
    );
}

