"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { HistoricalGame, NFLTeam } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Props for HistoricalGamesTable component
 */
interface HistoricalGamesTableProps {
    /** Array of historical games to display */
    games: HistoricalGame[];
    /** Team1 abbreviation (for consistent styling) */
    team1: NFLTeam;
    /** Team2 abbreviation (for consistent styling) */
    team2: NFLTeam;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Format a game date for display
 * @param dateString - ISO date string
 * @returns Formatted date (e.g., "Dec 29, 2024")
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
 * Determine the winner of a game
 * @returns The winning team or null if tie
 */
function getWinner(game: HistoricalGame): NFLTeam | null {
    if (game.homeScore > game.awayScore) {
        return game.homeTeam;
    } else if (game.awayScore > game.homeScore) {
        return game.awayTeam;
    }
    return null;
}

/**
 * HistoricalGamesTable component
 *
 * Displays a scrollable table of historical games between two teams:
 * - Season, Week, Date columns
 * - Score with winner highlighted
 * - Venue information
 * - Links to individual matchup pages
 */
export function HistoricalGamesTable({
    games,
    team1,
    team2,
    className,
}: HistoricalGamesTableProps) {
    if (games.length === 0) {
        return (
            <div
                className={cn(
                    "text-center py-8 text-muted-foreground",
                    className
                )}
            >
                No historical games found between these teams.
            </div>
        );
    }

    return (
        <div className={cn("overflow-x-auto", className)}>
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-border">
                        <th className="text-left py-3 px-2 text-muted-foreground font-medium">
                            Season
                        </th>
                        <th className="text-left py-3 px-2 text-muted-foreground font-medium">
                            Week
                        </th>
                        <th className="text-left py-3 px-2 text-muted-foreground font-medium">
                            Date
                        </th>
                        <th className="text-center py-3 px-2 text-muted-foreground font-medium">
                            {team1}
                        </th>
                        <th className="text-center py-3 px-2 text-muted-foreground font-medium">
                            Score
                        </th>
                        <th className="text-center py-3 px-2 text-muted-foreground font-medium">
                            {team2}
                        </th>
                        <th className="text-left py-3 px-2 text-muted-foreground font-medium hidden md:table-cell">
                            Venue
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {games.map((game) => (
                        <GameRow
                            key={game.id}
                            game={game}
                            team1={team1}
                            team2={team2}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/**
 * Props for individual game row
 */
interface GameRowProps {
    game: HistoricalGame;
    team1: NFLTeam;
    team2: NFLTeam;
}

/**
 * Individual game row component
 */
function GameRow({ game, team1, team2 }: GameRowProps) {
    const winner = getWinner(game);

    // Determine team1's score and team2's score
    const team1IsHome = game.homeTeam === team1;
    const team1Score = team1IsHome ? game.homeScore : game.awayScore;
    const team2Score = team1IsHome ? game.awayScore : game.homeScore;

    // Determine if each team won
    const team1Won = winner === team1;
    const team2Won = winner === team2;
    const isTie = winner === null;

    return (
        <tr className="border-b border-border/50 hover:bg-muted/30 transition-colors">
            {/* Season */}
            <td className="py-3 px-2 font-medium">{game.season}</td>

            {/* Week */}
            <td className="py-3 px-2">
                <Badge variant="outline" className="font-normal">
                    {game.week > 18 ? `Playoff` : `Wk ${game.week}`}
                </Badge>
            </td>

            {/* Date */}
            <td className="py-3 px-2 text-muted-foreground">
                {formatGameDate(game.gameDate)}
            </td>

            {/* Team1 indicator (home/away) */}
            <td className="py-3 px-2 text-center">
                <span
                    className={cn(
                        "text-xs px-1.5 py-0.5 rounded",
                        team1IsHome
                            ? "bg-muted text-muted-foreground"
                            : "text-muted-foreground"
                    )}
                >
                    {team1IsHome ? "H" : "A"}
                </span>
            </td>

            {/* Score */}
            <td className="py-3 px-2">
                <Link
                    href={`/nfl/matchup/${game.id}`}
                    className="flex items-center justify-center gap-2 hover:opacity-80 transition-opacity"
                >
                    <span
                        className={cn(
                            "font-bold text-lg min-w-[2rem] text-right",
                            team1Won && "text-stat-positive",
                            isTie && "text-stat-growth"
                        )}
                    >
                        {team1Score}
                    </span>
                    <span className="text-muted-foreground">-</span>
                    <span
                        className={cn(
                            "font-bold text-lg min-w-[2rem] text-left",
                            team2Won && "text-stat-positive",
                            isTie && "text-stat-growth"
                        )}
                    >
                        {team2Score}
                    </span>
                </Link>
            </td>

            {/* Team2 indicator (home/away) */}
            <td className="py-3 px-2 text-center">
                <span
                    className={cn(
                        "text-xs px-1.5 py-0.5 rounded",
                        !team1IsHome
                            ? "bg-muted text-muted-foreground"
                            : "text-muted-foreground"
                    )}
                >
                    {team1IsHome ? "A" : "H"}
                </span>
            </td>

            {/* Venue */}
            <td className="py-3 px-2 text-muted-foreground hidden md:table-cell truncate max-w-[150px]">
                {game.venue || "—"}
            </td>
        </tr>
    );
}

/**
 * Group games by season for display
 */
export function groupGamesBySeason(
    games: HistoricalGame[]
): Record<number, HistoricalGame[]> {
    return games.reduce((acc, game) => {
        const season = game.season;
        if (!acc[season]) {
            acc[season] = [];
        }
        acc[season].push(game);
        return acc;
    }, {} as Record<number, HistoricalGame[]>);
}
