import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";
import { getTeamColor } from "@/lib/team-colors";
import { NFLTeam } from "@/lib/types";

/**
 * Props for TeamBadge component
 */
interface TeamBadgeProps {
    /** NFL team abbreviation */
    team: NFLTeam;
    /** Whether the badge should link to the team page (default: false) */
    linkToTeam?: boolean;
    /** Additional CSS classes */
    className?: string;
}

/**
 * TeamBadge component
 *
 * Displays a colored badge with the team abbreviation.
 * Optionally links to the team&apos;s detail page.
 *
 * @example
 * ```tsx
 * // Non-clickable badge
 * <TeamBadge team="KC" />
 *
 * // Clickable badge linking to team page
 * <TeamBadge team="KC" linkToTeam />
 * ```
 */
export function TeamBadge({
    team,
    linkToTeam = false,
    className,
}: TeamBadgeProps) {
    const teamColor = getTeamColor(team);

    const badge = (
        <Badge
            variant="secondary"
            className={cn(
                "text-xs font-semibold",
                teamColor,
                linkToTeam && "hover:opacity-80 transition-opacity cursor-pointer",
                className
            )}
        >
            {team}
        </Badge>
    );

    if (linkToTeam) {
        return (
            <Link href={`/nfl/team/${team}`} onClick={(e) => e.stopPropagation()}>
                {badge}
            </Link>
        );
    }

    return badge;
}
