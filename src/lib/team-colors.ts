import type { NFLTeam } from "@/lib/types";

/**
 * NFL team colors for badge styling
 * Using muted versions to maintain dark theme aesthetic
 */
export const teamColors: Partial<Record<NFLTeam, string>> = {
    ARI: "bg-red-900/30 text-red-400",
    ATL: "bg-red-900/30 text-red-400",
    BAL: "bg-purple-900/30 text-purple-400",
    BUF: "bg-blue-900/30 text-blue-400",
    CAR: "bg-cyan-900/30 text-cyan-400",
    CHI: "bg-orange-900/30 text-orange-400",
    CIN: "bg-orange-900/30 text-orange-400",
    CLE: "bg-orange-900/30 text-orange-400",
    DAL: "bg-blue-900/30 text-blue-400",
    DEN: "bg-orange-900/30 text-orange-400",
    DET: "bg-blue-900/30 text-blue-400",
    GB: "bg-green-900/30 text-green-400",
    HOU: "bg-red-900/30 text-red-400",
    IND: "bg-blue-900/30 text-blue-400",
    JAX: "bg-teal-900/30 text-teal-400",
    KC: "bg-red-900/30 text-red-400",
    LAC: "bg-yellow-900/30 text-yellow-400",
    LAR: "bg-blue-900/30 text-blue-400",
    LV: "bg-gray-800/50 text-gray-300",
    MIA: "bg-teal-900/30 text-teal-400",
    MIN: "bg-purple-900/30 text-purple-400",
    NE: "bg-blue-900/30 text-blue-400",
    NO: "bg-yellow-900/30 text-yellow-400",
    NYG: "bg-blue-900/30 text-blue-400",
    NYJ: "bg-green-900/30 text-green-400",
    PHI: "bg-green-900/30 text-green-400",
    PIT: "bg-yellow-900/30 text-yellow-400",
    SEA: "bg-green-900/30 text-green-400",
    SF: "bg-red-900/30 text-red-400",
    TB: "bg-red-900/30 text-red-400",
    TEN: "bg-blue-900/30 text-blue-400",
    WAS: "bg-red-900/30 text-red-400",
};

/**
 * Position badge colors
 */
export const positionColors: Record<string, string> = {
    QB: "bg-stat-neutral/20 text-stat-neutral",
    RB: "bg-stat-positive/20 text-stat-positive",
    WR: "bg-stat-growth/20 text-stat-growth",
    TE: "bg-purple-900/30 text-purple-400",
};

/**
 * Default color for unknown teams/positions
 */
export const defaultBadgeColor = "bg-muted text-muted-foreground";

/**
 * Get the color class for a team badge
 */
export function getTeamColor(team: NFLTeam): string {
    return teamColors[team] || defaultBadgeColor;
}

/**
 * Get the color class for a position badge
 */
export function getPositionColor(position: string): string {
    return positionColors[position] || defaultBadgeColor;
}



