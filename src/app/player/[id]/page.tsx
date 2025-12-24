"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PlayerHeader } from "@/components/player/player-header";
import { StatSummary } from "@/components/player/stat-summary";
import { WeeklyCard, WeeklyCardSkeleton } from "@/components/player/weekly-card";
import { usePlayerStore, useSelectedSeason } from "@/stores/player-store";
import { getPlayerWithStats, getAvailableSeasons } from "@/lib/mock-data";
import type { PlayerWithStats } from "@/lib/types";

/**
 * Player profile page
 * 
 * Displays:
 * - Player header with name, team, position, season selector
 * - Season stat summary with visual bars
 * - Week-by-week breakdown cards
 */
export default function PlayerPage() {
  const params = useParams();
  const playerId = params.id as string;

  // Zustand store state
  const selectedSeason = useSelectedSeason();
  const { setSelectedSeason, setPlayer, getPlayer } = usePlayerStore();

  // Local state for full player data
  const [playerData, setPlayerData] = React.useState<PlayerWithStats | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Available seasons
  const availableSeasons = React.useMemo(() => getAvailableSeasons(), []);

  /**
   * Fetch player data when playerId or season changes
   * Uses cache-first strategy via Zustand store
   */
  React.useEffect(() => {
    setIsLoading(true);

    // Simulate network delay for realistic UX
    const timer = setTimeout(() => {
      const data = getPlayerWithStats(playerId, selectedSeason);
      if (data) {
        setPlayerData(data);
        // Cache the player in store
        setPlayer({
          id: data.id,
          name: data.name,
          team: data.team,
          position: data.position,
          jerseyNumber: data.jerseyNumber,
        });
      }
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [playerId, selectedSeason, setPlayer]);

  /**
   * Handle season change
   */
  const handleSeasonChange = (season: number) => {
    setSelectedSeason(season);
  };

  // Loading state
  if (isLoading) {
    return (
      <main className="min-h-screen">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {/* Back button */}
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-6 -ml-2">
              <svg
                className="w-4 h-4 mr-2"
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
              Back
            </Button>
          </Link>

          {/* Loading skeleton */}
          <div className="space-y-6">
            {/* Header skeleton */}
            <div className="space-y-4">
              <div className="h-9 w-64 bg-muted rounded animate-pulse" />
              <div className="flex gap-2">
                <div className="h-6 w-12 bg-muted rounded animate-pulse" />
                <div className="h-6 w-10 bg-muted rounded animate-pulse" />
              </div>
            </div>

            {/* Stat summary skeleton */}
            <div className="h-64 bg-card rounded-xl animate-pulse" />

            {/* Weekly cards skeleton */}
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <WeeklyCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Not found state
  if (!playerData) {
    return (
      <main className="min-h-screen">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-6 -ml-2">
              <svg
                className="w-4 h-4 mr-2"
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
              Back
            </Button>
          </Link>

          <div className="text-center py-16">
            <h1 className="text-2xl font-bold mb-2">Player Not Found</h1>
            <p className="text-muted-foreground mb-6">
              We couldn&apos;t find a player with that ID.
            </p>
            <Link href="/">
              <Button>Search Players</Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Sort weekly stats by week (descending - most recent first)
  const sortedWeeklyStats = [...playerData.weeklyStats].sort(
    (a, b) => b.week - a.week
  );

  return (
    <main className="min-h-screen pb-16">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Back button */}
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-6 -ml-2">
            <svg
              className="w-4 h-4 mr-2"
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
            Back
          </Button>
        </Link>

        {/* Player header */}
        <PlayerHeader
          player={playerData}
          selectedSeason={selectedSeason}
          availableSeasons={availableSeasons}
          onSeasonChange={handleSeasonChange}
          className="mb-6"
        />

        {/* Season stat summary */}
        <StatSummary
          position={playerData.position}
          seasonSummary={playerData.seasonSummary}
          className="mb-8"
        />

        {/* Week-by-week breakdown */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Week by Week</h2>
          <div className="space-y-3">
            {sortedWeeklyStats.map((stat, index) => {
              // Get previous week's stat for trend calculation
              const previousStat = sortedWeeklyStats[index + 1];

              return (
                <WeeklyCard
                  key={`week-${stat.week}`}
                  stat={stat}
                  position={playerData.position}
                  previousStat={previousStat}
                  seasonAverage={playerData.seasonSummary.averageStats}
                />
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

