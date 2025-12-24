"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    TrendIndicator,
    calculateTrend,
} from "@/components/ui/trend-indicator";
import type {
    WeeklyStat,
    PlayerPosition,
    PositionStats,
    PerformanceLevel,
} from "@/lib/types";
import {
    isQBStats,
    isRBStats,
    isWRStats,
    isTEStats,
    getPerformanceLevel,
} from "@/lib/types";

/**
 * Props for the WeeklyCard component
 */
interface WeeklyCardProps {
    /** Weekly stat data */
    stat: WeeklyStat;
    /** Player position for determining which stats to show */
    position: PlayerPosition;
    /** Previous week's stats for trend calculation */
    previousStat?: WeeklyStat;
    /** Season average for performance comparison */
    seasonAverage: PositionStats;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Get primary stats to display based on position
 */
const getPrimaryStats = (
    stats: PositionStats,
    position: PlayerPosition
): { label: string; value: number; unit: string }[] => {
    switch (position) {
        case "QB":
            if (isQBStats(stats)) {
                return [
                    { label: "Pass Yds", value: stats.passingYards, unit: "" },
                    { label: "Pass TD", value: stats.passingTDs, unit: "" },
                    { label: "INT", value: stats.interceptions, unit: "" },
                ];
            }
            break;
        case "RB":
            if (isRBStats(stats)) {
                return [
                    { label: "Rush Yds", value: stats.rushingYards, unit: "" },
                    { label: "Rush TD", value: stats.rushingTDs, unit: "" },
                    { label: "Rec Yds", value: stats.receivingYards, unit: "" },
                ];
            }
            break;
        case "WR":
            if (isWRStats(stats)) {
                return [
                    { label: "Rec Yds", value: stats.receivingYards, unit: "" },
                    { label: "Rec TD", value: stats.receivingTDs, unit: "" },
                    { label: "Rec", value: stats.receptions, unit: "" },
                ];
            }
            break;
        case "TE":
            if (isTEStats(stats)) {
                return [
                    { label: "Rec Yds", value: stats.receivingYards, unit: "" },
                    { label: "Rec TD", value: stats.receivingTDs, unit: "" },
                    { label: "Rec", value: stats.receptions, unit: "" },
                ];
            }
            break;
    }
    return [];
};

/**
 * Get the primary stat value for trend calculation
 */
const getPrimaryStat = (
    stats: PositionStats,
    position: PlayerPosition
): number => {
    switch (position) {
        case "QB":
            return isQBStats(stats) ? stats.passingYards : 0;
        case "RB":
            return isRBStats(stats) ? stats.rushingYards : 0;
        case "WR":
        case "TE":
            return isWRStats(stats) || isTEStats(stats)
                ? (stats as { receivingYards: number }).receivingYards
                : 0;
    }
};

/**
 * Get performance level for the week
 */
const getWeekPerformance = (
    stats: PositionStats,
    average: PositionStats,
    position: PlayerPosition
): PerformanceLevel => {
    const current = getPrimaryStat(stats, position);
    const avg = getPrimaryStat(average, position);
    return getPerformanceLevel(current, avg);
};

/**
 * WeeklyCard component
 *
 * Displays a single week's performance with:
 * - Week number and opponent
 * - Game result (W/L)
 * - Key stats for the position
 * - Trend indicator vs previous week
 * - Performance indicator vs season average
 *
 * @example
 * ```tsx
 * <WeeklyCard
 *   stat={weekStat}
 *   position="QB"
 *   previousStat={prevWeekStat}
 *   seasonAverage={avgStats}
 * />
 * ```
 */
export function WeeklyCard({
    stat,
    position,
    previousStat,
    seasonAverage,
    className,
}: WeeklyCardProps) {
    const primaryStats = getPrimaryStats(stat.stats, position);
    const performance = getWeekPerformance(stat.stats, seasonAverage, position);

    // Calculate trend from previous week
    const trend = previousStat
        ? calculateTrend(
              getPrimaryStat(stat.stats, position),
              getPrimaryStat(previousStat.stats, position)
          )
        : null;

    // Parse result for styling
    const isWin = stat.result.startsWith("W");

    // Performance indicator color
    const performanceColor =
        performance === "above"
            ? "border-l-stat-positive"
            : performance === "below"
            ? "border-l-muted-foreground/50"
            : "border-l-stat-neutral";

    return (
        <Card
            className={cn(
                "border-l-4 transition-colors",
                performanceColor,
                className
            )}
        >
            <CardContent className="py-4 px-4">
                {/* Header row */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">
                            Week {stat.week}
                        </span>
                        <span className="text-muted-foreground/50">•</span>
                        <span className="text-sm font-medium">
                            {stat.location === "H" ? "vs" : "@"} {stat.opponent}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {trend && (
                            <TrendIndicator
                                direction={trend.direction}
                                percentage={trend.percentage}
                                size="sm"
                            />
                        )}
                        <Badge
                            variant="secondary"
                            className={cn(
                                "font-mono text-xs",
                                isWin
                                    ? "bg-stat-positive/20 text-stat-positive"
                                    : "bg-muted text-muted-foreground"
                            )}
                        >
                            {stat.result}
                        </Badge>
                    </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-4">
                    {primaryStats.map((s, index) => (
                        <div key={s.label} className="text-center">
                            <div
                                className={cn(
                                    "text-xl font-bold tabular-nums",
                                    index === 0 &&
                                        performance === "above" &&
                                        "text-stat-positive",
                                    index === 0 &&
                                        performance === "below" &&
                                        "text-muted-foreground"
                                )}
                            >
                                {s.value}
                            </div>
                            <div className="text-xs text-muted-foreground font-medium">
                                {s.label}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

/**
 * WeeklyCardSkeleton for loading states
 */
export function WeeklyCardSkeleton({ className }: { className?: string }) {
    return (
        <Card className={cn("border-l-4 border-l-muted", className)}>
            <CardContent className="py-4 px-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                        <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                    </div>
                    <div className="h-5 w-16 bg-muted rounded animate-pulse" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="text-center">
                            <div className="h-7 w-12 bg-muted rounded animate-pulse mx-auto mb-1" />
                            <div className="h-3 w-14 bg-muted rounded animate-pulse mx-auto" />
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
