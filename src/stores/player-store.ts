import { create } from "zustand";
import type { Player, WeeklyStat, SeasonSummary } from "@/lib/types";

/**
 * Player store state interface
 * Manages cached player data and selected season state
 */
interface PlayerState {
    /** Cache of fetched players by ID */
    players: Record<string, Player>;
    /** Cache of weekly stats by composite key: `${playerId}-${season}` */
    weeklyStats: Record<string, WeeklyStat[]>;
    /** Cache of season summaries by composite key: `${playerId}-${season}` */
    seasonSummaries: Record<string, SeasonSummary>;
    /** Currently selected season for viewing */
    selectedSeason: number;
    /** Loading state for async operations */
    isLoading: boolean;
}

/**
 * Player store actions interface
 */
interface PlayerActions {
    /** Add or update a player in the cache */
    setPlayer: (player: Player) => void;
    /** Get a player from cache by ID */
    getPlayer: (id: string) => Player | undefined;
    /** Set weekly stats for a player and season */
    setWeeklyStats: (
        playerId: string,
        season: number,
        stats: WeeklyStat[]
    ) => void;
    /** Get weekly stats from cache */
    getWeeklyStats: (
        playerId: string,
        season: number
    ) => WeeklyStat[] | undefined;
    /** Set season summary for a player */
    setSeasonSummary: (
        playerId: string,
        season: number,
        summary: SeasonSummary
    ) => void;
    /** Get season summary from cache */
    getSeasonSummary: (
        playerId: string,
        season: number
    ) => SeasonSummary | undefined;
    /** Update the selected season */
    setSelectedSeason: (season: number) => void;
    /** Set loading state */
    setIsLoading: (loading: boolean) => void;
    /** Clear all cached data */
    clearCache: () => void;
}

type PlayerStore = PlayerState & PlayerActions;

/**
 * Generate composite key for stats caching
 */
const getStatsKey = (playerId: string, season: number): string => {
    return `${playerId}-${season}`;
};

/**
 * Current NFL season (2025)
 */
const CURRENT_SEASON = 2025;

/**
 * Zustand store for player data
 *
 * Provides cache-first strategy to minimize API calls:
 * 1. Check cache before fetching
 * 2. Store fetched data for future use
 * 3. Selective subscriptions prevent unnecessary re-renders
 *
 * @example
 * ```tsx
 * // In a component
 * const player = usePlayerStore((state) => state.getPlayer(playerId));
 * const setPlayer = usePlayerStore((state) => state.setPlayer);
 * ```
 */
export const usePlayerStore = create<PlayerStore>((set, get) => ({
    // Initial state
    players: {},
    weeklyStats: {},
    seasonSummaries: {},
    selectedSeason: CURRENT_SEASON,
    isLoading: false,

    // Actions
    setPlayer: (player) => {
        set((state) => ({
            players: {
                ...state.players,
                [player.id]: player,
            },
        }));
    },

    getPlayer: (id) => {
        return get().players[id];
    },

    setWeeklyStats: (playerId, season, stats) => {
        const key = getStatsKey(playerId, season);
        set((state) => ({
            weeklyStats: {
                ...state.weeklyStats,
                [key]: stats,
            },
        }));
    },

    getWeeklyStats: (playerId, season) => {
        const key = getStatsKey(playerId, season);
        return get().weeklyStats[key];
    },

    setSeasonSummary: (playerId, season, summary) => {
        const key = getStatsKey(playerId, season);
        set((state) => ({
            seasonSummaries: {
                ...state.seasonSummaries,
                [key]: summary,
            },
        }));
    },

    getSeasonSummary: (playerId, season) => {
        const key = getStatsKey(playerId, season);
        return get().seasonSummaries[key];
    },

    setSelectedSeason: (season) => {
        set({ selectedSeason: season });
    },

    setIsLoading: (loading) => {
        set({ isLoading: loading });
    },

    clearCache: () => {
        set({
            players: {},
            weeklyStats: {},
            seasonSummaries: {},
        });
    },
}));

/**
 * Selector hooks for optimized re-renders
 * Use these instead of selecting the entire store
 */
export const useSelectedSeason = () =>
    usePlayerStore((state) => state.selectedSeason);
export const useIsLoading = () => usePlayerStore((state) => state.isLoading);
