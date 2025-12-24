"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { Player, NFLTeam } from "@/lib/types";

/**
 * Props for the PlayerHeader component
 */
interface PlayerHeaderProps {
    /** Player data */
    player: Player;
    /** Currently selected season */
    selectedSeason: number;
    /** Available seasons to select from */
    availableSeasons: number[];
    /** Callback when season changes */
    onSeasonChange: (season: number) => void;
    /** Additional CSS classes */
    className?: string;
}

/**
 * NFL team colors for badge styling
 * Using muted versions to maintain dark theme aesthetic
 */
const teamColors: Partial<Record<NFLTeam, string>> = {
    ARI: "bg-red-900/30 text-red-400",
    ATL: "bg-red-900/30 text-red-400",
    BAL: "bg-purple-900/30 text-purple-400",
    BUF: "bg-blue-900/30 text-blue-400",
    CAR: "bg-cyan-900/30 text-cyan-400",
    CHI: "bg-orange-900/30 text-orange-400",
    CIN: "bg-orange-900/30 text-orange-400",
    CLE: "bg-orange-900/30 text-orange-400",
    DAL: "bg-blue-900/30 text-blue-400",
    DEN: "bg-orange-900/30 text-orange-400",
    DET: "bg-blue-900/30 text-blue-400",
    GB: "bg-green-900/30 text-green-400",
    HOU: "bg-red-900/30 text-red-400",
    IND: "bg-blue-900/30 text-blue-400",
    JAX: "bg-teal-900/30 text-teal-400",
    KC: "bg-red-900/30 text-red-400",
    LAC: "bg-yellow-900/30 text-yellow-400",
    LAR: "bg-blue-900/30 text-blue-400",
    LV: "bg-gray-800/50 text-gray-300",
    MIA: "bg-teal-900/30 text-teal-400",
    MIN: "bg-purple-900/30 text-purple-400",
    NE: "bg-blue-900/30 text-blue-400",
    NO: "bg-yellow-900/30 text-yellow-400",
    NYG: "bg-blue-900/30 text-blue-400",
    NYJ: "bg-green-900/30 text-green-400",
    PHI: "bg-green-900/30 text-green-400",
    PIT: "bg-yellow-900/30 text-yellow-400",
    SEA: "bg-green-900/30 text-green-400",
    SF: "bg-red-900/30 text-red-400",
    TB: "bg-red-900/30 text-red-400",
    TEN: "bg-blue-900/30 text-blue-400",
    WAS: "bg-red-900/30 text-red-400",
};

/**
 * Position badge colors
 */
const positionColors = {
    QB: "bg-stat-neutral/20 text-stat-neutral",
    RB: "bg-stat-positive/20 text-stat-positive",
    WR: "bg-stat-growth/20 text-stat-growth",
    TE: "bg-purple-900/30 text-purple-400",
};

/**
 * PlayerHeader component
 *
 * Displays player information above the fold:
 * - Name and jersey number
 * - Team badge with team color
 * - Position badge
 * - Season selector
 *
 * @example
 * ```tsx
 * <PlayerHeader
 *   player={player}
 *   selectedSeason={2024}
 *   availableSeasons={[2024, 2023, 2022]}
 *   onSeasonChange={(season) => setSelectedSeason(season)}
 * />
 * ```
 */
export function PlayerHeader({
    player,
    selectedSeason,
    availableSeasons,
    onSeasonChange,
    className,
}: PlayerHeaderProps) {
    const teamColor =
        teamColors[player.team] || "bg-muted text-muted-foreground";
    const positionColor = positionColors[player.position];

    return (
        <header className={cn("space-y-4", className)}>
            {/* Top row: Name and Season selector */}
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                    {/* Player name with jersey number */}
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">
                        <span className="text-muted-foreground font-normal mr-2">
                            #{player.jerseyNumber}
                        </span>
                        {player.name}
                    </h1>

                    {/* Badges row */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                            variant="secondary"
                            className={cn("font-semibold", teamColor)}
                        >
                            {player.team}
                        </Badge>
                        <Badge
                            variant="secondary"
                            className={cn("font-semibold", positionColor)}
                        >
                            {player.position}
                        </Badge>
                    </div>
                </div>

                {/* Season selector */}
                <Select
                    value={selectedSeason.toString()}
                    onValueChange={(value) =>
                        onSeasonChange(parseInt(value, 10))
                    }
                >
                    <SelectTrigger className="w-[120px] shrink-0">
                        <SelectValue placeholder="Season" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableSeasons.map((season) => (
                            <SelectItem key={season} value={season.toString()}>
                                {season}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </header>
    );
}
