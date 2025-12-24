/**
 * NFL Composite Data Source Adapter
 *
 * Orchestrates ESPN and PFR adapters with intelligent source selection.
 * Implements fallback logic and data merging strategies.
 *
 * Source-of-truth rules:
 * - Current season: ESPN primary, PFR fallback
 * - Historical (< current year): PFR primary
 * - Missing data: Try alternate source
 *
 * Features:
 * - Automatic source selection based on season
 * - Fallback on adapter failures
 * - Player identity matching across sources
 * - Data quality validation
 */

import {
    NFLBaseAdapter,
    type AdapterFetchOptions,
    type HealthCheckResult,
} from "./base";
import { NFLESPNAdapter } from "./nfl-espn.adapter";
import { NFLPFRAdapter, KNOWN_PFR_SLUGS } from "./nfl-pfr.adapter";
import { CacheService } from "../services/cache.service";
import { PlayerMatcherService } from "../services/player-matcher.service";
import { createChildLogger } from "@/lib/logger";
import type {
    RawPlayer,
    RawPlayerProfile,
    RawNFLPlayerSeason,
    RawNFLWeeklyStat,
} from "../types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/** Logger for composite adapter operations */
const log = createChildLogger({ adapter: "nfl-composite" });

/**
 * Configuration for the composite adapter
 */
export interface CompositeAdapterConfig {
    /** Supabase client for caching and player matching */
    supabaseClient: SupabaseClient<Database>;
    /** Whether to enable fallback on failures */
    enableFallback?: boolean;
    /** Whether to merge data from both sources */
    enableMerge?: boolean;
    /** Custom PFR slugs to use */
    pfrSlugs?: Record<string, string>;
}

/**
 * Source selection result
 */
interface SourceSelection {
    primary: "espn" | "pfr";
    fallback: "espn" | "pfr" | null;
    reason: string;
}

/**
 * NFL Composite Adapter combining ESPN and PFR
 */
export class NFLCompositeAdapter extends NFLBaseAdapter {
    readonly name = "nfl-composite";
    readonly version = "1.0.0";
    readonly description =
        "Composite adapter combining ESPN and PFR data sources";

    private espnAdapter: NFLESPNAdapter;
    private pfrAdapter: NFLPFRAdapter;
    private cacheService: CacheService;
    private playerMatcher: PlayerMatcherService;
    private enableFallback: boolean;
    private enableMerge: boolean;

    constructor(config: CompositeAdapterConfig) {
        super();

        // Initialize services
        this.cacheService = new CacheService(config.supabaseClient);
        this.playerMatcher = new PlayerMatcherService(config.supabaseClient);

        // Initialize adapters with cache service
        this.espnAdapter = NFLESPNAdapter.withCache(config.supabaseClient);
        this.pfrAdapter = NFLPFRAdapter.withCache(config.supabaseClient);

        // Configure PFR adapter with known slugs
        const slugs = config.pfrSlugs ?? KNOWN_PFR_SLUGS;
        for (const [name, slug] of Object.entries(slugs)) {
            this.pfrAdapter.addPlayerSlug(name, slug);
        }

        // Configuration
        this.enableFallback = config.enableFallback ?? true;
        this.enableMerge = config.enableMerge ?? false;
    }

    /**
     * Fetch players using appropriate source
     */
    async fetchPlayers(options: AdapterFetchOptions): Promise<RawPlayer[]> {
        const source = this.selectSource(options.season);
        log.info(
            { primary: source.primary, reason: source.reason },
            "Fetching players"
        );

        try {
            // Try primary source
            const players = await this.fetchPlayersFromSource(
                source.primary,
                options
            );

            // If merge enabled and we have a fallback, merge data
            if (this.enableMerge && source.fallback) {
                try {
                    const fallbackPlayers = await this.fetchPlayersFromSource(
                        source.fallback,
                        options
                    );
                    return this.mergePlayers(players, fallbackPlayers);
                } catch (error) {
                    log.warn({ error }, "Merge source failed");
                }
            }

            return players;
        } catch (error) {
            log.error(
                { primary: source.primary, error },
                "Primary source failed"
            );

            // Try fallback if enabled
            if (this.enableFallback && source.fallback) {
                log.info({ fallback: source.fallback }, "Falling back");
                return this.fetchPlayersFromSource(source.fallback, options);
            }

            throw error;
        }
    }

    /**
     * Fetch player profiles using appropriate source
     */
    async fetchPlayerProfiles(
        options: AdapterFetchOptions
    ): Promise<RawPlayerProfile[]> {
        const source = this.selectSource(options.season);
        log.info(
            { primary: source.primary, reason: source.reason },
            "Fetching profiles"
        );

        try {
            const profiles = await this.fetchProfilesFromSource(
                source.primary,
                options
            );

            if (this.enableMerge && source.fallback) {
                try {
                    const fallbackProfiles = await this.fetchProfilesFromSource(
                        source.fallback,
                        options
                    );
                    return this.mergeProfiles(profiles, fallbackProfiles);
                } catch (error) {
                    log.warn({ error }, "Merge source failed");
                }
            }

            return profiles;
        } catch (error) {
            log.error(
                { primary: source.primary, error },
                "Primary source failed"
            );

            if (this.enableFallback && source.fallback) {
                log.info({ fallback: source.fallback }, "Falling back");
                return this.fetchProfilesFromSource(source.fallback, options);
            }

            throw error;
        }
    }

    /**
     * Fetch player seasons using appropriate source
     */
    async fetchPlayerSeasons(
        options: AdapterFetchOptions
    ): Promise<RawNFLPlayerSeason[]> {
        const source = this.selectSource(options.season);
        log.info(
            { primary: source.primary, reason: source.reason },
            "Fetching seasons"
        );

        try {
            const seasons = await this.fetchSeasonsFromSource(
                source.primary,
                options
            );

            if (this.enableMerge && source.fallback) {
                try {
                    const fallbackSeasons = await this.fetchSeasonsFromSource(
                        source.fallback,
                        options
                    );
                    return this.mergeSeasons(seasons, fallbackSeasons);
                } catch (error) {
                    log.warn({ error }, "Merge source failed");
                }
            }

            return seasons;
        } catch (error) {
            log.error(
                { primary: source.primary, error },
                "Primary source failed"
            );

            if (this.enableFallback && source.fallback) {
                log.info({ fallback: source.fallback }, "Falling back");
                return this.fetchSeasonsFromSource(source.fallback, options);
            }

            throw error;
        }
    }

    /**
     * Fetch weekly stats using appropriate source
     */
    async fetchWeeklyStats(
        options: AdapterFetchOptions
    ): Promise<RawNFLWeeklyStat[]> {
        const source = this.selectSource(options.season);
        log.info(
            { primary: source.primary, reason: source.reason },
            "Fetching weekly stats"
        );

        try {
            const stats = await this.fetchStatsFromSource(
                source.primary,
                options
            );

            // Check for missing weeks and fill from fallback
            if (this.enableFallback && source.fallback) {
                const missingWeeks = this.findMissingWeeks(
                    stats,
                    options.season
                );

                if (missingWeeks.length > 0) {
                    log.info(
                        {
                            count: missingWeeks.length,
                            fallback: source.fallback,
                        },
                        "Filling missing weeks"
                    );

                    for (const week of missingWeeks) {
                        try {
                            const fallbackStats =
                                await this.fetchStatsFromSource(
                                    source.fallback,
                                    { ...options, week }
                                );
                            stats.push(...fallbackStats);
                        } catch (error) {
                            log.warn({ week, error }, "Failed to fill week");
                        }
                    }
                }
            }

            return stats;
        } catch (error) {
            log.error(
                { primary: source.primary, error },
                "Primary source failed"
            );

            if (this.enableFallback && source.fallback) {
                log.info({ fallback: source.fallback }, "Falling back");
                return this.fetchStatsFromSource(source.fallback, options);
            }

            throw error;
        }
    }

    /**
     * Health check for both adapters
     */
    async healthCheck(): Promise<HealthCheckResult> {
        const start = Date.now();
        const results: Array<{ source: string; result: HealthCheckResult }> =
            [];

        // Check ESPN
        try {
            const espnResult = await this.espnAdapter.healthCheck();
            results.push({ source: "espn", result: espnResult });
        } catch (error) {
            results.push({
                source: "espn",
                result: {
                    healthy: false,
                    message: `ESPN check failed: ${error}`,
                },
            });
        }

        // Check PFR
        try {
            const pfrResult = await this.pfrAdapter.healthCheck();
            results.push({ source: "pfr", result: pfrResult });
        } catch (error) {
            results.push({
                source: "pfr",
                result: {
                    healthy: false,
                    message: `PFR check failed: ${error}`,
                },
            });
        }

        // Composite is healthy if at least one source is healthy
        const anyHealthy = results.some((r) => r.result.healthy);
        const allHealthy = results.every((r) => r.result.healthy);

        const messages = results.map(
            (r) => `${r.source}: ${r.result.healthy ? "OK" : r.result.message}`
        );

        return {
            healthy: anyHealthy,
            message: allHealthy ? "All sources healthy" : messages.join("; "),
            latencyMs: Date.now() - start,
        };
    }

    // =========================================================================
    // Public configuration methods
    // =========================================================================

    /**
     * Add a PFR player slug
     */
    addPfrSlug(name: string, slug: string): void {
        this.pfrAdapter.addPlayerSlug(name, slug);
    }

    /**
     * Get the player matcher service
     */
    getPlayerMatcher(): PlayerMatcherService {
        return this.playerMatcher;
    }

    /**
     * Get the cache service
     */
    getCacheService(): CacheService {
        return this.cacheService;
    }

    // =========================================================================
    // Private helper methods
    // =========================================================================

    /**
     * Select appropriate source based on season
     */
    private selectSource(season: number): SourceSelection {
        const currentSeason = this.getCurrentSeason();

        if (season >= currentSeason) {
            // Current or future season - prefer ESPN
            return {
                primary: "espn",
                fallback: "pfr",
                reason: "current season - ESPN preferred",
            };
        } else if (season >= currentSeason - 2) {
            // Recent past seasons - ESPN still good
            return {
                primary: "espn",
                fallback: "pfr",
                reason: "recent season - ESPN preferred",
            };
        } else {
            // Historical data - prefer PFR
            return {
                primary: "pfr",
                fallback: "espn",
                reason: "historical season - PFR preferred",
            };
        }
    }

    /**
     * Fetch players from a specific source
     */
    private async fetchPlayersFromSource(
        source: "espn" | "pfr",
        options: AdapterFetchOptions
    ): Promise<RawPlayer[]> {
        if (source === "espn") {
            return this.espnAdapter.fetchPlayers(options);
        } else {
            return this.pfrAdapter.fetchPlayers(options);
        }
    }

    /**
     * Fetch profiles from a specific source
     */
    private async fetchProfilesFromSource(
        source: "espn" | "pfr",
        options: AdapterFetchOptions
    ): Promise<RawPlayerProfile[]> {
        if (source === "espn") {
            return this.espnAdapter.fetchPlayerProfiles(options);
        } else {
            return this.pfrAdapter.fetchPlayerProfiles(options);
        }
    }

    /**
     * Fetch seasons from a specific source
     */
    private async fetchSeasonsFromSource(
        source: "espn" | "pfr",
        options: AdapterFetchOptions
    ): Promise<RawNFLPlayerSeason[]> {
        if (source === "espn") {
            return this.espnAdapter.fetchPlayerSeasons(options);
        } else {
            return this.pfrAdapter.fetchPlayerSeasons(options);
        }
    }

    /**
     * Fetch stats from a specific source
     */
    private async fetchStatsFromSource(
        source: "espn" | "pfr",
        options: AdapterFetchOptions
    ): Promise<RawNFLWeeklyStat[]> {
        if (source === "espn") {
            return this.espnAdapter.fetchWeeklyStats(options);
        } else {
            return this.pfrAdapter.fetchWeeklyStats(options);
        }
    }

    /**
     * Merge players from two sources
     */
    private mergePlayers(
        primary: RawPlayer[],
        secondary: RawPlayer[]
    ): RawPlayer[] {
        const merged = new Map<string, RawPlayer>();

        // Add primary players
        for (const player of primary) {
            merged.set(player.externalId, player);
        }

        // Add secondary players that don't exist
        for (const player of secondary) {
            // Try to match by name
            const normalizedName = player.name.toLowerCase();
            let found = false;

            for (const existing of merged.values()) {
                if (existing.name.toLowerCase() === normalizedName) {
                    found = true;
                    // Update image if missing
                    if (!existing.imageUrl && player.imageUrl) {
                        existing.imageUrl = player.imageUrl;
                    }
                    break;
                }
            }

            if (!found) {
                merged.set(player.externalId, player);
            }
        }

        return Array.from(merged.values());
    }

    /**
     * Merge profiles from two sources
     */
    private mergeProfiles(
        primary: RawPlayerProfile[],
        secondary: RawPlayerProfile[]
    ): RawPlayerProfile[] {
        const merged = new Map<string, RawPlayerProfile>();

        // Add primary profiles
        for (const profile of primary) {
            merged.set(profile.playerExternalId, profile);
        }

        // Merge metadata from secondary
        for (const profile of secondary) {
            const existing = merged.get(profile.playerExternalId);
            if (existing) {
                // Merge metadata (both could be undefined)
                const profileMeta =
                    typeof profile.metadata === "object" && profile.metadata
                        ? profile.metadata
                        : {};
                const existingMeta =
                    typeof existing.metadata === "object" && existing.metadata
                        ? existing.metadata
                        : {};
                existing.metadata = {
                    ...profileMeta,
                    ...existingMeta,
                };
            } else {
                merged.set(profile.playerExternalId, profile);
            }
        }

        return Array.from(merged.values());
    }

    /**
     * Merge seasons from two sources
     */
    private mergeSeasons(
        primary: RawNFLPlayerSeason[],
        secondary: RawNFLPlayerSeason[]
    ): RawNFLPlayerSeason[] {
        const merged = new Map<string, RawNFLPlayerSeason>();

        // Key by player + season
        const makeKey = (s: RawNFLPlayerSeason) =>
            `${s.playerExternalId}:${s.season}`;

        // Add primary seasons
        for (const season of primary) {
            merged.set(makeKey(season), season);
        }

        // Add secondary seasons that don't exist
        for (const season of secondary) {
            const key = makeKey(season);
            if (!merged.has(key)) {
                merged.set(key, season);
            }
        }

        return Array.from(merged.values());
    }

    /**
     * Find missing weeks in stats data
     */
    private findMissingWeeks(
        stats: RawNFLWeeklyStat[],
        season: number
    ): number[] {
        const currentSeason = this.getCurrentSeason();
        const maxWeek = season === currentSeason ? this.getCurrentWeek() : 18;

        // Get all weeks we have data for
        const weeksWithData = new Set<number>();
        for (const stat of stats) {
            weeksWithData.add(stat.week);
        }

        // Find missing weeks
        const missingWeeks: number[] = [];
        for (let week = 1; week <= maxWeek; week++) {
            if (!weeksWithData.has(week)) {
                missingWeeks.push(week);
            }
        }

        return missingWeeks;
    }

    /**
     * Get current NFL week (approximate)
     */
    private getCurrentWeek(): number {
        const now = new Date();
        const seasonStart = new Date(now.getFullYear(), 8, 5);

        if (now < seasonStart) {
            return 0;
        }

        const weeksSinceStart = Math.floor(
            (now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000)
        );

        return Math.min(Math.max(weeksSinceStart + 1, 1), 18);
    }
}
