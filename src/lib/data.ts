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
    PlayerWithSeasonStats,
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

/**
 * Get all players on a team with their aggregated season stats
 * Used for sorting players by performance on matchup pages
 * @param team - Team abbreviation
 * @param season - Season year (defaults to 2024)
 * @returns Array of players with their season stats
 */
export async function getTeamPlayersWithStats(
    team: NFLTeam,
    season: number = 2024
): Promise<PlayerWithSeasonStats[]> {
    const supabase = createServerClient();

    // First get all players on the team
    const { data: playerData, error: playerError } = await supabase
        .from("nfl_player_season_details")
        .select("*")
        .eq("team", team)
        .eq("season", season)
        .eq("is_active", true)
        .not("name", "ilike", "% Team")
        .not("name", "eq", "")
        .order("position")
        .order("name");

    if (playerError || !playerData) {
        console.error("Error fetching team players:", playerError);
        return [];
    }

    // Get all weekly stats for these players
    const playerIds = playerData
        .map((p) => p.player_id)
        .filter((id): id is string => id !== null);

    if (playerIds.length === 0) {
        return [];
    }

    const { data: statsData, error: statsError } = await supabase
        .from("nfl_weekly_stats_with_player")
        .select("*")
        .in("player_id", playerIds)
        .eq("season", season);

    if (statsError) {
        console.error("Error fetching player stats:", statsError);
        // Return players without stats if stats query fails
        return playerData.map((p) => transformToPlayerWithStats(p, []));
    }

    // Group stats by player_id
    const statsByPlayer = new Map<string, NFLWeeklyStatsWithPlayer[]>();
    for (const stat of statsData || []) {
        if (!stat.player_id) continue;
        const existing = statsByPlayer.get(stat.player_id) || [];
        existing.push(stat);
        statsByPlayer.set(stat.player_id, existing);
    }

    // Transform players with their aggregated stats
    return playerData.map((p) => {
        const playerStats = statsByPlayer.get(p.player_id || "") || [];
        return transformToPlayerWithStats(p, playerStats);
    });
}

/**
 * Transform player data with weekly stats into PlayerWithSeasonStats
 * Calculates aggregated stats and performance score
 */
function transformToPlayerWithStats(
    data: NFLPlayerSeasonDetails,
    weeklyStats: NFLWeeklyStatsWithPlayer[]
): PlayerWithSeasonStats {
    // Aggregate stats from all weeks
    const aggregated = weeklyStats.reduce(
        (acc, week) => ({
            passingYards: acc.passingYards + (week.passing_yards || 0),
            passingTDs: acc.passingTDs + (week.passing_tds || 0),
            rushingYards: acc.rushingYards + (week.rushing_yards || 0),
            rushingTDs: acc.rushingTDs + (week.rushing_tds || 0),
            receivingYards: acc.receivingYards + (week.receiving_yards || 0),
            receivingTDs: acc.receivingTDs + (week.receiving_tds || 0),
            receptions: acc.receptions + (week.receptions || 0),
        }),
        {
            passingYards: 0,
            passingTDs: 0,
            rushingYards: 0,
            rushingTDs: 0,
            receivingYards: 0,
            receivingTDs: 0,
            receptions: 0,
        }
    );

    const gamesPlayed = weeklyStats.length;
    const position = (data.position || "QB") as PlayerPosition;

    // Calculate performance score based on position
    const performanceScore = calculatePerformanceScore(position, aggregated);

    return {
        id: data.player_id || "",
        name: data.name || "Unknown",
        team: (data.team || "FA") as NFLTeam,
        position,
        jerseyNumber: data.jersey_number || 0,
        imageUrl: data.image_url || undefined,
        ...aggregated,
        gamesPlayed,
        performanceScore,
    };
}

/**
 * Calculate a normalized performance score for sorting players
 * Score is weighted by position-relevant stats
 * @param position - Player position
 * @param stats - Aggregated season stats
 * @returns Performance score (higher is better)
 */
function calculatePerformanceScore(
    position: PlayerPosition,
    stats: {
        passingYards: number;
        passingTDs: number;
        rushingYards: number;
        rushingTDs: number;
        receivingYards: number;
        receivingTDs: number;
        receptions: number;
    }
): number {
    switch (position) {
        case "QB":
            // QBs: passing yards (0.04 pts/yd) + passing TDs (4 pts) + rushing yards (0.1 pts/yd) + rushing TDs (6 pts)
            return (
                stats.passingYards * 0.04 +
                stats.passingTDs * 4 +
                stats.rushingYards * 0.1 +
                stats.rushingTDs * 6
            );
        case "RB":
            // RBs: rushing yards (0.1 pts/yd) + rushing TDs (6 pts) + receiving yards (0.1 pts/yd) + receiving TDs (6 pts) + receptions (0.5 pts)
            return (
                stats.rushingYards * 0.1 +
                stats.rushingTDs * 6 +
                stats.receivingYards * 0.1 +
                stats.receivingTDs * 6 +
                stats.receptions * 0.5
            );
        case "WR":
            // WRs: receiving yards (0.1 pts/yd) + receiving TDs (6 pts) + receptions (1 pt) + rushing yards (0.1 pts/yd) + rushing TDs (6 pts)
            return (
                stats.receivingYards * 0.1 +
                stats.receivingTDs * 6 +
                stats.receptions * 1 +
                stats.rushingYards * 0.1 +
                stats.rushingTDs * 6
            );
        case "TE":
            // TEs: receiving yards (0.1 pts/yd) + receiving TDs (6 pts) + receptions (1 pt)
            return (
                stats.receivingYards * 0.1 +
                stats.receivingTDs * 6 +
                stats.receptions * 1
            );
        default:
            return 0;
    }
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
