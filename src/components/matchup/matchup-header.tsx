import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { TeamBadge } from "@/components/player/team-badge";
import type { NFLGame, TeamRecord } from "@/lib/types";
import { getTeamFullName } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Props for MatchupHeader component
 */
interface MatchupHeaderProps {
    /** The game data to display */
    game: NFLGame;
    /** Home team record */
    homeRecord?: TeamRecord;
    /** Away team record */
    awayRecord?: TeamRecord;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Format a team record for display
 *
 * @param record - Team win/loss/tie record
 * @returns Formatted record string (e.g., "10-5" or "10-5-1")
 */
function formatRecord(record?: TeamRecord): string {
    if (!record) return "";
    const { wins, losses, ties } = record;
    // Only show ties if there are any
    return ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;
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
 * - Hero-style team names as the primary visual element
 * - Large centered "@" separator
 * - Team badges with links to team pages
 * - Score (for completed/in-progress games)
 * - Game date, time, and venue
 * - Game status badge
 *
 * @example
 * ```tsx
 * <MatchupHeader game={game} homeRecord={homeRecord} awayRecord={awayRecord} />
 * ```
 */
export function MatchupHeader({
    game,
    homeRecord,
    awayRecord,
    className,
}: MatchupHeaderProps) {
    const { fullDate, time } = formatGameDateTime(game.gameDate);
    const statusDisplay = getStatusDisplay(game.status);
    const showScore = game.status !== "scheduled";

    return (
        <div className={cn("text-center", className)}>
            {/* Week and status - contextual info at top */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <span className="text-xs sm:text-sm text-muted-foreground tracking-wide uppercase">
                    Week {game.week}
                </span>
                <Badge variant={statusDisplay.variant} className="text-xs">
                    {statusDisplay.text}
                </Badge>
            </div>

            {/* Hero section - Teams matchup - always horizontal */}
            <div className="flex items-center justify-center gap-2 sm:gap-6 lg:gap-12 mb-6 sm:mb-8">
                {/* Away team - equal width with flex-1 and basis */}
                <Link
                    href={`/nfl/team/${game.awayTeam}`}
                    className="flex flex-col items-center gap-1 sm:gap-2 group flex-1 basis-0 min-w-0"
                >
                    {/* Team badge - secondary identifier */}
                    <TeamBadge
                        team={game.awayTeam}
                        className="text-xs sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1"
                    />

                    {/* Team name - primary visual element */}
                    <h2 className="text-base sm:text-2xl lg:text-3xl font-bold tracking-tight group-hover:text-primary transition-colors text-center leading-tight">
                        {getTeamFullName(game.awayTeam)}
                    </h2>

                    {/* Record */}
                    {awayRecord && (
                        <span className="text-xs sm:text-sm text-muted-foreground font-medium">
                            ({formatRecord(awayRecord)})
                        </span>
                    )}

                    {/* Score - prominent when game has started/finished */}
                    {showScore && (
                        <span className="text-2xl sm:text-4xl lg:text-5xl font-bold mt-1 tabular-nums">
                            {game.awayScore ?? 0}
                        </span>
                    )}
                </Link>

                {/* Centered separator - fixed width to not affect team spacing */}
                <div className="shrink-0 flex items-center justify-center w-8 sm:w-12">
                    <span className="text-2xl sm:text-4xl lg:text-5xl font-light text-muted-foreground/60 select-none">
                        {showScore ? "–" : "@"}
                    </span>
                </div>

                {/* Home team - equal width with flex-1 and basis */}
                <Link
                    href={`/nfl/team/${game.homeTeam}`}
                    className="flex flex-col items-center gap-1 sm:gap-2 group flex-1 basis-0 min-w-0"
                >
                    {/* Team badge - secondary identifier */}
                    <TeamBadge
                        team={game.homeTeam}
                        className="text-xs sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1"
                    />

                    {/* Team name - primary visual element */}
                    <h2 className="text-base sm:text-2xl lg:text-3xl font-bold tracking-tight group-hover:text-primary transition-colors text-center leading-tight">
                        {getTeamFullName(game.homeTeam)}
                    </h2>

                    {/* Record */}
                    {homeRecord && (
                        <span className="text-xs sm:text-sm text-muted-foreground font-medium">
                            ({formatRecord(homeRecord)})
                        </span>
                    )}

                    {/* Score - prominent when game has started/finished */}
                    {showScore && (
                        <span className="text-2xl sm:text-4xl lg:text-5xl font-bold mt-1 tabular-nums">
                            {game.homeScore ?? 0}
                        </span>
                    )}
                </Link>
            </div>

            {/* Date and time - supporting info */}
            <div className="mb-3 sm:mb-4">
                <div className="text-sm sm:text-lg lg:text-xl font-semibold">
                    {fullDate}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                    {time}
                </div>
            </div>

            {/* Venue - tertiary info */}
            {game.venue && (
                <div className="text-xs sm:text-sm text-muted-foreground">
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
