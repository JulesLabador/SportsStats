/**
 * Player Matcher Service
 *
 * Handles matching player identities across different data sources.
 * Uses heuristic matching to link ESPN player IDs to PFR slugs.
 *
 * Key features:
 * - Name normalization for consistent matching
 * - Fuzzy matching for name variations
 * - Confidence scoring for match quality
 * - Persistent storage of matches in database
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { createChildLogger } from "@/lib/logger";
import type {
    MatchConfidence,
    PlayerIdentityMapping,
    CreateIdentityMappingInput,
    PlayerMatchResult,
} from "../types";

/** Logger for player matcher service */
const log = createChildLogger({ service: "player-matcher" });

/** Type alias for Supabase client */
type SupabaseDbClient = SupabaseClient<Database>;

/**
 * Player data for matching
 */
export interface PlayerMatchCandidate {
    /** Player name */
    name: string;
    /** Position (QB, RB, WR, TE) */
    position: string;
    /** Current team abbreviation */
    team: string;
    /** Source-specific ID */
    sourceId: string;
    /** Data source */
    source: "espn" | "pfr";
}

/**
 * Internal player record for matching against
 */
interface InternalPlayer {
    id: string;
    name: string;
    position?: string;
    team?: string;
}

/**
 * Match candidate with score
 */
interface ScoredMatch {
    playerId: string;
    score: number;
    confidence: MatchConfidence;
    matchDetails: string[];
}

/**
 * Player Matcher Service for cross-source identity matching
 */
export class PlayerMatcherService {
    private client: SupabaseDbClient;

    // Cache of existing mappings
    private mappingCache: Map<string, PlayerIdentityMapping> = new Map();
    private espnIdToPlayerId: Map<string, string> = new Map();
    private pfrSlugToPlayerId: Map<string, string> = new Map();

    constructor(client: SupabaseDbClient) {
        this.client = client;
    }

    /**
     * Load existing identity mappings into cache
     */
    async loadMappings(): Promise<void> {
        const { data, error } = await this.client
            .from("player_identity_mappings")
            .select("*");

        if (error) {
            log.error({ error: error.message }, "Failed to load mappings");
            return;
        }

        this.mappingCache.clear();
        this.espnIdToPlayerId.clear();
        this.pfrSlugToPlayerId.clear();

        for (const row of data ?? []) {
            const mapping: PlayerIdentityMapping = {
                id: row.id,
                playerId: row.player_id,
                espnPlayerId: row.espn_player_id,
                pfrPlayerSlug: row.pfr_player_slug,
                matchConfidence: row.match_confidence as MatchConfidence,
                matchMethod: row.match_method,
                matchedAt: new Date(row.matched_at),
                manualOverride: row.manual_override,
                extraIds: (row.extra_ids as Record<string, string>) ?? {},
            };

            this.mappingCache.set(row.player_id, mapping);

            if (row.espn_player_id) {
                this.espnIdToPlayerId.set(row.espn_player_id, row.player_id);
            }
            if (row.pfr_player_slug) {
                this.pfrSlugToPlayerId.set(row.pfr_player_slug, row.player_id);
            }
        }

        log.info({ count: this.mappingCache.size }, "Loaded identity mappings");
    }

    /**
     * Find or create a player match for the given candidate
     *
     * @param candidate - Player data to match
     * @returns Match result with player ID and confidence
     */
    async matchPlayer(
        candidate: PlayerMatchCandidate
    ): Promise<PlayerMatchResult> {
        // First check if we already have a mapping for this source ID
        const existingMapping = this.findExistingMapping(candidate);
        if (existingMapping) {
            return {
                playerId: existingMapping.playerId,
                espnPlayerId: existingMapping.espnPlayerId,
                pfrPlayerSlug: existingMapping.pfrPlayerSlug,
                confidence: existingMapping.matchConfidence,
                isNewMatch: false,
            };
        }

        // Try to find a matching player in the database
        const matchResult = await this.findBestMatch(candidate);

        if (matchResult) {
            // Create or update the identity mapping
            await this.createOrUpdateMapping(candidate, matchResult);

            return {
                playerId: matchResult.playerId,
                espnPlayerId:
                    candidate.source === "espn" ? candidate.sourceId : null,
                pfrPlayerSlug:
                    candidate.source === "pfr" ? candidate.sourceId : null,
                confidence: matchResult.confidence,
                isNewMatch: true,
            };
        }

        // No match found - return null to indicate new player needed
        return {
            playerId: this.generatePlayerId(candidate.name),
            espnPlayerId:
                candidate.source === "espn" ? candidate.sourceId : null,
            pfrPlayerSlug:
                candidate.source === "pfr" ? candidate.sourceId : null,
            confidence: "low",
            isNewMatch: true,
        };
    }

    /**
     * Match multiple players in batch
     *
     * @param candidates - Array of player candidates
     * @returns Array of match results
     */
    async matchPlayers(
        candidates: PlayerMatchCandidate[]
    ): Promise<PlayerMatchResult[]> {
        // Ensure mappings are loaded
        if (this.mappingCache.size === 0) {
            await this.loadMappings();
        }

        const results: PlayerMatchResult[] = [];

        for (const candidate of candidates) {
            const result = await this.matchPlayer(candidate);
            results.push(result);
        }

        return results;
    }

    /**
     * Get player ID by ESPN player ID
     *
     * @param espnPlayerId - ESPN player ID
     * @returns Internal player ID or null
     */
    getPlayerIdByEspnId(espnPlayerId: string): string | null {
        return this.espnIdToPlayerId.get(espnPlayerId) ?? null;
    }

    /**
     * Get player ID by PFR slug
     *
     * @param pfrSlug - PFR player slug
     * @returns Internal player ID or null
     */
    getPlayerIdByPfrSlug(pfrSlug: string): string | null {
        return this.pfrSlugToPlayerId.get(pfrSlug) ?? null;
    }

    /**
     * Get mapping for a player
     *
     * @param playerId - Internal player ID
     * @returns Identity mapping or null
     */
    getMapping(playerId: string): PlayerIdentityMapping | null {
        return this.mappingCache.get(playerId) ?? null;
    }

    /**
     * Manually set a player identity mapping
     *
     * @param input - Mapping input data
     * @returns Created/updated mapping
     */
    async setManualMapping(
        input: CreateIdentityMappingInput & { manualOverride: true }
    ): Promise<PlayerIdentityMapping | null> {
        const { data, error } = await this.client
            .from("player_identity_mappings")
            .upsert(
                {
                    player_id: input.playerId,
                    espn_player_id: input.espnPlayerId ?? null,
                    pfr_player_slug: input.pfrPlayerSlug ?? null,
                    match_confidence: input.matchConfidence,
                    match_method: input.matchMethod,
                    manual_override: true,
                    matched_at: new Date().toISOString(),
                },
                {
                    onConflict: "player_id",
                    ignoreDuplicates: false,
                }
            )
            .select()
            .single();

        if (error) {
            log.error({ error: error.message }, "Failed to set manual mapping");
            return null;
        }

        // Update cache
        const mapping: PlayerIdentityMapping = {
            id: data.id,
            playerId: data.player_id,
            espnPlayerId: data.espn_player_id,
            pfrPlayerSlug: data.pfr_player_slug,
            matchConfidence: data.match_confidence as MatchConfidence,
            matchMethod: data.match_method,
            matchedAt: new Date(data.matched_at),
            manualOverride: data.manual_override,
            extraIds: (data.extra_ids as Record<string, string>) ?? {},
        };

        this.mappingCache.set(data.player_id, mapping);
        if (data.espn_player_id) {
            this.espnIdToPlayerId.set(data.espn_player_id, data.player_id);
        }
        if (data.pfr_player_slug) {
            this.pfrSlugToPlayerId.set(data.pfr_player_slug, data.player_id);
        }

        return mapping;
    }

    // =========================================================================
    // Private methods
    // =========================================================================

    /**
     * Find existing mapping for a source ID
     */
    private findExistingMapping(
        candidate: PlayerMatchCandidate
    ): PlayerIdentityMapping | null {
        if (candidate.source === "espn") {
            const playerId = this.espnIdToPlayerId.get(candidate.sourceId);
            if (playerId) {
                return this.mappingCache.get(playerId) ?? null;
            }
        } else {
            const playerId = this.pfrSlugToPlayerId.get(candidate.sourceId);
            if (playerId) {
                return this.mappingCache.get(playerId) ?? null;
            }
        }
        return null;
    }

    /**
     * Find the best matching player in the database
     */
    private async findBestMatch(
        candidate: PlayerMatchCandidate
    ): Promise<ScoredMatch | null> {
        // Get potential matches from database
        const normalizedName = this.normalizeName(candidate.name);

        // Query players with similar names
        const { data: players, error } = await this.client
            .from("nfl_player_season_details")
            .select("player_id, name, position, team")
            .ilike("name", `%${normalizedName.split(" ").pop()}%`);

        if (error || !players || players.length === 0) {
            return null;
        }

        // Score each potential match
        const scoredMatches: ScoredMatch[] = [];

        for (const player of players) {
            // Skip players with missing required fields
            if (!player.player_id || !player.name) {
                continue;
            }

            const internalPlayer: InternalPlayer = {
                id: player.player_id,
                name: player.name,
                position: player.position ?? undefined,
                team: player.team ?? undefined,
            };

            const { score, details } = this.calculateMatchScore(
                candidate,
                internalPlayer
            );

            if (score > 0) {
                scoredMatches.push({
                    playerId: player.player_id,
                    score,
                    confidence: this.scoreToConfidence(score),
                    matchDetails: details,
                });
            }
        }

        // Sort by score descending
        scoredMatches.sort((a, b) => b.score - a.score);

        // Return best match if it meets minimum threshold
        const bestMatch = scoredMatches[0];
        if (bestMatch && bestMatch.score >= 50) {
            return bestMatch;
        }

        return null;
    }

    /**
     * Calculate match score between candidate and internal player
     */
    private calculateMatchScore(
        candidate: PlayerMatchCandidate,
        internal: InternalPlayer
    ): { score: number; details: string[] } {
        let score = 0;
        const details: string[] = [];

        // Name matching (up to 60 points)
        const nameScore = this.calculateNameScore(
            candidate.name,
            internal.name
        );
        score += nameScore;
        if (nameScore > 0) {
            details.push(`name_score:${nameScore}`);
        }

        // Position matching (20 points for exact match)
        if (
            internal.position &&
            candidate.position.toUpperCase() === internal.position.toUpperCase()
        ) {
            score += 20;
            details.push("position_match");
        }

        // Team matching (20 points for exact match)
        if (
            internal.team &&
            candidate.team.toUpperCase() === internal.team.toUpperCase()
        ) {
            score += 20;
            details.push("team_match");
        }

        return { score, details };
    }

    /**
     * Calculate name similarity score
     */
    private calculateNameScore(
        candidateName: string,
        internalName: string
    ): number {
        const normCandidate = this.normalizeName(candidateName);
        const normInternal = this.normalizeName(internalName);

        // Exact match
        if (normCandidate === normInternal) {
            return 60;
        }

        // Check if last names match
        const candidateParts = normCandidate.split(" ");
        const internalParts = normInternal.split(" ");

        const candidateLastName = candidateParts[candidateParts.length - 1];
        const internalLastName = internalParts[internalParts.length - 1];

        if (candidateLastName === internalLastName) {
            // Last name matches - check first name
            const candidateFirstName = candidateParts[0];
            const internalFirstName = internalParts[0];

            if (candidateFirstName === internalFirstName) {
                return 55; // Full name match after normalization
            }

            // First initial matches
            if (candidateFirstName.charAt(0) === internalFirstName.charAt(0)) {
                return 40;
            }

            return 30; // Just last name matches
        }

        // Fuzzy matching using Levenshtein distance
        const distance = this.levenshteinDistance(normCandidate, normInternal);
        const maxLength = Math.max(normCandidate.length, normInternal.length);
        const similarity = 1 - distance / maxLength;

        if (similarity >= 0.9) return 50;
        if (similarity >= 0.8) return 35;
        if (similarity >= 0.7) return 20;

        return 0;
    }

    /**
     * Normalize a player name for matching
     */
    private normalizeName(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z\s]/g, "") // Remove non-letters except spaces
            .replace(/\s+(jr|sr|ii|iii|iv|v)$/i, "") // Remove suffixes
            .replace(/\s+/g, " ") // Normalize whitespace
            .trim();
    }

    /**
     * Calculate Levenshtein distance between two strings
     */
    private levenshteinDistance(a: string, b: string): number {
        const matrix: number[][] = [];

        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1 // deletion
                    );
                }
            }
        }

        return matrix[b.length][a.length];
    }

    /**
     * Convert score to confidence level
     */
    private scoreToConfidence(score: number): MatchConfidence {
        if (score >= 95) return "exact";
        if (score >= 80) return "high";
        if (score >= 60) return "medium";
        return "low";
    }

    /**
     * Create or update identity mapping in database
     */
    private async createOrUpdateMapping(
        candidate: PlayerMatchCandidate,
        match: ScoredMatch
    ): Promise<void> {
        const existingMapping = this.mappingCache.get(match.playerId);

        // Don't overwrite manual mappings
        if (existingMapping?.manualOverride) {
            return;
        }

        const updateData: Database["public"]["Tables"]["player_identity_mappings"]["Insert"] =
            {
                player_id: match.playerId,
                match_confidence: match.confidence,
                match_method: match.matchDetails.join(","),
                matched_at: new Date().toISOString(),
                manual_override: false,
                espn_player_id:
                    candidate.source === "espn" ? candidate.sourceId : null,
                pfr_player_slug:
                    candidate.source === "pfr" ? candidate.sourceId : null,
            };

        const { data, error } = await this.client
            .from("player_identity_mappings")
            .upsert(updateData, {
                onConflict: "player_id",
                ignoreDuplicates: false,
            })
            .select()
            .single();

        if (error) {
            log.error({ error: error.message }, "Failed to save mapping");
            return;
        }

        // Update cache
        const mapping: PlayerIdentityMapping = {
            id: data.id,
            playerId: data.player_id,
            espnPlayerId: data.espn_player_id,
            pfrPlayerSlug: data.pfr_player_slug,
            matchConfidence: data.match_confidence as MatchConfidence,
            matchMethod: data.match_method,
            matchedAt: new Date(data.matched_at),
            manualOverride: data.manual_override,
            extraIds: (data.extra_ids as Record<string, string>) ?? {},
        };

        this.mappingCache.set(data.player_id, mapping);
        if (data.espn_player_id) {
            this.espnIdToPlayerId.set(data.espn_player_id, data.player_id);
        }
        if (data.pfr_player_slug) {
            this.pfrSlugToPlayerId.set(data.pfr_player_slug, data.player_id);
        }
    }

    /**
     * Generate a player ID from name
     */
    private generatePlayerId(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .trim();
    }
}
