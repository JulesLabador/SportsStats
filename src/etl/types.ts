/**
 * ETL Pipeline Types
 *
 * Defines the raw data structures that adapters produce and the
 * database-ready structures that loaders consume.
 * Supports multiple sports with sport-specific stat interfaces.
 */

import type { SportId, Json } from "@/lib/database.types";

// ============================================================================
// SPORT TYPES
// ============================================================================

/** Re-export SportId and Json for convenience */
export type { SportId, Json };

/** NFL team abbreviations */
export type NFLTeam =
    | "ARI"
    | "ATL"
    | "BAL"
    | "BUF"
    | "CAR"
    | "CHI"
    | "CIN"
    | "CLE"
    | "DAL"
    | "DEN"
    | "DET"
    | "GB"
    | "HOU"
    | "IND"
    | "JAX"
    | "KC"
    | "LAC"
    | "LAR"
    | "LV"
    | "MIA"
    | "MIN"
    | "NE"
    | "NO"
    | "NYG"
    | "NYJ"
    | "PHI"
    | "PIT"
    | "SEA"
    | "SF"
    | "TB"
    | "TEN"
    | "WAS";

/** NFL player positions */
export type NFLPosition = "QB" | "RB" | "WR" | "TE";

// ============================================================================
// RAW TYPES - What adapters produce (normalized from external APIs)
// ============================================================================

/**
 * Raw player data from external data source
 * Adapters normalize their API responses to this format
 */
export interface RawPlayer {
    /** External ID from the data source */
    externalId: string;
    /** Full player name */
    name: string;
    /** URL to player headshot (optional) */
    imageUrl?: string;
}

/**
 * Raw player profile data linking player to a sport
 */
export interface RawPlayerProfile {
    /** External player ID */
    playerExternalId: string;
    /** Sport this profile belongs to */
    sportId: SportId;
    /** Position within the sport */
    position: string;
    /** Sport-specific metadata (college, draft info, etc.) */
    metadata?: Json;
}

/**
 * Raw NFL player season data from external data source
 */
export interface RawNFLPlayerSeason {
    /** External player ID */
    playerExternalId: string;
    /** Season year */
    season: number;
    /** Team for this season */
    team: NFLTeam;
    /** Jersey number for this season */
    jerseyNumber: number;
    /** Whether player was active */
    isActive: boolean;
}

/**
 * Raw NFL weekly stat data from external data source
 * All stat fields are optional - adapters only populate what's available
 */
export interface RawNFLWeeklyStat {
    /** External player ID */
    playerExternalId: string;
    /** Season year */
    season: number;
    /** Week number (1-18) */
    week: number;
    /** Opponent team abbreviation */
    opponent: NFLTeam;
    /** Home or Away */
    location: "H" | "A";
    /** Game result string (e.g., "W 24-17") */
    result?: string;

    // Passing stats
    passingYards?: number;
    passingTDs?: number;
    interceptions?: number;
    completions?: number;
    attempts?: number;

    // Rushing stats
    rushingYards?: number;
    rushingTDs?: number;
    carries?: number;

    // Receiving stats
    receivingYards?: number;
    receivingTDs?: number;
    receptions?: number;
    targets?: number;
}

// ============================================================================
// DATABASE TYPES - What loaders consume (ready for Supabase upsert)
// ============================================================================

/**
 * Player record ready for database insertion
 */
export interface DbPlayer {
    id: string;
    name: string;
    image_url: string | null;
}

/**
 * Player profile record ready for database insertion
 */
export interface DbPlayerProfile {
    player_id: string;
    sport_id: SportId;
    position: string;
    metadata: Json;
}

/**
 * NFL player season record ready for database insertion
 */
export interface DbNFLPlayerSeason {
    player_profile_id: string;
    season: number;
    team: string;
    jersey_number: number;
    is_active: boolean;
}

/**
 * NFL weekly stat record ready for database insertion
 * Note: player_season_id is resolved by the loader
 */
export interface DbNFLWeeklyStat {
    player_season_id: string;
    week: number;
    opponent: string;
    location: "H" | "A";
    result: string | null;
    passing_yards: number;
    passing_tds: number;
    interceptions: number;
    completions: number;
    attempts: number;
    rushing_yards: number;
    rushing_tds: number;
    carries: number;
    receiving_yards: number;
    receiving_tds: number;
    receptions: number;
    targets: number;
}

// ============================================================================
// ETL RUN TYPES
// ============================================================================

export type ETLRunStatus = "running" | "success" | "failed";

/**
 * ETL run record for tracking pipeline executions
 */
export interface ETLRunRecord {
    id: string;
    adapterName: string;
    sportId: SportId | null;
    startedAt: Date;
    completedAt: Date | null;
    status: ETLRunStatus;
    recordsProcessed: number;
    errorMessage: string | null;
}

/**
 * Options for running the ETL pipeline
 */
export interface ETLRunOptions {
    /** Which adapter to use */
    adapterName: string;
    /** Season to fetch data for (defaults to current year) */
    season?: number;
    /** Specific week to fetch (optional - fetches all weeks if not specified) */
    week?: number;
    /** Whether to fetch player data */
    fetchPlayers?: boolean;
    /** Whether to fetch weekly stats */
    fetchWeeklyStats?: boolean;
    /** Dry run - don't actually write to database */
    dryRun?: boolean;
}

/**
 * Result of an ETL run
 */
export interface ETLRunResult {
    success: boolean;
    runId: string;
    adapterName: string;
    sportId: SportId;
    recordsProcessed: number;
    duration: number;
    errors: string[];
}

// ============================================================================
// MAPPING TYPES
// ============================================================================

/**
 * Maps external player IDs to internal player IDs
 * Used during transformation to resolve references
 */
export type ExternalIdMap = Map<string, string>;

/**
 * Maps player_id to player_profile_id for a specific sport
 * Used during season loading to resolve foreign keys
 */
export type PlayerProfileIdMap = Map<string, string>;

/**
 * Maps (playerProfileId, season) to player_season_id
 * Used during weekly stats loading to resolve foreign keys
 */
export type PlayerSeasonIdMap = Map<string, string>;

/**
 * Creates a key for the PlayerSeasonIdMap
 */
export function makePlayerSeasonKey(
    playerProfileId: string,
    season: number
): string {
    return `${playerProfileId}:${season}`;
}

// ============================================================================
// CACHING TYPES
// ============================================================================

/** Supported data sources for caching */
export type DataSource = "espn" | "pfr";

/**
 * Cache entry for API responses
 */
export interface CacheEntry {
    id: string;
    source: DataSource;
    endpoint: string;
    paramsHash: string;
    responseData: Json;
    season: number | null;
    week: number | null;
    gameId: string | null;
    fetchedAt: Date;
    expiresAt: Date;
}

/**
 * Options for cache operations
 */
export interface CacheOptions {
    /** Time-to-live in milliseconds */
    ttlMs: number;
    /** Season for cache key (optional) */
    season?: number;
    /** Week for cache key (optional) */
    week?: number;
    /** Game ID for cache key (optional) */
    gameId?: string;
}

/**
 * Default TTL values for different cache scenarios (in milliseconds)
 */
export const CACHE_TTL = {
    /** Completed games - 24 hours */
    COMPLETED_GAME: 24 * 60 * 60 * 1000,
    /** In-progress games - 1 hour */
    IN_PROGRESS_GAME: 60 * 60 * 1000,
    /** Historical data - 7 days */
    HISTORICAL: 7 * 24 * 60 * 60 * 1000,
    /** Player info - 12 hours */
    PLAYER_INFO: 12 * 60 * 60 * 1000,
    /** Schedule data - 6 hours */
    SCHEDULE: 6 * 60 * 60 * 1000,
} as const;

// ============================================================================
// PLAYER IDENTITY TYPES
// ============================================================================

/** Confidence level for player identity matches */
export type MatchConfidence = "exact" | "high" | "medium" | "low";

/**
 * Player identity mapping linking IDs across sources
 */
export interface PlayerIdentityMapping {
    id: string;
    playerId: string;
    espnPlayerId: string | null;
    pfrPlayerSlug: string | null;
    matchConfidence: MatchConfidence;
    matchMethod: string | null;
    matchedAt: Date;
    manualOverride: boolean;
    extraIds: Record<string, string>;
}

/**
 * Input for creating a new player identity mapping
 */
export interface CreateIdentityMappingInput {
    playerId: string;
    espnPlayerId?: string;
    pfrPlayerSlug?: string;
    matchConfidence: MatchConfidence;
    matchMethod: string;
}

/**
 * Result of a player matching operation
 */
export interface PlayerMatchResult {
    playerId: string;
    espnPlayerId: string | null;
    pfrPlayerSlug: string | null;
    confidence: MatchConfidence;
    isNewMatch: boolean;
}

// ============================================================================
// RATE LIMITING TYPES
// ============================================================================

/**
 * Rate limit configuration per source
 */
export interface RateLimitConfig {
    /** Maximum requests per second */
    requestsPerSecond: number;
    /** Maximum concurrent requests */
    maxConcurrent: number;
    /** Base delay for exponential backoff (ms) */
    baseBackoffMs: number;
    /** Maximum backoff delay (ms) */
    maxBackoffMs: number;
}

/**
 * Default rate limit configurations
 */
export const RATE_LIMITS: Record<DataSource, RateLimitConfig> = {
    espn: {
        requestsPerSecond: 1,
        maxConcurrent: 1,
        baseBackoffMs: 1000,
        maxBackoffMs: 30000,
    },
    pfr: {
        requestsPerSecond: 1,
        maxConcurrent: 1,
        baseBackoffMs: 2000,
        maxBackoffMs: 60000,
    },
};
