import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SearchWrapper } from "@/components/search/search-wrapper";
import { TeamHeader } from "@/components/team/team-header";
import { TeamRoster } from "@/components/team/team-roster";
import { TeamSchedule } from "@/components/team/team-schedule";
import {
    getTeamInfo,
    getTeamRecentResults,
    getTeamUpcomingGames,
} from "@/lib/data";
import { NFL_TEAM_NAMES, type NFLTeam } from "@/lib/types";

/**
 * Page props with dynamic route params
 */
interface TeamPageProps {
    params: Promise<{
        team: string;
    }>;
}

/**
 * Validate that a string is a valid NFL team abbreviation
 */
function isValidTeam(team: string): team is NFLTeam {
    return team in NFL_TEAM_NAMES;
}

/**
 * Generate dynamic metadata for SEO based on team data
 */
export async function generateMetadata({
    params,
}: TeamPageProps): Promise<Metadata> {
    const { team } = await params;

    // Validate team
    if (!isValidTeam(team)) {
        return {
            title: "Team Not Found | NFL Stats",
            description: "The requested team could not be found.",
        };
    }

    const teamName = NFL_TEAM_NAMES[team];
    const title = `${teamName} | NFL Stats`;
    const description = `View the ${teamName} roster, schedule, and player statistics. See upcoming games and recent results.`;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            type: "website",
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
 */
export default async function TeamPage({ params }: TeamPageProps) {
    const { team: teamAbbr } = await params;

    // Validate team abbreviation
    if (!isValidTeam(teamAbbr)) {
        notFound();
    }

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

                {/* Back button */}
                <Link href="/">
                    <Button
                        variant="secondary"
                        size="sm"
                        className="mb-6 hover:cursor-pointer"
                    >
                        <svg
                            className="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 19l-7-7 7-7"
                            />
                        </svg>
                        Back
                    </Button>
                </Link>

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

