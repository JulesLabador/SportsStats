import type { Metadata } from "next";
import {
    PlayerContent,
    PlayerNotFound,
} from "@/components/player/player-content";
import {
    getPlayerWithStats,
    getAvailableSeasons,
    getPlayerById,
    getTeamSlug,
} from "@/lib/data";

/**
 * Page props with dynamic route params
 */
interface PlayerPageProps {
    params: Promise<{
        id: string;
    }>;
}

/**
 * Generate dynamic metadata for SEO based on player data
 *
 * This fetches basic player info to generate title and description
 * containing the player's name, team, and position.
 */
export async function generateMetadata({
    params,
}: PlayerPageProps): Promise<Metadata> {
    const { id } = await params;
    const player = await getPlayerById(id);

    // Return default metadata if player not found
    if (!player) {
        return {
            title: "Player Not Found | NFL Stats",
            description: "The requested player could not be found.",
        };
    }

    const title = `${player.name} Stats | ${player.team} ${player.position} | NFL Stats`;
    const description = `View ${player.name}'s NFL statistics, game logs, and performance trends. ${player.team} ${player.position} #${player.jerseyNumber}.`;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            type: "profile",
        },
        twitter: {
            card: "summary",
            title,
            description,
        },
    };
}

/**
 * Player profile page (Server Component)
 *
 * Displays:
 * - Player header with name, team, position, season selector
 * - Season stat summary with visual bars
 * - Game log table with heat-map coloring
 *
 * Data is fetched server-side for SEO, then passed to client
 * component for interactive season switching.
 */
export default async function PlayerPage({ params }: PlayerPageProps) {
    const { id: playerId } = await params;

    // Fetch available seasons for this player
    const availableSeasons = await getAvailableSeasons(playerId);

    // Use the most recent season as the initial season
    const initialSeason =
        availableSeasons.length > 0 ? availableSeasons[0] : 2024;

    // Fetch player data for the initial season
    const playerData = await getPlayerWithStats(playerId, initialSeason);

    // If player not found, show not found state
    if (!playerData) {
        return (
            <main className="min-h-screen">
                <PlayerNotFound />
            </main>
        );
    }

    // Fetch team slug for the player's current team
    const teamSlug = await getTeamSlug(playerData.team);

    return (
        <main className="min-h-screen pb-16">
            <PlayerContent
                initialData={playerData}
                availableSeasons={availableSeasons}
                initialSeason={initialSeason}
                teamSlug={teamSlug}
            />
        </main>
    );
}
