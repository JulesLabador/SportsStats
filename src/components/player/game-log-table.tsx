"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { getMetricTooltip } from "@/lib/metric-descriptions";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import type { WeeklyStat, PlayerPosition, PositionStats } from "@/lib/types";
import { isQBStats, isRBStats, isWRStats, isTEStats } from "@/lib/types";

/**
 * Column configuration for the game log table
 */
interface ColumnConfig {
    key: string;
    label: string;
    shortLabel: string;
    getValue: (stats: PositionStats) => number;
    /** Fixed max value for heat-map scaling (based on typical elite single-game performance) */
    maxValue: number;
}

/**
 * Get column configurations based on player position
 * Max values are based on elite single-game performances:
 * - Passing yards: 400+ is elite (record ~500)
 * - Passing TDs: 4+ is elite (record 7)
 * - Rushing yards: 150+ is elite (record ~300)
 * - Receiving yards: 150+ is elite (record ~300)
 * - TDs: 3+ is elite for any position
 * - Completions: 35+ is elite
 * - Carries: 25+ is elite
 * - Receptions: 12+ is elite
 * - Targets: 15+ is elite
 * - Interceptions: 3+ is a bad game
 */
const getColumnConfigs = (position: PlayerPosition): ColumnConfig[] => {
    switch (position) {
        case "QB":
            return [
                {
                    key: "passingYards",
                    label: "Passing Yards",
                    shortLabel: "YD",
                    getValue: (stats) =>
                        isQBStats(stats) ? stats.passingYards : 0,
                    maxValue: 400, // 400+ yards is an elite game
                },
                {
                    key: "completions",
                    label: "Completions",
                    shortLabel: "CMP",
                    getValue: (stats) =>
                        isQBStats(stats) ? stats.completions : 0,
                    maxValue: 35, // 35+ completions is elite
                },
                {
                    key: "passingTDs",
                    label: "Passing TDs",
                    shortLabel: "TD",
                    getValue: (stats) =>
                        isQBStats(stats) ? stats.passingTDs : 0,
                    maxValue: 4, // 4+ TDs is an elite game
                },
                {
                    key: "interceptions",
                    label: "Interceptions",
                    shortLabel: "INT",
                    getValue: (stats) =>
                        isQBStats(stats) ? stats.interceptions : 0,
                    maxValue: 3, // 3+ INTs is a bad game
                },
            ];
        case "RB":
            return [
                {
                    key: "rushingYards",
                    label: "Rushing Yards",
                    shortLabel: "YD",
                    getValue: (stats) =>
                        isRBStats(stats) ? stats.rushingYards : 0,
                    maxValue: 150, // 150+ rushing yards is elite
                },
                {
                    key: "carries",
                    label: "Carries",
                    shortLabel: "CAR",
                    getValue: (stats) => (isRBStats(stats) ? stats.carries : 0),
                    maxValue: 25, // 25+ carries is a heavy workload
                },
                {
                    key: "rushingTDs",
                    label: "Rushing TDs",
                    shortLabel: "TD",
                    getValue: (stats) =>
                        isRBStats(stats) ? stats.rushingTDs : 0,
                    maxValue: 3, // 3+ rushing TDs is elite
                },
                {
                    key: "receptions",
                    label: "Receptions",
                    shortLabel: "REC",
                    getValue: (stats) =>
                        isRBStats(stats) ? stats.receptions : 0,
                    maxValue: 8, // 8+ receptions for RB is elite
                },
                {
                    key: "receivingYards",
                    label: "Receiving Yards",
                    shortLabel: "REC YD",
                    getValue: (stats) =>
                        isRBStats(stats) ? stats.receivingYards : 0,
                    maxValue: 75, // 75+ receiving yards for RB is elite
                },
            ];
        case "WR":
            return [
                {
                    key: "receivingYards",
                    label: "Receiving Yards",
                    shortLabel: "YD",
                    getValue: (stats) =>
                        isWRStats(stats) ? stats.receivingYards : 0,
                    maxValue: 150, // 150+ receiving yards is elite
                },
                {
                    key: "receptions",
                    label: "Receptions",
                    shortLabel: "REC",
                    getValue: (stats) =>
                        isWRStats(stats) ? stats.receptions : 0,
                    maxValue: 12, // 12+ receptions is elite
                },
                {
                    key: "targets",
                    label: "Targets",
                    shortLabel: "TGT",
                    getValue: (stats) => (isWRStats(stats) ? stats.targets : 0),
                    maxValue: 15, // 15+ targets is elite volume
                },
                {
                    key: "receivingTDs",
                    label: "Receiving TDs",
                    shortLabel: "TD",
                    getValue: (stats) =>
                        isWRStats(stats) ? stats.receivingTDs : 0,
                    maxValue: 2, // 2+ receiving TDs is elite
                },
            ];
        case "TE":
            return [
                {
                    key: "receivingYards",
                    label: "Receiving Yards",
                    shortLabel: "YD",
                    getValue: (stats) =>
                        isTEStats(stats) ? stats.receivingYards : 0,
                    maxValue: 100, // 100+ receiving yards for TE is elite
                },
                {
                    key: "receptions",
                    label: "Receptions",
                    shortLabel: "REC",
                    getValue: (stats) =>
                        isTEStats(stats) ? stats.receptions : 0,
                    maxValue: 10, // 10+ receptions for TE is elite
                },
                {
                    key: "targets",
                    label: "Targets",
                    shortLabel: "TGT",
                    getValue: (stats) => (isTEStats(stats) ? stats.targets : 0),
                    maxValue: 12, // 12+ targets for TE is elite
                },
                {
                    key: "receivingTDs",
                    label: "Receiving TDs",
                    shortLabel: "TD",
                    getValue: (stats) =>
                        isTEStats(stats) ? stats.receivingTDs : 0,
                    maxValue: 2, // 2+ receiving TDs is elite
                },
            ];
    }
};

/**
 * Calculate intensity (0-1) for a value relative to max
 * Returns 0 for zero values, otherwise scales from 0.15 to 1
 */
const getIntensity = (value: number, maxValue: number): number => {
    if (value === 0 || maxValue === 0) return 0;
    // Minimum intensity of 0.15 for non-zero values, max of 1
    const minIntensity = 0.15;
    const ratio = value / maxValue;
    return minIntensity + ratio * (1 - minIntensity);
};

/**
 * Get the background color style for a cell based on intensity
 * Uses green for positive stats, red for negative stats (like INTs)
 */
const getCellStyle = (
    intensity: number,
    isNegativeStat: boolean = false
): React.CSSProperties => {
    if (intensity === 0) {
        return { backgroundColor: "transparent" };
    }

    // Use oklch for smooth color transitions
    // Green for positive stats, red/orange for negative stats
    if (isNegativeStat) {
        // Red-orange for negative stats (INTs)
        return {
            backgroundColor: `oklch(${0.45 + intensity * 0.2} ${
                0.12 + intensity * 0.08
            } 25 / ${intensity})`,
        };
    }

    // Green for positive stats
    return {
        backgroundColor: `oklch(${0.45 + intensity * 0.27} ${
            0.1 + intensity * 0.09
        } 145 / ${intensity})`,
    };
};

/**
 * Props for the GameLogTable component
 */
interface GameLogTableProps {
    /** Weekly stats data */
    weeklyStats: WeeklyStat[];
    /** Player position for determining which columns to show */
    position: PlayerPosition;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Column header with tooltip component
 * Renders a table header with metric explanation tooltip
 */
interface ColumnHeaderProps {
    /** The column configuration */
    column: ColumnConfig;
}

function ColumnHeader({ column }: ColumnHeaderProps) {
    const tooltipData = getMetricTooltip(column.key);

    // If we have tooltip data, wrap in a tooltip
    if (tooltipData) {
        return (
            <th
                key={column.key}
                className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider py-2 px-1 min-w-[48px]"
            >
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className="cursor-help underline decoration-dotted decoration-muted-foreground/50 underline-offset-2">
                            {column.shortLabel}
                        </span>
                    </TooltipTrigger>
                    <TooltipContent
                        side="top"
                        className="max-w-xs p-3 space-y-1.5"
                    >
                        <p className="font-semibold text-sm text-zinc-100">
                            {tooltipData.name}
                        </p>
                        <p className="text-xs leading-relaxed text-zinc-300">
                            {tooltipData.description}
                        </p>
                        <p className="text-xs leading-relaxed text-zinc-400 italic">
                            {tooltipData.significance}
                        </p>
                    </TooltipContent>
                </Tooltip>
            </th>
        );
    }

    // Fallback without tooltip
    return (
        <th
            key={column.key}
            className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider py-2 px-1 min-w-[48px]"
            title={column.label}
        >
            {column.shortLabel}
        </th>
    );
}

/**
 * GameLogTable component
 *
 * Displays weekly stats in a table format similar to the Sleeper app:
 * - Rows are weeks, columns are stats
 * - Each cell is color-coded based on value intensity
 * - Zero values have no color (like GitHub commit graph)
 * - Highest values have the brightest color
 * - Column headers include tooltips with metric explanations
 *
 * @example
 * ```tsx
 * <GameLogTable
 *   weeklyStats={player.weeklyStats}
 *   position="QB"
 * />
 * ```
 */
export function GameLogTable({
    weeklyStats,
    position,
    className,
}: GameLogTableProps) {
    const columns = getColumnConfigs(position);

    // Sort stats by week (ascending for table display)
    const sortedStats = React.useMemo(
        () => [...weeklyStats].sort((a, b) => a.week - b.week),
        [weeklyStats]
    );

    // Identify negative stats (like interceptions)
    const negativeStats = new Set(["interceptions"]);

    return (
        <div className={cn("overflow-x-auto", className)}>
            <table className="w-full border-collapse">
                {/* Header row with stat labels and tooltips */}
                <thead>
                    <tr>
                        <th className="sticky left-0 z-10 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider py-2 pr-2 w-16">
                            WK
                        </th>
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider py-2 px-1 w-16">
                            OPP
                        </th>
                        {columns.map((col) => (
                            <ColumnHeader key={col.key} column={col} />
                        ))}
                    </tr>
                </thead>

                {/* Data rows */}
                <tbody>
                    {sortedStats.map((stat) => {
                        const isWin = stat.result.startsWith("W");

                        return (
                            <tr
                                key={stat.week}
                                className="border-t border-border/50"
                            >
                                {/* Week number */}
                                <td className="sticky left-0 z-10 py-2 pr-2">
                                    <span className="text-sm font-medium text-muted-foreground">
                                        {stat.week}
                                    </span>
                                </td>

                                {/* Opponent */}
                                <td className="py-2 px-1">
                                    <span
                                        className={cn(
                                            "text-sm font-medium",
                                            isWin
                                                ? "text-stat-positive"
                                                : "text-destructive"
                                        )}
                                    >
                                        {stat.location === "A" ? "@" : ""}
                                        {stat.opponent}
                                    </span>
                                </td>

                                {/* Stat cells */}
                                {columns.map((col) => {
                                    const value = col.getValue(stat.stats);
                                    // Use fixed metric-based max value for consistent coloring
                                    const intensity = getIntensity(
                                        value,
                                        col.maxValue
                                    );
                                    const isNegative = negativeStats.has(
                                        col.key
                                    );
                                    const cellStyle = getCellStyle(
                                        intensity,
                                        isNegative
                                    );

                                    return (
                                        <td
                                            key={col.key}
                                            className="py-2 px-1 text-center"
                                        >
                                            <div
                                                className={cn(
                                                    "rounded-md px-2 py-1.5 text-sm font-semibold tabular-nums transition-colors",
                                                    intensity === 0
                                                        ? "text-muted-foreground/50"
                                                        : "text-foreground"
                                                )}
                                                style={cellStyle}
                                            >
                                                {value}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

/**
 * Skeleton loader for the GameLogTable
 */
export function GameLogTableSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn("overflow-x-auto", className)}>
            <div className="space-y-2">
                {/* Header skeleton */}
                <div className="flex gap-2">
                    <div className="h-6 w-12 bg-muted rounded animate-pulse" />
                    <div className="h-6 w-14 bg-muted rounded animate-pulse" />
                    {[1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="h-6 w-12 bg-muted rounded animate-pulse"
                        />
                    ))}
                </div>
                {/* Row skeletons */}
                {[1, 2, 3, 4, 5].map((row) => (
                    <div key={row} className="flex gap-2">
                        <div className="h-8 w-12 bg-muted/50 rounded animate-pulse" />
                        <div className="h-8 w-14 bg-muted/50 rounded animate-pulse" />
                        {[1, 2, 3, 4].map((i) => (
                            <div
                                key={i}
                                className="h-8 w-12 bg-muted/50 rounded animate-pulse"
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
