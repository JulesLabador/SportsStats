"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Props for HistoryPagination component
 */
interface HistoryPaginationProps {
    /** Current season */
    season: number;
    /** Current week */
    week: number;
    /** Array of available weeks for the current season */
    availableWeeks: number[];
    /** Array of available seasons */
    availableSeasons: number[];
    /** Additional CSS classes */
    className?: string;
}

/**
 * Calculate the previous week/season
 * @param season - Current season
 * @param week - Current week
 * @param availableWeeks - Available weeks for current season
 * @param availableSeasons - All available seasons
 * @returns Previous season/week or null if at start
 */
function getPreviousWeek(
    season: number,
    week: number,
    availableWeeks: number[],
    availableSeasons: number[]
): { season: number; week: number } | null {
    const currentWeekIndex = availableWeeks.indexOf(week);

    // If there's a previous week in this season
    if (currentWeekIndex > 0) {
        return { season, week: availableWeeks[currentWeekIndex - 1] };
    }

    // Otherwise, try to go to the previous season's last week
    const currentSeasonIndex = availableSeasons.indexOf(season);
    if (currentSeasonIndex < availableSeasons.length - 1) {
        // Previous season exists (seasons are sorted descending, so next index is older)
        const prevSeason = availableSeasons[currentSeasonIndex + 1];
        // We'll need to fetch weeks for that season - for now return week 18 as max regular season
        return { season: prevSeason, week: 18 };
    }

    return null;
}

/**
 * Calculate the next week/season
 * @param season - Current season
 * @param week - Current week
 * @param availableWeeks - Available weeks for current season
 * @param availableSeasons - All available seasons
 * @returns Next season/week or null if at end
 */
function getNextWeek(
    season: number,
    week: number,
    availableWeeks: number[],
    availableSeasons: number[]
): { season: number; week: number } | null {
    const currentWeekIndex = availableWeeks.indexOf(week);

    // If there's a next week in this season
    if (currentWeekIndex < availableWeeks.length - 1 && currentWeekIndex !== -1) {
        return { season, week: availableWeeks[currentWeekIndex + 1] };
    }

    // Otherwise, try to go to the next season's first week
    const currentSeasonIndex = availableSeasons.indexOf(season);
    if (currentSeasonIndex > 0) {
        // Next season exists (seasons are sorted descending, so previous index is newer)
        const nextSeason = availableSeasons[currentSeasonIndex - 1];
        // Start at week 1 for the next season
        return { season: nextSeason, week: 1 };
    }

    return null;
}

/**
 * Build URL for a specific season/week
 * Uses path-based routing for SEO-friendly URLs
 * @param season - Season year
 * @param week - Week number
 * @returns URL path string
 */
function buildUrl(season: number, week: number): string {
    return `/nfl/history/${season}/${week}`;
}

/**
 * HistoryPagination component
 *
 * Provides Previous/Next navigation for browsing game history:
 * - Previous arrow to go to earlier week/season
 * - Current week/season display
 * - Next arrow to go to later week/season
 * - Handles season boundaries gracefully
 */
export function HistoryPagination({
    season,
    week,
    availableWeeks,
    availableSeasons,
    className,
}: HistoryPaginationProps) {
    const prevWeek = getPreviousWeek(season, week, availableWeeks, availableSeasons);
    const nextWeek = getNextWeek(season, week, availableWeeks, availableSeasons);

    return (
        <div
            className={cn(
                "flex items-center justify-between gap-4",
                className
            )}
        >
            {/* Previous Button */}
            {prevWeek ? (
                <Link href={buildUrl(prevWeek.season, prevWeek.week)}>
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 hover:cursor-pointer"
                    >
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 19l-7-7 7-7"
                            />
                        </svg>
                        <span className="hidden sm:inline">Previous</span>
                    </Button>
                </Link>
            ) : (
                <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className="gap-1 opacity-50"
                >
                    <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 19l-7-7 7-7"
                        />
                    </svg>
                    <span className="hidden sm:inline">Previous</span>
                </Button>
            )}

            {/* Current Position Display */}
            <div className="flex flex-col items-center">
                <span className="text-sm font-medium">
                    {week > 18 ? "Playoff" : `Week ${week}`}
                </span>
                <span className="text-xs text-muted-foreground">
                    {season} Season
                </span>
            </div>

            {/* Next Button */}
            {nextWeek ? (
                <Link href={buildUrl(nextWeek.season, nextWeek.week)}>
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 hover:cursor-pointer"
                    >
                        <span className="hidden sm:inline">Next</span>
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                            />
                        </svg>
                    </Button>
                </Link>
            ) : (
                <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className="gap-1 opacity-50"
                >
                    <span className="hidden sm:inline">Next</span>
                    <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                        />
                    </svg>
                </Button>
            )}
        </div>
    );
}

/**
 * Skeleton loader for HistoryPagination
 */
export function HistoryPaginationSkeleton() {
    return (
        <div className="flex items-center justify-between gap-4">
            <div className="h-9 w-24 bg-muted rounded animate-pulse" />
            <div className="flex flex-col items-center gap-1">
                <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                <div className="h-3 w-20 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-9 w-24 bg-muted rounded animate-pulse" />
        </div>
    );
}

