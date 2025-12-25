import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchWrapper } from "@/components/search/search-wrapper";
import { getFeaturedPlayers } from "@/lib/data";
import { getTeamColor, getPositionColor } from "@/lib/team-colors";
import { cn } from "@/lib/utils";
import type { Player } from "@/lib/types";

/**
 * SEO metadata for the home page
 */
export const metadata: Metadata = {
    title: "NFL Stats | Player Statistics for Smarter Betting",
    description:
        "Search NFL player statistics, analyze performance trends, and make data-driven betting decisions. Fast, visual stats for QBs, RBs, WRs, and TEs.",
    keywords: [
        "NFL",
        "stats",
        "betting",
        "player statistics",
        "football",
        "fantasy football",
    ],
    openGraph: {
        title: "NFL Stats | Player Statistics for Smarter Betting",
        description:
            "Search NFL player statistics, analyze performance trends, and make data-driven betting decisions.",
        type: "website",
    },
};

/**
 * Home page component (Server Component)
 *
 * Features:
 * - Server-side data fetching for featured players (SEO-friendly)
 * - Client-side search via SearchWrapper component
 * - Static hero section and footer
 */
export default async function HomePage() {
    // Fetch featured players server-side for SEO
    const featuredPlayers = await getFeaturedPlayers();

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

                    {/* Search input (client component) */}
                    <SearchWrapper className="max-w-xl mx-auto" />
                </div>
            </section>

            {/* Featured players section */}
            <section className="max-w-5xl mx-auto px-4 pb-16">
                <div className="mb-6">
                    <h2 className="text-lg font-semibold text-muted-foreground">
                        Popular Players
                    </h2>
                </div>

                {featuredPlayers.length === 0 ? (
                    // Empty state
                    <div className="text-center py-12 text-muted-foreground">
                        <p>
                            No players found. Run the ETL pipeline to populate
                            the database.
                        </p>
                    </div>
                ) : (
                    // Player grid
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {featuredPlayers.map((player) => (
                            <PlayerCard key={player.id} player={player} />
                        ))}
                    </div>
                )}
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
 *
 * This is a pure component (no hooks) that renders a clickable card
 * linking to the player's detail page.
 */
interface PlayerCardProps {
    player: Player;
}

function PlayerCard({ player }: PlayerCardProps) {
    // Get team and position colors for badges
    const teamColor = getTeamColor(player.team);
    const positionColor = getPositionColor(player.position);

    return (
        <a href={`/player/${player.id}`}>
            <Card className="group cursor-pointer transition-colors hover:bg-card/80">
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
                                <Badge
                                    variant="secondary"
                                    className={cn(
                                        "text-xs font-semibold",
                                        teamColor
                                    )}
                                >
                                    {player.team}
                                </Badge>
                                <Badge
                                    variant="secondary"
                                    className={cn(
                                        "text-xs font-semibold",
                                        positionColor
                                    )}
                                >
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
        </a>
    );
}
