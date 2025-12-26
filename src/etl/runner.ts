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
 *
 * Adapter Types:
 * - Simple adapters (nfl-mock): Retrieved from registry, no external deps
 * - Configured adapters (nfl-espn, nfl-pfr, nfl-composite): Created via
 *   factory functions with caching and services attached
 */

import { createAdminClient } from "@/lib/supabase";
import { etlLogger, createChildLogger, type Logger } from "@/lib/logger";
import {
    getAdapter,
    getNFLAdapter,
    hasAdapter,
    getAdapterNames,
    isNFLAdapter,
    createESPNAdapter,
    createPFRAdapter,
    createDefaultCompositeAdapter,
} from "./adapters";
import type { DataSourceAdapter, NFLDataSourceAdapter } from "./adapters/base";
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
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Default ETL options
 */
const DEFAULT_OPTIONS: Partial<ETLRunOptions> = {
    fetchPlayers: true,
    fetchWeeklyStats: true,
    fetchGames: true,
    dryRun: false,
};

/**
 * Adapters that require factory instantiation with Supabase client
 * These adapters need caching, rate limiting, and/or player matching services
 */
const CONFIGURED_ADAPTERS = ["nfl-espn", "nfl-pfr", "nfl-composite"] as const;
type ConfiguredAdapterName = (typeof CONFIGURED_ADAPTERS)[number];

/**
 * Check if an adapter requires factory instantiation
 */
function isConfiguredAdapter(name: string): name is ConfiguredAdapterName {
    return CONFIGURED_ADAPTERS.includes(name as ConfiguredAdapterName);
}

/**
 * Create a configured adapter with all services attached
 *
 * @param name - Adapter name
 * @param supabaseClient - Supabase client for caching and services
 * @returns Configured adapter instance
 */
function createConfiguredAdapter(
    name: ConfiguredAdapterName,
    supabaseClient: SupabaseClient<Database>
): DataSourceAdapter {
    switch (name) {
        case "nfl-espn":
            etlLogger.info("Creating ESPN adapter with caching enabled");
            return createESPNAdapter(supabaseClient);

        case "nfl-pfr":
            etlLogger.info("Creating PFR adapter with caching enabled");
            return createPFRAdapter(supabaseClient);

        case "nfl-composite":
            etlLogger.info(
                "Creating Composite adapter with ESPN + PFR, caching, and player matching"
            );
            return createDefaultCompositeAdapter(supabaseClient);

        default:
            throw new Error(`Unknown configured adapter: ${name}`);
    }
}

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

    // Determine season (default to current year)
    const season = config.season ?? new Date().getFullYear();

    // Initialize Supabase client early (needed for configured adapters)
    let supabase: SupabaseClient<Database> | null = null;
    let loader: SupabaseLoader | null = null;

    // For configured adapters or non-dry-run, we need Supabase
    const needsSupabase =
        isConfiguredAdapter(config.adapterName) || !config.dryRun;

    if (needsSupabase) {
        try {
            supabase = createAdminClient();
            loader = new SupabaseLoader(supabase);
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Unknown error";
            return {
                success: false,
                runId: "",
                adapterName: config.adapterName,
                sportId: "nfl", // Default for error response
                recordsProcessed: 0,
                duration: Date.now() - startTime,
                errors: [`Failed to initialize Supabase: ${message}`],
            };
        }
    }

    // Get or create the adapter
    let adapter: DataSourceAdapter;

    if (isConfiguredAdapter(config.adapterName)) {
        // Configured adapters need factory instantiation with Supabase
        if (!supabase) {
            return {
                success: false,
                runId: "",
                adapterName: config.adapterName,
                sportId: "nfl",
                recordsProcessed: 0,
                duration: Date.now() - startTime,
                errors: [
                    `Adapter ${config.adapterName} requires Supabase connection for caching`,
                ],
            };
        }
        adapter = createConfiguredAdapter(config.adapterName, supabase);
    } else {
        // Simple adapters from registry
        adapter = getAdapter(config.adapterName)!;
    }

    const sportId = adapter.sportId;

    // Create a run-specific logger with context
    const log = createChildLogger({
        adapter: adapter.name,
        version: adapter.version,
        sport: sportId,
        season,
        week: config.week ?? "all",
        dryRun: config.dryRun ?? false,
    });

    log.info("Starting ETL run");
    log.debug(
        { configured: isConfiguredAdapter(config.adapterName) },
        "Adapter configuration"
    );

    // Create ETL run record (if not dry run)
    if (!config.dryRun && loader) {
        try {
            runId = await loader.createETLRun(adapter.name, sportId);
            log.info({ runId }, "Created ETL run record");
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Unknown error";
            errors.push(`Warning: Failed to create run record: ${message}`);
            log.warn({ error: message }, "Failed to create run record");
        }
    }

    try {
        // Health check
        log.debug("Running health check...");
        const healthResult = await adapter.healthCheck();
        if (!healthResult.healthy) {
            throw new Error(
                `Adapter health check failed: ${healthResult.message}`
            );
        }
        log.info({ latencyMs: healthResult.latencyMs }, "Health check passed");

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
            log.info("Fetching players...");
            const rawPlayers = await adapter.fetchPlayers(fetchOptions);
            log.info({ count: rawPlayers.length }, "Fetched players");

            // Transform
            const { players, externalIdMap: playerIdMap } =
                transformPlayers(rawPlayers);
            externalIdMap = playerIdMap;

            // Validate
            const validPlayers = players.filter(validatePlayer);
            log.info(
                { valid: validPlayers.length, total: players.length },
                "Players validated"
            );

            // Load (if not dry run)
            if (!config.dryRun && loader) {
                const result = await loader.loadPlayers(validPlayers);
                totalRecordsProcessed += result.recordsUpserted;
                errors.push(...result.errors);
                log.info({ loaded: result.recordsUpserted }, "Loaded players");
            }
        }

        // =====================================================================
        // STEP 2: Fetch and load player profiles (sport-specific)
        // =====================================================================
        if (config.fetchPlayers) {
            log.info("Fetching player profiles...");
            const rawProfiles = await adapter.fetchPlayerProfiles(fetchOptions);
            log.info({ count: rawProfiles.length }, "Fetched player profiles");

            // Transform
            const profiles = transformPlayerProfiles(
                rawProfiles,
                externalIdMap
            );

            // Validate
            const validProfiles = profiles.filter(validatePlayerProfile);
            log.info(
                { valid: validProfiles.length, total: profiles.length },
                "Profiles validated"
            );

            // Load (if not dry run)
            if (!config.dryRun && loader) {
                const result = await loader.loadPlayerProfiles(validProfiles);
                totalRecordsProcessed += result.recordsUpserted;
                errors.push(...result.errors);
                playerProfileIdMap = result.playerProfileIdMap;
                log.info(
                    { loaded: result.recordsUpserted },
                    "Loaded player profiles"
                );
            }
        }

        // =====================================================================
        // SPORT-SPECIFIC PROCESSING
        // =====================================================================
        if (isNFLAdapter(adapter)) {
            await processNFLData(
                adapter as NFLDataSourceAdapter,
                fetchOptions,
                config,
                loader,
                externalIdMap,
                playerProfileIdMap,
                errors,
                (count) => {
                    totalRecordsProcessed += count;
                },
                log
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
        log.info(
            { duration, totalRecords: totalRecordsProcessed },
            "ETL run completed"
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

        log.error({ error: message }, "ETL run failed");

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
    adapter: NFLDataSourceAdapter,
    fetchOptions: AdapterFetchOptions,
    config: ETLRunOptions & typeof DEFAULT_OPTIONS,
    loader: SupabaseLoader | null,
    externalIdMap: ExternalIdMap,
    playerProfileIdMap: PlayerProfileIdMap,
    errors: string[],
    addRecords: (count: number) => void,
    log: Logger
): Promise<void> {
    // Get or fetch player profile ID map
    if (playerProfileIdMap.size === 0 && !config.dryRun && loader) {
        log.debug("Fetching existing player profile IDs...");
        playerProfileIdMap = await loader.getPlayerProfileIdMap("nfl");
    }

    // =========================================================================
    // STEP 3: Fetch and load NFL player seasons
    // =========================================================================
    if (config.fetchPlayers) {
        log.info("Fetching NFL player seasons...");
        const rawSeasons = await adapter.fetchPlayerSeasons(fetchOptions);
        log.info({ count: rawSeasons.length }, "Fetched NFL player seasons");

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
            log.info(
                { loaded: result.recordsUpserted },
                "Loaded NFL player seasons"
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
        log.info("Fetching NFL weekly stats...");
        const rawStats = await adapter.fetchWeeklyStats(fetchOptions);
        log.info({ count: rawStats.length }, "Fetched NFL weekly stat records");

        // Transform
        const stats = transformNFLWeeklyStats(
            rawStats,
            externalIdMap,
            playerProfileIdMap
        );

        // Validate
        const validStats = stats.filter(validateNFLWeeklyStat);
        log.info(
            { valid: validStats.length, total: stats.length },
            "Weekly stats validated"
        );

        // Load (if not dry run)
        if (!config.dryRun && loader) {
            // Get player season ID map (either from step 3 or fetch from DB)
            let playerSeasonIdMap = (
                loader as SupabaseLoader & {
                    _nflPlayerSeasonIdMap?: Map<string, string>;
                }
            )._nflPlayerSeasonIdMap;

            if (!playerSeasonIdMap || playerSeasonIdMap.size === 0) {
                log.debug("Fetching NFL player season IDs from database...");
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
            log.info(
                { loaded: result.recordsUpserted },
                "Loaded NFL weekly stats"
            );
        }
    }

    // =========================================================================
    // STEP 5: Fetch and load NFL games
    // =========================================================================
    if (config.fetchGames) {
        log.info("Fetching NFL games...");
        const rawGames = await adapter.fetchGames(fetchOptions);
        log.info({ count: rawGames.length }, "Fetched NFL games");

        // Transform raw games to database format
        const dbGames = rawGames.map((game) => ({
            espn_game_id: game.espnGameId,
            season: game.season,
            week: game.week,
            home_team: game.homeTeam,
            away_team: game.awayTeam,
            home_score: game.homeScore,
            away_score: game.awayScore,
            game_date: game.gameDate,
            venue_name: game.venue?.name ?? null,
            venue_city: game.venue?.city ?? null,
            venue_state: game.venue?.state ?? null,
            status: game.status,
        }));

        // Load (if not dry run)
        if (!config.dryRun && loader) {
            const result = await loader.loadNFLGames(dbGames);
            addRecords(result.recordsUpserted);
            errors.push(...result.errors);
            log.info({ loaded: result.recordsUpserted }, "Loaded NFL games");
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
