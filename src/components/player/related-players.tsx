"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getPlayersByTeam } from "@/lib/data";
import type { Player, NFLTeam } from "@/lib/types";
import { PositionBadge } from "./position-badge";

/**
 * Props for RelatedPlayers component
 */
interface RelatedPlayersProps {
    /** The team to fetch teammates from */
    team: NFLTeam;
    /** The current player's ID to exclude from results */
    currentPlayerId: string;
    /** Additional CSS classes */
    className?: string;
}

/**
 * RelatedPlayers component
 *
 * Displays a responsive grid of teammate cards.
 * Fetches players on the same team and renders them as compact,
 * clickable cards that link to their player pages.
 *
 * @example
 * ```tsx
 * <RelatedPlayers
 *   team="KC"
 *   currentPlayerId="player-123"
 *   className="mt-8"
 * />
 * ```
 */
export function RelatedPlayers({
    team,
    currentPlayerId,
    className,
}: RelatedPlayersProps) {
    const [teammates, setTeammates] = React.useState<Player[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    // Fetch teammates on mount
    React.useEffect(() => {
        async function fetchTeammates() {
            setIsLoading(true);
            try {
                const players = await getPlayersByTeam(
                    team,
                    currentPlayerId,
                    10
                );
                setTeammates(players);
            } catch (error) {
                console.error("Error fetching teammates:", error);
                setTeammates([]);
            } finally {
                setIsLoading(false);
            }
        }

        fetchTeammates();
    }, [team, currentPlayerId]);

    // Don't render section if no teammates found (after loading)
    if (!isLoading && teammates.length === 0) {
        return null;
    }

    return (
        <section className={cn("mt-8", className)}>
            <h2 className="text-lg font-semibold mb-4">
                Related Players
                <span className="text-muted-foreground font-normal ml-2">
                    {team} Teammates
                </span>
            </h2>

            {isLoading ? (
                // Loading skeleton grid
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <div
                            key={i}
                            className="h-24 bg-card rounded-lg animate-pulse"
                        />
                    ))}
                </div>
            ) : (
                // Teammates grid
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {teammates.map((player) => (
                        <TeammateCard key={player.id} player={player} />
                    ))}
                </div>
            )}
        </section>
    );
}

/**
 * Props for TeammateCard component
 */
interface TeammateCardProps {
    player: Player;
}

/**
 * Compact teammate card for the grid layout
 */
function TeammateCard({ player }: TeammateCardProps) {
    return (
        <Link href={`/nfl/player/${player.id}`}>
            <Card className="group cursor-pointer transition-colors hover:bg-card/80">
                <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 group-hover:bg-muted/80 transition-colors">
                            <span className="text-sm font-bold text-muted-foreground">
                                {player.name.charAt(0)}
                            </span>
                        </div>

                        {/* Player info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-1">
                                <span className="text-xs text-muted-foreground">
                                    #{player.jerseyNumber}
                                </span>
                            </div>
                            <div className="font-medium text-sm truncate">
                                {player.name.split(" ").pop()}
                            </div>
                            <PositionBadge playerPosition={player.position} />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}
