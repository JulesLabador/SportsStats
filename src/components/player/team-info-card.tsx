import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getTeamColor } from "@/lib/team-colors";
import { NFL_TEAM_NAMES, type NFLTeam } from "@/lib/types";

/**
 * Props for TeamInfoCard component
 */
interface TeamInfoCardProps {
    /** NFL team abbreviation */
    team: NFLTeam;
    /** URL slug for the team page */
    teamSlug: string;
    /** Additional CSS classes */
    className?: string;
}

/**
 * TeamInfoCard component
 *
 * A clickable card that displays team information and navigates to the team page.
 * Features:
 * - Team-colored left border accent
 * - Team abbreviation badge with team colors
 * - Full team name
 * - Chevron icon indicating navigation
 * - Hover state with subtle lift effect
 *
 * @example
 * ```tsx
 * <TeamInfoCard team="KC" className="mb-6" />
 * ```
 */
export function TeamInfoCard({ team, teamSlug, className }: TeamInfoCardProps) {
    const teamColor = getTeamColor(team);
    const teamName = NFL_TEAM_NAMES[team] ?? team;

    // Extract the accent color for the left border from teamColor
    // teamColor format is "bg-{color}-900/30 text-{color}-400"
    // We use the text color as the border accent (more vibrant)
    const accentColorClass = teamColor
        .split(" ")
        .find((c) => c.startsWith("text-"))
        ?.replace("text-", "bg-");

    return (
        <Link href={`/nfl/team/${teamSlug}`} className={cn("block group", className)}>
            <Card
                className={cn(
                    "relative overflow-hidden transition-all duration-200",
                    "hover:translate-y-[-2px] hover:shadow-lg",
                    "cursor-pointer"
                )}
            >
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                        {/* Team abbreviation badge */}
                        <Badge
                            variant="secondary"
                            className={cn(
                                "text-sm font-bold px-2.5 py-1",
                                teamColor
                            )}
                        >
                            {team}
                        </Badge>

                        {/* Full team name */}
                        <span className="font-medium text-foreground group-hover:text-foreground/90 transition-colors">
                            {teamName}
                        </span>
                    </div>

                    {/* Navigation indicator */}
                    <ChevronRight
                        className="h-5 w-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
                        aria-hidden="true"
                    />
                </div>

                {/* Team-colored accent bar on the left */}
                <div
                    className={cn(
                        "absolute left-0 top-0 bottom-0 w-1",
                        accentColorClass ?? "bg-primary"
                    )}
                    aria-hidden="true"
                />
            </Card>
        </Link>
    );
}
