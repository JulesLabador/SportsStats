/**
 * Data Access Layer for NFL Player Statistics
 *
 * Provides functions to fetch player data from Supabase database.
 * Transforms database records into application types.
 */

import { createServerClient } from "./supabase";
import type {
    Player,
    PlayerWithStats,
    WeeklyStat,
    SeasonSummary,
    PositionStats,
    PlayerPosition,
    NFLTeam,
    QBStats,
    RBStats,
    WRStats,
    TEStats,
    NFLGame,
    GameStatus,
    TeamInfo,
    TeamRecord,
    HeadToHeadStats,
    HistoricalGame,
} from "./types";
import { NFL_TEAM_NAMES } from "./types";
import type {
    NFLWeeklyStatsWithPlayer,
    NFLPlayerSeasonDetails,
    NFLGameRow,
} from "./database.types";

/**
 * Search players by name, team, or position
 * @param query - Search query string
 * @returns Array of matching players (deduplicated by player_id)
 */
export async function searchPlayers(query: string): Promise<Player[]> {
    if (!query.trim()) return [];

    const supabase = createServerClient();
    const normalizedQuery = query.toLowerCase().trim();

    // Query the nfl_player_season_details view for current season players
    // Order by season desc to get most recent season first for deduplication
    const { data, error } = await supabase
        .from("nfl_player_season_details")
        .select("*")
        .or(
            `name.ilike.%${normalizedQuery}%,team.ilike.%${normalizedQuery}%,position.ilike.%${normalizedQuery}%`
        )
        .eq("is_active", true)
        .order("season", { ascending: false })
        .order("name")
        .limit(50); // Fetch more to account for duplicates before deduplication

    if (error) {
        console.error("Error searching players:", error);
        return [];
    }

    // Deduplicate by player_id, keeping the first occurrence (most recent season)
    const seenIds = new Set<string>();
    const uniqueData = (data || []).filter((record) => {
        const playerId = record.player_id;
        if (!playerId || seenIds.has(playerId)) {
            return false;
        }
        seenIds.add(playerId);
        return true;
    });

    // Transform database records to Player type and limit to 20 results
    return uniqueData.slice(0, 20).map(transformToPlayer);
}

/**
 * Get featured/popular players for the home page
 * Returns active players from the current season
 * @returns Array of featured players
 */
export async function getFeaturedPlayers(): Promise<Player[]> {
    const supabase = createServerClient();
    const currentSeason = 2024;

    // Get a sample of active players from the current season
    // Filter by season to avoid duplicate player_ids across seasons
    // Filter out placeholder records (name = " Team" or similar invalid names)
    const { data, error } = await supabase
        .from("nfl_player_season_details")
        .select("*")
        .eq("is_active", true)
        .eq("season", currentSeason)
        .not("name", "ilike", "% Team")
        .not("name", "eq", "")
        .order("name")
        .limit(6);

    if (error) {
        console.error("Error fetching featured players:", error);
        return [];
    }

    return (data || []).map(transformToPlayer);
}

/**
 * Get available seasons for a player
 * @param playerId - The player's ID
 * @returns Array of available season years
 */
export async function getAvailableSeasons(playerId: string): Promise<number[]> {
    const supabase = createServerClient();

    const { data, error } = await supabase
        .from("nfl_player_season_details")
        .select("season")
        .eq("player_id", playerId)
        .order("season", { ascending: false });

    if (error) {
        console.error("Error fetching available seasons:", error);
        return [2024]; // Default fallback
    }

    // Extract unique seasons
    const seasons = [
        ...new Set((data || []).map((d) => d.season).filter(Boolean)),
    ] as number[];
    return seasons.length > 0 ? seasons : [2024];
}

/**
 * Get complete player data with statistics for a specific season
 * @param playerId - The player's ID
 * @param season - The season year (defaults to 2024)
 * @returns Player data with weekly stats and season summary, or undefined if not found
 */
export async function getPlayerWithStats(
    playerId: string,
    season: number = 2024
): Promise<PlayerWithStats | undefined> {
    const supabase = createServerClient();

    // First, get the player's season details
    const { data: playerData, error: playerError } = await supabase
        .from("nfl_player_season_details")
        .select("*")
        .eq("player_id", playerId)
        .eq("season", season)
        .single();

    if (playerError || !playerData) {
        console.error("Error fetching player:", playerError);
        return undefined;
    }

    // Get weekly stats for this player and season
    const { data: weeklyData, error: weeklyError } = await supabase
        .from("nfl_weekly_stats_with_player")
        .select("*")
        .eq("player_id", playerId)
        .eq("season", season)
        .order("week", { ascending: true });

    if (weeklyError) {
        console.error("Error fetching weekly stats:", weeklyError);
        return undefined;
    }

    // Transform to application types
    const player = transformToPlayer(playerData);
    const position = playerData.position as PlayerPosition;
    const weeklyStats = (weeklyData || []).map((w) =>
        transformToWeeklyStat(w, position, season)
    );
    const seasonSummary = calculateSeasonSummary(weeklyStats, season);

    return {
        ...player,
        weeklyStats,
        seasonSummary,
    };
}

/**
 * Get a single player by ID (basic info only)
 * Returns the most recent season's data for the player.
 * @param playerId - The player's ID
 * @returns Player or undefined if not found
 */
export async function getPlayerById(
    playerId: string
): Promise<Player | undefined> {
    const supabase = createServerClient();

    // Query without .single() since a player can have multiple seasons
    // Order by season desc to get the most recent data first
    const { data, error } = await supabase
        .from("nfl_player_season_details")
        .select("*")
        .eq("player_id", playerId)
        .order("season", { ascending: false })
        .limit(1);

    if (error) {
        console.error("Error fetching player by ID:", error);
        return undefined;
    }

    // Return undefined if no data found
    if (!data || data.length === 0) {
        return undefined;
    }

    return transformToPlayer(data[0]);
}

/**
 * Get players on the same team (teammates)
 * Returns active players from the current season on the specified team,
 * excluding the current player.
 * @param team - The team abbreviation (e.g., "KC", "SF")
 * @param excludePlayerId - The player ID to exclude from results
 * @param limit - Maximum number of players to return (default 10)
 * @returns Array of teammate players
 */
export async function getPlayersByTeam(
    team: string,
    excludePlayerId: string,
    limit: number = 10
): Promise<Player[]> {
    const supabase = createServerClient();
    const currentSeason = 2024;

    // Query for active players on the same team, excluding the current player
    // Filter out placeholder records with invalid names
    const { data, error } = await supabase
        .from("nfl_player_season_details")
        .select("*")
        .eq("team", team)
        .eq("is_active", true)
        .eq("season", currentSeason)
        .neq("player_id", excludePlayerId)
        .not("name", "ilike", "% Team")
        .not("name", "eq", "")
        .order("name")
        .limit(limit);

    if (error) {
        console.error("Error fetching players by team:", error);
        return [];
    }

    return (data || []).map(transformToPlayer);
}

// ============================================================================
// Transform Functions
// ============================================================================

/**
 * Transform database player record to application Player type
 */
function transformToPlayer(data: NFLPlayerSeasonDetails): Player {
    return {
        id: data.player_id || "",
        name: data.name || "Unknown",
        team: (data.team || "FA") as NFLTeam,
        position: (data.position || "QB") as PlayerPosition,
        jerseyNumber: data.jersey_number || 0,
        imageUrl: data.image_url || undefined,
    };
}

/**
 * Transform database weekly stat record to application WeeklyStat type
 */
function transformToWeeklyStat(
    data: NFLWeeklyStatsWithPlayer,
    position: PlayerPosition,
    season: number
): WeeklyStat {
    const stats = extractPositionStats(data, position);

    return {
        week: data.week || 0,
        season: data.season || season,
        opponent: (data.opponent || "BYE") as NFLTeam,
        location: (data.location || "H") as "H" | "A",
        result: data.result || "",
        stats,
    };
}

/**
 * Extract position-specific stats from database record
 */
function extractPositionStats(
    data: NFLWeeklyStatsWithPlayer,
    position: PlayerPosition
): PositionStats {
    switch (position) {
        case "QB":
            return {
                passingYards: data.passing_yards || 0,
                passingTDs: data.passing_tds || 0,
                interceptions: data.interceptions || 0,
                completions: data.completions || 0,
                attempts: data.attempts || 0,
                rushingYards: data.rushing_yards || 0,
                rushingTDs: data.rushing_tds || 0,
            } as QBStats;

        case "RB":
            return {
                rushingYards: data.rushing_yards || 0,
                rushingTDs: data.rushing_tds || 0,
                carries: data.carries || 0,
                receivingYards: data.receiving_yards || 0,
                receivingTDs: data.receiving_tds || 0,
                receptions: data.receptions || 0,
                targets: data.targets || 0,
            } as RBStats;

        case "WR":
            return {
                receivingYards: data.receiving_yards || 0,
                receivingTDs: data.receiving_tds || 0,
                receptions: data.receptions || 0,
                targets: data.targets || 0,
                rushingYards: data.rushing_yards || 0,
                rushingTDs: data.rushing_tds || 0,
            } as WRStats;

        case "TE":
            return {
                receivingYards: data.receiving_yards || 0,
                receivingTDs: data.receiving_tds || 0,
                receptions: data.receptions || 0,
                targets: data.targets || 0,
            } as TEStats;

        default:
            // Default to QB stats structure
            return {
                passingYards: data.passing_yards || 0,
                passingTDs: data.passing_tds || 0,
                interceptions: data.interceptions || 0,
                completions: data.completions || 0,
                attempts: data.attempts || 0,
                rushingYards: data.rushing_yards || 0,
                rushingTDs: data.rushing_tds || 0,
            } as QBStats;
    }
}

/**
 * Calculate season summary from weekly stats
 */
function calculateSeasonSummary(
    weeklyStats: WeeklyStat[],
    season: number
): SeasonSummary {
    const gamesPlayed = weeklyStats.length;

    if (gamesPlayed === 0) {
        // Return empty summary if no games
        return {
            season,
            gamesPlayed: 0,
            totalStats: {
                passingYards: 0,
                passingTDs: 0,
                interceptions: 0,
                completions: 0,
                attempts: 0,
                rushingYards: 0,
                rushingTDs: 0,
            } as QBStats,
            averageStats: {
                passingYards: 0,
                passingTDs: 0,
                interceptions: 0,
                completions: 0,
                attempts: 0,
                rushingYards: 0,
                rushingTDs: 0,
            } as QBStats,
        };
    }

    // Sum all stats
    const totalStats = weeklyStats.reduce((acc, week) => {
        const stats = week.stats;
        Object.keys(stats).forEach((key) => {
            const statKey = key as keyof typeof stats;
            if (typeof stats[statKey] === "number") {
                (acc as Record<string, number>)[statKey] =
                    ((acc as Record<string, number>)[statKey] || 0) +
                    (stats[statKey] as number);
            }
        });
        return acc;
    }, {} as Record<string, number>);

    // Calculate averages
    const averageStats = Object.keys(totalStats).reduce((acc, key) => {
        acc[key] = Math.round((totalStats[key] / gamesPlayed) * 10) / 10;
        return acc;
    }, {} as Record<string, number>);

    return {
        season,
        gamesPlayed,
        totalStats: totalStats as unknown as PositionStats,
        averageStats: averageStats as unknown as PositionStats,
    };
}

// ============================================================================
// Game & Matchup Functions
// ============================================================================

/**
 * Get upcoming NFL games
 * Returns scheduled games ordered by date
 * @param limit - Maximum number of games to return (default 10)
 * @returns Array of upcoming games
 */
export async function getUpcomingGames(limit: number = 10): Promise<NFLGame[]> {
    const supabase = createServerClient();

    const { data, error } = await supabase
        .from("nfl_games")
        .select("*")
        .eq("status", "scheduled")
        .gte("game_date", new Date().toISOString())
        .order("game_date", { ascending: true })
        .limit(limit);

    if (error) {
        console.error("Error fetching upcoming games:", error);
        return [];
    }

    return (data || []).map(transformToNFLGame);
}

/**
 * Get a single game by ID
 * @param gameId - The game's database ID
 * @returns Game data or undefined if not found
 */
export async function getGameById(
    gameId: string
): Promise<NFLGame | undefined> {
    const supabase = createServerClient();

    const { data, error } = await supabase
        .from("nfl_games")
        .select("*")
        .eq("id", gameId)
        .single();

    if (error || !data) {
        console.error("Error fetching game:", error);
        return undefined;
    }

    return transformToNFLGame(data);
}

/**
 * Get recent completed games for a team
 * @param team - Team abbreviation
 * @param limit - Maximum number of games to return (default 5)
 * @returns Array of recent completed games
 */
export async function getTeamRecentResults(
    team: NFLTeam,
    limit: number = 5
): Promise<NFLGame[]> {
    const supabase = createServerClient();

    const { data, error } = await supabase
        .from("nfl_games")
        .select("*")
        .eq("status", "final")
        .or(`home_team.eq.${team},away_team.eq.${team}`)
        .order("game_date", { ascending: false })
        .limit(limit);

    if (error) {
        console.error("Error fetching team recent results:", error);
        return [];
    }

    return (data || []).map(transformToNFLGame);
}

/**
 * Get upcoming games for a team
 * @param team - Team abbreviation
 * @param limit - Maximum number of games to return (default 3)
 * @returns Array of upcoming games for the team
 */
export async function getTeamUpcomingGames(
    team: NFLTeam,
    limit: number = 3
): Promise<NFLGame[]> {
    const supabase = createServerClient();

    const { data, error } = await supabase
        .from("nfl_games")
        .select("*")
        .eq("status", "scheduled")
        .or(`home_team.eq.${team},away_team.eq.${team}`)
        .gte("game_date", new Date().toISOString())
        .order("game_date", { ascending: true })
        .limit(limit);

    if (error) {
        console.error("Error fetching team upcoming games:", error);
        return [];
    }

    return (data || []).map(transformToNFLGame);
}

// ============================================================================
// Team Functions
// ============================================================================

/**
 * Get full team information including roster and record
 * @param team - Team abbreviation
 * @param season - Season year (defaults to 2024)
 * @returns Team info with roster and record
 */
export async function getTeamInfo(
    team: NFLTeam,
    season: number = 2024
): Promise<TeamInfo | undefined> {
    const supabase = createServerClient();

    // Get team record from the view
    const { data: teamData, error: teamError } = await supabase
        .from("nfl_team_details")
        .select("*")
        .eq("abbreviation", team)
        .eq("season", season)
        .single();

    // Get team roster
    const players = await getTeamPlayers(team, season);

    // Build team record (default to 0-0-0 if no data)
    const record: TeamRecord = {
        wins: teamData?.wins ?? 0,
        losses: teamData?.losses ?? 0,
        ties: teamData?.ties ?? 0,
    };

    return {
        abbreviation: team,
        name: NFL_TEAM_NAMES[team] ?? team,
        record,
        players,
    };
}

/**
 * Get team records for multiple teams
 * Efficiently fetches records for a batch of teams in a single query
 * @param teams - Array of team abbreviations
 * @param season - Season year (defaults to 2024)
 * @returns Map of team abbreviation to TeamRecord
 */
export async function getTeamRecords(
    teams: NFLTeam[],
    season: number = 2024
): Promise<Map<NFLTeam, TeamRecord>> {
    const supabase = createServerClient();
    const recordsMap = new Map<NFLTeam, TeamRecord>();

    // Return empty map if no teams provided
    if (teams.length === 0) {
        return recordsMap;
    }

    // Query team records for all teams at once
    const { data, error } = await supabase
        .from("nfl_team_details")
        .select("abbreviation, wins, losses, ties")
        .in("abbreviation", teams)
        .eq("season", season);

    if (error) {
        console.error("Error fetching team records:", error);
        // Return empty records for all teams on error
        teams.forEach((team) => {
            recordsMap.set(team, { wins: 0, losses: 0, ties: 0 });
        });
        return recordsMap;
    }

    // Build the map from query results
    (data || []).forEach((row) => {
        const team = row.abbreviation as NFLTeam;
        recordsMap.set(team, {
            wins: row.wins ?? 0,
            losses: row.losses ?? 0,
            ties: row.ties ?? 0,
        });
    });

    // Ensure all requested teams have an entry (default to 0-0-0 if not found)
    teams.forEach((team) => {
        if (!recordsMap.has(team)) {
            recordsMap.set(team, { wins: 0, losses: 0, ties: 0 });
        }
    });

    return recordsMap;
}

/**
 * Get all players on a team for a season
 * @param team - Team abbreviation
 * @param season - Season year (defaults to 2024)
 * @returns Array of players on the team
 */
export async function getTeamPlayers(
    team: NFLTeam,
    season: number = 2024
): Promise<Player[]> {
    const supabase = createServerClient();

    const { data, error } = await supabase
        .from("nfl_player_season_details")
        .select("*")
        .eq("team", team)
        .eq("season", season)
        .eq("is_active", true)
        .not("name", "ilike", "% Team")
        .not("name", "eq", "")
        .order("position")
        .order("name");

    if (error) {
        console.error("Error fetching team players:", error);
        return [];
    }

    return (data || []).map(transformToPlayer);
}

// ============================================================================
// Game Transform Functions
// ============================================================================

/**
 * Transform database game record to application NFLGame type
 */
function transformToNFLGame(data: NFLGameRow): NFLGame {
    return {
        id: data.id,
        espnGameId: data.espn_game_id,
        season: data.season,
        week: data.week,
        homeTeam: data.home_team as NFLTeam,
        awayTeam: data.away_team as NFLTeam,
        homeScore: data.home_score,
        awayScore: data.away_score,
        gameDate: data.game_date,
        venue: data.venue_name
            ? {
                  name: data.venue_name,
                  city: data.venue_city ?? "",
                  state: data.venue_state ?? "",
              }
            : undefined,
        status: data.status as GameStatus,
    };
}

/**
 * Transform database game record to HistoricalGame type
 * Only for completed games with valid scores
 */
function transformToHistoricalGame(data: NFLGameRow): HistoricalGame {
    return {
        id: data.id,
        season: data.season,
        week: data.week,
        gameDate: data.game_date,
        homeTeam: data.home_team as NFLTeam,
        awayTeam: data.away_team as NFLTeam,
        homeScore: data.home_score ?? 0,
        awayScore: data.away_score ?? 0,
        venue: data.venue_name ?? undefined,
    };
}

// ============================================================================
// Head-to-Head History Functions
// ============================================================================

/**
 * Get head-to-head history between two teams
 * Calculates comprehensive statistics from all completed games
 *
 * @param team1 - First team abbreviation (typically away team)
 * @param team2 - Second team abbreviation (typically home team)
 * @param seasonLimit - Optional limit on number of seasons to include (default: 5, null for all)
 * @returns HeadToHeadStats object with aggregate stats and game history
 */
export async function getHeadToHeadHistory(
    team1: NFLTeam,
    team2: NFLTeam,
    seasonLimit: number | null = 5
): Promise<HeadToHeadStats> {
    const supabase = createServerClient();

    // Build query for games between these two teams
    // Games where team1 is home and team2 is away, OR team1 is away and team2 is home
    let query = supabase
        .from("nfl_games")
        .select("*")
        .eq("status", "final")
        .or(
            `and(home_team.eq.${team1},away_team.eq.${team2}),and(home_team.eq.${team2},away_team.eq.${team1})`
        )
        .order("game_date", { ascending: false });

    // Apply season limit if specified
    if (seasonLimit !== null) {
        const currentYear = new Date().getFullYear();
        const minSeason = currentYear - seasonLimit;
        query = query.gte("season", minSeason);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Error fetching head-to-head history:", error);
        // Return empty stats on error
        return createEmptyHeadToHeadStats(team1, team2);
    }

    const games = (data || []).map(transformToHistoricalGame);

    // If no games found, return empty stats
    if (games.length === 0) {
        return createEmptyHeadToHeadStats(team1, team2);
    }

    // Calculate all statistics from the games
    return calculateHeadToHeadStats(team1, team2, games);
}

/**
 * Create empty HeadToHeadStats object for when no history exists
 */
function createEmptyHeadToHeadStats(
    team1: NFLTeam,
    team2: NFLTeam
): HeadToHeadStats {
    return {
        team1,
        team2,
        totalGames: 0,
        team1Wins: 0,
        team2Wins: 0,
        ties: 0,
        team1TotalPoints: 0,
        team2TotalPoints: 0,
        team1AvgPoints: 0,
        team2AvgPoints: 0,
        team1HighestScore: 0,
        team2HighestScore: 0,
        team1LowestScore: 0,
        team2LowestScore: 0,
        team1HomeRecord: { wins: 0, losses: 0, ties: 0 },
        team1AwayRecord: { wins: 0, losses: 0, ties: 0 },
        currentStreak: { team: null, count: 0 },
        biggestMarginOfVictory: null,
        games: [],
    };
}

/**
 * Calculate comprehensive head-to-head statistics from game history
 *
 * @param team1 - First team abbreviation
 * @param team2 - Second team abbreviation
 * @param games - Array of historical games (sorted by date descending)
 * @returns Complete HeadToHeadStats object
 */
function calculateHeadToHeadStats(
    team1: NFLTeam,
    team2: NFLTeam,
    games: HistoricalGame[]
): HeadToHeadStats {
    // Initialize counters
    let team1Wins = 0;
    let team2Wins = 0;
    let ties = 0;
    let team1TotalPoints = 0;
    let team2TotalPoints = 0;
    let team1HighestScore = 0;
    let team2HighestScore = 0;
    let team1LowestScore = Infinity;
    let team2LowestScore = Infinity;

    // Home/away records for team1
    const team1HomeRecord = { wins: 0, losses: 0, ties: 0 };
    const team1AwayRecord = { wins: 0, losses: 0, ties: 0 };

    // Track biggest margin of victory
    let biggestMargin = 0;
    let biggestMarginGame: HistoricalGame | null = null;
    let biggestMarginTeam: NFLTeam | null = null;

    // Process each game
    for (const game of games) {
        // Determine team1's score and team2's score for this game
        const team1IsHome = game.homeTeam === team1;
        const team1Score = team1IsHome ? game.homeScore : game.awayScore;
        const team2Score = team1IsHome ? game.awayScore : game.homeScore;

        // Update totals
        team1TotalPoints += team1Score;
        team2TotalPoints += team2Score;

        // Update high/low scores
        team1HighestScore = Math.max(team1HighestScore, team1Score);
        team2HighestScore = Math.max(team2HighestScore, team2Score);
        team1LowestScore = Math.min(team1LowestScore, team1Score);
        team2LowestScore = Math.min(team2LowestScore, team2Score);

        // Determine winner and update records
        if (team1Score > team2Score) {
            team1Wins++;
            if (team1IsHome) {
                team1HomeRecord.wins++;
            } else {
                team1AwayRecord.wins++;
            }
        } else if (team2Score > team1Score) {
            team2Wins++;
            if (team1IsHome) {
                team1HomeRecord.losses++;
            } else {
                team1AwayRecord.losses++;
            }
        } else {
            ties++;
            if (team1IsHome) {
                team1HomeRecord.ties++;
            } else {
                team1AwayRecord.ties++;
            }
        }

        // Check for biggest margin of victory
        const margin = Math.abs(team1Score - team2Score);
        if (margin > biggestMargin) {
            biggestMargin = margin;
            biggestMarginGame = game;
            biggestMarginTeam = team1Score > team2Score ? team1 : team2;
        }
    }

    // Handle case where team never scored (shouldn't happen but be safe)
    if (team1LowestScore === Infinity) team1LowestScore = 0;
    if (team2LowestScore === Infinity) team2LowestScore = 0;

    // Calculate current streak (games are sorted by date descending)
    const currentStreak = calculateCurrentStreak(team1, games);

    // Calculate averages
    const totalGames = games.length;
    const team1AvgPoints =
        totalGames > 0
            ? Math.round((team1TotalPoints / totalGames) * 10) / 10
            : 0;
    const team2AvgPoints =
        totalGames > 0
            ? Math.round((team2TotalPoints / totalGames) * 10) / 10
            : 0;

    return {
        team1,
        team2,
        totalGames,
        team1Wins,
        team2Wins,
        ties,
        team1TotalPoints,
        team2TotalPoints,
        team1AvgPoints,
        team2AvgPoints,
        team1HighestScore,
        team2HighestScore,
        team1LowestScore,
        team2LowestScore,
        team1HomeRecord,
        team1AwayRecord,
        currentStreak,
        biggestMarginOfVictory:
            biggestMarginGame && biggestMarginTeam
                ? {
                      team: biggestMarginTeam,
                      margin: biggestMargin,
                      game: biggestMarginGame,
                  }
                : null,
        games,
    };
}

/**
 * Calculate current winning streak from sorted games
 * Games should be sorted by date descending (most recent first)
 *
 * @param team1 - First team to track streak for
 * @param games - Array of games sorted by date descending
 * @returns Streak object with team and count
 */
function calculateCurrentStreak(
    team1: NFLTeam,
    games: HistoricalGame[]
): { team: NFLTeam | null; count: number } {
    if (games.length === 0) {
        return { team: null, count: 0 };
    }

    // Start with the most recent game
    const firstGame = games[0];
    const team1IsHome = firstGame.homeTeam === team1;
    const team1Score = team1IsHome ? firstGame.homeScore : firstGame.awayScore;
    const team2Score = team1IsHome ? firstGame.awayScore : firstGame.homeScore;

    // Determine initial streak team (null if tie)
    let streakTeam: NFLTeam | null = null;
    if (team1Score > team2Score) {
        streakTeam = team1;
    } else if (team2Score > team1Score) {
        streakTeam =
            firstGame.homeTeam === team1
                ? firstGame.awayTeam
                : firstGame.homeTeam;
    }

    // If first game was a tie, no streak
    if (streakTeam === null) {
        return { team: null, count: 0 };
    }

    let count = 1;

    // Count consecutive wins for the same team
    for (let i = 1; i < games.length; i++) {
        const game = games[i];
        const t1IsHome = game.homeTeam === team1;
        const t1Score = t1IsHome ? game.homeScore : game.awayScore;
        const t2Score = t1IsHome ? game.awayScore : game.homeScore;

        // Determine winner of this game
        let winner: NFLTeam | null = null;
        if (t1Score > t2Score) {
            winner = team1;
        } else if (t2Score > t1Score) {
            winner = game.homeTeam === team1 ? game.awayTeam : game.homeTeam;
        }

        // If same team won, extend streak; otherwise break
        if (winner === streakTeam) {
            count++;
        } else {
            break;
        }
    }

    return { team: streakTeam, count };
}
