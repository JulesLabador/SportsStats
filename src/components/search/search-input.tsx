"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
    useSearchStore,
    useSearchQuery,
    useRecentSearches,
    useIsSearching,
} from "@/stores/search-store";
import type { Player } from "@/lib/types";
import { TeamBadge } from "../player/team-badge";
import { PositionBadge } from "../player/position-badge";

/**
 * Props for the SearchInput component
 */
interface SearchInputProps {
    /** Callback when a player is selected */
    onSelectPlayer: (player: Player) => void;
    /** Search results to display */
    searchResults: Player[];
    /** Placeholder text */
    placeholder?: string;
    /** Additional CSS classes */
    className?: string;
}

/**
 * SearchInput component
 *
 * Provides a search input with:
 * - Type-ahead search functionality
 * - Recent searches display
 * - Search results dropdown
 * - Keyboard navigation
 *
 * @example
 * ```tsx
 * <SearchInput
 *   onSelectPlayer={(player) => router.push(`/player/${player.id}`)}
 *   searchResults={filteredPlayers}
 * />
 * ```
 */
export function SearchInput({
    onSelectPlayer,
    searchResults,
    placeholder = "Search NFL players...",
    className,
}: SearchInputProps) {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [focusedIndex, setFocusedIndex] = React.useState(-1);

    // Store state
    const query = useSearchQuery();
    const recentSearches = useRecentSearches();
    const isSearching = useIsSearching();
    const { setQuery, setIsSearching, addRecentSearch, clearRecentSearches } =
        useSearchStore();

    // Determine what to show in dropdown
    const showRecent =
        isSearching && query.length === 0 && recentSearches.length > 0;
    const showResults =
        isSearching && query.length > 0 && searchResults.length > 0;
    const showNoResults =
        isSearching && query.length > 0 && searchResults.length === 0;
    const showDropdown = showRecent || showResults || showNoResults;

    // Items to display (recent or search results)
    const displayItems = showRecent ? recentSearches : searchResults;

    /**
     * Handle player selection
     */
    const handleSelect = (player: Player) => {
        addRecentSearch(player);
        setIsSearching(false);
        setQuery("");
        onSelectPlayer(player);
    };

    /**
     * Handle keyboard navigation
     */
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!showDropdown) return;

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setFocusedIndex((prev) =>
                    prev < displayItems.length - 1 ? prev + 1 : prev
                );
                break;
            case "ArrowUp":
                e.preventDefault();
                setFocusedIndex((prev) => (prev > 0 ? prev - 1 : -1));
                break;
            case "Enter":
                e.preventDefault();
                if (focusedIndex >= 0 && focusedIndex < displayItems.length) {
                    handleSelect(displayItems[focusedIndex]);
                }
                break;
            case "Escape":
                e.preventDefault();
                setIsSearching(false);
                inputRef.current?.blur();
                break;
        }
    };

    // Reset focused index when results change
    React.useEffect(() => {
        setFocusedIndex(-1);
    }, [searchResults, query]);

    return (
        <div className={cn("relative w-full", className)}>
            {/* Search input */}
            <div className="relative">
                {/* Search icon */}
                <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                </svg>

                <Input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsSearching(true)}
                    onBlur={() => {
                        // Delay to allow click events on dropdown
                        setTimeout(() => setIsSearching(false), 200);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="pl-10 pr-4 h-12 text-base"
                />

                {/* Clear button */}
                {query.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                )}
            </div>

            {/* Dropdown */}
            {showDropdown && (
                <Card className="absolute top-full left-0 right-0 mt-2 z-50 overflow-hidden">
                    <CardContent className="p-0">
                        {/* Recent searches header */}
                        {showRecent && (
                            <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Recent Searches
                                </span>
                                <button
                                    type="button"
                                    onClick={clearRecentSearches}
                                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Clear
                                </button>
                            </div>
                        )}

                        {/* No results message */}
                        {showNoResults && (
                            <div className="px-4 py-8 text-center text-muted-foreground">
                                <p className="text-sm">
                                    No players found for &quot;{query}&quot;
                                </p>
                            </div>
                        )}

                        {/* Results list */}
                        {displayItems.length > 0 && (
                            <ul className="py-2">
                                {displayItems.map((player, index) => (
                                    <li key={player.id}>
                                        <button
                                            type="button"
                                            onClick={() => handleSelect(player)}
                                            className={cn(
                                                "w-full px-4 py-3 flex items-center gap-3 text-left transition-colors hover:cursor-pointer",
                                                focusedIndex === index
                                                    ? "bg-accent"
                                                    : "hover:bg-accent/50"
                                            )}
                                        >
                                            {/* Player avatar placeholder */}
                                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                                                <span className="text-sm font-semibold text-muted-foreground">
                                                    {player.name.charAt(0)}
                                                </span>
                                            </div>

                                            {/* Player info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium truncate">
                                                    {player.name}
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <TeamBadge
                                                        team={player.team}
                                                    />
                                                    <PositionBadge
                                                        playerPosition={
                                                            player.position
                                                        }
                                                    />
                                                </div>
                                            </div>

                                            {/* Arrow */}
                                            <svg
                                                className="w-5 h-5 text-muted-foreground shrink-0"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M9 5l7 7-7 7"
                                                />
                                            </svg>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
