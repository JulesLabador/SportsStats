"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { StatBar, StatValue } from "@/components/ui/stat-bar";
import type {
    PlayerPosition,
    PositionStats,
    SeasonSummary,
    PerformanceLevel,
    QBStats,
    RBStats,
    WRStats,
    TEStats,
} from "@/lib/types";
import {
    isQBStats,
    isRBStats,
    isWRStats,
    isTEStats,
    getPerformanceLevel,
} from "@/lib/types";

/**
 * Props for the StatSummary component
 */
interface StatSummaryProps {
    /** Player position for determining which stats to show */
    position: PlayerPosition;
    /** Season summary with total and average stats */
    seasonSummary: SeasonSummary;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Stat configuration for each position
 * Defines which stats to display and their max values for visualization
 */
interface StatConfig {
    key: string;
    label: string;
    unit: string;
    maxValue: number;
    getValue: (stats: PositionStats) => number;
}

/**
 * Get stat configurations based on position
 */
const getStatConfigs = (position: PlayerPosition): StatConfig[] => {
    switch (position) {
        case "QB":
            return [
                {
                    key: "passingYards",
                    label: "Passing Yards",
                    unit: "yds",
                    maxValue: 5500,
                    getValue: (stats) =>
                        isQBStats(stats) ? stats.passingYards : 0,
                },
                {
                    key: "passingTDs",
                    label: "Passing TDs",
                    unit: "TDs",
                    maxValue: 50,
                    getValue: (stats) =>
                        isQBStats(stats) ? stats.passingTDs : 0,
                },
                {
                    key: "rushingYards",
                    label: "Rushing Yards",
                    unit: "yds",
                    maxValue: 1000,
                    getValue: (stats) =>
                        isQBStats(stats) ? stats.rushingYards : 0,
                },
            ];
        case "RB":
            return [
                {
                    key: "rushingYards",
                    label: "Rushing Yards",
                    unit: "yds",
                    maxValue: 2000,
                    getValue: (stats) =>
                        isRBStats(stats) ? stats.rushingYards : 0,
                },
                {
                    key: "rushingTDs",
                    label: "Rushing TDs",
                    unit: "TDs",
                    maxValue: 20,
                    getValue: (stats) =>
                        isRBStats(stats) ? stats.rushingTDs : 0,
                },
                {
                    key: "receivingYards",
                    label: "Receiving Yards",
                    unit: "yds",
                    maxValue: 800,
                    getValue: (stats) =>
                        isRBStats(stats) ? stats.receivingYards : 0,
                },
            ];
        case "WR":
            return [
                {
                    key: "receivingYards",
                    label: "Receiving Yards",
                    unit: "yds",
                    maxValue: 2000,
                    getValue: (stats) =>
                        isWRStats(stats) ? stats.receivingYards : 0,
                },
                {
                    key: "receivingTDs",
                    label: "Receiving TDs",
                    unit: "TDs",
                    maxValue: 18,
                    getValue: (stats) =>
                        isWRStats(stats) ? stats.receivingTDs : 0,
                },
                {
                    key: "receptions",
                    label: "Receptions",
                    unit: "rec",
                    maxValue: 150,
                    getValue: (stats) =>
                        isWRStats(stats) ? stats.receptions : 0,
                },
            ];
        case "TE":
            return [
                {
                    key: "receivingYards",
                    label: "Receiving Yards",
                    unit: "yds",
                    maxValue: 1400,
                    getValue: (stats) =>
                        isTEStats(stats) ? stats.receivingYards : 0,
                },
                {
                    key: "receivingTDs",
                    label: "Receiving TDs",
                    unit: "TDs",
                    maxValue: 15,
                    getValue: (stats) =>
                        isTEStats(stats) ? stats.receivingTDs : 0,
                },
                {
                    key: "receptions",
                    label: "Receptions",
                    unit: "rec",
                    maxValue: 120,
                    getValue: (stats) =>
                        isTEStats(stats) ? stats.receptions : 0,
                },
            ];
    }
};

/**
 * League average stats for performance comparison
 * These are approximate averages for top performers at each position
 */
const leagueAverages: Record<PlayerPosition, Record<string, number>> = {
    QB: {
        passingYards: 4000,
        passingTDs: 28,
        rushingYards: 200,
    },
    RB: {
        rushingYards: 1000,
        rushingTDs: 8,
        receivingYards: 300,
    },
    WR: {
        receivingYards: 1000,
        receivingTDs: 7,
        receptions: 80,
    },
    TE: {
        receivingYards: 700,
        receivingTDs: 5,
        receptions: 60,
    },
};

/**
 * StatSummary component
 *
 * Displays key season statistics with visual bars
 * Stats are position-specific and color-coded by performance
 *
 * @example
 * ```tsx
 * <StatSummary
 *   position="QB"
 *   seasonSummary={seasonSummary}
 * />
 * ```
 */
export function StatSummary({
    position,
    seasonSummary,
    className,
}: StatSummaryProps) {
    const statConfigs = getStatConfigs(position);
    const averages = leagueAverages[position];

    return (
        <Card className={cn("", className)}>
            <CardContent className="pt-6 space-y-6">
                {/* Season header */}
                <div className="flex items-baseline justify-between">
                    <h2 className="text-lg font-semibold">
                        {seasonSummary.season} Season
                    </h2>
                    <span className="text-sm text-muted-foreground">
                        {seasonSummary.gamesPlayed} games
                    </span>
                </div>

                {/* Stat bars */}
                <div className="space-y-4">
                    {statConfigs.map((config) => {
                        const value = config.getValue(seasonSummary.totalStats);
                        const average =
                            averages[config.key] || config.maxValue / 2;
                        const performance = getPerformanceLevel(value, average);

                        return (
                            <StatBar
                                key={config.key}
                                label={config.label}
                                value={value}
                                maxValue={config.maxValue}
                                average={average}
                                performance={performance}
                                unit={config.unit}
                                size="lg"
                            />
                        );
                    })}
                </div>

                {/* Per game averages */}
                <div className="pt-4 border-t border-border">
                    <h3 className="text-sm font-medium text-muted-foreground mb-6">
                        Per Game Average
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                        {statConfigs.map((config) => {
                            const avgValue = config.getValue(
                                seasonSummary.averageStats
                            );
                            const leagueAvg = (averages[config.key] || 0) / 17; // Approximate per-game
                            const performance = getPerformanceLevel(
                                avgValue,
                                leagueAvg
                            );

                            return (
                                <StatValue
                                    key={`avg-${config.key}`}
                                    label={config.label}
                                    value={Math.round(avgValue * 10) / 10}
                                    performance={performance}
                                />
                            );
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
