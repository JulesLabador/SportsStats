"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { SearchWrapper } from "@/components/search/search-wrapper";
import { PlayerHeader } from "./player-header";
import { StatSummary } from "./stat-summary";
import { GameLogTable, GameLogTableSkeleton } from "./game-log-table";
import { RelatedPlayers } from "./related-players";
import { usePlayerStore } from "@/stores/player-store";
import { getPlayerWithStats } from "@/lib/data";
import type { PlayerWithStats } from "@/lib/types";

/**
 * Props for PlayerContent component
 */
interface PlayerContentProps {
    /** Initial player data fetched server-side */
    initialData: PlayerWithStats;
    /** Available seasons for this player */
    availableSeasons: number[];
    /** The initial season that was fetched */
    initialSeason: number;
}

/**
 * PlayerContent component
 *
 * Client-side wrapper for the player page content.
 * Handles:
 * - Season selection state via Zustand store
 * - Re-fetching data when season changes
 * - Loading states during season transitions
 *
 * This component receives initial data from the server and manages
 * subsequent client-side updates when the user changes seasons.
 *
 * @example
 * ```tsx
 * <PlayerContent
 *   initialData={playerData}
 *   availableSeasons={[2024, 2023, 2022]}
 *   initialSeason={2024}
 * />
 * ```
 */
export function PlayerContent({
    initialData,
    availableSeasons,
    initialSeason,
}: PlayerContentProps) {
    // Track current player data (starts with server-fetched data)
    const [playerData, setPlayerData] =
        React.useState<PlayerWithStats>(initialData);
    const [isLoading, setIsLoading] = React.useState(false);

    // Zustand store for season selection
    const { selectedSeason, setSelectedSeason } = usePlayerStore();

    // Initialize selected season from server-provided initial season
    React.useEffect(() => {
        // Only set if different to avoid unnecessary re-renders
        if (selectedSeason !== initialSeason) {
            setSelectedSeason(initialSeason);
        }
    }, [initialSeason, selectedSeason, setSelectedSeason]);

    // Track the current season being displayed
    // Use initialSeason on first render, then selectedSeason after
    const [displayedSeason, setDisplayedSeason] = React.useState(initialSeason);

    /**
     * Handle season change - fetch new data for the selected season
     */
    const handleSeasonChange = async (newSeason: number) => {
        // Update store immediately for responsive UI
        setSelectedSeason(newSeason);

        // Skip fetch if same season
        if (newSeason === displayedSeason) return;

        setIsLoading(true);

        try {
            const data = await getPlayerWithStats(initialData.id, newSeason);
            if (data) {
                setPlayerData(data);
                setDisplayedSeason(newSeason);
            }
        } catch (error) {
            console.error("Error fetching player data for season:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-6">
            {/* Search bar for quick player navigation */}
            <SearchWrapper className="mb-6" />

            {/* Back button - uses browser history for proper navigation */}
            <BackButton className="mb-6" />

            {/* Player header with season selector */}
            <PlayerHeader
                player={playerData}
                selectedSeason={selectedSeason || displayedSeason}
                availableSeasons={availableSeasons}
                onSeasonChange={handleSeasonChange}
                className="mb-6"
            />

            {/* Season stat summary */}
            {isLoading ? (
                <div className="h-64 bg-card rounded-xl animate-pulse mb-8" />
            ) : (
                <StatSummary
                    position={playerData.position}
                    seasonSummary={playerData.seasonSummary}
                    className="mb-8"
                />
            )}

            {/* Game Log Table */}
            <section>
                <h2 className="text-lg font-semibold mb-4">Game Log</h2>
                <Card>
                    <CardContent className="pt-6 pb-4">
                        {isLoading ? (
                            <GameLogTableSkeleton />
                        ) : playerData.weeklyStats.length > 0 ? (
                            <GameLogTable
                                weeklyStats={playerData.weeklyStats}
                                position={playerData.position}
                            />
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                No game data available for the {displayedSeason}{" "}
                                season.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </section>

            {/* Related players (teammates) */}
            <RelatedPlayers
                team={playerData.team}
                currentPlayerId={playerData.id}
            />
        </div>
    );
}

/**
 * PlayerNotFound component
 *
 * Displayed when a player cannot be found or has no data for the requested season.
 */
export function PlayerNotFound() {
    return (
        <div className="max-w-4xl mx-auto px-4 py-6">
            <BackButton className="mb-6 -ml-2" />

            <div className="text-center py-16">
                <h1 className="text-2xl font-bold mb-2">Player Not Found</h1>
                <p className="text-muted-foreground mb-6">
                    We couldn&apos;t find a player with that ID, or no data
                    exists for this player.
                </p>
                <Link href="/">
                    <Button>Search Players</Button>
                </Link>
            </div>
        </div>
    );
}
