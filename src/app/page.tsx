"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/search/search-input";
import { useSearchStore } from "@/stores/search-store";
import { searchPlayers, getFeaturedPlayers } from "@/lib/mock-data";
import type { Player } from "@/lib/types";

/**
 * Home page component
 *
 * Features:
 * - Player search with type-ahead
 * - Featured players grid
 * - Recent searches (from Zustand store)
 */
export default function HomePage() {
    const router = useRouter();
    const query = useSearchStore((state) => state.query);
    const [searchResults, setSearchResults] = React.useState<Player[]>([]);
    const featuredPlayers = React.useMemo(() => getFeaturedPlayers(), []);

    // Update search results when query changes
    React.useEffect(() => {
        if (query.trim()) {
            const results = searchPlayers(query);
            setSearchResults(results);
        } else {
            setSearchResults([]);
        }
    }, [query]);

    /**
     * Handle player selection - navigate to player page
     */
    const handleSelectPlayer = (player: Player) => {
        router.push(`/player/${player.id}`);
    };

    return (
        <main className="min-h-screen">
            {/* Hero section with search */}
            <section className="relative">
                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-stat-neutral/5 to-transparent pointer-events-none" />

                <div className="relative max-w-3xl mx-auto px-4 pt-16 pb-12 sm:pt-24 sm:pb-16">
                    {/* Logo/Title */}
                    <div className="text-center mb-8">
                        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3">
                            NFL Stats
                        </h1>
                        <p className="text-lg text-muted-foreground max-w-md mx-auto">
                            Fast, visual player statistics for smarter betting
                            decisions
                        </p>
                    </div>

                    {/* Search input */}
                    <SearchInput
                        onSelectPlayer={handleSelectPlayer}
                        searchResults={searchResults}
                        className="max-w-xl mx-auto"
                    />
                </div>
            </section>

            {/* Featured players section */}
            <section className="max-w-5xl mx-auto px-4 pb-16">
                <div className="mb-6">
                    <h2 className="text-lg font-semibold text-muted-foreground">
                        Popular Players
                    </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {featuredPlayers.map((player) => (
                        <PlayerCard
                            key={player.id}
                            player={player}
                            onClick={() => handleSelectPlayer(player)}
                        />
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-border py-8">
                <div className="max-w-5xl mx-auto px-4 text-center text-sm text-muted-foreground">
                    <p>
                        Data for informational purposes only. Not financial
                        advice.
                    </p>
                </div>
            </footer>
        </main>
    );
}

/**
 * Player card component for featured players grid
 */
interface PlayerCardProps {
    player: Player;
    onClick: () => void;
}

function PlayerCard({ player, onClick }: PlayerCardProps) {
    return (
        <Card
            className="group cursor-pointer transition-colors hover:bg-card/80"
            onClick={onClick}
        >
            <CardContent className="p-4">
                <div className="flex items-center gap-4">
                    {/* Avatar placeholder */}
                    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center shrink-0 group-hover:bg-muted/80 transition-colors">
                        <span className="text-xl font-bold text-muted-foreground">
                            {player.name.charAt(0)}
                        </span>
                    </div>

                    {/* Player info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                            <span className="text-sm text-muted-foreground font-medium">
                                #{player.jerseyNumber}
                            </span>
                            <h3 className="font-semibold truncate">
                                {player.name}
                            </h3>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                                {player.team}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                                {player.position}
                            </Badge>
                        </div>
                    </div>

                    {/* Arrow indicator */}
                    <svg
                        className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0"
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
                </div>
            </CardContent>
        </Card>
    );
}
