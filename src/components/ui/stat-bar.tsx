"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { getMetricTooltip } from "@/lib/metric-descriptions";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
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
    /** Optional metric key for tooltip lookup (e.g., "passingYards") */
    metricKey?: string;
}

/**
 * Apple HIG System Colors for gradient bars
 * Reference: https://developer.apple.com/design/human-interface-guidelines/color
 */
const APPLE_BLUE = "#007AFF";
const APPLE_PURPLE = "#AF52DE";

/**
 * Get color classes based on performance level
 * Uses Apple HIG blue-purple gradient for bars, white text for values
 */
const getPerformanceColors = (_performance: PerformanceLevel) => {
    // All bars use the same blue-purple gradient
    // Text values are white for readability
    return {
        barStyle: {
            background: `linear-gradient(to right, ${APPLE_BLUE}, ${APPLE_PURPLE})`,
        },
        text: "text-white",
    };
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
 * - Label and optional value (with tooltip explanation)
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
 *   metricKey="passingYards"
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
    metricKey,
}: StatBarProps) {
    // Calculate fill percentage (capped at 100%)
    const fillPercent = Math.min((value / maxValue) * 100, 100);

    // Calculate average marker position if provided
    const averagePercent = average
        ? Math.min((average / maxValue) * 100, 100)
        : null;

    const colors = getPerformanceColors(performance);
    const sizes = getSizeClasses(size);

    // Get tooltip content if metric key is provided
    const tooltipData = metricKey ? getMetricTooltip(metricKey) : null;

    /**
     * Render the label element, optionally wrapped in a tooltip
     */
    const renderLabel = () => {
        const labelElement = (
            <span
                className={cn(
                    "font-medium text-muted-foreground",
                    sizes.text,
                    tooltipData &&
                        "cursor-help underline decoration-dotted decoration-muted-foreground/50 underline-offset-2"
                )}
            >
                {label}
            </span>
        );

        // If we have tooltip data, wrap the label in a tooltip
        if (tooltipData) {
            return (
                <Tooltip>
                    <TooltipTrigger asChild>{labelElement}</TooltipTrigger>
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
            );
        }

        return labelElement;
    };

    return (
        <div className={cn("space-y-1.5", className)}>
            {/* Header row with label and value */}
            <div className="flex items-baseline justify-between gap-2">
                {renderLabel()}
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

            {/* Bar container with tooltip explanation */}
            <Tooltip>
                <TooltipTrigger asChild>
                    <div
                        className={cn(
                            "relative w-full rounded-full bg-muted/50 cursor-help",
                            sizes.bar
                        )}
                    >
                        {/* Fill bar with Apple HIG blue-purple gradient */}
                        <div
                            className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
                            style={{
                                width: `${fillPercent}%`,
                                ...colors.barStyle,
                            }}
                        />

                        {/* Average marker */}
                        {averagePercent !== null && (
                            <div
                                className="absolute top-1/2 -translate-y-1/2 w-0.5 h-[150%] bg-foreground/40 rounded-full"
                                style={{ left: `${averagePercent}%` }}
                            />
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent
                    side="bottom"
                    className="max-w-xs p-3 space-y-2"
                >
                    {/* Current progress */}
                    <div className="space-y-1">
                        <p className="font-semibold text-base text-zinc-100">
                            {Math.round(fillPercent)}% of Elite Ceiling
                        </p>
                        <p className="text-sm text-zinc-300">
                            <span className="font-medium">
                                {value.toLocaleString()}
                            </span>
                            <span className="text-zinc-400">
                                {" "}
                                / {maxValue.toLocaleString()} {unit}
                            </span>
                        </p>
                    </div>

                    {/* Average explanation if present */}
                    {average !== undefined && (
                        <div className="pt-1 border-t border-zinc-700">
                            <p className="text-base text-zinc-400">
                                <span className="inline-block w-1.5 h-3 bg-foreground/40 rounded-full mr-1.5 align-middle" />
                                League avg: {average.toLocaleString()} {unit}
                            </p>
                        </div>
                    )}

                    {/* Explanation */}
                    <p className="text-sm text-zinc-500 italic pt-1">
                        Bar shows progress toward an elite season performance
                    </p>
                </TooltipContent>
            </Tooltip>
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
    /** Optional metric key for tooltip lookup (e.g., "passingYards") */
    metricKey?: string;
}

/**
 * StatValue component for compact stat display
 *
 * Shows a value with label, optionally with tooltip explanation
 *
 * @example
 * ```tsx
 * <StatValue
 *   label="Passing"
 *   value={324}
 *   performance="above"
 *   metricKey="passingYards"
 * />
 * ```
 */
export function StatValue({
    label,
    value,
    unit,
    performance = "average",
    className,
    metricKey,
}: StatValueProps) {
    // Use white text for stat values to match the gradient bar styling
    const colors = { text: "text-white" };

    // Get tooltip content if metric key is provided
    const tooltipData = metricKey ? getMetricTooltip(metricKey) : null;

    /**
     * Render the label element, optionally wrapped in a tooltip
     */
    const renderLabel = () => {
        const labelElement = (
            <div
                className={cn(
                    "text-sm text-muted-foreground font-medium mt-0.5 ",
                    tooltipData &&
                        "cursor-help underline decoration-dotted decoration-muted-foreground/50 underline-offset-2"
                )}
            >
                {label}
            </div>
        );

        // If we have tooltip data, wrap the label in a tooltip
        if (tooltipData) {
            return (
                <Tooltip>
                    <TooltipTrigger asChild>{labelElement}</TooltipTrigger>
                    <TooltipContent
                        side="top"
                        className="max-w-xs p-3 space-y-1.5"
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
            );
        }

        return labelElement;
    };

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
            {renderLabel()}
        </div>
    );
}
