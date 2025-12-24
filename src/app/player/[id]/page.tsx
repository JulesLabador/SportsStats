"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PlayerHeader } from "@/components/player/player-header";
import { StatSummary } from "@/components/player/stat-summary";
import {
    GameLogTable,
    GameLogTableSkeleton,
} from "@/components/player/game-log-table";
import { usePlayerStore, useSelectedSeason } from "@/stores/player-store";
import { getPlayerWithStats, getAvailableSeasons } from "@/lib/data";
import type { PlayerWithStats } from "@/lib/types";

/**
 * Player profile page
 *
 * Displays:
 * - Player header with name, team, position, season selector
 * - Season stat summary with visual bars
 * - Game log table with heat-map coloring
 *
 * Data is fetched from Supabase database.
 */
export default function PlayerPage() {
    const params = useParams();
    const playerId = params.id as string;

    // Zustand store state
    const selectedSeason = useSelectedSeason();
    const { setSelectedSeason, setPlayer } = usePlayerStore();

    // Local state for full player data
    const [playerData, setPlayerData] = React.useState<PlayerWithStats | null>(
        null
    );
    const [isLoading, setIsLoading] = React.useState(true);
    const [availableSeasons, setAvailableSeasons] = React.useState<number[]>([2024]);

    /**
     * Fetch available seasons for this player on mount
     * Also sets the selected season to the most recent available season
     */
    React.useEffect(() => {
        async function loadAvailableSeasons() {
            try {
                const seasons = await getAvailableSeasons(playerId);
                setAvailableSeasons(seasons);

                // #region agent log
                fetch('http://127.0.0.1:7245/ingest/d123b1e9-793c-4e2a-8c08-6c4c1e97ec66',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'player/[id]/page.tsx:loadAvailableSeasons',message:'Available seasons loaded',data:{playerId,seasons,mostRecentSeason:seasons[0]},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B-fix'})}).catch(()=>{});
                // #endregion

                // Set selected season to the most recent available season
                // This ensures we don't query for a season that doesn't exist
                if (seasons.length > 0 && !seasons.includes(selectedSeason)) {
                    setSelectedSeason(seasons[0]);
                }
            } catch (error) {
                console.error("Error fetching available seasons:", error);
            }
        }
        loadAvailableSeasons();
    }, [playerId, selectedSeason, setSelectedSeason]);

    /**
     * Fetch player data when playerId or season changes
     */
    React.useEffect(() => {
        async function loadPlayerData() {
            setIsLoading(true);

            // #region agent log
            fetch('http://127.0.0.1:7245/ingest/d123b1e9-793c-4e2a-8c08-6c4c1e97ec66',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'player/[id]/page.tsx:loadPlayerData',message:'Loading player data',data:{playerId,selectedSeason,playerIdFromParams:params.id},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
            // #endregion

            try {
                const data = await getPlayerWithStats(playerId, selectedSeason);
                // #region agent log
                fetch('http://127.0.0.1:7245/ingest/d123b1e9-793c-4e2a-8c08-6c4c1e97ec66',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'player/[id]/page.tsx:afterFetch',message:'Player data fetch result',data:{playerId,hasData:!!data,dataId:data?.id,dataName:data?.name},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
                // #endregion
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
                } else {
                    setPlayerData(null);
                }
            } catch (error) {
                console.error("Error fetching player data:", error);
                setPlayerData(null);
            } finally {
                setIsLoading(false);
            }
        }

        loadPlayerData();
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
                <div className="max-w-4xl mx-auto px-4 py-6">
                    {/* Back button */}
                    <Link href="/">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="mb-6 -ml-2"
                        >
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

                        {/* Game log skeleton */}
                        <Card>
                            <CardContent className="pt-6">
                                <GameLogTableSkeleton />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        );
    }

    // Not found state
    if (!playerData) {
        return (
            <main className="min-h-screen">
                <div className="max-w-4xl mx-auto px-4 py-6">
                    <Link href="/">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="mb-6 -ml-2"
                        >
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
                        <h1 className="text-2xl font-bold mb-2">
                            Player Not Found
                        </h1>
                        <p className="text-muted-foreground mb-6">
                            We couldn&apos;t find a player with that ID, or no data exists for the {selectedSeason} season.
                        </p>
                        <Link href="/">
                            <Button>Search Players</Button>
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen pb-16">
            <div className="max-w-4xl mx-auto px-4 py-6">
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

                {/* Game Log Table */}
                <section>
                    <h2 className="text-lg font-semibold mb-4">Game Log</h2>
                    <Card>
                        <CardContent className="pt-6 pb-4">
                            {playerData.weeklyStats.length > 0 ? (
                                <GameLogTable
                                    weeklyStats={playerData.weeklyStats}
                                    position={playerData.position}
                                />
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    No game data available for the {selectedSeason} season.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </section>
            </div>
        </main>
    );
}
