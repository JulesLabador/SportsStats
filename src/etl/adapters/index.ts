/**
 * Adapter Registry
 *
 * Central registry for all data source adapters.
 * The ETL runner uses this to discover and instantiate adapters.
 *
 * Adapters are sport-specific (e.g., nfl-mock, nfl-espn, nfl-pfr).
 *
 * To register a new adapter:
 * 1. Import the adapter class
 * 2. Add it to the ADAPTER_REGISTRY object with a unique key
 *
 * Note: Some adapters (like nfl-composite) require configuration and
 * should be instantiated via factory functions instead of the registry.
 */

import type { DataSourceAdapter, NFLDataSourceAdapter } from "./base";
import { NFLMockAdapter } from "./nfl-mock.adapter";
import { NFLESPNAdapter } from "./nfl-espn.adapter";
import { NFLPFRAdapter, KNOWN_PFR_SLUGS } from "./nfl-pfr.adapter";
import {
    NFLCompositeAdapter,
    type CompositeAdapterConfig,
} from "./nfl-composite.adapter";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Registry of all available data source adapters
 * Keys are adapter names, values are adapter instances
 *
 * Note: ESPN and PFR adapters are registered without cache service.
 * Use factory functions for production use with caching enabled.
 */
const ADAPTER_REGISTRY: Record<string, DataSourceAdapter> = {
    "nfl-mock": new NFLMockAdapter(),
    "nfl-espn": new NFLESPNAdapter(),
    "nfl-pfr": new NFLPFRAdapter(),
    // Note: nfl-composite requires Supabase client, use createCompositeAdapter()
};

/**
 * Get an adapter by name
 *
 * @param name - Adapter name (e.g., 'nfl-mock', 'mlb-sportsdataio')
 * @returns The adapter instance or undefined if not found
 */
export function getAdapter(name: string): DataSourceAdapter | undefined {
    return ADAPTER_REGISTRY[name];
}

/**
 * Get an NFL adapter by name
 * Returns undefined if adapter doesn't exist or isn't an NFL adapter
 *
 * @param name - Adapter name
 * @returns The NFL adapter instance or undefined
 */
export function getNFLAdapter(name: string): NFLDataSourceAdapter | undefined {
    const adapter = ADAPTER_REGISTRY[name];
    if (adapter && adapter.sportId === "nfl") {
        return adapter as NFLDataSourceAdapter;
    }
    return undefined;
}

/**
 * Get all registered adapter names
 *
 * @returns Array of adapter names
 */
export function getAdapterNames(): string[] {
    return Object.keys(ADAPTER_REGISTRY);
}

/**
 * Get adapter names filtered by sport
 *
 * @param sportId - Sport ID to filter by
 * @returns Array of adapter names for that sport
 */
export function getAdapterNamesBySport(sportId: string): string[] {
    return Object.entries(ADAPTER_REGISTRY)
        .filter(([_, adapter]) => adapter.sportId === sportId)
        .map(([name]) => name);
}

/**
 * Check if an adapter exists
 *
 * @param name - Adapter name to check
 * @returns True if adapter is registered
 */
export function hasAdapter(name: string): boolean {
    return name in ADAPTER_REGISTRY;
}

/**
 * Get all registered adapters
 *
 * @returns Array of all adapter instances
 */
export function getAllAdapters(): DataSourceAdapter[] {
    return Object.values(ADAPTER_REGISTRY);
}

// ============================================================================
// Factory Functions for Configured Adapters
// ============================================================================

/**
 * Create an ESPN adapter with caching enabled
 *
 * @param supabaseClient - Supabase client for cache storage
 * @returns Configured ESPN adapter
 */
export function createESPNAdapter(
    supabaseClient: SupabaseClient<Database>
): NFLESPNAdapter {
    return NFLESPNAdapter.withCache(supabaseClient);
}

/**
 * Create a PFR adapter with caching enabled
 *
 * @param supabaseClient - Supabase client for cache storage
 * @param pfrSlugs - Optional map of player names to PFR slugs
 * @returns Configured PFR adapter
 */
export function createPFRAdapter(
    supabaseClient: SupabaseClient<Database>,
    pfrSlugs?: Record<string, string>
): NFLPFRAdapter {
    const adapter = NFLPFRAdapter.withCache(supabaseClient);

    // Add known slugs
    const slugs = pfrSlugs ?? KNOWN_PFR_SLUGS;
    for (const [name, slug] of Object.entries(slugs)) {
        adapter.addPlayerSlug(name, slug);
    }

    return adapter;
}

/**
 * Create a composite adapter with full configuration
 *
 * @param config - Composite adapter configuration
 * @returns Configured composite adapter
 */
export function createCompositeAdapter(
    config: CompositeAdapterConfig
): NFLCompositeAdapter {
    return new NFLCompositeAdapter(config);
}

/**
 * Create a composite adapter with default settings
 *
 * @param supabaseClient - Supabase client
 * @returns Configured composite adapter with defaults
 */
export function createDefaultCompositeAdapter(
    supabaseClient: SupabaseClient<Database>
): NFLCompositeAdapter {
    return new NFLCompositeAdapter({
        supabaseClient,
        enableFallback: true,
        enableMerge: false,
        pfrSlugs: KNOWN_PFR_SLUGS,
    });
}

// Re-export adapter types and base classes
export { BaseAdapter, NFLBaseAdapter, isNFLAdapter } from "./base";
export type {
    DataSourceAdapter,
    NFLDataSourceAdapter,
    AdapterFetchOptions,
    HealthCheckResult,
} from "./base";

// Re-export adapter classes for direct use
export { NFLMockAdapter } from "./nfl-mock.adapter";
export { NFLESPNAdapter } from "./nfl-espn.adapter";
export { NFLPFRAdapter, KNOWN_PFR_SLUGS } from "./nfl-pfr.adapter";
export {
    NFLCompositeAdapter,
    type CompositeAdapterConfig,
} from "./nfl-composite.adapter";
