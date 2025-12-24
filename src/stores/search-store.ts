import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Player } from "@/lib/types";

/**
 * Maximum number of recent searches to store
 */
const MAX_RECENT_SEARCHES = 10;

/**
 * Search store state interface
 */
interface SearchState {
    /** Current search query */
    query: string;
    /** Recent player searches (persisted to localStorage) */
    recentSearches: Player[];
    /** Whether search is currently active/focused */
    isSearching: boolean;
    /** Search results from current query */
    searchResults: Player[];
}

/**
 * Search store actions interface
 */
interface SearchActions {
    /** Update the search query */
    setQuery: (query: string) => void;
    /** Add a player to recent searches */
    addRecentSearch: (player: Player) => void;
    /** Remove a specific player from recent searches */
    removeRecentSearch: (playerId: string) => void;
    /** Clear all recent searches */
    clearRecentSearches: () => void;
    /** Set search focus state */
    setIsSearching: (isSearching: boolean) => void;
    /** Set search results */
    setSearchResults: (results: Player[]) => void;
    /** Clear search state (query and results) */
    clearSearch: () => void;
}

type SearchStore = SearchState & SearchActions;

/**
 * Zustand store for search functionality
 *
 * Features:
 * - Persists recent searches to localStorage
 * - Limits recent searches to prevent unbounded growth
 * - Deduplicates recent searches (most recent first)
 *
 * @example
 * ```tsx
 * const query = useSearchStore((state) => state.query);
 * const setQuery = useSearchStore((state) => state.setQuery);
 * const recentSearches = useSearchStore((state) => state.recentSearches);
 * ```
 */
export const useSearchStore = create<SearchStore>()(
    persist(
        (set, get) => ({
            // Initial state
            query: "",
            recentSearches: [],
            isSearching: false,
            searchResults: [],

            // Actions
            setQuery: (query) => {
                set({ query });
            },

            addRecentSearch: (player) => {
                const { recentSearches } = get();

                // Remove if already exists (will be re-added at front)
                const filtered = recentSearches.filter(
                    (p) => p.id !== player.id
                );

                // Add to front and limit to max
                const updated = [player, ...filtered].slice(
                    0,
                    MAX_RECENT_SEARCHES
                );

                set({ recentSearches: updated });
            },

            removeRecentSearch: (playerId) => {
                set((state) => ({
                    recentSearches: state.recentSearches.filter(
                        (p) => p.id !== playerId
                    ),
                }));
            },

            clearRecentSearches: () => {
                set({ recentSearches: [] });
            },

            setIsSearching: (isSearching) => {
                set({ isSearching });
            },

            setSearchResults: (results) => {
                set({ searchResults: results });
            },

            clearSearch: () => {
                set({
                    query: "",
                    searchResults: [],
                    isSearching: false,
                });
            },
        }),
        {
            name: "nfl-stats-search",
            // Only persist recentSearches to localStorage
            partialize: (state) => ({
                recentSearches: state.recentSearches,
            }),
        }
    )
);

/**
 * Selector hooks for optimized re-renders
 */
export const useSearchQuery = () => useSearchStore((state) => state.query);
export const useRecentSearches = () =>
    useSearchStore((state) => state.recentSearches);
export const useIsSearching = () =>
    useSearchStore((state) => state.isSearching);
export const useSearchResults = () =>
    useSearchStore((state) => state.searchResults);
