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
import { getTeamColor, getPositionColor } from "@/lib/team-colors";
import type { Player } from "@/lib/types";

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
    const teamColor = getTeamColor(player.team);
    const positionColor = getPositionColor(player.position);

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
