import { Badge } from "@/components/ui/badge";
import { TeamBadge } from "@/components/player/team-badge";
import type { TeamInfo, NFLTeam } from "@/lib/types";
import { getTeamColor } from "@/lib/team-colors";
import { cn } from "@/lib/utils";

/**
 * Props for TeamHeader component
 */
interface TeamHeaderProps {
    /** Team information including record */
    teamInfo: TeamInfo;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Format team record for display
 *
 * @param record - Team win/loss/tie record
 * @returns Formatted record string (e.g., "10-5-0")
 */
function formatRecord(record: TeamInfo["record"]): string {
    return `${record.wins}-${record.losses}${record.ties > 0 ? `-${record.ties}` : ""}`;
}

/**
 * TeamHeader component
 *
 * Displays the header for a team page with:
 * - Team badge/logo placeholder
 * - Full team name
 * - Win/loss/tie record
 * - Team color accent
 *
 * @example
 * ```tsx
 * <TeamHeader teamInfo={teamInfo} />
 * ```
 */
export function TeamHeader({ teamInfo, className }: TeamHeaderProps) {
    const teamColorClass = getTeamColor(teamInfo.abbreviation);

    return (
        <div className={cn("text-center", className)}>
            {/* Team badge - large */}
            <div className="mb-4">
                <div
                    className={cn(
                        "inline-flex items-center justify-center w-24 h-24 rounded-full text-4xl font-bold",
                        teamColorClass
                    )}
                >
                    {teamInfo.abbreviation}
                </div>
            </div>

            {/* Team name */}
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">
                {teamInfo.name}
            </h1>

            {/* Record */}
            <div className="flex items-center justify-center gap-3">
                <Badge variant="secondary" className="text-sm">
                    {formatRecord(teamInfo.record)}
                </Badge>
                <span className="text-sm text-muted-foreground">
                    {teamInfo.players.length} Players
                </span>
            </div>
        </div>
    );
}

/**
 * Skeleton loader for TeamHeader
 */
export function TeamHeaderSkeleton() {
    return (
        <div className="text-center">
            <div className="mb-4">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-muted animate-pulse" />
            </div>
            <div className="h-10 w-64 mx-auto bg-muted rounded animate-pulse mb-2" />
            <div className="flex items-center justify-center gap-3">
                <div className="h-6 w-16 bg-muted rounded animate-pulse" />
                <div className="h-4 w-20 bg-muted rounded animate-pulse" />
            </div>
        </div>
    );
}

