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
} from "./types";
import type {
    NFLWeeklyStatsWithPlayer,
    NFLPlayerSeasonDetails,
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
