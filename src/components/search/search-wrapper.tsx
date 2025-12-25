"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SearchInput } from "./search-input";
import { useSearchStore } from "@/stores/search-store";
import { searchPlayers } from "@/lib/data";
import type { Player } from "@/lib/types";

/**
 * Props for SearchWrapper component
 */
interface SearchWrapperProps {
    /** Additional CSS classes */
    className?: string;
}

/**
 * SearchWrapper component
 *
 * Client-side wrapper for the search functionality on the home page.
 * Handles:
 * - Debounced search API calls
 * - Search state via Zustand store
 * - Navigation to player pages on selection
 *
 * This component is extracted to keep the home page as a Server Component
 * while maintaining interactive search functionality.
 *
 * @example
 * ```tsx
 * <SearchWrapper className="max-w-xl mx-auto" />
 * ```
 */
export function SearchWrapper({ className }: SearchWrapperProps) {
    const router = useRouter();
    const query = useSearchStore((state) => state.query);
    const [searchResults, setSearchResults] = React.useState<Player[]>([]);

    // Debounced search effect
    // Triggers API call when query changes, with 300ms debounce
    React.useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.trim()) {
                try {
                    const results = await searchPlayers(query);
                    setSearchResults(results);
                } catch (error) {
                    console.error("Error searching players:", error);
                    setSearchResults([]);
                }
            } else {
                setSearchResults([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    /**
     * Handle player selection - navigate to player page
     */
    const handleSelectPlayer = (player: Player) => {
        router.push(`/player/${player.id}`);
    };

    return (
        <SearchInput
            onSelectPlayer={handleSelectPlayer}
            searchResults={searchResults}
            className={className}
        />
    );
}

