/**
 * NFL ESPN Data Source Adapter
 *
 * Fetches NFL data from ESPN's unofficial JSON endpoints.
 * Primary source for current season data.
 *
 * Endpoints used:
 * - Scoreboard: Schedule and game IDs
 * - Game Summary: Box scores and player stats
 * - Athletes: Player information
 *
 * Features:
 * - Schema adapter layer for handling ESPN field changes
 * - Caching integration for response storage
 * - Rate limiting for respectful API usage
 */

import {
    NFLBaseAdapter,
    type AdapterFetchOptions,
    type HealthCheckResult,
} from "./base";
import type {
    RawPlayer,
    RawPlayerProfile,
    RawNFLPlayerSeason,
    RawNFLWeeklyStat,
    RawNFLGame,
    NFLTeam,
    NFLPosition,
    NFLGameStatus,
    Json,
} from "../types";
import { CACHE_TTL } from "../types";
import { CacheService } from "../services/cache.service";
import { getRateLimiter } from "../services/rate-limiter.service";
import { createChildLogger } from "@/lib/logger";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/** Logger for ESPN adapter operations */
const log = createChildLogger({ adapter: "nfl-espn" });

// ============================================================================
// ESPN API Response Types
// ============================================================================

/**
 * ESPN Scoreboard API response structure
 */
interface ESPNScoreboardResponse {
    events: ESPNEvent[];
    season: {
        year: number;
        type: number;
    };
    week: {
        number: number;
    };
}

/**
 * ESPN Event (Game) structure
 */
interface ESPNEvent {
    id: string;
    date: string;
    name: string;
    shortName: string;
    season: {
        year: number;
        type: number;
    };
    week: {
        number: number;
    };
    competitions: ESPNCompetition[];
    status: {
        type: {
            id: string;
            name: string;
            state: string;
            completed: boolean;
        };
    };
}

/**
 * ESPN Competition structure
 */
interface ESPNCompetition {
    id: string;
    competitors: ESPNCompetitor[];
    venue?: {
        fullName: string;
        address?: {
            city: string;
            state: string;
        };
    };
}

/**
 * ESPN Competitor (Team) structure
 */
interface ESPNCompetitor {
    id: string;
    homeAway: "home" | "away";
    team: {
        id: string;
        abbreviation: string;
        displayName: string;
        shortDisplayName: string;
    };
    score: string;
    winner?: boolean;
}

/**
 * ESPN Game Summary response structure
 */
interface ESPNGameSummaryResponse {
    boxscore: {
        players: ESPNBoxscoreTeam[];
        teams: ESPNBoxscoreTeamStats[];
    };
    header: {
        competitions: ESPNCompetition[];
        season: {
            year: number;
            type: number;
        };
        week: number;
    };
}

/**
 * ESPN Boxscore team structure
 */
interface ESPNBoxscoreTeam {
    team: {
        id: string;
        abbreviation: string;
    };
    statistics: ESPNPlayerStatCategory[];
}

/**
 * ESPN Player stat category
 */
interface ESPNPlayerStatCategory {
    name: string;
    keys: string[];
    labels: string[];
    descriptions: string[];
    athletes: ESPNAthleteStats[];
}

/**
 * ESPN Athlete stats structure
 */
interface ESPNAthleteStats {
    athlete: {
        id: string;
        displayName: string;
        shortName: string;
        position: {
            abbreviation: string;
        };
        team?: {
            id: string;
        };
    };
    stats: string[];
}

/**
 * ESPN Boxscore team stats
 */
interface ESPNBoxscoreTeamStats {
    team: {
        id: string;
        abbreviation: string;
    };
    statistics: Array<{
        name: string;
        displayValue: string;
    }>;
}

/**
 * ESPN Athlete detail response
 */
interface ESPNAthleteResponse {
    athlete: {
        id: string;
        fullName: string;
        displayName: string;
        firstName: string;
        lastName: string;
        jersey?: string;
        position: {
            abbreviation: string;
            name: string;
        };
        team?: {
            id: string;
            abbreviation: string;
            displayName: string;
        };
        headshot?: {
            href: string;
        };
        college?: {
            name: string;
        };
        draft?: {
            year: number;
            round: number;
            selection: number;
        };
    };
}

// ============================================================================
// ESPN Adapter Implementation
// ============================================================================

/**
 * NFL ESPN Adapter for fetching data from ESPN's unofficial API
 */
export class NFLESPNAdapter extends NFLBaseAdapter {
    readonly name = "nfl-espn";
    readonly version = "1.0.0";
    readonly description = "ESPN unofficial JSON API adapter for NFL data";

    // ESPN API base URLs
    private readonly SCOREBOARD_URL =
        "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";
    private readonly SUMMARY_URL =
        "https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary";
    private readonly ATHLETE_URL =
        "https://site.api.espn.com/apis/common/v3/sports/football/nfl/athletes";

    // Cache service (optional - set via setCacheService)
    private cacheService: CacheService | null = null;

    /**
     * Set the cache service for response caching
     *
     * @param cacheService - CacheService instance
     */
    setCacheService(cacheService: CacheService): void {
        this.cacheService = cacheService;
    }

    /**
     * Create a new adapter with cache service
     *
     * @param supabaseClient - Supabase client for cache storage
     * @returns Configured adapter instance
     */
    static withCache(supabaseClient: SupabaseClient<Database>): NFLESPNAdapter {
        const adapter = new NFLESPNAdapter();
        adapter.setCacheService(new CacheService(supabaseClient));
        return adapter;
    }

    /**
     * Fetch players from ESPN
     * Uses scoreboard data to discover active players
     */
    async fetchPlayers(options: AdapterFetchOptions): Promise<RawPlayer[]> {
        const playerMap = new Map<string, RawPlayer>();

        // Fetch schedule to get game IDs
        const schedule = await this.fetchSchedule(options.season, options.week);

        // For each completed game, fetch player data
        for (const game of schedule) {
            if (!game.completed) continue;

            try {
                const summary = await this.fetchGameSummary(game.gameId);
                const players = this.extractPlayersFromSummary(summary);

                for (const player of players) {
                    if (!playerMap.has(player.externalId)) {
                        playerMap.set(player.externalId, player);
                    }
                }
            } catch (error) {
                log.warn(
                    { gameId: game.gameId, error },
                    "Failed to fetch game"
                );
            }
        }

        return Array.from(playerMap.values());
    }

    /**
     * Fetch player profiles from ESPN
     *
     * Iterates through all players and fetches detailed athlete data.
     * Logs progress every 50 players to provide visibility during long runs.
     */
    async fetchPlayerProfiles(
        options: AdapterFetchOptions
    ): Promise<RawPlayerProfile[]> {
        const profiles: RawPlayerProfile[] = [];

        // Get players first
        const players = await this.fetchPlayers(options);
        const totalPlayers = players.length;

        log.info(
            { totalPlayers },
            "Starting player profile fetch - this may take a while"
        );

        // Track progress for logging
        const progressInterval = 50;
        let successCount = 0;
        let errorCount = 0;
        const startTime = Date.now();

        for (let i = 0; i < players.length; i++) {
            const player = players[i];

            try {
                const athleteData = await this.fetchAthleteDetail(
                    player.externalId
                );

                if (athleteData) {
                    profiles.push({
                        playerExternalId: player.externalId,
                        sportId: "nfl",
                        position: this.normalizePosition(
                            athleteData.athlete.position.abbreviation
                        ),
                        metadata: {
                            college: athleteData.athlete.college?.name,
                            draft_year: athleteData.athlete.draft?.year,
                            draft_round: athleteData.athlete.draft?.round,
                            draft_pick: athleteData.athlete.draft?.selection,
                        },
                    });
                    successCount++;
                }
            } catch (error) {
                // Create basic profile if detail fetch fails
                profiles.push({
                    playerExternalId: player.externalId,
                    sportId: "nfl",
                    position: "QB", // Default, will be updated
                    metadata: {},
                });
                errorCount++;
            }

            // Log progress every N players
            const processed = i + 1;
            if (processed % progressInterval === 0 || processed === totalPlayers) {
                const elapsedMs = Date.now() - startTime;
                const avgMsPerPlayer = elapsedMs / processed;
                const remainingPlayers = totalPlayers - processed;
                const estimatedRemainingMs = remainingPlayers * avgMsPerPlayer;
                const estimatedRemainingMins = Math.ceil(estimatedRemainingMs / 60000);

                log.info(
                    {
                        progress: `${processed}/${totalPlayers}`,
                        percentComplete: Math.round((processed / totalPlayers) * 100),
                        successCount,
                        errorCount,
                        elapsedSecs: Math.round(elapsedMs / 1000),
                        estimatedRemainingMins: processed < totalPlayers ? estimatedRemainingMins : 0,
                    },
                    `Player profiles: ${processed}/${totalPlayers} (${Math.round((processed / totalPlayers) * 100)}%)`
                );
            }
        }

        const totalElapsedSecs = Math.round((Date.now() - startTime) / 1000);
        log.info(
            { totalPlayers, successCount, errorCount, totalElapsedSecs },
            "Completed player profile fetch"
        );

        return profiles;
    }

    /**
     * Fetch NFL player seasons from ESPN
     */
    async fetchPlayerSeasons(
        options: AdapterFetchOptions
    ): Promise<RawNFLPlayerSeason[]> {
        const seasons: RawNFLPlayerSeason[] = [];
        const playerTeamMap = new Map<
            string,
            { team: NFLTeam; jersey: number }
        >();

        // Fetch schedule to get game data
        const schedule = await this.fetchSchedule(options.season, options.week);

        // Extract player team info from games
        for (const game of schedule) {
            if (!game.completed) continue;

            try {
                const summary = await this.fetchGameSummary(game.gameId);
                this.extractPlayerTeamsFromSummary(summary, playerTeamMap);
            } catch (error) {
                log.warn(
                    { gameId: game.gameId, error },
                    "Failed to fetch game"
                );
            }
        }

        // Fetch jersey numbers from athlete details for each player
        // ESPN boxscore doesn't include jersey numbers, so we need to fetch them separately
        for (const [playerId, info] of playerTeamMap) {
            if (info.jersey === 0) {
                try {
                    const athleteData = await this.fetchAthleteDetail(playerId);
                    if (athleteData?.athlete?.jersey) {
                        info.jersey =
                            parseInt(athleteData.athlete.jersey, 10) || 0;
                    }
                } catch (error) {
                    log.debug(
                        { playerId, error },
                        "Failed to fetch athlete jersey number"
                    );
                }
            }
        }

        // Create season records
        for (const [playerId, info] of playerTeamMap) {
            seasons.push({
                playerExternalId: playerId,
                season: options.season,
                team: info.team,
                jerseyNumber: info.jersey,
                isActive: true,
            });
        }

        return seasons;
    }

    /**
     * Fetch NFL weekly stats from ESPN
     */
    async fetchWeeklyStats(
        options: AdapterFetchOptions
    ): Promise<RawNFLWeeklyStat[]> {
        const stats: RawNFLWeeklyStat[] = [];

        // Determine weeks to fetch
        const weeks = options.week
            ? [options.week]
            : this.getWeeksToFetch(options.season);

        for (const week of weeks) {
            const weekStats = await this.fetchWeekStats(options.season, week);
            stats.push(...weekStats);
        }

        return stats;
    }

    /**
     * Fetch NFL games (upcoming, in-progress, and completed)
     *
     * Fetches all games for the specified season/week with full game details
     * including venue information and game status.
     *
     * @param options - Fetch options including season and optional week
     * @returns Array of raw NFL game data
     */
    async fetchGames(options: AdapterFetchOptions): Promise<RawNFLGame[]> {
        const games: RawNFLGame[] = [];

        // Determine weeks to fetch
        const weeks = options.week
            ? [options.week]
            : this.getAllWeeksForSeason(options.season);

        for (const week of weeks) {
            const weekGames = await this.fetchWeekGames(options.season, week);
            games.push(...weekGames);
        }

        return games;
    }

    /**
     * Fetch games for a specific week with caching
     *
     * Uses different TTLs based on game status:
     * - Scheduled: 6 hours (games can be rescheduled)
     * - In-progress: 1 hour (scores updating)
     * - Completed: 24 hours (final scores don't change)
     *
     * @param season - Season year
     * @param week - Week number
     * @returns Array of raw NFL game data for the week
     */
    private async fetchWeekGames(
        season: number,
        week: number
    ): Promise<RawNFLGame[]> {
        const url = `${this.SCOREBOARD_URL}?seasontype=2&week=${week}&dates=${season}`;
        const cacheKey = { season, week, type: "games" };

        // Check cache first
        if (this.cacheService) {
            const cached =
                await this.cacheService.get<ESPNScoreboardResponse>(
                    "espn",
                    "games",
                    cacheKey
                );

            if (cached.hit && cached.data) {
                log.debug({ season, week }, "Cache hit for games");
                return this.parseGamesFromScoreboard(cached.data, season, week);
            }
        }

        // Fetch from API
        try {
            const response = await this.fetchWithRateLimit(url);
            const data = (await response.json()) as ESPNScoreboardResponse;

            // Parse games to determine appropriate TTL
            const games = this.parseGamesFromScoreboard(data, season, week);

            // Determine TTL based on game statuses
            // Use shortest TTL if any games are in-progress
            const ttlMs = this.determineCacheTTL(games);

            // Cache the response
            if (this.cacheService) {
                await this.cacheService.set(
                    "espn",
                    "games",
                    cacheKey,
                    data as unknown as Json,
                    {
                        ttlMs,
                        season,
                        week,
                    }
                );
            }

            return games;
        } catch (error) {
            log.warn({ season, week, error }, "Failed to fetch games for week");
            return [];
        }
    }

    /**
     * Parse ESPN scoreboard response into RawNFLGame objects
     *
     * Extracts all game information including venue and status details.
     *
     * @param data - ESPN scoreboard response
     * @param season - Season year
     * @param week - Week number
     * @returns Array of parsed game objects
     */
    private parseGamesFromScoreboard(
        data: ESPNScoreboardResponse,
        season: number,
        week: number
    ): RawNFLGame[] {
        const games: RawNFLGame[] = [];

        for (const event of data.events ?? []) {
            const competition = event.competitions?.[0];
            if (!competition) continue;

            const homeCompetitor = competition.competitors.find(
                (c) => c.homeAway === "home"
            );
            const awayCompetitor = competition.competitors.find(
                (c) => c.homeAway === "away"
            );

            if (!homeCompetitor || !awayCompetitor) continue;

            // Determine game status from ESPN status
            const status = this.parseGameStatus(event.status);

            // Parse scores (null for scheduled games)
            const homeScore =
                status === "scheduled"
                    ? null
                    : parseInt(homeCompetitor.score) || 0;
            const awayScore =
                status === "scheduled"
                    ? null
                    : parseInt(awayCompetitor.score) || 0;

            // Parse venue information
            const venue = competition.venue
                ? {
                      name: competition.venue.fullName,
                      city: competition.venue.address?.city ?? "",
                      state: competition.venue.address?.state ?? "",
                  }
                : undefined;

            games.push({
                espnGameId: event.id,
                season,
                week,
                homeTeam: homeCompetitor.team.abbreviation as NFLTeam,
                awayTeam: awayCompetitor.team.abbreviation as NFLTeam,
                homeScore,
                awayScore,
                gameDate: event.date,
                venue,
                status,
            });
        }

        return games;
    }

    /**
     * Parse ESPN event status into our game status type
     *
     * @param espnStatus - ESPN status object
     * @returns Normalized game status
     */
    private parseGameStatus(espnStatus: ESPNEvent["status"]): NFLGameStatus {
        const state = espnStatus.type.state.toLowerCase();
        const completed = espnStatus.type.completed;

        if (completed) {
            return "final";
        } else if (state === "in") {
            return "in_progress";
        } else {
            return "scheduled";
        }
    }

    /**
     * Determine appropriate cache TTL based on game statuses
     *
     * Uses the most conservative (shortest) TTL if games have mixed statuses.
     *
     * @param games - Array of games to check
     * @returns TTL in milliseconds
     */
    private determineCacheTTL(games: RawNFLGame[]): number {
        // Check if any games are in-progress
        const hasInProgress = games.some((g) => g.status === "in_progress");
        if (hasInProgress) {
            return CACHE_TTL.IN_PROGRESS_GAME;
        }

        // Check if any games are scheduled (upcoming)
        const hasScheduled = games.some((g) => g.status === "scheduled");
        if (hasScheduled) {
            return CACHE_TTL.SCHEDULE;
        }

        // All games are completed
        return CACHE_TTL.COMPLETED_GAME;
    }

    /**
     * Get all weeks for a season (including future weeks)
     *
     * Unlike getWeeksToFetch which only returns past weeks,
     * this returns all 18 regular season weeks.
     *
     * @param season - Season year
     * @returns Array of week numbers (1-18)
     */
    private getAllWeeksForSeason(season: number): number[] {
        // For regular season, return weeks 1-18
        // Could be extended to include playoffs (weeks 19-22)
        return Array.from({ length: 18 }, (_, i) => i + 1);
    }

    /**
     * Health check for ESPN API
     */
    async healthCheck(): Promise<HealthCheckResult> {
        const start = Date.now();

        try {
            const response = await this.fetchWithRateLimit(this.SCOREBOARD_URL);

            if (!response.ok) {
                return {
                    healthy: false,
                    message: `ESPN API returned status ${response.status}`,
                    latencyMs: Date.now() - start,
                };
            }

            return {
                healthy: true,
                message: "ESPN API is accessible",
                latencyMs: Date.now() - start,
            };
        } catch (error) {
            return {
                healthy: false,
                message: `ESPN API health check failed: ${error}`,
                latencyMs: Date.now() - start,
            };
        }
    }

    // =========================================================================
    // Private helper methods
    // =========================================================================

    /**
     * Fetch schedule for a season/week
     */
    private async fetchSchedule(
        season: number,
        week?: number
    ): Promise<
        Array<{
            gameId: string;
            week: number;
            homeTeam: NFLTeam;
            awayTeam: NFLTeam;
            homeScore: number;
            awayScore: number;
            completed: boolean;
        }>
    > {
        const games: Array<{
            gameId: string;
            week: number;
            homeTeam: NFLTeam;
            awayTeam: NFLTeam;
            homeScore: number;
            awayScore: number;
            completed: boolean;
        }> = [];

        const weeks = week ? [week] : this.getWeeksToFetch(season);

        for (const w of weeks) {
            const url = `${this.SCOREBOARD_URL}?seasontype=2&week=${w}&dates=${season}`;
            const cacheKey = { season, week: w, type: "scoreboard" };

            // Check cache first
            if (this.cacheService) {
                const cached =
                    await this.cacheService.get<ESPNScoreboardResponse>(
                        "espn",
                        "scoreboard",
                        cacheKey
                    );

                if (cached.hit && cached.data) {
                    const weekGames = this.parseScoreboardResponse(
                        cached.data,
                        w
                    );
                    games.push(...weekGames);
                    continue;
                }
            }

            // Fetch from API
            try {
                const response = await this.fetchWithRateLimit(url);
                const data = (await response.json()) as ESPNScoreboardResponse;

                // Cache the response
                if (this.cacheService) {
                    await this.cacheService.set(
                        "espn",
                        "scoreboard",
                        cacheKey,
                        data as unknown as Json,
                        {
                            ttlMs: CacheService.getTTL("schedule"),
                            season,
                            week: w,
                        }
                    );
                }

                const weekGames = this.parseScoreboardResponse(data, w);
                games.push(...weekGames);
            } catch (error) {
                log.warn({ week: w, error }, "Failed to fetch week");
            }
        }

        return games;
    }

    /**
     * Parse scoreboard response into game objects
     */
    private parseScoreboardResponse(
        data: ESPNScoreboardResponse,
        week: number
    ): Array<{
        gameId: string;
        week: number;
        homeTeam: NFLTeam;
        awayTeam: NFLTeam;
        homeScore: number;
        awayScore: number;
        completed: boolean;
    }> {
        const games: Array<{
            gameId: string;
            week: number;
            homeTeam: NFLTeam;
            awayTeam: NFLTeam;
            homeScore: number;
            awayScore: number;
            completed: boolean;
        }> = [];

        for (const event of data.events ?? []) {
            const competition = event.competitions?.[0];
            if (!competition) continue;

            const homeTeam = competition.competitors.find(
                (c) => c.homeAway === "home"
            );
            const awayTeam = competition.competitors.find(
                (c) => c.homeAway === "away"
            );

            if (!homeTeam || !awayTeam) continue;

            games.push({
                gameId: event.id,
                week,
                homeTeam: homeTeam.team.abbreviation as NFLTeam,
                awayTeam: awayTeam.team.abbreviation as NFLTeam,
                homeScore: parseInt(homeTeam.score) || 0,
                awayScore: parseInt(awayTeam.score) || 0,
                completed: event.status.type.completed,
            });
        }

        return games;
    }

    /**
     * Fetch game summary (boxscore) from ESPN
     */
    private async fetchGameSummary(
        gameId: string
    ): Promise<ESPNGameSummaryResponse> {
        const url = `${this.SUMMARY_URL}?event=${gameId}`;
        const cacheKey = { gameId };

        // Check cache first
        if (this.cacheService) {
            const cached = await this.cacheService.get<ESPNGameSummaryResponse>(
                "espn",
                "summary",
                cacheKey
            );

            if (cached.hit && cached.data) {
                return cached.data;
            }
        }

        const response = await this.fetchWithRateLimit(url);
        const data = (await response.json()) as ESPNGameSummaryResponse;

        // Cache the response
        if (this.cacheService) {
            await this.cacheService.set(
                "espn",
                "summary",
                cacheKey,
                data as unknown as Json,
                {
                    ttlMs: CacheService.getTTL("game"),
                    gameId,
                }
            );
        }

        return data;
    }

    /**
     * Fetch athlete detail from ESPN
     */
    private async fetchAthleteDetail(
        athleteId: string
    ): Promise<ESPNAthleteResponse | null> {
        const url = `${this.ATHLETE_URL}/${athleteId}`;
        const cacheKey = { athleteId };

        // Check cache first
        if (this.cacheService) {
            const cached = await this.cacheService.get<ESPNAthleteResponse>(
                "espn",
                "athlete",
                cacheKey
            );

            if (cached.hit && cached.data) {
                return cached.data;
            }
        }

        try {
            const response = await this.fetchWithRateLimit(url);
            const data = (await response.json()) as ESPNAthleteResponse;

            // Cache the response
            if (this.cacheService) {
                await this.cacheService.set(
                    "espn",
                    "athlete",
                    cacheKey,
                    data as unknown as Json,
                    {
                        ttlMs: CacheService.getTTL("player"),
                    }
                );
            }

            return data;
        } catch {
            return null;
        }
    }

    /**
     * Extract players from game summary
     */
    private extractPlayersFromSummary(
        summary: ESPNGameSummaryResponse
    ): RawPlayer[] {
        const players: RawPlayer[] = [];
        const seenIds = new Set<string>();

        for (const team of summary.boxscore?.players ?? []) {
            for (const category of team.statistics ?? []) {
                for (const athleteStats of category.athletes ?? []) {
                    const athlete = athleteStats.athlete;
                    if (!athlete || seenIds.has(athlete.id)) continue;

                    seenIds.add(athlete.id);
                    players.push({
                        externalId: athlete.id,
                        name: athlete.displayName,
                        imageUrl: undefined, // ESPN doesn't include in boxscore
                    });
                }
            }
        }

        return players;
    }

    /**
     * Extract player team info from game summary
     */
    private extractPlayerTeamsFromSummary(
        summary: ESPNGameSummaryResponse,
        playerTeamMap: Map<string, { team: NFLTeam; jersey: number }>
    ): void {
        for (const team of summary.boxscore?.players ?? []) {
            const teamAbbr = team.team.abbreviation as NFLTeam;

            for (const category of team.statistics ?? []) {
                for (const athleteStats of category.athletes ?? []) {
                    const athlete = athleteStats.athlete;
                    if (!athlete) continue;

                    if (!playerTeamMap.has(athlete.id)) {
                        playerTeamMap.set(athlete.id, {
                            team: teamAbbr,
                            jersey: 0, // ESPN doesn't include jersey in boxscore
                        });
                    }
                }
            }
        }
    }

    /**
     * Fetch stats for a specific week
     */
    private async fetchWeekStats(
        season: number,
        week: number
    ): Promise<RawNFLWeeklyStat[]> {
        const stats: RawNFLWeeklyStat[] = [];

        // Get games for this week
        const schedule = await this.fetchSchedule(season, week);

        for (const game of schedule) {
            if (!game.completed) continue;

            try {
                const summary = await this.fetchGameSummary(game.gameId);
                const gameStats = this.extractStatsFromSummary(
                    summary,
                    season,
                    week,
                    game
                );
                stats.push(...gameStats);
            } catch (error) {
                log.warn(
                    { gameId: game.gameId, error },
                    "Failed to fetch stats for game"
                );
            }
        }

        return stats;
    }

    /**
     * Extract player stats from game summary
     */
    private extractStatsFromSummary(
        summary: ESPNGameSummaryResponse,
        season: number,
        week: number,
        game: {
            gameId: string;
            homeTeam: NFLTeam;
            awayTeam: NFLTeam;
            homeScore: number;
            awayScore: number;
        }
    ): RawNFLWeeklyStat[] {
        const stats: RawNFLWeeklyStat[] = [];
        const playerStatsMap = new Map<string, Partial<RawNFLWeeklyStat>>();

        for (const team of summary.boxscore?.players ?? []) {
            const teamAbbr = team.team.abbreviation as NFLTeam;
            const isHome = teamAbbr === game.homeTeam;
            const opponent = isHome ? game.awayTeam : game.homeTeam;

            // Determine result
            const teamScore = isHome ? game.homeScore : game.awayScore;
            const oppScore = isHome ? game.awayScore : game.homeScore;
            const won = teamScore > oppScore;
            const result = won
                ? `W ${teamScore}-${oppScore}`
                : `L ${oppScore}-${teamScore}`;

            for (const category of team.statistics ?? []) {
                const categoryName = category.name.toLowerCase();

                for (const athleteStats of category.athletes ?? []) {
                    const athlete = athleteStats.athlete;
                    if (!athlete) continue;

                    // Initialize player stats if needed
                    if (!playerStatsMap.has(athlete.id)) {
                        playerStatsMap.set(athlete.id, {
                            playerExternalId: athlete.id,
                            season,
                            week,
                            opponent,
                            location: isHome ? "H" : "A",
                            result,
                        });
                    }

                    const playerStats = playerStatsMap.get(athlete.id)!;

                    // Parse stats based on category
                    this.parseStatCategory(
                        categoryName,
                        category.keys,
                        athleteStats.stats,
                        playerStats
                    );
                }
            }
        }

        // Convert to array
        for (const playerStats of playerStatsMap.values()) {
            stats.push(playerStats as RawNFLWeeklyStat);
        }

        return stats;
    }

    /**
     * Parse stats from a category
     */
    private parseStatCategory(
        categoryName: string,
        keys: string[],
        values: string[],
        playerStats: Partial<RawNFLWeeklyStat>
    ): void {
        // Create key-value map
        const statMap = new Map<string, string>();
        for (let i = 0; i < keys.length && i < values.length; i++) {
            statMap.set(keys[i].toLowerCase(), values[i]);
        }

        switch (categoryName) {
            case "passing":
                this.parsePassingStats(statMap, playerStats);
                break;
            case "rushing":
                this.parseRushingStats(statMap, playerStats);
                break;
            case "receiving":
                this.parseReceivingStats(statMap, playerStats);
                break;
        }
    }

    /**
     * Parse passing stats
     */
    private parsePassingStats(
        statMap: Map<string, string>,
        playerStats: Partial<RawNFLWeeklyStat>
    ): void {
        // ESPN format: "C/ATT" for completions/attempts
        const compAtt = statMap.get("c/att") ?? statMap.get("comp/att");
        if (compAtt) {
            const [comp, att] = compAtt.split("/").map((s) => parseInt(s) || 0);
            playerStats.completions = comp;
            playerStats.attempts = att;
        }

        playerStats.passingYards =
            parseInt(
                statMap.get("yds") ?? statMap.get("passingyards") ?? "0"
            ) || 0;
        playerStats.passingTDs =
            parseInt(
                statMap.get("td") ?? statMap.get("passingtouchdowns") ?? "0"
            ) || 0;
        playerStats.interceptions =
            parseInt(
                statMap.get("int") ?? statMap.get("interceptions") ?? "0"
            ) || 0;
    }

    /**
     * Parse rushing stats
     */
    private parseRushingStats(
        statMap: Map<string, string>,
        playerStats: Partial<RawNFLWeeklyStat>
    ): void {
        playerStats.carries =
            parseInt(
                statMap.get("car") ?? statMap.get("rushingcarries") ?? "0"
            ) || 0;
        playerStats.rushingYards =
            parseInt(
                statMap.get("yds") ?? statMap.get("rushingyards") ?? "0"
            ) || 0;
        playerStats.rushingTDs =
            parseInt(
                statMap.get("td") ?? statMap.get("rushingtouchdowns") ?? "0"
            ) || 0;
    }

    /**
     * Parse receiving stats
     */
    private parseReceivingStats(
        statMap: Map<string, string>,
        playerStats: Partial<RawNFLWeeklyStat>
    ): void {
        playerStats.receptions =
            parseInt(statMap.get("rec") ?? statMap.get("receptions") ?? "0") ||
            0;
        playerStats.receivingYards =
            parseInt(
                statMap.get("yds") ?? statMap.get("receivingyards") ?? "0"
            ) || 0;
        playerStats.receivingTDs =
            parseInt(
                statMap.get("td") ?? statMap.get("receivingtouchdowns") ?? "0"
            ) || 0;
        playerStats.targets =
            parseInt(statMap.get("tgt") ?? statMap.get("targets") ?? "0") || 0;
    }

    /**
     * Fetch with rate limiting
     */
    private async fetchWithRateLimit(url: string): Promise<Response> {
        const rateLimiter = getRateLimiter();

        return rateLimiter.execute("espn", async () => {
            const response = await fetch(url, {
                headers: {
                    "User-Agent": "StatLine/1.0 (NFL Stats Aggregator)",
                    Accept: "application/json",
                },
            });

            if (!response.ok) {
                throw new Error(
                    `ESPN API error: ${response.status} ${response.statusText}`
                );
            }

            return response;
        });
    }

    /**
     * Get weeks to fetch for a season
     */
    private getWeeksToFetch(season: number): number[] {
        const currentSeason = this.getCurrentSeason();
        const currentWeek = this.getCurrentWeek();

        // If current season, only fetch up to current week
        const maxWeek = season === currentSeason ? currentWeek : 18;

        return Array.from({ length: maxWeek }, (_, i) => i + 1);
    }

    /**
     * Get current NFL week (approximate)
     */
    private getCurrentWeek(): number {
        const now = new Date();
        const seasonStart = new Date(now.getFullYear(), 8, 5); // First Thursday of September (approx)

        if (now < seasonStart) {
            return 0;
        }

        const weeksSinceStart = Math.floor(
            (now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000)
        );

        return Math.min(Math.max(weeksSinceStart + 1, 1), 18);
    }

    /**
     * Normalize position abbreviation
     */
    private normalizePosition(position: string): NFLPosition {
        const normalized = position.toUpperCase();

        switch (normalized) {
            case "QB":
                return "QB";
            case "RB":
            case "FB":
                return "RB";
            case "WR":
                return "WR";
            case "TE":
                return "TE";
            default:
                // Default to WR for unknown offensive positions
                return "WR";
        }
    }
}
