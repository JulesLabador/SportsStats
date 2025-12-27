"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PositionBadge } from "@/components/player/position-badge";
import type { Player, NFLTeam, PlayerPosition } from "@/lib/types";
import { getTeamFullName } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Number of players to show by default before collapsing */
const DEFAULT_VISIBLE_PLAYERS = 5;

/**
 * Props for TeamRosterTable component
 */
interface TeamRosterTableProps {
    /** Team abbreviation */
    team: NFLTeam;
    /** Array of players on the team */
    players: Player[];
    /** Whether this is the home team */
    isHome?: boolean;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Group players by position
 *
 * @param players - Array of players to group
 * @returns Object with position keys and player arrays
 */
function groupPlayersByPosition(
    players: Player[]
): Record<PlayerPosition, Player[]> {
    const groups: Record<PlayerPosition, Player[]> = {
        QB: [],
        RB: [],
        WR: [],
        TE: [],
    };

    for (const player of players) {
        if (groups[player.position]) {
            groups[player.position].push(player);
        }
    }

    return groups;
}

/**
 * Flatten grouped players into an ordered list
 * Maintains position group order (QB, RB, WR, TE)
 *
 * @param groupedPlayers - Players grouped by position
 * @returns Flat array of players in display order
 */
function flattenPlayersInOrder(
    groupedPlayers: Record<PlayerPosition, Player[]>
): Player[] {
    const orderedPositions: PlayerPosition[] = ["QB", "RB", "WR", "TE"];
    const flattened: Player[] = [];

    for (const position of orderedPositions) {
        flattened.push(...groupedPlayers[position]);
    }

    return flattened;
}

/**
 * Position display order and labels
 */
const POSITION_ORDER: { position: PlayerPosition; label: string }[] = [
    { position: "QB", label: "Quarterbacks" },
    { position: "RB", label: "Running Backs" },
    { position: "WR", label: "Wide Receivers" },
    { position: "TE", label: "Tight Ends" },
];

/**
 * TeamRosterTable component
 *
 * Displays a team&apos;s roster grouped by position with:
 * - Position headers
 * - Player name, jersey number
 * - Links to player pages
 * - Collapsible list showing first 5 players by default
 *
 * @example
 * ```tsx
 * <TeamRosterTable team="KC" players={players} isHome={true} />
 * ```
 */
export function TeamRosterTable({
    team,
    players,
    isHome = false,
    className,
}: TeamRosterTableProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const groupedPlayers = groupPlayersByPosition(players);
    const teamName = getTeamFullName(team);

    // Get flattened list to determine visible players
    const flattenedPlayers = flattenPlayersInOrder(groupedPlayers);
    const totalPlayers = flattenedPlayers.length;
    const hasMorePlayers = totalPlayers > DEFAULT_VISIBLE_PLAYERS;

    // Create a set of visible player IDs when collapsed
    const visiblePlayerIds = new Set(
        isExpanded
            ? flattenedPlayers.map((p) => p.id)
            : flattenedPlayers.slice(0, DEFAULT_VISIBLE_PLAYERS).map((p) => p.id)
    );

    /**
     * Toggle expanded/collapsed state
     */
    const handleToggle = () => {
        setIsExpanded((prev) => !prev);
    };

    return (
        <Card className={cn("", className)}>
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between">
                    <Link
                        href={`/team/${team}`}
                        className="hover:text-primary transition-colors"
                    >
                        {teamName}
                    </Link>
                    <span className="text-sm font-normal text-muted-foreground">
                        {isHome ? "Home" : "Away"}
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                {players.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <p>No roster data available</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {POSITION_ORDER.map(({ position, label }) => {
                            const positionPlayers = groupedPlayers[position];
                            // Filter to only visible players for this position
                            const visiblePositionPlayers = positionPlayers.filter(
                                (player) => visiblePlayerIds.has(player.id)
                            );

                            // Skip position group if no visible players
                            if (visiblePositionPlayers.length === 0) return null;

                            return (
                                <div key={position}>
                                    {/* Position header */}
                                    <div className="flex items-center gap-2 mb-3">
                                        <PositionBadge
                                            playerPosition={position}
                                        />
                                        <span className="text-sm text-muted-foreground">
                                            {label} ({positionPlayers.length})
                                        </span>
                                    </div>

                                    {/* Players list */}
                                    <div className="space-y-1">
                                        {visiblePositionPlayers.map((player) => (
                                            <PlayerRow
                                                key={player.id}
                                                player={player}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Toggle button - only show if there are more players than the default */}
                        {hasMorePlayers && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleToggle}
                                className="w-full mt-4"
                            >
                                {isExpanded ? (
                                    <>
                                        <ChevronUpIcon className="w-4 h-4 mr-2" />
                                        Show Less
                                    </>
                                ) : (
                                    <>
                                        <ChevronDownIcon className="w-4 h-4 mr-2" />
                                        Show All {totalPlayers} Players
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

/**
 * Individual player row component
 */
interface PlayerRowProps {
    player: Player;
}

function PlayerRow({ player }: PlayerRowProps) {
    return (
        <Link
            href={`/player/${player.id}`}
            className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors group"
        >
            <div className="flex items-center gap-3">
                {/* Jersey number */}
                <span className="text-sm text-muted-foreground w-6 text-right">
                    #{player.jerseyNumber}
                </span>
                {/* Player name */}
                <span className="font-medium group-hover:text-primary transition-colors">
                    {player.name}
                </span>
            </div>

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
        </Link>
    );
}

/**
 * Chevron down icon component
 */
function ChevronDownIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
            />
        </svg>
    );
}

/**
 * Chevron up icon component
 */
function ChevronUpIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 15l7-7 7 7"
            />
        </svg>
    );
}

/**
 * Skeleton loader for TeamRosterTable
 */
export function TeamRosterTableSkeleton() {
    return (
        <Card>
            <CardHeader className="pb-4">
                <div className="h-6 w-48 bg-muted rounded animate-pulse" />
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {[1, 2, 3].map((group) => (
                        <div key={group}>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="h-5 w-8 bg-muted rounded animate-pulse" />
                                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                            </div>
                            <div className="space-y-1">
                                {[1, 2, 3].map((row) => (
                                    <div
                                        key={row}
                                        className="flex items-center justify-between py-2 px-3"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="h-4 w-6 bg-muted rounded animate-pulse" />
                                            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
