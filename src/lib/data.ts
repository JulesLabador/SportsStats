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
    HistoricalMatchupStats,
    HistoricalGame,
    TeamMatchupStats,
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
export async function getGameById(gameId: string): Promise<NFLGame | undefined> {
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

// ============================================================================
// Historical Matchup Functions
// ============================================================================

/**
 * Transform a database game row to a HistoricalGame
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

/**
 * Calculate the current streak for a team in historical matchups
 * @param games - Games sorted by date descending (most recent first)
 * @param team - The team to calculate streak for
 * @returns Positive number for winning streak, negative for losing streak
 */
function calculateStreak(games: HistoricalGame[], team: NFLTeam): number {
    if (games.length === 0) return 0;

    let streak = 0;
    let firstGameResult: "win" | "loss" | "tie" | null = null;

    for (const game of games) {
        // Determine if the team won, lost, or tied this game
        const teamScore =
            game.homeTeam === team ? game.homeScore : game.awayScore;
        const opponentScore =
            game.homeTeam === team ? game.awayScore : game.homeScore;

        let result: "win" | "loss" | "tie";
        if (teamScore > opponentScore) {
            result = "win";
        } else if (teamScore < opponentScore) {
            result = "loss";
        } else {
            result = "tie";
        }

        // Set the first game result to track what kind of streak we have
        if (firstGameResult === null) {
            firstGameResult = result;
        }

        // If the result matches the streak type, increment
        if (result === firstGameResult) {
            if (result === "win") {
                streak++;
            } else if (result === "loss") {
                streak--;
            }
            // Ties don&apos;t count as part of win/loss streaks
        } else if (result !== "tie") {
            // Streak broken by opposite result
            break;
        }
    }

    return streak;
}

/**
 * Calculate team-specific stats from historical games
 */
function calculateTeamStats(
    games: HistoricalGame[],
    team: NFLTeam
): TeamMatchupStats {
    let wins = 0;
    let losses = 0;
    let ties = 0;
    let totalPointsScored = 0;
    let totalPointsAllowed = 0;

    let highestScoringWin: HistoricalGame | null = null;
    let highestScoringLoss: HistoricalGame | null = null;
    let largestVictory: HistoricalGame | null = null;
    let largestVictoryMargin = 0;

    for (const game of games) {
        // Calculate points for this team
        const teamScore =
            game.homeTeam === team ? game.homeScore : game.awayScore;
        const opponentScore =
            game.homeTeam === team ? game.awayScore : game.homeScore;

        totalPointsScored += teamScore;
        totalPointsAllowed += opponentScore;

        if (teamScore > opponentScore) {
            // Win
            wins++;
            const margin = teamScore - opponentScore;

            // Check for highest scoring win
            if (!highestScoringWin || teamScore > getTeamScore(highestScoringWin, team)) {
                highestScoringWin = game;
            }

            // Check for largest victory
            if (margin > largestVictoryMargin) {
                largestVictoryMargin = margin;
                largestVictory = game;
            }
        } else if (teamScore < opponentScore) {
            // Loss
            losses++;

            // Check for highest scoring loss
            if (!highestScoringLoss || teamScore > getTeamScore(highestScoringLoss, team)) {
                highestScoringLoss = game;
            }
        } else {
            // Tie
            ties++;
        }
    }

    const totalGames = games.length;
    const avgPointsScored = totalGames > 0 ? Math.round((totalPointsScored / totalGames) * 10) / 10 : 0;
    const avgPointsAllowed = totalGames > 0 ? Math.round((totalPointsAllowed / totalGames) * 10) / 10 : 0;

    return {
        team,
        wins,
        losses,
        ties,
        totalPointsScored,
        totalPointsAllowed,
        avgPointsScored,
        avgPointsAllowed,
        highestScoringWin,
        highestScoringLoss,
        largestVictory,
        currentStreak: calculateStreak(games, team),
    };
}

/**
 * Helper to get the score for a specific team in a game
 */
function getTeamScore(game: HistoricalGame, team: NFLTeam): number {
    return game.homeTeam === team ? game.homeScore : game.awayScore;
}

/**
 * Get historical matchup statistics between two teams
 * @param team1 - First team abbreviation
 * @param team2 - Second team abbreviation
 * @returns Historical matchup stats or undefined if no games found
 */
export async function getHistoricalMatchupStats(
    team1: NFLTeam,
    team2: NFLTeam
): Promise<HistoricalMatchupStats | undefined> {
    const supabase = createServerClient();

    // Fetch all completed games between these two teams
    const { data, error } = await supabase
        .from("nfl_games")
        .select("*")
        .eq("status", "final")
        .or(
            `and(home_team.eq.${team1},away_team.eq.${team2}),and(home_team.eq.${team2},away_team.eq.${team1})`
        )
        .order("game_date", { ascending: false });

    if (error) {
        console.error("Error fetching historical matchup:", error);
        return undefined;
    }

    // If no games found, return stats with zero values
    if (!data || data.length === 0) {
        return {
            team1,
            team2,
            totalGames: 0,
            team1Stats: {
                team: team1,
                wins: 0,
                losses: 0,
                ties: 0,
                totalPointsScored: 0,
                totalPointsAllowed: 0,
                avgPointsScored: 0,
                avgPointsAllowed: 0,
                highestScoringWin: null,
                highestScoringLoss: null,
                largestVictory: null,
                currentStreak: 0,
            },
            team2Stats: {
                team: team2,
                wins: 0,
                losses: 0,
                ties: 0,
                totalPointsScored: 0,
                totalPointsAllowed: 0,
                avgPointsScored: 0,
                avgPointsAllowed: 0,
                highestScoringWin: null,
                highestScoringLoss: null,
                largestVictory: null,
                currentStreak: 0,
            },
            lastMeeting: null,
            closestGame: null,
            highestScoringGame: null,
            lowestScoringGame: null,
            games: [],
        };
    }

    // Transform to HistoricalGame type
    const games = data.map(transformToHistoricalGame);

    // Calculate team stats
    const team1Stats = calculateTeamStats(games, team1);
    const team2Stats = calculateTeamStats(games, team2);

    // Find special games
    const lastMeeting = games[0] ?? null;

    // Find closest game (smallest margin)
    let closestGame: HistoricalGame | null = null;
    let smallestMargin = Infinity;

    // Find highest and lowest scoring games
    let highestScoringGame: HistoricalGame | null = null;
    let highestTotalScore = 0;
    let lowestScoringGame: HistoricalGame | null = null;
    let lowestTotalScore = Infinity;

    for (const game of games) {
        const totalScore = game.homeScore + game.awayScore;
        const margin = Math.abs(game.homeScore - game.awayScore);

        // Closest game
        if (margin < smallestMargin) {
            smallestMargin = margin;
            closestGame = game;
        }

        // Highest scoring
        if (totalScore > highestTotalScore) {
            highestTotalScore = totalScore;
            highestScoringGame = game;
        }

        // Lowest scoring
        if (totalScore < lowestTotalScore) {
            lowestTotalScore = totalScore;
            lowestScoringGame = game;
        }
    }

    return {
        team1,
        team2,
        totalGames: games.length,
        team1Stats,
        team2Stats,
        lastMeeting,
        closestGame,
        highestScoringGame,
        lowestScoringGame,
        games,
    };
}
