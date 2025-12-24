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
 * Performance tier type for discrete heatmap coloring
 * Each tier represents a distinct level of performance for instant visual recognition
 */
type PerformanceTier = "elite" | "great" | "good" | "average" | "poor" | "zero";

/**
 * Negative stat tier type for stats where lower is better (e.g., interceptions)
 */
type NegativeTier = "clean" | "minor" | "concerning" | "bad" | "awful";

/**
 * Configuration for each performance tier
 * Includes visual styling and descriptive label
 */
interface TierConfig {
    /** CSS class for background color */
    bgClass: string;
    /** CSS class for text color */
    textClass: string;
    /** Human-readable label for the tier */
    label: string;
}

/**
 * Performance tier configurations for positive stats
 * Uses a green scale with blue-purple gradient for elite performances
 * Gradient = elite, then green scale from bright to dark
 */
const PERFORMANCE_TIERS: Record<PerformanceTier, TierConfig> = {
    elite: {
        bgClass: "bg-tier-elite",
        textClass: "text-white font-bold",
        label: "Elite",
    },
    great: {
        bgClass: "bg-tier-great",
        textClass: "text-white",
        label: "Great",
    },
    good: {
        bgClass: "bg-tier-good",
        textClass: "text-white",
        label: "Good",
    },
    average: {
        bgClass: "bg-tier-average",
        textClass: "text-zinc-200",
        label: "Avg",
    },
    poor: {
        bgClass: "bg-tier-poor",
        textClass: "text-zinc-300",
        label: "Low",
    },
    zero: {
        bgClass: "bg-transparent",
        textClass: "text-zinc-600",
        label: "None",
    },
};

/**
 * Performance tier configurations for negative stats (like interceptions)
 * Uses a spectrum from green (0 INTs) to red (3+ INTs)
 */
const NEGATIVE_TIERS: Record<NegativeTier, TierConfig> = {
    clean: {
        bgClass: "bg-tier-great",
        textClass: "text-white font-bold",
        label: "Clean",
    },
    minor: {
        bgClass: "bg-tier-negative-mild",
        textClass: "text-zinc-900",
        label: "Minor",
    },
    concerning: {
        bgClass: "bg-tier-negative-bad",
        textClass: "text-white",
        label: "Concerning",
    },
    bad: {
        bgClass: "bg-tier-negative-awful",
        textClass: "text-white",
        label: "Bad",
    },
    awful: {
        bgClass: "bg-red-600",
        textClass: "text-white font-bold",
        label: "Awful",
    },
};

/**
 * Get the performance tier for a positive stat value
 *
 * Elite tier is reserved for the actual best value(s) in the dataset.
 * Other tiers are based on percentage of the threshold maxValue:
 * - Elite: Only the actual max value in the column (gradient highlight)
 * - Great: 75%+ of threshold
 * - Good: 50-74% of threshold
 * - Average: 25-49% of threshold
 * - Poor: 1-24% of threshold
 * - Zero: 0
 *
 * @param value - The stat value
 * @param thresholdMax - The elite threshold for this stat (e.g., 400 for passing yards)
 * @param actualMax - The actual max value in the dataset for this column
 * @returns The performance tier
 */
const getPerformanceTier = (
    value: number,
    thresholdMax: number,
    actualMax: number
): PerformanceTier => {
    // Zero values get no color
    if (value === 0) return "zero";
    // Guard against division by zero
    if (thresholdMax === 0) return "average";

    // Elite is ONLY for the actual best value in the column
    if (value === actualMax && actualMax > 0) return "elite";

    const ratio = value / thresholdMax;

    // Other tiers based on threshold percentage
    if (ratio >= 0.75) return "great";
    if (ratio >= 0.5) return "good";
    if (ratio >= 0.25) return "average";
    return "poor";
};

/**
 * Get the tier for negative stats (like interceptions)
 * For negative stats, lower is better, so the logic is inverted:
 * - 0: Clean (green) - no turnovers
 * - 1: Minor (yellow) - one mistake
 * - 2: Concerning (orange) - multiple mistakes
 * - 3+: Bad/Awful (red) - serious turnover problems
 *
 * @param value - The stat value (e.g., number of interceptions)
 * @returns The negative tier
 */
const getNegativeTier = (value: number): NegativeTier => {
    if (value === 0) return "clean";
    if (value === 1) return "minor";
    if (value === 2) return "concerning";
    if (value === 3) return "bad";
    return "awful";
};

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
 * Shows complete stat picture for each position including secondary stats.
 *
 * Max values are based on elite single-game performances:
 * - Passing yards: 400+ is elite (record ~500)
 * - Passing TDs: 4+ is elite (record 7)
 * - Rushing yards: 150+ is elite for RB (record ~300), 75+ for QB/WR
 * - Receiving yards: 150+ is elite for WR, 100+ for TE, 75+ for RB
 * - TDs: 3+ is elite for any position
 * - Completions: 35+ is elite
 * - Carries: 25+ is elite for RB, 10+ for QB
 * - Receptions: 12+ is elite for WR, 10+ for TE, 8+ for RB
 * - Targets: 15+ is elite for WR, 12+ for TE
 * - Interceptions: 3+ is a bad game
 */
const getColumnConfigs = (position: PlayerPosition): ColumnConfig[] => {
    switch (position) {
        case "QB":
            // QBs: Passing stats + rushing stats (dual-threat value)
            return [
                {
                    key: "passingYards",
                    label: "Passing Yards",
                    shortLabel: "PASS",
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
                    shortLabel: "PTD",
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
                {
                    key: "rushingYards",
                    label: "Rushing Yards",
                    shortLabel: "RUSH",
                    getValue: (stats) =>
                        isQBStats(stats) ? stats.rushingYards : 0,
                    maxValue: 75, // 75+ rushing yards for QB is elite
                },
                {
                    key: "rushingTDs",
                    label: "Rushing TDs",
                    shortLabel: "RTD",
                    getValue: (stats) =>
                        isQBStats(stats) ? stats.rushingTDs : 0,
                    maxValue: 2, // 2+ rushing TDs for QB is elite
                },
            ];
        case "RB":
            // RBs: Rushing stats + receiving stats (pass-catching backs)
            return [
                {
                    key: "rushingYards",
                    label: "Rushing Yards",
                    shortLabel: "RUSH",
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
                    shortLabel: "RTD",
                    getValue: (stats) =>
                        isRBStats(stats) ? stats.rushingTDs : 0,
                    maxValue: 3, // 3+ rushing TDs is elite
                },
                {
                    key: "receivingYards",
                    label: "Receiving Yards",
                    shortLabel: "REC",
                    getValue: (stats) =>
                        isRBStats(stats) ? stats.receivingYards : 0,
                    maxValue: 75, // 75+ receiving yards for RB is elite
                },
                {
                    key: "receptions",
                    label: "Receptions",
                    shortLabel: "CTCH",
                    getValue: (stats) =>
                        isRBStats(stats) ? stats.receptions : 0,
                    maxValue: 8, // 8+ receptions for RB is elite
                },
                {
                    key: "receivingTDs",
                    label: "Receiving TDs",
                    shortLabel: "RCTD",
                    getValue: (stats) =>
                        isRBStats(stats) ? stats.receivingTDs : 0,
                    maxValue: 2, // 2+ receiving TDs for RB is elite
                },
            ];
        case "WR":
            // WRs: Receiving stats + rushing stats (jet sweeps, end-arounds)
            return [
                {
                    key: "receivingYards",
                    label: "Receiving Yards",
                    shortLabel: "REC",
                    getValue: (stats) =>
                        isWRStats(stats) ? stats.receivingYards : 0,
                    maxValue: 150, // 150+ receiving yards is elite
                },
                {
                    key: "receptions",
                    label: "Receptions",
                    shortLabel: "CTCH",
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
                    shortLabel: "RCTD",
                    getValue: (stats) =>
                        isWRStats(stats) ? stats.receivingTDs : 0,
                    maxValue: 2, // 2+ receiving TDs is elite
                },
                {
                    key: "rushingYards",
                    label: "Rushing Yards",
                    shortLabel: "RUSH",
                    getValue: (stats) =>
                        isWRStats(stats) ? stats.rushingYards : 0,
                    maxValue: 50, // 50+ rushing yards for WR is elite
                },
                {
                    key: "rushingTDs",
                    label: "Rushing TDs",
                    shortLabel: "RTD",
                    getValue: (stats) =>
                        isWRStats(stats) ? stats.rushingTDs : 0,
                    maxValue: 1, // 1+ rushing TD for WR is notable
                },
            ];
        case "TE":
            // TEs: Primarily receiving stats (rushing is very rare for TEs)
            return [
                {
                    key: "receivingYards",
                    label: "Receiving Yards",
                    shortLabel: "REC",
                    getValue: (stats) =>
                        isTEStats(stats) ? stats.receivingYards : 0,
                    maxValue: 100, // 100+ receiving yards for TE is elite
                },
                {
                    key: "receptions",
                    label: "Receptions",
                    shortLabel: "CTCH",
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
                    shortLabel: "RCTD",
                    getValue: (stats) =>
                        isTEStats(stats) ? stats.receivingTDs : 0,
                    maxValue: 2, // 2+ receiving TDs is elite
                },
            ];
    }
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
                        className="max-w-sm p-3 space-y-1.5"
                    >
                        <p className="font-semibold text-base text-zinc-100">
                            {tooltipData.name}
                        </p>
                        <p className="text-sm leading-relaxed text-zinc-300">
                            {tooltipData.description}
                        </p>
                        <p className="text-sm leading-relaxed text-zinc-400 italic">
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
 * Legend item configuration
 */
interface LegendItem {
    bgClass: string;
    label: string;
}

/**
 * Performance legend items for positive stats
 * Single green scale from bright (elite) to dark (low)
 */
const POSITIVE_LEGEND_ITEMS: LegendItem[] = [
    { bgClass: "bg-tier-elite", label: "Elite" },
    { bgClass: "bg-tier-great", label: "Great" },
    { bgClass: "bg-tier-good", label: "Good" },
    { bgClass: "bg-tier-average", label: "Avg" },
    { bgClass: "bg-tier-poor", label: "Low" },
];

/**
 * Performance legend items for negative stats (INTs)
 */
const NEGATIVE_LEGEND_ITEMS: LegendItem[] = [
    { bgClass: "bg-tier-great", label: "0" },
    { bgClass: "bg-tier-negative-mild", label: "1" },
    { bgClass: "bg-tier-negative-bad", label: "2" },
    { bgClass: "bg-tier-negative-awful", label: "3+" },
];

/**
 * PerformanceLegend component
 * Displays a visual guide for interpreting the heatmap colors
 *
 * @param showNegative - Whether to show the negative stats legend (for QBs)
 */
function PerformanceLegend({ showNegative }: { showNegative: boolean }) {
    return (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground mb-4">
            {/* Positive stats legend */}
            <div className="flex items-center gap-2">
                <span className="font-medium">Performance:</span>
                <div className="flex items-center gap-1">
                    {POSITIVE_LEGEND_ITEMS.map((item) => (
                        <div
                            key={item.label}
                            className="flex items-center gap-1"
                        >
                            <div
                                className={cn(
                                    "w-4 h-4 rounded-sm",
                                    item.bgClass
                                )}
                            />
                            <span className="text-zinc-400">{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Negative stats legend (for QBs with INTs) */}
            {showNegative && (
                <div className="flex items-center gap-2">
                    <span className="font-medium">INTs:</span>
                    <div className="flex items-center gap-1">
                        {NEGATIVE_LEGEND_ITEMS.map((item) => (
                            <div
                                key={item.label}
                                className="flex items-center gap-1"
                            >
                                <div
                                    className={cn(
                                        "w-4 h-4 rounded-sm",
                                        item.bgClass
                                    )}
                                />
                                <span className="text-zinc-400">
                                    {item.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * GameLogTable component
 *
 * Displays weekly stats in a table format with discrete performance tiers:
 * - Rows are weeks, columns are stats
 * - Each cell is color-coded using discrete tiers (Elite/Great/Good/Average/Poor)
 * - Zero values have no color
 * - Includes a visual legend for easy interpretation
 * - Column headers include tooltips with metric explanations
 *
 * The discrete tier approach makes it instantly clear:
 * - 🟢 Bright green = Elite game (top tier)
 * - 🟢 Medium green = Great/Good game
 * - ⚫ Gray = Average/Below average
 * - 🟡🟠🔴 Yellow/Orange/Red = Bad game (for negative stats like INTs)
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

    // Calculate the actual max value for each column from the data
    // This is used to determine which cell(s) get the "elite" gradient
    const columnMaxValues = React.useMemo(() => {
        const maxValues: Record<string, number> = {};
        columns.forEach((col) => {
            const values = weeklyStats.map((stat) => col.getValue(stat.stats));
            maxValues[col.key] = Math.max(...values, 0);
        });
        return maxValues;
    }, [weeklyStats, columns]);

    // Identify negative stats (like interceptions)
    const negativeStats = new Set(["interceptions"]);

    // Check if this position has negative stats to show in legend
    const hasNegativeStats = position === "QB";

    return (
        <div className={cn("space-y-2", className)}>
            {/* Performance legend for visual reference */}
            <PerformanceLegend showNegative={hasNegativeStats} />

            <div className="overflow-x-auto">
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

                                    {/* Stat cells with discrete tier coloring */}
                                    {columns.map((col) => {
                                        const value = col.getValue(stat.stats);
                                        const isNegative = negativeStats.has(
                                            col.key
                                        );

                                        // Get the appropriate tier and config
                                        let tierConfig: TierConfig;
                                        if (isNegative) {
                                            // For negative stats (INTs), use the negative tier system
                                            const tier = getNegativeTier(value);
                                            tierConfig = NEGATIVE_TIERS[tier];
                                        } else {
                                            // For positive stats, use the standard performance tier
                                            // Pass both the threshold max and actual max from data
                                            const actualMax =
                                                columnMaxValues[col.key];
                                            const tier = getPerformanceTier(
                                                value,
                                                col.maxValue,
                                                actualMax
                                            );
                                            tierConfig =
                                                PERFORMANCE_TIERS[tier];
                                        }

                                        return (
                                            <td
                                                key={col.key}
                                                className="py-2 px-1 text-center"
                                            >
                                                <div
                                                    className={cn(
                                                        "rounded-md px-2 py-1.5 text-sm tabular-nums transition-colors",
                                                        tierConfig.bgClass,
                                                        tierConfig.textClass
                                                    )}
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
                {/* Legend skeleton */}
                <div className="flex gap-4 mb-4">
                    <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                    <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div
                                key={i}
                                className="h-4 w-4 bg-muted rounded animate-pulse"
                            />
                        ))}
                    </div>
                </div>
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
