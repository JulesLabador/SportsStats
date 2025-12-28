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
 * Player with aggregated season stats for roster display
 * Used for sorting players by performance on matchup pages
 */
export interface PlayerWithSeasonStats extends Player {
    /** Total passing yards (QB) */
    passingYards: number;
    /** Total passing touchdowns (QB) */
    passingTDs: number;
    /** Total rushing yards (RB, QB) */
    rushingYards: number;
    /** Total rushing touchdowns (RB, QB) */
    rushingTDs: number;
    /** Total receiving yards (WR, TE, RB) */
    receivingYards: number;
    /** Total receiving touchdowns (WR, TE, RB) */
    receivingTDs: number;
    /** Total receptions (WR, TE, RB) */
    receptions: number;
    /** Games played this season */
    gamesPlayed: number;
    /** Calculated performance score for sorting */
    performanceScore: number;
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

// ============================================================================
// GAME & MATCHUP TYPES
// ============================================================================

/** Game status for NFL games */
export type GameStatus = "scheduled" | "in_progress" | "final";

/**
 * NFL game/matchup information
 * Used for upcoming matches and matchup detail pages
 */
export interface NFLGame {
    /** Internal database ID */
    id: string;
    /** ESPN's game identifier */
    espnGameId: string;
    /** Season year */
    season: number;
    /** Week number (1-18 regular, 19-22 playoffs) */
    week: number;
    /** Home team abbreviation */
    homeTeam: NFLTeam;
    /** Away team abbreviation */
    awayTeam: NFLTeam;
    /** Home team score (null for upcoming games) */
    homeScore: number | null;
    /** Away team score (null for upcoming games) */
    awayScore: number | null;
    /** Game date and time (ISO string) */
    gameDate: string;
    /** Venue information */
    venue?: {
        name: string;
        city: string;
        state: string;
    };
    /** Game status */
    status: GameStatus;
}

/**
 * Team win/loss/tie record
 */
export interface TeamRecord {
    wins: number;
    losses: number;
    ties: number;
}

/**
 * Full team information including roster and record
 * Used for team detail pages
 */
export interface TeamInfo {
    /** Team abbreviation (e.g., "KC", "SF") */
    abbreviation: NFLTeam;
    /** Full team name (e.g., "Kansas City Chiefs") */
    name: string;
    /** Current season record */
    record: TeamRecord;
    /** Team roster (active players) */
    players: Player[];
}

/**
 * NFL team full names mapping
 */
export const NFL_TEAM_NAMES: Record<NFLTeam, string> = {
    ARI: "Arizona Cardinals",
    ATL: "Atlanta Falcons",
    BAL: "Baltimore Ravens",
    BUF: "Buffalo Bills",
    CAR: "Carolina Panthers",
    CHI: "Chicago Bears",
    CIN: "Cincinnati Bengals",
    CLE: "Cleveland Browns",
    DAL: "Dallas Cowboys",
    DEN: "Denver Broncos",
    DET: "Detroit Lions",
    GB: "Green Bay Packers",
    HOU: "Houston Texans",
    IND: "Indianapolis Colts",
    JAX: "Jacksonville Jaguars",
    KC: "Kansas City Chiefs",
    LAC: "Los Angeles Chargers",
    LAR: "Los Angeles Rams",
    LV: "Las Vegas Raiders",
    MIA: "Miami Dolphins",
    MIN: "Minnesota Vikings",
    NE: "New England Patriots",
    NO: "New Orleans Saints",
    NYG: "New York Giants",
    NYJ: "New York Jets",
    PHI: "Philadelphia Eagles",
    PIT: "Pittsburgh Steelers",
    SEA: "Seattle Seahawks",
    SF: "San Francisco 49ers",
    TB: "Tampa Bay Buccaneers",
    TEN: "Tennessee Titans",
    WAS: "Washington Commanders",
};

/**
 * Get the full name for an NFL team
 * @param team - Team abbreviation
 * @returns Full team name
 */
export function getTeamFullName(team: NFLTeam): string {
    return NFL_TEAM_NAMES[team] ?? team;
}

// ============================================================================
// HEAD-TO-HEAD MATCHUP TYPES
// ============================================================================

/**
 * Historical game data for head-to-head matchups
 * Represents a completed game between two teams
 */
export interface HistoricalGame {
    /** Internal database ID */
    id: string;
    /** Season year */
    season: number;
    /** Week number */
    week: number;
    /** Game date (ISO string) */
    gameDate: string;
    /** Home team abbreviation */
    homeTeam: NFLTeam;
    /** Away team abbreviation */
    awayTeam: NFLTeam;
    /** Home team final score */
    homeScore: number;
    /** Away team final score */
    awayScore: number;
    /** Venue name (optional) */
    venue?: string;
}

/**
 * Head-to-head matchup statistics between two teams
 * Contains aggregate stats and game history
 */
export interface HeadToHeadStats {
    /** First team (typically away team in current matchup) */
    team1: NFLTeam;
    /** Second team (typically home team in current matchup) */
    team2: NFLTeam;
    /** Total games played between teams */
    totalGames: number;
    /** Number of wins for team1 */
    team1Wins: number;
    /** Number of wins for team2 */
    team2Wins: number;
    /** Number of ties */
    ties: number;
    /** Total points scored by team1 across all games */
    team1TotalPoints: number;
    /** Total points scored by team2 across all games */
    team2TotalPoints: number;
    /** Average points per game for team1 */
    team1AvgPoints: number;
    /** Average points per game for team2 */
    team2AvgPoints: number;
    /** Highest score by team1 in a single game */
    team1HighestScore: number;
    /** Highest score by team2 in a single game */
    team2HighestScore: number;
    /** Lowest score by team1 in a single game */
    team1LowestScore: number;
    /** Lowest score by team2 in a single game */
    team2LowestScore: number;
    /** Team1&apos;s record when playing at home against team2 */
    team1HomeRecord: TeamRecord;
    /** Team1&apos;s record when playing away against team2 */
    team1AwayRecord: TeamRecord;
    /** Current winning streak information */
    currentStreak: {
        /** Team with the streak, null if no streak */
        team: NFLTeam | null;
        /** Number of consecutive wins */
        count: number;
    };
    /** Biggest margin of victory in the series */
    biggestMarginOfVictory: {
        /** Team that won by the biggest margin */
        team: NFLTeam;
        /** Point differential */
        margin: number;
        /** The game where this occurred */
        game: HistoricalGame;
    } | null;
    /** List of all historical games, sorted by date descending */
    games: HistoricalGame[];
}
