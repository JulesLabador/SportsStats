/**
 * Adapter Registry
 *
 * Central registry for all data source adapters.
 * The ETL runner uses this to discover and instantiate adapters.
 *
 * Adapters are sport-specific (e.g., nfl-mock, mlb-sportsdataio).
 *
 * To register a new adapter:
 * 1. Import the adapter class
 * 2. Add it to the ADAPTER_REGISTRY object with a unique key
 */

import type { DataSourceAdapter, NFLDataSourceAdapter } from "./base";
import { NFLMockAdapter } from "./nfl-mock.adapter";

/**
 * Registry of all available data source adapters
 * Keys are adapter names, values are adapter instances
 */
const ADAPTER_REGISTRY: Record<string, DataSourceAdapter> = {
    "nfl-mock": new NFLMockAdapter(),
    // Add new adapters here:
    // 'nfl-sportsdataio': new NFLSportsDataIOAdapter(),
    // 'mlb-mock': new MLBMockAdapter(),
    // 'nba-mock': new NBAMockAdapter(),
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

// Re-export adapter types and base classes
export { BaseAdapter, NFLBaseAdapter, isNFLAdapter } from "./base";
export type {
    DataSourceAdapter,
    NFLDataSourceAdapter,
    AdapterFetchOptions,
    HealthCheckResult,
} from "./base";
