import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { TeamBadge } from "@/components/player/team-badge";
import type { NFLGame } from "@/lib/types";
import { getTeamFullName } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Props for MatchupHeader component
 */
interface MatchupHeaderProps {
    /** The game data to display */
    game: NFLGame;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Format a game date for display in the header
 *
 * @param dateString - ISO date string
 * @returns Formatted date and time strings
 */
function formatGameDateTime(dateString: string): {
    fullDate: string;
    time: string;
} {
    const date = new Date(dateString);

    // Format: "Sunday, December 29, 2024"
    const fullDate = date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
    });

    // Format: "1:00 PM EST"
    const time = date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZoneName: "short",
    });

    return { fullDate, time };
}

/**
 * Get status badge variant and text
 */
function getStatusDisplay(status: NFLGame["status"]): {
    text: string;
    variant: "default" | "secondary" | "destructive" | "outline";
} {
    switch (status) {
        case "scheduled":
            return { text: "Upcoming", variant: "secondary" };
        case "in_progress":
            return { text: "Live", variant: "destructive" };
        case "final":
            return { text: "Final", variant: "outline" };
        default:
            return { text: status, variant: "secondary" };
    }
}

/**
 * MatchupHeader component
 *
 * Displays the header for a matchup page with:
 * - Team badges with links to team pages
 * - Score (for completed/in-progress games)
 * - Game date, time, and venue
 * - Game status badge
 *
 * @example
 * ```tsx
 * <MatchupHeader game={game} />
 * ```
 */
export function MatchupHeader({ game, className }: MatchupHeaderProps) {
    const { fullDate, time } = formatGameDateTime(game.gameDate);
    const statusDisplay = getStatusDisplay(game.status);
    const showScore = game.status !== "scheduled";

    return (
        <div className={cn("text-center", className)}>
            {/* Week and status */}
            <div className="flex items-center justify-center gap-3 mb-6">
                <span className="text-sm text-muted-foreground">
                    Week {game.week}
                </span>
                <Badge variant={statusDisplay.variant}>{statusDisplay.text}</Badge>
            </div>

            {/* Teams matchup */}
            <div className="flex items-center justify-center gap-4 sm:gap-8 mb-6">
                {/* Away team */}
                <Link
                    href={`/team/${game.awayTeam}`}
                    className="flex flex-col items-center gap-2 group"
                >
                    <div className="text-3xl sm:text-4xl font-bold group-hover:text-primary transition-colors">
                        <TeamBadge team={game.awayTeam} />
                    </div>
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                        {getTeamFullName(game.awayTeam)}
                    </span>
                    {showScore && (
                        <span className="text-2xl sm:text-3xl font-bold">
                            {game.awayScore ?? 0}
                        </span>
                    )}
                </Link>

                {/* VS / @ indicator */}
                <div className="flex flex-col items-center">
                    <span className="text-xl sm:text-2xl font-medium text-muted-foreground">
                        {showScore ? "-" : "@"}
                    </span>
                </div>

                {/* Home team */}
                <Link
                    href={`/team/${game.homeTeam}`}
                    className="flex flex-col items-center gap-2 group"
                >
                    <div className="text-3xl sm:text-4xl font-bold group-hover:text-primary transition-colors">
                        <TeamBadge team={game.homeTeam} />
                    </div>
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                        {getTeamFullName(game.homeTeam)}
                    </span>
                    {showScore && (
                        <span className="text-2xl sm:text-3xl font-bold">
                            {game.homeScore ?? 0}
                        </span>
                    )}
                </Link>
            </div>

            {/* Date and time */}
            <div className="mb-4">
                <div className="text-lg font-medium">{fullDate}</div>
                <div className="text-sm text-muted-foreground">{time}</div>
            </div>

            {/* Venue */}
            {game.venue && (
                <div className="text-sm text-muted-foreground">
                    {game.venue.name}
                    {game.venue.city && game.venue.state && (
                        <span>
                            {" "}
                            · {game.venue.city}, {game.venue.state}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

