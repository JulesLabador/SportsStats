"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Trend direction type
 */
export type TrendDirection = "up" | "down" | "neutral";

/**
 * Props for the TrendIndicator component
 */
interface TrendIndicatorProps {
    /** Direction of the trend */
    direction: TrendDirection;
    /** Optional percentage change to display */
    percentage?: number;
    /** Size variant */
    size?: "sm" | "md" | "lg";
    /** Whether to show the label text */
    showLabel?: boolean;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Get size classes for the indicator
 */
const getSizeClasses = (size: "sm" | "md" | "lg") => {
    switch (size) {
        case "sm":
            return {
                icon: "w-3 h-3",
                text: "text-xs",
                gap: "gap-0.5",
            };
        case "lg":
            return {
                icon: "w-5 h-5",
                text: "text-base",
                gap: "gap-1.5",
            };
        case "md":
        default:
            return {
                icon: "w-4 h-4",
                text: "text-sm",
                gap: "gap-1",
            };
    }
};

/**
 * Get color classes based on trend direction
 */
const getTrendColors = (direction: TrendDirection) => {
    switch (direction) {
        case "up":
            return "text-stat-positive";
        case "down":
            return "text-muted-foreground";
        case "neutral":
        default:
            return "text-stat-neutral";
    }
};

/**
 * Arrow icons for each direction
 */
const TrendArrow = ({
    direction,
    className,
}: {
    direction: TrendDirection;
    className?: string;
}) => {
    if (direction === "up") {
        return (
            <svg
                className={className}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
        );
    }

    if (direction === "down") {
        return (
            <svg
                className={className}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
        );
    }

    // Neutral - horizontal line
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
        >
            <path d="M5 12h14" />
        </svg>
    );
};

/**
 * TrendIndicator component for showing performance trends
 *
 * Displays an arrow with optional percentage change
 * Color-coded: green for up, muted for down, blue for neutral
 *
 * @example
 * ```tsx
 * <TrendIndicator direction="up" percentage={12.5} />
 * <TrendIndicator direction="down" percentage={-8.3} showLabel />
 * ```
 */
export function TrendIndicator({
    direction,
    percentage,
    size = "md",
    showLabel = false,
    className,
}: TrendIndicatorProps) {
    const sizes = getSizeClasses(size);
    const colors = getTrendColors(direction);

    const label =
        direction === "up" ? "Up" : direction === "down" ? "Down" : "Stable";

    return (
        <div
            className={cn(
                "inline-flex items-center",
                sizes.gap,
                colors,
                className
            )}
        >
            <TrendArrow direction={direction} className={sizes.icon} />
            {percentage !== undefined && (
                <span className={cn("font-medium tabular-nums", sizes.text)}>
                    {percentage > 0 ? "+" : ""}
                    {percentage.toFixed(1)}%
                </span>
            )}
            {showLabel && (
                <span className={cn("font-medium", sizes.text)}>{label}</span>
            )}
        </div>
    );
}

/**
 * Calculate trend direction from two values
 * @param current - Current value
 * @param previous - Previous value
 * @param threshold - Percentage threshold for neutral (default 2%)
 */
export function calculateTrend(
    current: number,
    previous: number,
    threshold: number = 0.02
): { direction: TrendDirection; percentage: number } {
    if (previous === 0) {
        return { direction: "neutral", percentage: 0 };
    }

    const percentChange = ((current - previous) / previous) * 100;

    if (Math.abs(percentChange) < threshold * 100) {
        return { direction: "neutral", percentage: percentChange };
    }

    return {
        direction: percentChange > 0 ? "up" : "down",
        percentage: percentChange,
    };
}
