"use client";

import { cn } from "@/lib/utils";

/**
 * Props for HistoryFilters component
 */
interface HistoryFiltersProps {
    /** Current season being viewed */
    season: number;
    /** Current week being viewed */
    week: number;
    /** Total number of games in this week */
    gameCount: number;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Get the week label (regular season or playoff)
 * @param week - Week number
 * @returns Formatted week label
 */
function getWeekLabel(week: number): string {
    if (week > 18) {
        switch (week) {
            case 19:
                return "Wild Card";
            case 20:
                return "Divisional";
            case 21:
                return "Conference Championship";
            case 22:
                return "Super Bowl";
            default:
                return `Playoff Week ${week - 18}`;
        }
    }
    return `Week ${week}`;
}

/**
 * HistoryFilters component
 *
 * Displays the current season/week filter state:
 * - Season and week header
 * - Game count summary
 * - Visual indicator for playoff weeks
 */
export function HistoryFilters({
    season,
    week,
    gameCount,
    className,
}: HistoryFiltersProps) {
    const isPlayoff = week > 18;
    const weekLabel = getWeekLabel(week);

    return (
        <div className={cn("space-y-2", className)}>
            {/* Main header */}
            <div className="flex items-baseline gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold">
                    {weekLabel}
                </h1>
                <span className="text-lg text-muted-foreground">
                    {season}
                </span>
                {isPlayoff && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-stat-growth/20 text-stat-growth">
                        Playoffs
                    </span>
                )}
            </div>

            {/* Game count */}
            <p className="text-sm text-muted-foreground">
                {gameCount === 0
                    ? "No games found"
                    : gameCount === 1
                    ? "1 game"
                    : `${gameCount} games`}
            </p>
        </div>
    );
}

/**
 * Skeleton loader for HistoryFilters
 */
export function HistoryFiltersSkeleton() {
    return (
        <div className="space-y-2">
            <div className="flex items-baseline gap-3">
                <div className="h-8 w-32 bg-muted rounded animate-pulse" />
                <div className="h-6 w-12 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
        </div>
    );
}

