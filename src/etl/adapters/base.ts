/**
 * Data Source Adapter Base Interface
 *
 * All data source adapters must implement this interface.
 * The ETL runner uses these methods to fetch data in a source-agnostic way.
 *
 * Adapters are sport-specific (e.g., NFLMockAdapter, MLBSportsDataIOAdapter).
 *
 * To add a new data source:
 * 1. Create a new file: src/etl/adapters/[sport]-[source].adapter.ts
 * 2. Implement the DataSourceAdapter interface
 * 3. Register the adapter in src/etl/adapters/index.ts
 */

import type {
    SportId,
    RawPlayer,
    RawPlayerProfile,
    RawNFLPlayerSeason,
    RawNFLWeeklyStat,
} from "../types";

/**
 * Configuration options passed to adapter methods
 */
export interface AdapterFetchOptions {
    /** Season year to fetch data for */
    season: number;
    /** Specific week to fetch (optional) */
    week?: number;
}

/**
 * Result of a health check
 */
export interface HealthCheckResult {
    healthy: boolean;
    message: string;
    latencyMs?: number;
}

/**
 * Base interface that all data source adapters must implement.
 *
 * Adapters are responsible for:
 * 1. Connecting to their external data source
 * 2. Fetching raw data
 * 3. Normalizing responses to the Raw* types
 *
 * Adapters should NOT:
 * - Write to the database (that's the loader's job)
 * - Transform data to database format (that's the transformer's job)
 * - Handle retries or rate limiting (that's the runner's job)
 */
export interface DataSourceAdapter {
    /**
     * Unique identifier for this adapter
     * Used in ETL run logs and configuration
     */
    readonly name: string;

    /**
     * Version of the adapter implementation
     * Useful for tracking which version processed data
     */
    readonly version: string;

    /**
     * Human-readable description of the data source
     */
    readonly description: string;

    /**
     * Sport this adapter handles
     * Each adapter is specific to one sport
     */
    readonly sportId: SportId;

    /**
     * Fetch all players from the data source
     * Returns normalized player data (core identity only)
     *
     * @param options - Fetch options including season
     * @returns Array of raw player records
     */
    fetchPlayers(options: AdapterFetchOptions): Promise<RawPlayer[]>;

    /**
     * Fetch player profiles (sport-specific data)
     * Links players to this sport with position and metadata
     *
     * @param options - Fetch options including season
     * @returns Array of raw player profile records
     */
    fetchPlayerProfiles(
        options: AdapterFetchOptions
    ): Promise<RawPlayerProfile[]>;

    /**
     * Check if the data source is healthy and accessible
     * Used before running ETL to validate connectivity
     *
     * @returns Health check result with status and message
     */
    healthCheck(): Promise<HealthCheckResult>;
}

/**
 * NFL-specific adapter interface
 * Extends base adapter with NFL-specific methods
 */
export interface NFLDataSourceAdapter extends DataSourceAdapter {
    readonly sportId: "nfl";

    /**
     * Fetch NFL player season records
     * Contains team/jersey info for each player for a given season
     *
     * @param options - Fetch options including season
     * @returns Array of raw NFL player season records
     */
    fetchPlayerSeasons(
        options: AdapterFetchOptions
    ): Promise<RawNFLPlayerSeason[]>;

    /**
     * Fetch NFL weekly statistics for players
     * If week is specified in options, fetches only that week
     * Otherwise fetches all available weeks for the season
     *
     * @param options - Fetch options including season and optional week
     * @returns Array of raw NFL weekly stat records
     */
    fetchWeeklyStats(options: AdapterFetchOptions): Promise<RawNFLWeeklyStat[]>;
}

/**
 * Type guard to check if an adapter is an NFL adapter
 */
export function isNFLAdapter(
    adapter: DataSourceAdapter
): adapter is NFLDataSourceAdapter {
    return adapter.sportId === "nfl";
}

/**
 * Abstract base class with common adapter functionality
 * Extend this class to get helper methods and consistent error handling
 */
export abstract class BaseAdapter implements DataSourceAdapter {
    abstract readonly name: string;
    abstract readonly version: string;
    abstract readonly description: string;
    abstract readonly sportId: SportId;

    abstract fetchPlayers(options: AdapterFetchOptions): Promise<RawPlayer[]>;
    abstract fetchPlayerProfiles(
        options: AdapterFetchOptions
    ): Promise<RawPlayerProfile[]>;
    abstract healthCheck(): Promise<HealthCheckResult>;

    /**
     * Helper to generate a slug ID from a player name
     * Used when the data source doesn't provide a stable ID
     *
     * @param name - Player's full name
     * @returns URL-safe slug (e.g., "patrick-mahomes")
     */
    protected generatePlayerId(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
            .replace(/\s+/g, "-") // Spaces to hyphens
            .replace(/-+/g, "-") // Collapse multiple hyphens
            .trim();
    }

    /**
     * Helper to get the current season year
     * Override in sport-specific adapters if season timing differs
     *
     * @returns Current season year
     */
    protected getCurrentSeason(): number {
        const now = new Date();
        return now.getFullYear();
    }

    /**
     * Helper to validate season is reasonable
     *
     * @param season - Season year to validate
     * @returns True if season is valid
     */
    protected isValidSeason(season: number): boolean {
        const currentSeason = this.getCurrentSeason();
        // Allow seasons from 2000 to next year (for pre-season data)
        return season >= 2000 && season <= currentSeason + 1;
    }
}

/**
 * Abstract base class for NFL adapters
 * Provides NFL-specific helper methods
 */
export abstract class NFLBaseAdapter
    extends BaseAdapter
    implements NFLDataSourceAdapter
{
    readonly sportId = "nfl" as const;

    abstract fetchPlayerSeasons(
        options: AdapterFetchOptions
    ): Promise<RawNFLPlayerSeason[]>;
    abstract fetchWeeklyStats(
        options: AdapterFetchOptions
    ): Promise<RawNFLWeeklyStat[]>;

    /**
     * Helper to get the current NFL season year
     * NFL season spans two calendar years, so this accounts for that
     *
     * @returns Current season year
     */
    protected override getCurrentSeason(): number {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth(); // 0-indexed

        // NFL season starts in September (month 8)
        // If we're before September, we're in the previous year's season
        return month < 8 ? year - 1 : year;
    }

    /**
     * Helper to validate NFL week number
     *
     * @param week - Week number to validate
     * @returns True if week is valid (1-18)
     */
    protected isValidWeek(week: number): boolean {
        return week >= 1 && week <= 18;
    }
}
