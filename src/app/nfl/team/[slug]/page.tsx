import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/ui/back-button";
import { SearchWrapper } from "@/components/search/search-wrapper";
import { TeamHeader } from "@/components/team/team-header";
import { TeamRoster } from "@/components/team/team-roster";
import { TeamSchedule } from "@/components/team/team-schedule";
import {
    getTeamInfo,
    getTeamRecentResults,
    getTeamUpcomingGames,
    getTeamBySlug,
    getAllTeamSlugs,
} from "@/lib/data";
import type { NFLTeam } from "@/lib/types";

/**
 * Page props with dynamic route params
 * Uses slug format (e.g., "kansas-city-chiefs") instead of abbreviation
 */
interface TeamPageProps {
    params: Promise<{
        slug: string;
    }>;
}

/**
 * Generate static params for all NFL teams
 * Enables static generation of all team pages at build time
 */
export async function generateStaticParams() {
    // Fetch all team slugs from the database
    const slugs = await getAllTeamSlugs();
    return slugs.map((slug) => ({ slug }));
}

/**
 * Generate dynamic metadata for SEO based on team data
 */
export async function generateMetadata({
    params,
}: TeamPageProps): Promise<Metadata> {
    const { slug } = await params;

    // Resolve slug to team data from database
    const team = await getTeamBySlug(slug);

    // Return 404 metadata if team not found
    if (!team) {
        return {
            title: "Team Not Found | NFL Stats",
            description: "The requested team could not be found.",
        };
    }

    const title = `${team.name} | NFL Stats`;
    const description = `View the ${team.name} roster, schedule, and player statistics. See upcoming games and recent results.`;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            type: "website",
        },
        alternates: {
            canonical: `/nfl/team/${slug}`,
        },
    };
}

/**
 * Team page (Server Component)
 *
 * Displays:
 * - Team header with name, record, and logo placeholder
 * - Team roster grouped by position
 * - Recent results and upcoming games
 *
 * URL format: /nfl/team/[slug] (e.g., /nfl/team/kansas-city-chiefs)
 */
export default async function TeamPage({ params }: TeamPageProps) {
    const { slug } = await params;

    // Resolve slug to team data from database
    const team = await getTeamBySlug(slug);

    // If slug doesn&apos;t match any team, show 404
    if (!team) {
        notFound();
    }

    const teamAbbr = team.abbreviation as NFLTeam;

    // Fetch all team data in parallel
    const [teamInfo, recentGames, upcomingGames] = await Promise.all([
        getTeamInfo(teamAbbr),
        getTeamRecentResults(teamAbbr, 5),
        getTeamUpcomingGames(teamAbbr, 3),
    ]);

    // If team info not found, show 404
    if (!teamInfo) {
        notFound();
    }

    return (
        <main className="min-h-screen pb-16">
            <div className="max-w-5xl mx-auto px-4 py-6">
                {/* Search bar for quick navigation */}
                <SearchWrapper className="mb-6" />

                {/* Back button - uses browser history for proper navigation */}
                <BackButton className="mb-6" />

                {/* Team header */}
                <TeamHeader teamInfo={teamInfo} className="mb-10" />

                {/* Schedule section */}
                <section className="mb-10">
                    <h2 className="text-lg font-semibold mb-6">Schedule</h2>
                    <TeamSchedule
                        team={teamAbbr}
                        recentGames={recentGames}
                        upcomingGames={upcomingGames}
                    />
                </section>

                {/* Roster section */}
                <section>
                    <h2 className="text-lg font-semibold mb-6">Roster</h2>
                    <TeamRoster players={teamInfo.players} />
                </section>
            </div>
        </main>
    );
}

