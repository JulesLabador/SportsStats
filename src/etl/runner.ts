/**
 * ETL Runner
 *
 * Main orchestrator for the ETL pipeline.
 * Coordinates adapters, transformers, and loaders to ingest data.
 * Supports multi-sport schema with sport-specific processing.
 *
 * This runner is environment-agnostic and can be invoked from:
 * - Vercel Cron (via API route)
 * - Supabase Edge Functions
 * - Standalone Node.js script
 */

import { createAdminClient } from "@/lib/supabase";
import {
    getAdapter,
    getNFLAdapter,
    hasAdapter,
    getAdapterNames,
    isNFLAdapter,
} from "./adapters";
import type { AdapterFetchOptions } from "./adapters/base";
import {
    transformPlayers,
    transformPlayerProfiles,
    transformNFLPlayerSeasons,
    transformNFLWeeklyStats,
    validatePlayer,
    validatePlayerProfile,
    validateNFLWeeklyStat,
} from "./transformers/stats";
import { SupabaseLoader } from "./loaders/supabase";
import type {
    ETLRunOptions,
    ETLRunResult,
    ExternalIdMap,
    PlayerProfileIdMap,
} from "./types";

/**
 * Default ETL options
 */
const DEFAULT_OPTIONS: Partial<ETLRunOptions> = {
    fetchPlayers: true,
    fetchWeeklyStats: true,
    dryRun: false,
};

/**
 * Run the ETL pipeline with the specified options
 *
 * @param options - ETL run configuration
 * @returns Result of the ETL run
 */
export async function runETL(options: ETLRunOptions): Promise<ETLRunResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let totalRecordsProcessed = 0;
    let runId = "";

    // Merge with defaults
    const config = { ...DEFAULT_OPTIONS, ...options };

    // Validate adapter exists
    if (!hasAdapter(config.adapterName)) {
        return {
            success: false,
            runId: "",
            adapterName: config.adapterName,
            sportId: "nfl", // Default for error response
            recordsProcessed: 0,
            duration: Date.now() - startTime,
            errors: [
                `Unknown adapter: ${
                    config.adapterName
                }. Available: ${getAdapterNames().join(", ")}`,
            ],
        };
    }

    const adapter = getAdapter(config.adapterName)!;
    const sportId = adapter.sportId;

    // Determine season (default to current year)
    const season = config.season ?? new Date().getFullYear();

    console.log(
        `[ETL] Starting run with adapter: ${adapter.name} v${adapter.version}`
    );
    console.log(
        `[ETL] Sport: ${sportId}, Season: ${season}, Week: ${
            config.week ?? "all"
        }`
    );
    console.log(`[ETL] Dry run: ${config.dryRun}`);

    // Initialize Supabase client and loader
    let loader: SupabaseLoader | null = null;
    if (!config.dryRun) {
        try {
            const supabase = createAdminClient();
            loader = new SupabaseLoader(supabase);

            // Create ETL run record
            runId = await loader.createETLRun(adapter.name, sportId);
            console.log(`[ETL] Created run record: ${runId}`);
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Unknown error";
            return {
                success: false,
                runId: "",
                adapterName: config.adapterName,
                sportId,
                recordsProcessed: 0,
                duration: Date.now() - startTime,
                errors: [`Failed to initialize Supabase: ${message}`],
            };
        }
    }

    try {
        // Health check
        console.log(`[ETL] Running health check...`);
        const healthResult = await adapter.healthCheck();
        if (!healthResult.healthy) {
            throw new Error(
                `Adapter health check failed: ${healthResult.message}`
            );
        }
        console.log(`[ETL] Health check passed (${healthResult.latencyMs}ms)`);

        // Prepare fetch options
        const fetchOptions: AdapterFetchOptions = {
            season,
            week: config.week,
        };

        // Track ID mappings across operations
        let externalIdMap: ExternalIdMap = new Map();
        let playerProfileIdMap: PlayerProfileIdMap = new Map();

        // =====================================================================
        // STEP 1: Fetch and load players (core identity)
        // =====================================================================
        if (config.fetchPlayers) {
            console.log(`[ETL] Fetching players...`);
            const rawPlayers = await adapter.fetchPlayers(fetchOptions);
            console.log(`[ETL] Fetched ${rawPlayers.length} players`);

            // Transform
            const { players, externalIdMap: playerIdMap } =
                transformPlayers(rawPlayers);
            externalIdMap = playerIdMap;

            // Validate
            const validPlayers = players.filter(validatePlayer);
            console.log(
                `[ETL] ${validPlayers.length}/${players.length} players valid`
            );

            // Load (if not dry run)
            if (!config.dryRun && loader) {
                const result = await loader.loadPlayers(validPlayers);
                totalRecordsProcessed += result.recordsUpserted;
                errors.push(...result.errors);
                console.log(`[ETL] Loaded ${result.recordsUpserted} players`);
            }
        }

        // =====================================================================
        // STEP 2: Fetch and load player profiles (sport-specific)
        // =====================================================================
        if (config.fetchPlayers) {
            console.log(`[ETL] Fetching player profiles...`);
            const rawProfiles = await adapter.fetchPlayerProfiles(fetchOptions);
            console.log(`[ETL] Fetched ${rawProfiles.length} player profiles`);

            // Transform
            const profiles = transformPlayerProfiles(
                rawProfiles,
                externalIdMap
            );

            // Validate
            const validProfiles = profiles.filter(validatePlayerProfile);
            console.log(
                `[ETL] ${validProfiles.length}/${profiles.length} profiles valid`
            );

            // Load (if not dry run)
            if (!config.dryRun && loader) {
                const result = await loader.loadPlayerProfiles(validProfiles);
                totalRecordsProcessed += result.recordsUpserted;
                errors.push(...result.errors);
                playerProfileIdMap = result.playerProfileIdMap;
                console.log(
                    `[ETL] Loaded ${result.recordsUpserted} player profiles`
                );
            }
        }

        // =====================================================================
        // SPORT-SPECIFIC PROCESSING
        // =====================================================================
        if (isNFLAdapter(adapter)) {
            await processNFLData(
                adapter,
                fetchOptions,
                config,
                loader,
                externalIdMap,
                playerProfileIdMap,
                errors,
                (count) => {
                    totalRecordsProcessed += count;
                }
            );
        }
        // Add other sports here:
        // else if (isMLBAdapter(adapter)) { ... }
        // else if (isNBAAdapter(adapter)) { ... }

        // Update ETL run record with success
        if (!config.dryRun && loader) {
            await loader.updateETLRun(runId, "success", totalRecordsProcessed);
        }

        const duration = Date.now() - startTime;
        console.log(
            `[ETL] Completed in ${duration}ms. Total records: ${totalRecordsProcessed}`
        );

        return {
            success: errors.length === 0,
            runId,
            adapterName: config.adapterName,
            sportId,
            recordsProcessed: totalRecordsProcessed,
            duration,
            errors,
        };
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Unknown error";
        errors.push(message);

        // Update ETL run record with failure
        if (!config.dryRun && loader && runId) {
            await loader.updateETLRun(
                runId,
                "failed",
                totalRecordsProcessed,
                message
            );
        }

        console.error(`[ETL] Failed: ${message}`);

        return {
            success: false,
            runId,
            adapterName: config.adapterName,
            sportId: adapter.sportId,
            recordsProcessed: totalRecordsProcessed,
            duration: Date.now() - startTime,
            errors,
        };
    }
}

/**
 * Process NFL-specific data (seasons and weekly stats)
 */
async function processNFLData(
    adapter: ReturnType<typeof getNFLAdapter> & object,
    fetchOptions: AdapterFetchOptions,
    config: ETLRunOptions & typeof DEFAULT_OPTIONS,
    loader: SupabaseLoader | null,
    externalIdMap: ExternalIdMap,
    playerProfileIdMap: PlayerProfileIdMap,
    errors: string[],
    addRecords: (count: number) => void
): Promise<void> {
    // Get or fetch player profile ID map
    if (playerProfileIdMap.size === 0 && !config.dryRun && loader) {
        console.log(`[ETL] Fetching existing player profile IDs...`);
        playerProfileIdMap = await loader.getPlayerProfileIdMap("nfl");
    }

    // =========================================================================
    // STEP 3: Fetch and load NFL player seasons
    // =========================================================================
    if (config.fetchPlayers) {
        console.log(`[ETL] Fetching NFL player seasons...`);
        const rawSeasons = await adapter.fetchPlayerSeasons(fetchOptions);
        console.log(`[ETL] Fetched ${rawSeasons.length} NFL player seasons`);

        // Transform
        const seasons = transformNFLPlayerSeasons(
            rawSeasons,
            externalIdMap,
            playerProfileIdMap
        );

        // Load (if not dry run)
        if (!config.dryRun && loader) {
            const result = await loader.loadNFLPlayerSeasons(seasons);
            addRecords(result.recordsUpserted);
            errors.push(...result.errors);
            console.log(
                `[ETL] Loaded ${result.recordsUpserted} NFL player seasons`
            );

            // Store the player season ID map for weekly stats
            (
                loader as SupabaseLoader & {
                    _nflPlayerSeasonIdMap?: Map<string, string>;
                }
            )._nflPlayerSeasonIdMap = result.playerSeasonIdMap;
        }
    }

    // =========================================================================
    // STEP 4: Fetch and load NFL weekly stats
    // =========================================================================
    if (config.fetchWeeklyStats) {
        console.log(`[ETL] Fetching NFL weekly stats...`);
        const rawStats = await adapter.fetchWeeklyStats(fetchOptions);
        console.log(`[ETL] Fetched ${rawStats.length} NFL weekly stat records`);

        // Transform
        const stats = transformNFLWeeklyStats(
            rawStats,
            externalIdMap,
            playerProfileIdMap
        );

        // Validate
        const validStats = stats.filter(validateNFLWeeklyStat);
        console.log(`[ETL] ${validStats.length}/${stats.length} stats valid`);

        // Load (if not dry run)
        if (!config.dryRun && loader) {
            // Get player season ID map (either from step 3 or fetch from DB)
            let playerSeasonIdMap = (
                loader as SupabaseLoader & {
                    _nflPlayerSeasonIdMap?: Map<string, string>;
                }
            )._nflPlayerSeasonIdMap;

            if (!playerSeasonIdMap || playerSeasonIdMap.size === 0) {
                console.log(
                    `[ETL] Fetching NFL player season IDs from database...`
                );
                playerSeasonIdMap = await loader.getNFLPlayerSeasonIdMap(
                    fetchOptions.season
                );
            }

            const result = await loader.loadNFLWeeklyStats(
                validStats,
                playerSeasonIdMap
            );
            addRecords(result.recordsUpserted);
            errors.push(...result.errors);
            console.log(
                `[ETL] Loaded ${result.recordsUpserted} NFL weekly stats`
            );
        }
    }
}

/**
 * Run ETL for a specific week only (useful for incremental updates)
 *
 * @param adapterName - Name of the adapter to use
 * @param season - Season year
 * @param week - Week number
 * @returns Result of the ETL run
 */
export async function runWeeklyUpdate(
    adapterName: string,
    season: number,
    week: number
): Promise<ETLRunResult> {
    return runETL({
        adapterName,
        season,
        week,
        fetchPlayers: false, // Don't re-fetch players for weekly updates
        fetchWeeklyStats: true,
    });
}

/**
 * Run a dry run to test the pipeline without writing to the database
 *
 * @param adapterName - Name of the adapter to use
 * @param season - Season year
 * @returns Result of the dry run
 */
export async function runDryRun(
    adapterName: string,
    season?: number
): Promise<ETLRunResult> {
    return runETL({
        adapterName,
        season,
        dryRun: true,
    });
}
