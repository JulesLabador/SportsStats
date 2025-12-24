"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { PerformanceLevel } from "@/lib/types";

/**
 * Props for the StatBar component
 */
interface StatBarProps {
    /** The stat label (e.g., "Passing Yards") */
    label: string;
    /** Current value of the stat */
    value: number;
    /** Maximum value for the bar (determines fill percentage) */
    maxValue: number;
    /** Optional average value to show as a marker */
    average?: number;
    /** Performance level for color coding */
    performance?: PerformanceLevel;
    /** Unit to display after the value (e.g., "yds", "TDs") */
    unit?: string;
    /** Additional CSS classes */
    className?: string;
    /** Whether to show the numeric value */
    showValue?: boolean;
    /** Size variant */
    size?: "sm" | "md" | "lg";
}

/**
 * Get color classes based on performance level
 */
const getPerformanceColors = (performance: PerformanceLevel) => {
    switch (performance) {
        case "above":
            return {
                bar: "bg-stat-positive",
                text: "text-stat-positive",
            };
        case "below":
            return {
                bar: "bg-muted-foreground/50",
                text: "text-muted-foreground",
            };
        case "average":
        default:
            return {
                bar: "bg-stat-neutral",
                text: "text-stat-neutral",
            };
    }
};

/**
 * Get size classes for the stat bar
 */
const getSizeClasses = (size: "sm" | "md" | "lg") => {
    switch (size) {
        case "sm":
            return {
                bar: "h-1.5",
                text: "text-xs",
                value: "text-sm",
            };
        case "lg":
            return {
                bar: "h-3",
                text: "text-sm",
                value: "text-xl",
            };
        case "md":
        default:
            return {
                bar: "h-2",
                text: "text-xs",
                value: "text-lg",
            };
    }
};

/**
 * StatBar component for visualizing player statistics
 *
 * Displays a horizontal bar with:
 * - Label and optional value
 * - Color-coded fill based on performance
 * - Optional average marker
 *
 * @example
 * ```tsx
 * <StatBar
 *   label="Passing Yards"
 *   value={324}
 *   maxValue={500}
 *   average={280}
 *   performance="above"
 *   unit="yds"
 * />
 * ```
 */
export function StatBar({
    label,
    value,
    maxValue,
    average,
    performance = "average",
    unit = "",
    className,
    showValue = true,
    size = "md",
}: StatBarProps) {
    // Calculate fill percentage (capped at 100%)
    const fillPercent = Math.min((value / maxValue) * 100, 100);

    // Calculate average marker position if provided
    const averagePercent = average
        ? Math.min((average / maxValue) * 100, 100)
        : null;

    const colors = getPerformanceColors(performance);
    const sizes = getSizeClasses(size);

    return (
        <div className={cn("space-y-1.5", className)}>
            {/* Header row with label and value */}
            <div className="flex items-baseline justify-between gap-2">
                <span
                    className={cn(
                        "font-medium text-muted-foreground",
                        sizes.text
                    )}
                >
                    {label}
                </span>
                {showValue && (
                    <span
                        className={cn(
                            "font-semibold tabular-nums",
                            sizes.value,
                            colors.text
                        )}
                    >
                        {value.toLocaleString()}
                        {unit && (
                            <span className="ml-0.5 text-muted-foreground font-normal text-xs">
                                {unit}
                            </span>
                        )}
                    </span>
                )}
            </div>

            {/* Bar container */}
            <div
                className={cn(
                    "relative w-full rounded-full bg-muted/50",
                    sizes.bar
                )}
            >
                {/* Fill bar */}
                <div
                    className={cn(
                        "absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out",
                        colors.bar
                    )}
                    style={{ width: `${fillPercent}%` }}
                />

                {/* Average marker */}
                {averagePercent !== null && (
                    <div
                        className="absolute top-1/2 -translate-y-1/2 w-0.5 h-[150%] bg-foreground/40 rounded-full"
                        style={{ left: `${averagePercent}%` }}
                        title={`Average: ${average?.toLocaleString()}`}
                    />
                )}
            </div>
        </div>
    );
}

/**
 * Compact stat display for smaller spaces
 */
interface StatValueProps {
    label: string;
    value: number;
    unit?: string;
    performance?: PerformanceLevel;
    className?: string;
}

export function StatValue({
    label,
    value,
    unit,
    performance = "average",
    className,
}: StatValueProps) {
    const colors = getPerformanceColors(performance);

    return (
        <div className={cn("text-center", className)}>
            <div className={cn("text-2xl font-bold tabular-nums", colors.text)}>
                {value.toLocaleString()}
                {unit && (
                    <span className="ml-0.5 text-sm text-muted-foreground font-normal">
                        {unit}
                    </span>
                )}
            </div>
            <div className="text-xs text-muted-foreground font-medium mt-0.5">
                {label}
            </div>
        </div>
    );
}
