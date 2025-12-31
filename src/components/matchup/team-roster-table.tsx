"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PositionBadge } from "@/components/player/position-badge";
import type {
    NFLTeam,
    PlayerPosition,
    PlayerWithSeasonStats,
} from "@/lib/types";
import { getTeamFullName } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Number of players to show by default before collapsing */
const DEFAULT_VISIBLE_PLAYERS = 5;

/** Sort mode options */
type SortMode = "position" | "performance";

/**
 * Props for TeamRosterTable component
 */
interface TeamRosterTableProps {
    /** Team abbreviation */
    team: NFLTeam;
    /** URL slug for the team page */
    teamSlug: string;
    /** Array of players with their season stats */
    players: PlayerWithSeasonStats[];
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
    players: PlayerWithSeasonStats[]
): Record<PlayerPosition, PlayerWithSeasonStats[]> {
    const groups: Record<PlayerPosition, PlayerWithSeasonStats[]> = {
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
    groupedPlayers: Record<PlayerPosition, PlayerWithSeasonStats[]>
): PlayerWithSeasonStats[] {
    const orderedPositions: PlayerPosition[] = ["QB", "RB", "WR", "TE"];
    const flattened: PlayerWithSeasonStats[] = [];

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
 * Get the primary stat label for a player based on position
 */
function getPrimaryStatLabel(player: PlayerWithSeasonStats): string {
    switch (player.position) {
        case "QB":
            return `${player.passingYards.toLocaleString()} pass yds, ${
                player.passingTDs
            } TD`;
        case "RB":
            return `${player.rushingYards.toLocaleString()} rush yds, ${
                player.rushingTDs
            } TD`;
        case "WR":
        case "TE":
            return `${player.receivingYards.toLocaleString()} rec yds, ${
                player.receivingTDs
            } TD`;
        default:
            return "";
    }
}

/**
 * TeamRosterTable component
 *
 * Displays a team&apos;s roster with two view modes:
 * - Position: Grouped by position (QB, RB, WR, TE)
 * - Performance: Sorted by performance score (best performers first)
 *
 * Features:
 * - Toggle between position and performance views
 * - Shows player stats in performance view
 * - Collapsible list showing first 5 players by default
 * - Links to player pages
 *
 * @example
 * ```tsx
 * <TeamRosterTable team="KC" players={playersWithStats} isHome={true} />
 * ```
 */
export function TeamRosterTable({
    team,
    teamSlug,
    players,
    isHome = false,
    className,
}: TeamRosterTableProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [sortMode, setSortMode] = useState<SortMode>("performance");

    const teamName = getTeamFullName(team);

    // Sort players by performance score (descending)
    const sortedByPerformance = useMemo(() => {
        return [...players].sort(
            (a, b) => b.performanceScore - a.performanceScore
        );
    }, [players]);

    // Group players by position
    const groupedPlayers = useMemo(
        () => groupPlayersByPosition(players),
        [players]
    );

    // Get flattened list based on sort mode
    const flattenedPlayers = useMemo(() => {
        if (sortMode === "performance") {
            return sortedByPerformance;
        }
        return flattenPlayersInOrder(groupedPlayers);
    }, [sortMode, sortedByPerformance, groupedPlayers]);

    const totalPlayers = flattenedPlayers.length;
    const hasMorePlayers = totalPlayers > DEFAULT_VISIBLE_PLAYERS;

    // Get visible players based on expanded state
    const visiblePlayers = useMemo(() => {
        if (isExpanded) {
            return flattenedPlayers;
        }
        return flattenedPlayers.slice(0, DEFAULT_VISIBLE_PLAYERS);
    }, [isExpanded, flattenedPlayers]);

    // Create a set of visible player IDs for position view
    const visiblePlayerIds = useMemo(
        () => new Set(visiblePlayers.map((p) => p.id)),
        [visiblePlayers]
    );

    /**
     * Toggle expanded/collapsed state
     */
    const handleToggle = () => {
        setIsExpanded((prev) => !prev);
    };

    /**
     * Toggle sort mode between position and performance
     */
    const handleSortToggle = () => {
        setSortMode((prev) =>
            prev === "position" ? "performance" : "position"
        );
        // Reset to collapsed when switching modes
        setIsExpanded(false);
    };

    return (
        <Card className={cn("", className)}>
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between">
                    <Link
                        href={`/nfl/team/${teamSlug}`}
                        className="hover:text-primary transition-colors"
                    >
                        {teamName}
                    </Link>
                    <span className="text-sm font-normal text-muted-foreground">
                        {isHome ? "Home" : "Away"}
                    </span>
                </CardTitle>
                {/* Sort toggle */}
                <div className="flex items-center gap-2 mt-2">
                    <Button
                        variant={
                            sortMode === "performance" ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() =>
                            sortMode !== "performance" && handleSortToggle()
                        }
                        className="text-xs h-7 px-2"
                    >
                        <TrophyIcon className="w-3 h-3 mr-1" />
                        Top Performers
                    </Button>
                    <Button
                        variant={
                            sortMode === "position" ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() =>
                            sortMode !== "position" && handleSortToggle()
                        }
                        className="text-xs h-7 px-2"
                    >
                        <GridIcon className="w-3 h-3 mr-1" />
                        By Position
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {players.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <p>No roster data available</p>
                    </div>
                ) : sortMode === "performance" ? (
                    // Performance view - flat list sorted by score
                    <div className="space-y-1">
                        {visiblePlayers.map((player, index) => (
                            <PlayerRowWithStats
                                key={player.id}
                                player={player}
                                rank={index + 1}
                            />
                        ))}

                        {/* Toggle button */}
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
                ) : (
                    // Position view - grouped by position
                    <div className="space-y-4">
                        {POSITION_ORDER.map(({ position, label }) => {
                            const positionPlayers = groupedPlayers[position];
                            // Filter to only visible players for this position
                            const visiblePositionPlayers =
                                positionPlayers.filter((player) =>
                                    visiblePlayerIds.has(player.id)
                                );

                            // Skip position group if no visible players
                            if (visiblePositionPlayers.length === 0)
                                return null;

                            return (
                                <div key={position}>
                                    {/* Position header */}
                                    <div className="flex items-center gap-2 mb-1">
                                        <PositionBadge
                                            playerPosition={position}
                                        />
                                        <span className="text-sm text-muted-foreground">
                                            {label} ({positionPlayers.length})
                                        </span>
                                    </div>

                                    {/* Players list */}
                                    <div className="space-y-1">
                                        {visiblePositionPlayers.map(
                                            (player) => (
                                                <PlayerRow
                                                    key={player.id}
                                                    player={player}
                                                />
                                            )
                                        )}
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
 * Individual player row component (basic - for position view)
 * Uses consistent height with performance view to prevent layout shift
 */
interface PlayerRowProps {
    player: PlayerWithSeasonStats;
}

function PlayerRow({ player }: PlayerRowProps) {
    const statLabel = getPrimaryStatLabel(player);
    const hasStats = player.gamesPlayed > 0;

    return (
        <Link
            href={`/nfl/player/${player.id}`}
            className="flex items-center justify-between py-2.5 px-3 rounded-md hover:bg-muted/50 transition-colors group"
        >
            <div className="flex items-center gap-3 min-w-0">
                {/* Jersey number */}
                <span className="text-sm text-muted-foreground w-6 text-right shrink-0">
                    #{player.jerseyNumber}
                </span>
                {/* Player info - consistent two-line layout */}
                <div className="min-w-0 flex-1">
                    <span className="font-medium group-hover:text-primary transition-colors block truncate">
                        {player.name}
                    </span>
                    {hasStats && (
                        <span className="text-xs text-muted-foreground block truncate">
                            {statLabel}
                        </span>
                    )}
                </div>
            </div>

            {/* Arrow indicator */}
            <svg
                className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0 ml-2"
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
 * Player row with stats (for performance view)
 */
interface PlayerRowWithStatsProps {
    player: PlayerWithSeasonStats;
    rank: number;
}

function PlayerRowWithStats({ player, rank }: PlayerRowWithStatsProps) {
    const statLabel = getPrimaryStatLabel(player);
    const hasStats = player.gamesPlayed > 0;

    return (
        <Link
            href={`/nfl/player/${player.id}`}
            className="flex items-center justify-between py-2.5 px-3 rounded-md hover:bg-muted/50 transition-colors group"
        >
            <div className="flex items-center gap-3 min-w-0">
                {/* Rank badge */}
                <span
                    className={cn(
                        "text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                        rank <= 3
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                    )}
                >
                    {rank}
                </span>
                {/* Position badge */}
                <PositionBadge playerPosition={player.position} />
                {/* Player info */}
                <div className="min-w-0 flex-1">
                    <span className="font-medium group-hover:text-primary transition-colors block truncate">
                        {player.name}
                    </span>
                    {hasStats && (
                        <span className="text-xs text-muted-foreground block truncate">
                            {statLabel}
                        </span>
                    )}
                </div>
            </div>

            {/* Arrow indicator */}
            <svg
                className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0 ml-2"
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
 * Trophy icon component
 */
function TrophyIcon({ className }: { className?: string }) {
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
                d="M5 3h14a2 2 0 012 2v3a7 7 0 01-7 7h0a7 7 0 01-7-7V5a2 2 0 012-2zM12 15v4M8 21h8M17 8h2a2 2 0 012 2v1a3 3 0 01-3 3h-1M7 8H5a2 2 0 00-2 2v1a3 3 0 003 3h1"
            />
        </svg>
    );
}

/**
 * Grid icon component
 */
function GridIcon({ className }: { className?: string }) {
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
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
            />
        </svg>
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
                <div className="flex gap-2 mt-2">
                    <div className="h-7 w-28 bg-muted rounded animate-pulse" />
                    <div className="h-7 w-24 bg-muted rounded animate-pulse" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-1">
                    {[1, 2, 3, 4, 5].map((row) => (
                        <div
                            key={row}
                            className="flex items-center justify-between py-2.5 px-3"
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-5 w-5 bg-muted rounded-full animate-pulse" />
                                <div className="h-5 w-8 bg-muted rounded animate-pulse" />
                                <div className="space-y-1">
                                    <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                                    <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
