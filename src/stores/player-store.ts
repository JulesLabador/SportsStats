import { create } from "zustand";

/**
 * Player store state interface
 *
 * Simplified for SSR architecture:
 * - Server handles data fetching (no client-side caching needed)
 * - Only tracks selected season for client-side season switching
 */
interface PlayerState {
    /** Currently selected season for viewing */
    selectedSeason: number;
}

/**
 * Player store actions interface
 */
interface PlayerActions {
    /** Update the selected season */
    setSelectedSeason: (season: number) => void;
}

type PlayerStore = PlayerState & PlayerActions;

/**
 * Current NFL season (2025)
 */
const CURRENT_SEASON = 2025;

/**
 * Zustand store for player page state
 *
 * Simplified for SSR architecture:
 * - Server fetches data at request time (no client-side caching)
 * - Only manages selected season for interactive season switching
 *
 * @example
 * ```tsx
 * // In a component
 * const { selectedSeason, setSelectedSeason } = usePlayerStore();
 * ```
 */
export const usePlayerStore = create<PlayerStore>((set) => ({
    // Initial state
    selectedSeason: CURRENT_SEASON,

    // Actions
    setSelectedSeason: (season) => {
        set({ selectedSeason: season });
    },
}));

/**
 * Selector hook for selected season
 * Use this for optimized re-renders when only needing the season value
 */
export const useSelectedSeason = () =>
    usePlayerStore((state) => state.selectedSeason);
