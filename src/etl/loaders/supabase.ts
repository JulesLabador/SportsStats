/**
 * Supabase Loader
 *
 * Handles upserting transformed data into Supabase.
 * Uses conflict handling for idempotent operations.
 * Supports multi-sport schema with sport-specific tables.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type {
    DbPlayer,
    DbPlayerProfile,
    DbNFLPlayerSeason,
    DbNFLWeeklyStat,
    PlayerProfileIdMap,
    PlayerSeasonIdMap,
    ETLRunRecord,
    ETLRunStatus,
    SportId,
} from "../types";
import { makePlayerSeasonKey } from "../types";

/**
 * Result of a load operation
 */
export interface LoadResult {
    success: boolean;
    recordsUpserted: number;
    errors: string[];
}

// Type alias for the Supabase client with our database schema
type SupabaseDbClient = SupabaseClient<Database>;

/**
 * Supabase Loader class for ETL operations
 * Handles multi-sport schema with unified players and sport-specific tables
 */
export class SupabaseLoader {
    private client: SupabaseDbClient;

    constructor(client: SupabaseDbClient) {
        this.client = client;
    }

    // =========================================================================
    // Core Player Operations (shared across sports)
    // =========================================================================

    /**
     * Upsert players into the database
     * Uses player ID as the conflict target
     *
     * @param players - Array of player records to upsert
     * @returns Load result with count and any errors
     */
    async loadPlayers(players: DbPlayer[]): Promise<LoadResult> {
        const errors: string[] = [];
        let recordsUpserted = 0;

        // Process in batches to avoid hitting limits
        const batchSize = 100;
        for (let i = 0; i < players.length; i += batchSize) {
            const batch = players.slice(i, i + batchSize);

            const { data, error } = await this.client
                .from("players")
                .upsert(
                    batch as Database["public"]["Tables"]["players"]["Insert"][],
                    {
                        onConflict: "id",
                        ignoreDuplicates: false,
                    }
                )
                .select();

            if (error) {
                errors.push(
                    `Player batch ${i / batchSize + 1}: ${error.message}`
                );
            } else {
                recordsUpserted += data?.length ?? batch.length;
            }
        }

        return {
            success: errors.length === 0,
            recordsUpserted,
            errors,
        };
    }

    /**
     * Upsert player profiles into the database
     * Returns a map of player_id -> player_profile_id for use in season loading
     *
     * @param profiles - Array of player profile records to upsert
     * @returns Load result and player profile ID map
     */
    async loadPlayerProfiles(
        profiles: DbPlayerProfile[]
    ): Promise<LoadResult & { playerProfileIdMap: PlayerProfileIdMap }> {
        const errors: string[] = [];
        let recordsUpserted = 0;
        const playerProfileIdMap: PlayerProfileIdMap = new Map();

        // Process in batches
        const batchSize = 100;
        for (let i = 0; i < profiles.length; i += batchSize) {
            const batch = profiles.slice(i, i + batchSize);

            const { data, error } = await this.client
                .from("player_profiles")
                .upsert(
                    batch as Database["public"]["Tables"]["player_profiles"]["Insert"][],
                    {
                        onConflict: "player_id,sport_id",
                        ignoreDuplicates: false,
                    }
                )
                .select("id, player_id");

            if (error) {
                errors.push(
                    `Player profile batch ${i / batchSize + 1}: ${
                        error.message
                    }`
                );
            } else if (data) {
                recordsUpserted += data.length;

                // Build the ID map for use in season loading
                for (const row of data) {
                    playerProfileIdMap.set(row.player_id, row.id);
                }
            }
        }

        return {
            success: errors.length === 0,
            recordsUpserted,
            errors,
            playerProfileIdMap,
        };
    }

    // =========================================================================
    // NFL-Specific Operations
    // =========================================================================

    /**
     * Upsert NFL player seasons into the database
     * Returns a map of (player_profile_id, season) -> player_season_id for use in weekly stats
     *
     * @param seasons - Array of NFL player season records to upsert
     * @returns Load result and player season ID map
     */
    async loadNFLPlayerSeasons(
        seasons: DbNFLPlayerSeason[]
    ): Promise<LoadResult & { playerSeasonIdMap: PlayerSeasonIdMap }> {
        const errors: string[] = [];
        let recordsUpserted = 0;
        const playerSeasonIdMap: PlayerSeasonIdMap = new Map();

        // Process in batches
        const batchSize = 100;
        for (let i = 0; i < seasons.length; i += batchSize) {
            const batch = seasons.slice(i, i + batchSize);

            const { data, error } = await this.client
                .from("nfl_player_seasons")
                .upsert(
                    batch as Database["public"]["Tables"]["nfl_player_seasons"]["Insert"][],
                    {
                        onConflict: "player_profile_id,season",
                        ignoreDuplicates: false,
                    }
                )
                .select("id, player_profile_id, season");

            if (error) {
                errors.push(
                    `NFL player season batch ${i / batchSize + 1}: ${
                        error.message
                    }`
                );
            } else if (data) {
                recordsUpserted += data.length;

                // Build the ID map for use in weekly stats loading
                for (const row of data) {
                    const key = makePlayerSeasonKey(
                        row.player_profile_id,
                        row.season
                    );
                    playerSeasonIdMap.set(key, row.id);
                }
            }
        }

        return {
            success: errors.length === 0,
            recordsUpserted,
            errors,
            playerSeasonIdMap,
        };
    }

    /**
     * Upsert NFL weekly stats into the database
     * Requires player_season_id map to resolve foreign keys
     *
     * @param stats - Array of NFL weekly stat records (with player_profile_id and season for lookup)
     * @param playerSeasonIdMap - Map to resolve player_season_id
     * @returns Load result with count and any errors
     */
    async loadNFLWeeklyStats(
        stats: Array<
            Omit<DbNFLWeeklyStat, "player_season_id"> & {
                player_profile_id: string;
                season: number;
            }
        >,
        playerSeasonIdMap: PlayerSeasonIdMap
    ): Promise<LoadResult> {
        const errors: string[] = [];
        let recordsUpserted = 0;

        // Resolve player_season_id for each stat
        const resolvedStats: DbNFLWeeklyStat[] = [];
        for (const stat of stats) {
            const key = makePlayerSeasonKey(
                stat.player_profile_id,
                stat.season
            );
            const playerSeasonId = playerSeasonIdMap.get(key);

            if (!playerSeasonId) {
                errors.push(
                    `Could not resolve player_season_id for profile ${stat.player_profile_id}, season ${stat.season}`
                );
                continue;
            }

            // Remove player_profile_id and season, add player_season_id
            const {
                player_profile_id: _profileId,
                season: _season,
                ...statData
            } = stat;
            resolvedStats.push({
                ...statData,
                player_season_id: playerSeasonId,
            });
        }

        // Process in batches
        const batchSize = 100;
        for (let i = 0; i < resolvedStats.length; i += batchSize) {
            const batch = resolvedStats.slice(i, i + batchSize);

            const { data, error } = await this.client
                .from("nfl_weekly_stats")
                .upsert(
                    batch as Database["public"]["Tables"]["nfl_weekly_stats"]["Insert"][],
                    {
                        onConflict: "player_season_id,week",
                        ignoreDuplicates: false,
                    }
                )
                .select();

            if (error) {
                errors.push(
                    `NFL weekly stats batch ${i / batchSize + 1}: ${
                        error.message
                    }`
                );
            } else {
                recordsUpserted += data?.length ?? batch.length;
            }
        }

        return {
            success: errors.length === 0,
            recordsUpserted,
            errors,
        };
    }

    /**
     * Fetch existing NFL player season IDs for a given season
     * Useful when only loading weekly stats without re-loading players/seasons
     *
     * @param season - Season year to fetch
     * @returns Player season ID map
     */
    async getNFLPlayerSeasonIdMap(season: number): Promise<PlayerSeasonIdMap> {
        const playerSeasonIdMap: PlayerSeasonIdMap = new Map();

        const { data, error } = await this.client
            .from("nfl_player_seasons")
            .select("id, player_profile_id, season")
            .eq("season", season);

        if (error) {
            throw new Error(
                `Failed to fetch NFL player seasons: ${error.message}`
            );
        }

        for (const row of data ?? []) {
            const key = makePlayerSeasonKey(row.player_profile_id, row.season);
            playerSeasonIdMap.set(key, row.id);
        }

        return playerSeasonIdMap;
    }

    /**
     * Fetch player profile ID map for a sport
     *
     * @param sportId - Sport to fetch profiles for
     * @returns Player profile ID map (player_id -> profile_id)
     */
    async getPlayerProfileIdMap(sportId: SportId): Promise<PlayerProfileIdMap> {
        const playerProfileIdMap: PlayerProfileIdMap = new Map();

        const { data, error } = await this.client
            .from("player_profiles")
            .select("id, player_id")
            .eq("sport_id", sportId);

        if (error) {
            throw new Error(
                `Failed to fetch player profiles: ${error.message}`
            );
        }

        for (const row of data ?? []) {
            playerProfileIdMap.set(row.player_id, row.id);
        }

        return playerProfileIdMap;
    }

    // =========================================================================
    // ETL Run Operations
    // =========================================================================

    /**
     * Create a new ETL run record
     *
     * @param adapterName - Name of the adapter being used
     * @param sportId - Sport being processed
     * @returns The created run record ID
     */
    async createETLRun(adapterName: string, sportId: SportId): Promise<string> {
        const insertData: Database["public"]["Tables"]["etl_runs"]["Insert"] = {
            adapter_name: adapterName,
            sport_id: sportId,
            status: "running",
            records_processed: 0,
        };

        const { data, error } = await this.client
            .from("etl_runs")
            .insert(insertData)
            .select("id")
            .single();

        if (error) {
            throw new Error(`Failed to create ETL run: ${error.message}`);
        }

        if (!data) {
            throw new Error("Failed to create ETL run: no data returned");
        }

        return data.id;
    }

    /**
     * Update an ETL run record with completion status
     *
     * @param runId - The run ID to update
     * @param status - Final status (success or failed)
     * @param recordsProcessed - Total records processed
     * @param errorMessage - Error message if failed
     */
    async updateETLRun(
        runId: string,
        status: "success" | "failed",
        recordsProcessed: number,
        errorMessage?: string
    ): Promise<void> {
        const updateData: Database["public"]["Tables"]["etl_runs"]["Update"] = {
            status,
            completed_at: new Date().toISOString(),
            records_processed: recordsProcessed,
            error_message: errorMessage ?? null,
        };

        const { error } = await this.client
            .from("etl_runs")
            .update(updateData)
            .eq("id", runId);

        if (error) {
            console.error(
                `Failed to update ETL run ${runId}: ${error.message}`
            );
        }
    }

    /**
     * Get recent ETL runs for monitoring
     *
     * @param limit - Number of runs to fetch
     * @param sportId - Optional sport filter
     * @returns Array of recent ETL run records
     */
    async getRecentRuns(
        limit: number = 10,
        sportId?: SportId
    ): Promise<ETLRunRecord[]> {
        let query = this.client
            .from("etl_runs")
            .select(
                "id, adapter_name, sport_id, started_at, completed_at, status, records_processed, error_message"
            )
            .order("started_at", { ascending: false })
            .limit(limit);

        if (sportId) {
            query = query.eq("sport_id", sportId);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(`Failed to fetch ETL runs: ${error.message}`);
        }

        return (data ?? []).map((row) => ({
            id: row.id,
            adapterName: row.adapter_name,
            sportId: row.sport_id as SportId | null,
            startedAt: new Date(row.started_at),
            completedAt: row.completed_at ? new Date(row.completed_at) : null,
            status: row.status as ETLRunStatus,
            recordsProcessed: row.records_processed,
            errorMessage: row.error_message,
        }));
    }
}
