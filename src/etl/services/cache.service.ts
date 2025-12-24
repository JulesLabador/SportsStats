/**
 * Cache Service
 *
 * Handles caching of API/scrape responses in Supabase.
 * Supports TTL-based expiration and source-specific cache management.
 *
 * Key features:
 * - Store raw responses (JSON or HTML) with configurable TTL
 * - Query cache by source, endpoint, and params
 * - Automatic expiration checking
 * - Cache invalidation by source/endpoint/params
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { dbLogger } from "@/lib/logger";
import type { DataSource, CacheOptions, Json } from "../types";
import { CACHE_TTL } from "../types";
import { createHash } from "crypto";

/** Logger for cache operations */
const log = dbLogger.child({ service: "cache" });

/** Type alias for Supabase client */
type SupabaseDbClient = SupabaseClient<Database>;

/**
 * Result of a cache lookup
 */
export interface CacheGetResult<T = Json> {
    /** Whether the cache entry was found and is valid */
    hit: boolean;
    /** The cached data (null if miss) */
    data: T | null;
    /** When the data was fetched (null if miss) */
    fetchedAt: Date | null;
    /** Whether the entry exists but is expired */
    expired: boolean;
}

/**
 * Cache Service for storing and retrieving API responses
 */
export class CacheService {
    private client: SupabaseDbClient;

    constructor(client: SupabaseDbClient) {
        this.client = client;
    }

    /**
     * Generate a hash of request parameters for cache key
     *
     * @param params - Request parameters object
     * @returns SHA256 hash string
     */
    private hashParams(params: Record<string, unknown>): string {
        // Sort keys for consistent hashing
        const sortedParams = Object.keys(params)
            .sort()
            .reduce((acc, key) => {
                acc[key] = params[key];
                return acc;
            }, {} as Record<string, unknown>);

        const jsonString = JSON.stringify(sortedParams);
        return createHash("sha256").update(jsonString).digest("hex");
    }

    /**
     * Get a cached response if it exists and is not expired
     *
     * @param source - Data source (espn/pfr)
     * @param endpoint - API endpoint or URL path
     * @param params - Request parameters
     * @returns Cache lookup result
     */
    async get<T = Json>(
        source: DataSource,
        endpoint: string,
        params: Record<string, unknown> = {}
    ): Promise<CacheGetResult<T>> {
        const paramsHash = this.hashParams(params);

        const { data, error } = await this.client
            .from("api_response_cache")
            .select("response_data, fetched_at, expires_at")
            .eq("source", source)
            .eq("endpoint", endpoint)
            .eq("params_hash", paramsHash)
            .single();

        // No cache entry found
        if (error || !data) {
            return {
                hit: false,
                data: null,
                fetchedAt: null,
                expired: false,
            };
        }

        const now = new Date();
        const expiresAt = new Date(data.expires_at);
        const fetchedAt = new Date(data.fetched_at);

        // Entry exists but is expired
        if (expiresAt < now) {
            return {
                hit: false,
                data: data.response_data as T,
                fetchedAt,
                expired: true,
            };
        }

        // Valid cache hit
        return {
            hit: true,
            data: data.response_data as T,
            fetchedAt,
            expired: false,
        };
    }

    /**
     * Store a response in the cache
     *
     * @param source - Data source (espn/pfr)
     * @param endpoint - API endpoint or URL path
     * @param params - Request parameters
     * @param data - Response data to cache
     * @param options - Cache options including TTL
     * @returns True if successfully cached
     */
    async set(
        source: DataSource,
        endpoint: string,
        params: Record<string, unknown>,
        data: Json,
        options: CacheOptions
    ): Promise<boolean> {
        const paramsHash = this.hashParams(params);
        const now = new Date();
        const expiresAt = new Date(now.getTime() + options.ttlMs);

        const { error } = await this.client.from("api_response_cache").upsert(
            {
                source,
                endpoint,
                params_hash: paramsHash,
                response_data: data,
                season: options.season ?? null,
                week: options.week ?? null,
                game_id: options.gameId ?? null,
                fetched_at: now.toISOString(),
                expires_at: expiresAt.toISOString(),
            },
            {
                onConflict: "source,endpoint,params_hash",
                ignoreDuplicates: false,
            }
        );

        if (error) {
            log.error(
                { error: error.message, source, endpoint },
                "Failed to cache response"
            );
            return false;
        }

        return true;
    }

    /**
     * Invalidate cache entries matching the given criteria
     *
     * @param source - Data source to invalidate
     * @param endpoint - Optional endpoint filter
     * @param params - Optional params filter
     * @returns Number of entries invalidated
     */
    async invalidate(
        source: DataSource,
        endpoint?: string,
        params?: Record<string, unknown>
    ): Promise<number> {
        let query = this.client
            .from("api_response_cache")
            .delete()
            .eq("source", source);

        if (endpoint) {
            query = query.eq("endpoint", endpoint);
        }

        if (params) {
            const paramsHash = this.hashParams(params);
            query = query.eq("params_hash", paramsHash);
        }

        const { data, error } = await query.select("id");

        if (error) {
            log.error(
                { error: error.message, source, endpoint },
                "Failed to invalidate cache"
            );
            return 0;
        }

        return data?.length ?? 0;
    }

    /**
     * Invalidate cache entries for a specific season/week
     *
     * @param source - Data source to invalidate
     * @param season - Season year
     * @param week - Optional week number
     * @returns Number of entries invalidated
     */
    async invalidateBySeasonWeek(
        source: DataSource,
        season: number,
        week?: number
    ): Promise<number> {
        let query = this.client
            .from("api_response_cache")
            .delete()
            .eq("source", source)
            .eq("season", season);

        if (week !== undefined) {
            query = query.eq("week", week);
        }

        const { data, error } = await query.select("id");

        if (error) {
            log.error(
                { error: error.message, source, season, week },
                "Failed to invalidate cache by season/week"
            );
            return 0;
        }

        return data?.length ?? 0;
    }

    /**
     * Invalidate cache entry for a specific game
     *
     * @param source - Data source to invalidate
     * @param gameId - Game identifier
     * @returns Number of entries invalidated
     */
    async invalidateByGameId(
        source: DataSource,
        gameId: string
    ): Promise<number> {
        const { data, error } = await this.client
            .from("api_response_cache")
            .delete()
            .eq("source", source)
            .eq("game_id", gameId)
            .select("id");

        if (error) {
            log.error(
                { error: error.message, source, gameId },
                "Failed to invalidate cache by game ID"
            );
            return 0;
        }

        return data?.length ?? 0;
    }

    /**
     * Clean up all expired cache entries
     *
     * @returns Number of entries removed
     */
    async cleanupExpired(): Promise<number> {
        const { data, error } = await this.client.rpc("cleanup_expired_cache");

        if (error) {
            log.error(
                { error: error.message },
                "Failed to cleanup expired cache"
            );
            return 0;
        }

        return data ?? 0;
    }

    /**
     * Get cache statistics for monitoring
     *
     * @returns Cache statistics by source
     */
    async getStats(): Promise<
        Array<{
            source: DataSource;
            totalEntries: number;
            validEntries: number;
            expiredEntries: number;
            oldestFetch: Date | null;
            newestFetch: Date | null;
        }>
    > {
        const { data, error } = await this.client
            .from("api_cache_stats")
            .select("*");

        if (error) {
            log.error({ error: error.message }, "Failed to get cache stats");
            return [];
        }

        return (data ?? []).map((row) => ({
            source: row.source as DataSource,
            totalEntries: row.total_entries ?? 0,
            validEntries: row.valid_entries ?? 0,
            expiredEntries: row.expired_entries ?? 0,
            oldestFetch: row.oldest_fetch ? new Date(row.oldest_fetch) : null,
            newestFetch: row.newest_fetch ? new Date(row.newest_fetch) : null,
        }));
    }

    /**
     * Helper to get appropriate TTL based on data type
     *
     * @param type - Type of data being cached
     * @param isHistorical - Whether this is historical data
     * @returns TTL in milliseconds
     */
    static getTTL(
        type: "game" | "player" | "schedule",
        isHistorical: boolean = false
    ): number {
        if (isHistorical) {
            return CACHE_TTL.HISTORICAL;
        }

        switch (type) {
            case "game":
                return CACHE_TTL.COMPLETED_GAME;
            case "player":
                return CACHE_TTL.PLAYER_INFO;
            case "schedule":
                return CACHE_TTL.SCHEDULE;
            default:
                return CACHE_TTL.COMPLETED_GAME;
        }
    }
}
