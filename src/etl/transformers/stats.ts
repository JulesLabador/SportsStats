/**
 * Stats Transformer
 *
 * Transforms raw adapter data into database-ready format.
 * Handles normalization, default values, and data validation.
 * Supports multi-sport schema with sport-specific transformations.
 */

import type {
    RawPlayer,
    RawPlayerProfile,
    RawNFLPlayerSeason,
    RawNFLWeeklyStat,
    DbPlayer,
    DbPlayerProfile,
    DbNFLPlayerSeason,
    DbNFLWeeklyStat,
    ExternalIdMap,
    PlayerProfileIdMap,
    SportId,
} from "../types";
import { createChildLogger } from "@/lib/logger";

/** Logger for transformer operations */
const log = createChildLogger({ component: "transformer" });

// ============================================================================
// Core Player Transformations (shared across sports)
// ============================================================================

/**
 * Transform raw player data to database format
 *
 * @param rawPlayers - Array of raw player records from adapter
 * @returns Object containing transformed players and external ID mapping
 */
export function transformPlayers(rawPlayers: RawPlayer[]): {
    players: DbPlayer[];
    externalIdMap: ExternalIdMap;
} {
    const externalIdMap: ExternalIdMap = new Map();
    const players: DbPlayer[] = [];

    for (const raw of rawPlayers) {
        // Generate internal ID from external ID (or use as-is if already a slug)
        const internalId = normalizePlayerId(raw.externalId);

        // Track mapping from external to internal ID
        externalIdMap.set(raw.externalId, internalId);

        players.push({
            id: internalId,
            name: raw.name,
            image_url: raw.imageUrl ?? null,
        });
    }

    return { players, externalIdMap };
}

/**
 * Transform raw player profile data to database format
 *
 * @param rawProfiles - Array of raw player profile records from adapter
 * @param externalIdMap - Mapping from external to internal player IDs
 * @returns Array of transformed player profile records
 */
export function transformPlayerProfiles(
    rawProfiles: RawPlayerProfile[],
    externalIdMap: ExternalIdMap
): DbPlayerProfile[] {
    const profiles: DbPlayerProfile[] = [];

    for (const raw of rawProfiles) {
        // Resolve external ID to internal ID
        const playerId = externalIdMap.get(raw.playerExternalId);

        if (!playerId) {
            log.warn(
                { externalId: raw.playerExternalId },
                "Unknown player external ID"
            );
            continue;
        }

        profiles.push({
            player_id: playerId,
            sport_id: raw.sportId,
            position: raw.position,
            metadata: raw.metadata ?? {},
        });
    }

    return profiles;
}

// ============================================================================
// NFL-Specific Transformations
// ============================================================================

/**
 * Transform raw NFL player season data to database format
 *
 * @param rawSeasons - Array of raw NFL player season records from adapter
 * @param externalIdMap - Mapping from external to internal player IDs
 * @param playerProfileIdMap - Mapping from player_id to player_profile_id
 * @returns Array of transformed NFL player season records
 */
export function transformNFLPlayerSeasons(
    rawSeasons: RawNFLPlayerSeason[],
    externalIdMap: ExternalIdMap,
    playerProfileIdMap: PlayerProfileIdMap
): DbNFLPlayerSeason[] {
    const seasons: DbNFLPlayerSeason[] = [];

    for (const raw of rawSeasons) {
        // Resolve external ID to internal ID
        const playerId = externalIdMap.get(raw.playerExternalId);

        if (!playerId) {
            log.warn(
                { externalId: raw.playerExternalId },
                "Unknown player external ID"
            );
            continue;
        }

        // Resolve player_id to player_profile_id
        const playerProfileId = playerProfileIdMap.get(playerId);

        if (!playerProfileId) {
            log.warn({ playerId }, "No NFL profile found for player");
            continue;
        }

        seasons.push({
            player_profile_id: playerProfileId,
            season: raw.season,
            team: raw.team,
            jersey_number: raw.jerseyNumber,
            is_active: raw.isActive,
        });
    }

    return seasons;
}

/**
 * Transform raw NFL weekly stats to database format
 * Note: player_season_id must be resolved by the loader after player_seasons are inserted
 *
 * @param rawStats - Array of raw NFL weekly stat records from adapter
 * @param externalIdMap - Mapping from external to internal player IDs
 * @param playerProfileIdMap - Mapping from player_id to player_profile_id
 * @returns Array of partially transformed weekly stats (missing player_season_id)
 */
export function transformNFLWeeklyStats(
    rawStats: RawNFLWeeklyStat[],
    externalIdMap: ExternalIdMap,
    playerProfileIdMap: PlayerProfileIdMap
): Array<
    Omit<DbNFLWeeklyStat, "player_season_id"> & {
        player_profile_id: string;
        season: number;
    }
> {
    const stats: Array<
        Omit<DbNFLWeeklyStat, "player_season_id"> & {
            player_profile_id: string;
            season: number;
        }
    > = [];

    for (const raw of rawStats) {
        // Resolve external ID to internal ID
        const playerId = externalIdMap.get(raw.playerExternalId);

        if (!playerId) {
            log.warn(
                { externalId: raw.playerExternalId },
                "Unknown player external ID in stats"
            );
            continue;
        }

        // Resolve player_id to player_profile_id
        const playerProfileId = playerProfileIdMap.get(playerId);

        if (!playerProfileId) {
            log.warn({ playerId }, "No NFL profile found for player in stats");
            continue;
        }

        stats.push({
            // These will be used to look up player_season_id
            player_profile_id: playerProfileId,
            season: raw.season,

            // Game info
            week: raw.week,
            opponent: raw.opponent,
            location: raw.location,
            result: raw.result ?? null,

            // Passing stats (default to 0 if not provided)
            passing_yards: raw.passingYards ?? 0,
            passing_tds: raw.passingTDs ?? 0,
            interceptions: raw.interceptions ?? 0,
            completions: raw.completions ?? 0,
            attempts: raw.attempts ?? 0,

            // Rushing stats
            rushing_yards: raw.rushingYards ?? 0,
            rushing_tds: raw.rushingTDs ?? 0,
            carries: raw.carries ?? 0,

            // Receiving stats
            receiving_yards: raw.receivingYards ?? 0,
            receiving_tds: raw.receivingTDs ?? 0,
            receptions: raw.receptions ?? 0,
            targets: raw.targets ?? 0,
        });
    }

    return stats;
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Normalize a player ID to a consistent slug format
 *
 * @param externalId - External ID from data source
 * @returns Normalized slug ID
 */
function normalizePlayerId(externalId: string): string {
    // If it's already a slug format, return as-is
    if (/^[a-z0-9-]+$/.test(externalId)) {
        return externalId;
    }

    // Otherwise, convert to slug
    return externalId
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();
}

/**
 * Validate transformed player data
 *
 * @param player - Transformed player record
 * @returns True if valid, false otherwise
 */
export function validatePlayer(player: DbPlayer): boolean {
    if (!player.id || player.id.length === 0) {
        log.warn("Player missing ID");
        return false;
    }

    if (!player.name || player.name.length === 0) {
        log.warn({ playerId: player.id }, "Player missing name");
        return false;
    }

    return true;
}

/**
 * Validate transformed player profile data
 *
 * @param profile - Transformed player profile record
 * @returns True if valid, false otherwise
 */
export function validatePlayerProfile(profile: DbPlayerProfile): boolean {
    if (!profile.player_id || profile.player_id.length === 0) {
        log.warn("Profile missing player_id");
        return false;
    }

    const validSports: SportId[] = ["nfl", "mlb", "nba", "f1"];
    if (!validSports.includes(profile.sport_id)) {
        log.warn({ sportId: profile.sport_id }, "Profile has invalid sport_id");
        return false;
    }

    if (!profile.position || profile.position.length === 0) {
        log.warn({ playerId: profile.player_id }, "Profile missing position");
        return false;
    }

    return true;
}

/**
 * Validate transformed NFL weekly stat data
 *
 * @param stat - Transformed NFL weekly stat record
 * @returns True if valid, false otherwise
 */
export function validateNFLWeeklyStat(
    stat: Omit<DbNFLWeeklyStat, "player_season_id"> & {
        player_profile_id: string;
        season: number;
    }
): boolean {
    if (stat.week < 1 || stat.week > 18) {
        log.warn({ week: stat.week }, "Invalid week number");
        return false;
    }

    if (stat.season < 2000 || stat.season > new Date().getFullYear() + 1) {
        log.warn({ season: stat.season }, "Invalid season");
        return false;
    }

    if (!["H", "A"].includes(stat.location)) {
        log.warn({ location: stat.location }, "Invalid location");
        return false;
    }

    return true;
}
