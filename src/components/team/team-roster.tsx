import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { PositionBadge } from "@/components/player/position-badge";
import type { Player, PlayerPosition } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Props for TeamRoster component
 */
interface TeamRosterProps {
    /** Array of players on the team */
    players: Player[];
    /** Additional CSS classes */
    className?: string;
}

/**
 * Group players by position
 */
function groupPlayersByPosition(
    players: Player[]
): Record<PlayerPosition, Player[]> {
    const groups: Record<PlayerPosition, Player[]> = {
        QB: [],
        RB: [],
        WR: [],
        TE: [],
    };

    for (const player of players) {
        if (groups[player.position]) {
            groups[player.position].push(player);
        }
    }

    return groups;
}

/**
 * Position display order
 */
const POSITION_ORDER: { position: PlayerPosition; label: string }[] = [
    { position: "QB", label: "Quarterbacks" },
    { position: "RB", label: "Running Backs" },
    { position: "WR", label: "Wide Receivers" },
    { position: "TE", label: "Tight Ends" },
];

/**
 * TeamRoster component
 *
 * Displays the full team roster grouped by position with:
 * - Position section headers
 * - Player cards with name and jersey number
 * - Links to player detail pages
 *
 * @example
 * ```tsx
 * <TeamRoster players={players} />
 * ```
 */
export function TeamRoster({ players, className }: TeamRosterProps) {
    const groupedPlayers = groupPlayersByPosition(players);

    if (players.length === 0) {
        return (
            <div
                className={cn(
                    "text-center py-12 text-muted-foreground",
                    className
                )}
            >
                <p>No roster data available for this team.</p>
            </div>
        );
    }

    return (
        <div className={cn("space-y-8", className)}>
            {POSITION_ORDER.map(({ position, label }) => {
                const positionPlayers = groupedPlayers[position];
                if (positionPlayers.length === 0) return null;

                return (
                    <section key={position}>
                        {/* Position header */}
                        <div className="flex items-center gap-3 mb-4">
                            <PositionBadge playerPosition={position} />
                            <h3 className="text-lg font-semibold">{label}</h3>
                            <span className="text-sm text-muted-foreground">
                                ({positionPlayers.length})
                            </span>
                        </div>

                        {/* Player cards grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {positionPlayers.map((player) => (
                                <PlayerCard key={player.id} player={player} />
                            ))}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}

/**
 * Individual player card component
 */
interface PlayerCardProps {
    player: Player;
}

function PlayerCard({ player }: PlayerCardProps) {
    return (
        <Link href={`/nfl/player/${player.id}`}>
            <Card className="group cursor-pointer transition-colors hover:bg-card/80">
                <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                        {/* Avatar placeholder */}
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 group-hover:bg-muted/80 transition-colors">
                            <span className="text-sm font-bold text-muted-foreground">
                                {player.name.charAt(0)}
                            </span>
                        </div>

                        {/* Player info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                                <span className="text-xs text-muted-foreground font-medium">
                                    #{player.jerseyNumber}
                                </span>
                                <span className="font-medium truncate group-hover:text-primary transition-colors">
                                    {player.name}
                                </span>
                            </div>
                        </div>

                        {/* Arrow indicator */}
                        <svg
                            className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0"
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
        </Link>
    );
}

/**
 * Skeleton loader for TeamRoster
 */
export function TeamRosterSkeleton() {
    return (
        <div className="space-y-8">
            {[1, 2, 3].map((section) => (
                <section key={section}>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-5 w-8 bg-muted rounded animate-pulse" />
                        <div className="h-6 w-32 bg-muted rounded animate-pulse" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {[1, 2, 3].map((card) => (
                            <Card key={card}>
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                                        <div className="flex-1">
                                            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}

