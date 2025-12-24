/**
 * Core TypeScript interfaces for NFL player statistics
 * These types are used throughout the application for type safety
 */

/** NFL team abbreviations */
export type NFLTeam =
    | "ARI"
    | "ATL"
    | "BAL"
    | "BUF"
    | "CAR"
    | "CHI"
    | "CIN"
    | "CLE"
    | "DAL"
    | "DEN"
    | "DET"
    | "GB"
    | "HOU"
    | "IND"
    | "JAX"
    | "KC"
    | "LAC"
    | "LAR"
    | "LV"
    | "MIA"
    | "MIN"
    | "NE"
    | "NO"
    | "NYG"
    | "NYJ"
    | "PHI"
    | "PIT"
    | "SEA"
    | "SF"
    | "TB"
    | "TEN"
    | "WAS";

/** Player positions relevant for betting stats */
export type PlayerPosition = "QB" | "RB" | "WR" | "TE";

/**
 * Core player information
 */
export interface Player {
    id: string;
    name: string;
    team: NFLTeam;
    position: PlayerPosition;
    jerseyNumber: number;
    /** URL to player headshot image */
    imageUrl?: string;
}

/**
 * Quarterback-specific statistics
 */
export interface QBStats {
    passingYards: number;
    passingTDs: number;
    interceptions: number;
    completions: number;
    attempts: number;
    rushingYards: number;
    rushingTDs: number;
}

/**
 * Running back-specific statistics
 */
export interface RBStats {
    rushingYards: number;
    rushingTDs: number;
    carries: number;
    receivingYards: number;
    receivingTDs: number;
    receptions: number;
    targets: number;
}

/**
 * Wide receiver-specific statistics
 */
export interface WRStats {
    receivingYards: number;
    receivingTDs: number;
    receptions: number;
    targets: number;
    rushingYards: number;
    rushingTDs: number;
}

/**
 * Tight end-specific statistics
 */
export interface TEStats {
    receivingYards: number;
    receivingTDs: number;
    receptions: number;
    targets: number;
}

/** Union type for all position-specific stats */
export type PositionStats = QBStats | RBStats | WRStats | TEStats;

/**
 * Weekly game statistics for a player
 */
export interface WeeklyStat {
    week: number;
    season: number;
    opponent: NFLTeam;
    /** Home (H) or Away (A) */
    location: "H" | "A";
    /** Final score: "W 24-17" or "L 14-21" */
    result: string;
    stats: PositionStats;
}

/**
 * Season summary statistics
 */
export interface SeasonSummary {
    season: number;
    gamesPlayed: number;
    totalStats: PositionStats;
    averageStats: PositionStats;
}

/**
 * Complete player data with all statistics
 */
export interface PlayerWithStats extends Player {
    weeklyStats: WeeklyStat[];
    seasonSummary: SeasonSummary;
}

/**
 * Search result item for player search
 */
export interface PlayerSearchResult {
    id: string;
    name: string;
    team: NFLTeam;
    position: PlayerPosition;
}

/**
 * Performance indicator for stat visualization
 * Determines color coding based on performance relative to average
 */
export type PerformanceLevel = "above" | "average" | "below";

/**
 * Helper function to determine performance level
 * @param value - The stat value to evaluate
 * @param average - The average value to compare against
 * @param threshold - Percentage threshold for above/below (default 10%)
 */
export function getPerformanceLevel(
    value: number,
    average: number,
    threshold: number = 0.1
): PerformanceLevel {
    const percentDiff = (value - average) / average;
    if (percentDiff > threshold) return "above";
    if (percentDiff < -threshold) return "below";
    return "average";
}

/**
 * Type guard to check if stats are QB stats
 */
export function isQBStats(stats: PositionStats): stats is QBStats {
    return "passingYards" in stats && "passingTDs" in stats;
}

/**
 * Type guard to check if stats are RB stats
 */
export function isRBStats(stats: PositionStats): stats is RBStats {
    return (
        "rushingYards" in stats &&
        "carries" in stats &&
        !("passingYards" in stats)
    );
}

/**
 * Type guard to check if stats are WR stats
 */
export function isWRStats(stats: PositionStats): stats is WRStats {
    return (
        "receivingYards" in stats &&
        "targets" in stats &&
        "rushingYards" in stats
    );
}

/**
 * Type guard to check if stats are TE stats
 */
export function isTEStats(stats: PositionStats): stats is TEStats {
    return (
        "receivingYards" in stats &&
        "targets" in stats &&
        !("rushingYards" in stats)
    );
}
