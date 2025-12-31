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
    HeadToHeadStats,
    HistoricalGame,
    GameTeamStats,
    HistoricGameWithStats,
} from "./types";
import { NFL_TEAM_NAMES } from "./types";
import type {
    NFLWeeklyStatsWithPlayer,
    NFLPlayerSeasonDetails,
    NFLGameRow,
    NFLTeamRow,
} from "./database.types";

// ============================================================================
// NFL Team Data Functions (Database-backed)
// ============================================================================

/**
 * Fetch all NFL teams from the database
 *
 * @returns Array of all NFL team records
 */
export async function getAllTeams(): Promise<NFLTeamRow[]> {
    const supabase = createServerClient();

    const { data, error } = await supabase
        .from("nfl_teams")
        .select("*")
        .order("name");

    if (error) {
        console.error("Error fetching NFL teams:", error);
        return [];
    }

    return data || [];
}

/**
 * Get team data by abbreviation from the database
 *
 * @param abbreviation - Team abbreviation (e.g., "KC")
 * @returns Team data or undefined if not found
 */
export async function getTeamByAbbreviation(
    abbreviation: string
): Promise<NFLTeamRow | undefined> {
    const supabase = createServerClient();

    const { data, error } = await supabase
        .from("nfl_teams")
        .select("*")
        .eq("abbreviation", abbreviation)
        .single();

    if (error) {
        // Not found is expected for invalid abbreviations
        if (error.code !== "PGRST116") {
            console.error("Error fetching team by abbreviation:", error);
        }
        return undefined;
    }

    return data;
}

/**
 * Get team data by URL slug from the database
 *
 * @param slug - URL slug (e.g., "kansas-city-chiefs")
 * @returns Team data or undefined if not found
 */
export async function getTeamBySlug(
    slug: string
): Promise<NFLTeamRow | undefined> {
    const supabase = createServerClient();

    const { data, error } = await supabase
        .from("nfl_teams")
        .select("*")
        .eq("slug", slug)
        .single();

    if (error) {
        // Not found is expected for invalid slugs
        if (error.code !== "PGRST116") {
            console.error("Error fetching team by slug:", error);
        }
        return undefined;
    }

    return data;
}

/**
 * Resolve a team abbreviation (current or historical) to the current team
 * Uses the historical_abbreviations array to find relocated franchises
 *
 * @param abbreviation - Team abbreviation (may be historical like "STL", "OAK", "SD")
 * @returns Current team data or undefined if not recognized
 */
export async function resolveTeamAbbreviation(
    abbreviation: string
): Promise<NFLTeamRow | undefined> {
    const supabase = createServerClient();

    // First check if it's a current abbreviation
    const currentTeam = await getTeamByAbbreviation(abbreviation);
    if (currentTeam) {
        return currentTeam;
    }

    // Check if it's a historical abbreviation
    const { data, error } = await supabase
        .from("nfl_teams")
        .select("*")
        .contains("historical_abbreviations", [abbreviation])
        .single();

    if (error) {
        if (error.code !== "PGRST116") {
            console.error("Error resolving team abbreviation:", error);
        }
        return undefined;
    }

    return data;
}

/**
 * Get all abbreviations for a franchise (current + historical)
 * Used for querying historical game data that may use old abbreviations
 *
 * @param abbreviation - Current team abbreviation
 * @returns Array of all abbreviations associated with the franchise
 */
export async function getFranchiseAbbreviations(
    abbreviation: string
): Promise<string[]> {
    const team = await getTeamByAbbreviation(abbreviation);
    if (!team) {
        return [abbreviation];
    }

    return [team.abbreviation, ...team.historical_abbreviations];
}

/**
 * Get all team slugs for sitemap generation
 *
 * @returns Array of all team URL slugs
 */
export async function getAllTeamSlugs(): Promise<string[]> {
    const teams = await getAllTeams();
    return teams.map((team) => team.slug);
}

/**
 * Get the URL slug for an NFL team
 *
 * @param abbreviation - Team abbreviation
 * @returns SEO-friendly URL slug or lowercase abbreviation as fallback
 */
export async function getTeamSlug(abbreviation: string): Promise<string> {
    const team = await getTeamByAbbreviation(abbreviation);
    return team?.slug ?? abbreviation.toLowerCase();
}

/**
 * Get the current NFL season year
 * NFL seasons span two calendar years (e.g., 2024-2025 season is "2025")
 * The season year is the year the season ends in
 * @returns Current NFL season year
 */
export function getCurrentSeason(): number {
    return new Date().getFullYear();
}

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
    season: number = getCurrentSeason()
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

    // Include games that started within the last 3.5 hours (still potentially live)
    // This allows the LIVE tag to show for games currently in progress
    const liveGameCutoff = new Date(
        Date.now() - 3.5 * 60 * 60 * 1000
    ).toISOString();

    const { data, error } = await supabase
        .from("nfl_games")
        .select("*")
        .eq("status", "scheduled")
        .gte("game_date", liveGameCutoff)
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
 * Includes historical games from franchise relocations (e.g., STL games for LAR)
 * @param team - Team abbreviation
 * @param limit - Maximum number of games to return (default 5)
 * @returns Array of recent completed games
 */
export async function getTeamRecentResults(
    team: NFLTeam,
    limit: number = 5
): Promise<NFLGame[]> {
    const supabase = createServerClient();

    // Get all abbreviations for this franchise (current + historical)
    const franchiseAbbrs = await getFranchiseAbbreviations(team);

    // Build OR conditions for all franchise abbreviations
    // e.g., for LV: "home_team.eq.LV,away_team.eq.LV,home_team.eq.OAK,away_team.eq.OAK"
    const orConditions = franchiseAbbrs
        .flatMap((abbr: string) => [`home_team.eq.${abbr}`, `away_team.eq.${abbr}`])
        .join(",");

    const { data, error } = await supabase
        .from("nfl_games")
        .select("*")
        .eq("status", "final")
        .or(orConditions)
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
 * Note: Upcoming games only use current abbreviation (teams don&apos;t relocate mid-season)
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
    season: number = getCurrentSeason()
): Promise<TeamInfo | undefined> {
    const supabase = createServerClient();

    // Get team data from nfl_teams table
    const teamRecord = await getTeamByAbbreviation(team);

    // Get team record from the view
    const { data: teamData } = await supabase
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
        name: teamRecord?.name ?? NFL_TEAM_NAMES[team] ?? team,
        record,
        players,
    };
}

/**
 * Get team records for multiple teams
 * Calculates win/loss/tie records directly from completed games
 * Includes historical franchise abbreviations for relocated teams
 * @param teams - Array of team abbreviations
 * @param season - Season year (defaults to 2024)
 * @returns Map of team abbreviation to TeamRecord
 */
export async function getTeamRecords(
    teams: NFLTeam[],
    season: number = getCurrentSeason()
): Promise<Map<NFLTeam, TeamRecord>> {
    const supabase = createServerClient();
    const recordsMap = new Map<NFLTeam, TeamRecord>();

    // Initialize all teams with 0-0-0
    teams.forEach((team) => {
        recordsMap.set(team, { wins: 0, losses: 0, ties: 0 });
    });

    // Return empty map if no teams provided
    if (teams.length === 0) {
        return recordsMap;
    }

    // Build a map of all abbreviations (current + historical) to current team
    // e.g., { "LV": "LV", "OAK": "LV", "LAR": "LAR", "STL": "LAR" }
    const abbrToCurrentTeam = new Map<string, NFLTeam>();
    const franchiseAbbrPromises = teams.map(async (team) => {
        const allAbbrs = await getFranchiseAbbreviations(team);
        allAbbrs.forEach((abbr) => {
            abbrToCurrentTeam.set(abbr, team);
        });
    });
    await Promise.all(franchiseAbbrPromises);

    // Query completed games for the season involving any of the requested teams
    const { data: games, error } = await supabase
        .from("nfl_games")
        .select("home_team, away_team, home_score, away_score")
        .eq("season", season)
        .eq("status", "final");

    if (error) {
        console.error("Error fetching games for team records:", error);
        return recordsMap;
    }

    // Calculate records from completed games
    (games || []).forEach((game) => {
        const homeTeamAbbr = game.home_team;
        const awayTeamAbbr = game.away_team;
        const homeScore = game.home_score ?? 0;
        const awayScore = game.away_score ?? 0;

        // Resolve to current team abbreviation (handles historical abbreviations)
        const homeTeam = abbrToCurrentTeam.get(homeTeamAbbr);
        const awayTeam = abbrToCurrentTeam.get(awayTeamAbbr);

        // Only process if we&apos;re tracking one of these teams
        if (!homeTeam && !awayTeam) return;

        // Determine outcome
        if (homeScore > awayScore) {
            // Home team won
            if (homeTeam) {
                const record = recordsMap.get(homeTeam)!;
                record.wins++;
            }
            if (awayTeam) {
                const record = recordsMap.get(awayTeam)!;
                record.losses++;
            }
        } else if (awayScore > homeScore) {
            // Away team won
            if (awayTeam) {
                const record = recordsMap.get(awayTeam)!;
                record.wins++;
            }
            if (homeTeam) {
                const record = recordsMap.get(homeTeam)!;
                record.losses++;
            }
        } else {
            // Tie
            if (homeTeam) {
                const record = recordsMap.get(homeTeam)!;
                record.ties++;
            }
            if (awayTeam) {
                const record = recordsMap.get(awayTeam)!;
                record.ties++;
            }
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
    season: number = getCurrentSeason()
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
    season: number = getCurrentSeason()
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

// ============================================================================
// Historic Matchups Browser Functions
// ============================================================================

/**
 * Get historic games with optional season and week filters
 * Returns completed games ordered by date descending
 *
 * @param season - Optional season year to filter by
 * @param week - Optional week number to filter by
 * @returns Array of historical games
 */
export async function getHistoricGames(
    season?: number,
    week?: number
): Promise<HistoricalGame[]> {
    const supabase = createServerClient();

    // Build query for completed games
    let query = supabase
        .from("nfl_games")
        .select("*")
        .eq("status", "final")
        .order("game_date", { ascending: false });

    // Apply filters if provided
    if (season !== undefined) {
        query = query.eq("season", season);
    }
    if (week !== undefined) {
        query = query.eq("week", week);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Error fetching historic games:", error);
        return [];
    }

    return (data || []).map(transformToHistoricalGame);
}

/**
 * Get list of available seasons with game data
 * Returns seasons in descending order (most recent first)
 *
 * @returns Array of season years with completed games
 */
export async function getAvailableHistoricSeasons(): Promise<number[]> {
    const supabase = createServerClient();

    // Query distinct seasons from completed games
    const { data, error } = await supabase
        .from("nfl_games")
        .select("season")
        .eq("status", "final")
        .order("season", { ascending: false });

    if (error) {
        console.error("Error fetching available historic seasons:", error);
        return [];
    }

    // Extract unique seasons
    const seasons = [...new Set((data || []).map((d) => d.season))];
    return seasons;
}

/**
 * Get list of available weeks for a specific season
 * Returns weeks in ascending order
 *
 * @param season - The season year to get weeks for
 * @returns Array of week numbers with completed games
 */
export async function getAvailableWeeksForSeason(
    season: number
): Promise<number[]> {
    const supabase = createServerClient();

    // Query distinct weeks from completed games for the season
    const { data, error } = await supabase
        .from("nfl_games")
        .select("week")
        .eq("status", "final")
        .eq("season", season)
        .order("week", { ascending: true });

    if (error) {
        console.error("Error fetching available weeks:", error);
        return [];
    }

    // Extract unique weeks
    const weeks = [...new Set((data || []).map((d) => d.week))];
    return weeks;
}

/**
 * Get most recent completed season and week
 * Used as default for the history browser
 *
 * @returns Object with season and week of most recent completed game
 */
export async function getMostRecentCompletedWeek(): Promise<{
    season: number;
    week: number;
} | null> {
    const supabase = createServerClient();

    // Get the most recent completed game
    const { data, error } = await supabase
        .from("nfl_games")
        .select("season, week")
        .eq("status", "final")
        .order("game_date", { ascending: false })
        .limit(1)
        .single();

    if (error || !data) {
        console.error("Error fetching most recent completed week:", error);
        return null;
    }

    return { season: data.season, week: data.week };
}

/**
 * Get aggregated team stats for a specific game
 * Aggregates passing and rushing stats from all players on each team
 *
 * @param game - The historical game to get stats for
 * @returns Game with aggregated team stats, or null if stats unavailable
 */
export async function getGameTeamStats(
    game: HistoricalGame
): Promise<HistoricGameWithStats> {
    const supabase = createServerClient();

    // Query weekly stats for both teams in this game's week
    const { data, error } = await supabase
        .from("nfl_weekly_stats_with_player")
        .select("team, completions, attempts, rushing_yards")
        .eq("season", game.season)
        .eq("week", game.week)
        .in("team", [game.homeTeam, game.awayTeam]);

    // Create empty stats as fallback
    const emptyStats = (team: NFLTeam): GameTeamStats => ({
        team,
        completions: 0,
        attempts: 0,
        incompletions: 0,
        rushingYards: 0,
    });

    if (error || !data) {
        console.error("Error fetching game team stats:", error);
        return {
            ...game,
            homeStats: emptyStats(game.homeTeam),
            awayStats: emptyStats(game.awayTeam),
        };
    }

    // Aggregate stats by team
    const homeStats = data
        .filter((s) => s.team === game.homeTeam)
        .reduce(
            (acc, stat) => ({
                team: game.homeTeam,
                completions: acc.completions + (stat.completions || 0),
                attempts: acc.attempts + (stat.attempts || 0),
                incompletions: 0, // Will calculate after
                rushingYards: acc.rushingYards + (stat.rushing_yards || 0),
            }),
            emptyStats(game.homeTeam)
        );

    const awayStats = data
        .filter((s) => s.team === game.awayTeam)
        .reduce(
            (acc, stat) => ({
                team: game.awayTeam,
                completions: acc.completions + (stat.completions || 0),
                attempts: acc.attempts + (stat.attempts || 0),
                incompletions: 0, // Will calculate after
                rushingYards: acc.rushingYards + (stat.rushing_yards || 0),
            }),
            emptyStats(game.awayTeam)
        );

    // Calculate incompletions
    homeStats.incompletions = homeStats.attempts - homeStats.completions;
    awayStats.incompletions = awayStats.attempts - awayStats.completions;

    return {
        ...game,
        homeStats,
        awayStats,
    };
}

/**
 * Get historic games with aggregated team stats for a season/week
 * Combines game data with passing and rushing stats
 *
 * @param season - Optional season year to filter by
 * @param week - Optional week number to filter by
 * @returns Array of games with team stats
 */
export async function getHistoricGamesWithStats(
    season?: number,
    week?: number
): Promise<HistoricGameWithStats[]> {
    // First get the games
    const games = await getHistoricGames(season, week);

    if (games.length === 0) {
        return [];
    }

    // Get stats for all games in parallel
    const gamesWithStats = await Promise.all(
        games.map((game) => getGameTeamStats(game))
    );

    return gamesWithStats;
}

// ============================================================================
// Sitemap Data Functions
// ============================================================================

/**
 * Get all game IDs for sitemap generation
 * Returns IDs for all games (scheduled, in-progress, and completed)
 *
 * @returns Array of game IDs
 */
export async function getAllGameIds(): Promise<string[]> {
    const supabase = createServerClient();

    const { data, error } = await supabase
        .from("nfl_games")
        .select("id")
        .order("game_date", { ascending: false });

    if (error) {
        console.error("Error fetching game IDs for sitemap:", error);
        return [];
    }

    return (data || []).map((game) => game.id);
}

/**
 * Get all player IDs for sitemap generation
 * Returns IDs for all active players with recent season data
 *
 * @returns Array of player IDs
 */
export async function getAllPlayerIds(): Promise<string[]> {
    const supabase = createServerClient();

    // Get unique player IDs from the season details view
    // Filter to active players to avoid indexing inactive/retired players
    const { data, error } = await supabase
        .from("nfl_player_season_details")
        .select("player_id")
        .eq("is_active", true)
        .not("name", "ilike", "% Team")
        .not("name", "eq", "")
        .order("name");

    if (error) {
        console.error("Error fetching player IDs for sitemap:", error);
        return [];
    }

    // Deduplicate player IDs (players may appear in multiple seasons)
    const uniqueIds = [
        ...new Set(
            (data || [])
                .map((player) => player.player_id)
                .filter((id): id is string => id !== null)
        ),
    ];

    return uniqueIds;
}
