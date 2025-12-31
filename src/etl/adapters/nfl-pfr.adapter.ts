/**
 * NFL Pro Football Reference (PFR) Data Source Adapter
 *
 * Scrapes NFL data from Pro Football Reference.
 * Primary source for historical backfill and fallback for ESPN.
 *
 * Scrape targets:
 * - Player game logs: Weekly stats for a player/season
 * - Player pages: Basic player info and career data
 *
 * Features:
 * - Respectful rate limiting (1 req/sec)
 * - HTML parsing with defensive error handling
 * - Caching of scraped content
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
    Json,
} from "../types";
import { CacheService } from "../services/cache.service";
import { getRateLimiter } from "../services/rate-limiter.service";
import { createChildLogger } from "@/lib/logger";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/** Logger for PFR adapter operations */
const log = createChildLogger({ adapter: "nfl-pfr" });

// ============================================================================
// PFR Types
// ============================================================================

/**
 * PFR player info extracted from pages
 */
interface PFRPlayerInfo {
    slug: string;
    name: string;
    position: string;
    team: string;
    jerseyNumber: number;
    college?: string;
    draftYear?: number;
    draftRound?: number;
    draftPick?: number;
}

/**
 * PFR game log row
 */
interface PFRGameLogRow {
    week: number;
    date: string;
    team: string;
    location: "H" | "A";
    opponent: string;
    result: string;
    stats: Record<string, number>;
}

// ============================================================================
// PFR Adapter Implementation
// ============================================================================

/**
 * NFL PFR Adapter for scraping data from Pro Football Reference
 */
export class NFLPFRAdapter extends NFLBaseAdapter {
    readonly name = "nfl-pfr";
    readonly version = "1.0.0";
    readonly description =
        "Pro Football Reference scraping adapter for NFL historical data";

    // PFR base URL
    private readonly BASE_URL = "https://www.pro-football-reference.com";

    // Cache service (optional - set via setCacheService)
    private cacheService: CacheService | null = null;

    // Known player slugs for fetching (populated externally or via search)
    private playerSlugs: Map<string, string> = new Map();

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
    static withCache(supabaseClient: SupabaseClient<Database>): NFLPFRAdapter {
        const adapter = new NFLPFRAdapter();
        adapter.setCacheService(new CacheService(supabaseClient));
        return adapter;
    }

    /**
     * Set known player slugs for fetching
     * PFR slugs are like "MahoPa00" for Patrick Mahomes
     *
     * @param slugs - Map of player name to PFR slug
     */
    setPlayerSlugs(slugs: Map<string, string>): void {
        this.playerSlugs = slugs;
    }

    /**
     * Add a player slug
     *
     * @param name - Player name
     * @param slug - PFR slug
     */
    addPlayerSlug(name: string, slug: string): void {
        this.playerSlugs.set(name.toLowerCase(), slug);
    }

    /**
     * Fetch players from PFR
     * Requires known player slugs to be set
     */
    async fetchPlayers(options: AdapterFetchOptions): Promise<RawPlayer[]> {
        const players: RawPlayer[] = [];

        for (const [name, slug] of this.playerSlugs) {
            try {
                const playerInfo = await this.fetchPlayerPage(slug);

                if (playerInfo) {
                    players.push({
                        externalId: slug,
                        name: playerInfo.name,
                        imageUrl: undefined, // PFR doesn't provide easily scrapeable images
                    });
                }
            } catch (error) {
                log.warn({ slug, error }, "Failed to fetch player");
            }
        }

        return players;
    }

    /**
     * Fetch player profiles from PFR
     */
    async fetchPlayerProfiles(
        options: AdapterFetchOptions
    ): Promise<RawPlayerProfile[]> {
        const profiles: RawPlayerProfile[] = [];

        for (const [name, slug] of this.playerSlugs) {
            try {
                const playerInfo = await this.fetchPlayerPage(slug);

                if (playerInfo) {
                    profiles.push({
                        playerExternalId: slug,
                        sportId: "nfl",
                        position: this.normalizePosition(playerInfo.position),
                        metadata: {
                            college: playerInfo.college,
                            draft_year: playerInfo.draftYear,
                            draft_round: playerInfo.draftRound,
                            draft_pick: playerInfo.draftPick,
                            pfr_slug: slug,
                        },
                    });
                }
            } catch (error) {
                log.warn({ slug, error }, "Failed to fetch profile");
            }
        }

        return profiles;
    }

    /**
     * Fetch NFL player seasons from PFR
     */
    async fetchPlayerSeasons(
        options: AdapterFetchOptions
    ): Promise<RawNFLPlayerSeason[]> {
        const seasons: RawNFLPlayerSeason[] = [];

        for (const [name, slug] of this.playerSlugs) {
            try {
                const playerInfo = await this.fetchPlayerPage(slug);

                if (playerInfo) {
                    seasons.push({
                        playerExternalId: slug,
                        season: options.season,
                        team: this.normalizeTeam(playerInfo.team),
                        jerseyNumber: playerInfo.jerseyNumber,
                        isActive: true,
                    });
                }
            } catch (error) {
                log.warn({ slug, error }, "Failed to fetch season");
            }
        }

        return seasons;
    }

    /**
     * Fetch NFL weekly stats from PFR
     */
    async fetchWeeklyStats(
        options: AdapterFetchOptions
    ): Promise<RawNFLWeeklyStat[]> {
        const stats: RawNFLWeeklyStat[] = [];

        for (const [name, slug] of this.playerSlugs) {
            try {
                const gameLogs = await this.fetchPlayerGameLog(
                    slug,
                    options.season
                );

                for (const log of gameLogs) {
                    // Filter by week if specified
                    if (options.week && log.week !== options.week) {
                        continue;
                    }

                    stats.push({
                        playerExternalId: slug,
                        season: options.season,
                        week: log.week,
                        opponent: this.normalizeTeam(log.opponent),
                        location: log.location,
                        result: log.result,
                        // Passing stats
                        passingYards: log.stats.pass_yds ?? 0,
                        passingTDs: log.stats.pass_td ?? 0,
                        interceptions: log.stats.pass_int ?? 0,
                        completions: log.stats.pass_cmp ?? 0,
                        attempts: log.stats.pass_att ?? 0,
                        // Rushing stats
                        rushingYards: log.stats.rush_yds ?? 0,
                        rushingTDs: log.stats.rush_td ?? 0,
                        carries: log.stats.rush_att ?? 0,
                        // Receiving stats
                        receivingYards: log.stats.rec_yds ?? 0,
                        receivingTDs: log.stats.rec_td ?? 0,
                        receptions: log.stats.rec ?? 0,
                        targets: log.stats.targets ?? 0,
                    });
                }
            } catch (error) {
                log.warn({ slug, error }, "Failed to fetch game log");
            }
        }

        return stats;
    }

    /**
     * Fetch NFL games from PFR
     *
     * Note: PFR is primarily used for player stats, not schedule data.
     * This method returns an empty array as game data should come from ESPN.
     */
    async fetchGames(_options: AdapterFetchOptions): Promise<RawNFLGame[]> {
        log.debug(
            "PFR adapter does not support game fetching, returning empty array"
        );
        return [];
    }

    /**
     * Health check for PFR
     */
    async healthCheck(): Promise<HealthCheckResult> {
        const start = Date.now();

        try {
            const response = await this.fetchWithRateLimit(this.BASE_URL);

            if (!response.ok) {
                return {
                    healthy: false,
                    message: `PFR returned status ${response.status}`,
                    latencyMs: Date.now() - start,
                };
            }

            return {
                healthy: true,
                message: "PFR is accessible",
                latencyMs: Date.now() - start,
            };
        } catch (error) {
            return {
                healthy: false,
                message: `PFR health check failed: ${error}`,
                latencyMs: Date.now() - start,
            };
        }
    }

    // =========================================================================
    // Private helper methods
    // =========================================================================

    /**
     * Fetch and parse a player page
     */
    private async fetchPlayerPage(slug: string): Promise<PFRPlayerInfo | null> {
        const firstLetter = slug.charAt(0).toUpperCase();
        const url = `${this.BASE_URL}/players/${firstLetter}/${slug}.htm`;
        const cacheKey = { slug, type: "player" };

        // Check cache first
        if (this.cacheService) {
            const cached = await this.cacheService.get<{ html: string }>(
                "pfr",
                "player",
                cacheKey
            );

            if (cached.hit && cached.data) {
                return this.parsePlayerPage(cached.data.html, slug);
            }
        }

        const response = await this.fetchWithRateLimit(url);
        const html = await response.text();

        // Cache the response
        if (this.cacheService) {
            await this.cacheService.set(
                "pfr",
                "player",
                cacheKey,
                { html } as unknown as Json,
                {
                    ttlMs: CacheService.getTTL("player", true),
                }
            );
        }

        return this.parsePlayerPage(html, slug);
    }

    /**
     * Parse player page HTML
     */
    private parsePlayerPage(html: string, slug: string): PFRPlayerInfo | null {
        try {
            // Extract player name from title or h1
            const nameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
            const name = nameMatch ? nameMatch[1].trim() : "";

            if (!name) {
                return null;
            }

            // Extract position from meta info
            const positionMatch = html.match(/Position<\/strong>:\s*([A-Z]+)/i);
            const position = positionMatch ? positionMatch[1] : "QB";

            // Extract team from current team section
            const teamMatch = html.match(
                /Team<\/strong>:\s*<a[^>]*>([^<]+)<\/a>/i
            );
            const team = teamMatch ? teamMatch[1] : "";

            // Extract jersey number
            const jerseyMatch = html.match(/Number<\/strong>:\s*(\d+)/i);
            const jerseyNumber = jerseyMatch ? parseInt(jerseyMatch[1]) : 0;

            // Extract college
            const collegeMatch = html.match(
                /College<\/strong>:\s*<a[^>]*>([^<]+)<\/a>/i
            );
            const college = collegeMatch ? collegeMatch[1] : undefined;

            // Extract draft info
            const draftMatch = html.match(
                /Draft<\/strong>:\s*<a[^>]*>[^<]+<\/a>\s*in\s*the\s*(\d+)\w*\s*round\s*\((\d+)\w*\s*overall\)\s*of\s*the\s*<a[^>]*>(\d+)/i
            );
            let draftYear: number | undefined;
            let draftRound: number | undefined;
            let draftPick: number | undefined;

            if (draftMatch) {
                draftRound = parseInt(draftMatch[1]);
                draftPick = parseInt(draftMatch[2]);
                draftYear = parseInt(draftMatch[3]);
            }

            return {
                slug,
                name,
                position,
                team,
                jerseyNumber,
                college,
                draftYear,
                draftRound,
                draftPick,
            };
        } catch (error) {
            log.warn({ slug, error }, "Failed to parse player page");
            return null;
        }
    }

    /**
     * Fetch and parse player game log for a season
     */
    private async fetchPlayerGameLog(
        slug: string,
        season: number
    ): Promise<PFRGameLogRow[]> {
        const firstLetter = slug.charAt(0).toUpperCase();
        const url = `${this.BASE_URL}/players/${firstLetter}/${slug}/gamelog/${season}/`;
        const cacheKey = { slug, season, type: "gamelog" };

        // Check cache first
        if (this.cacheService) {
            const cached = await this.cacheService.get<{ html: string }>(
                "pfr",
                "gamelog",
                cacheKey
            );

            if (cached.hit && cached.data) {
                return this.parseGameLog(cached.data.html);
            }
        }

        try {
            const response = await this.fetchWithRateLimit(url);
            const html = await response.text();

            // Cache the response
            if (this.cacheService) {
                await this.cacheService.set(
                    "pfr",
                    "gamelog",
                    cacheKey,
                    { html } as unknown as Json,
                    {
                        ttlMs: CacheService.getTTL(
                            "game",
                            season < this.getCurrentSeason()
                        ),
                        season,
                    }
                );
            }

            return this.parseGameLog(html);
        } catch (error) {
            log.warn(
                { slug, season, error },
                "Failed to fetch game log for season"
            );
            return [];
        }
    }

    /**
     * Parse game log HTML table
     */
    private parseGameLog(html: string): PFRGameLogRow[] {
        const rows: PFRGameLogRow[] = [];

        try {
            // Find the stats table
            const tableMatch = html.match(
                /<table[^>]*id="stats"[^>]*>([\s\S]*?)<\/table>/i
            );

            if (!tableMatch) {
                // Try alternate table ID
                const altTableMatch = html.match(
                    /<table[^>]*id="stats_games"[^>]*>([\s\S]*?)<\/table>/i
                );
                if (!altTableMatch) {
                    return rows;
                }
            }

            const tableHtml = tableMatch ? tableMatch[1] : "";

            // Extract header to get column mappings
            const headerMatch = tableHtml.match(/<thead>([\s\S]*?)<\/thead>/i);
            const columns = this.parseTableHeader(
                headerMatch ? headerMatch[1] : ""
            );

            // Extract body rows
            const bodyMatch = tableHtml.match(/<tbody>([\s\S]*?)<\/tbody>/i);
            if (!bodyMatch) {
                return rows;
            }

            // Parse each row
            const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
            let rowMatch;

            while ((rowMatch = rowRegex.exec(bodyMatch[1])) !== null) {
                const rowHtml = rowMatch[1];

                // Skip header rows and divider rows
                if (
                    rowHtml.includes('class="thead"') ||
                    rowHtml.includes('class="partial_table"')
                ) {
                    continue;
                }

                const row = this.parseTableRow(rowHtml, columns);
                if (row) {
                    rows.push(row);
                }
            }
        } catch (error) {
            log.warn({ error }, "Failed to parse game log");
        }

        return rows;
    }

    /**
     * Parse table header to get column mappings
     */
    private parseTableHeader(headerHtml: string): Map<number, string> {
        const columns = new Map<number, string>();

        // Find the last header row (actual column names)
        const headerRowMatch = headerHtml.match(
            /<tr[^>]*>(?!.*<tr)([\s\S]*?)<\/tr>/i
        );
        if (!headerRowMatch) {
            return columns;
        }

        // Extract th elements
        const thRegex = /<th[^>]*data-stat="([^"]+)"[^>]*>/gi;
        let thMatch;
        let index = 0;

        while ((thMatch = thRegex.exec(headerRowMatch[1])) !== null) {
            columns.set(index, thMatch[1]);
            index++;
        }

        return columns;
    }

    /**
     * Parse a table row into a game log row
     */
    private parseTableRow(
        rowHtml: string,
        columns: Map<number, string>
    ): PFRGameLogRow | null {
        try {
            const cells: string[] = [];

            // Extract td/th values
            const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
            let cellMatch;

            while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
                // Strip HTML tags from cell content
                const cellContent = cellMatch[1].replace(/<[^>]+>/g, "").trim();
                cells.push(cellContent);
            }

            if (cells.length === 0) {
                return null;
            }

            // Map cells to column names
            const cellMap = new Map<string, string>();
            for (let i = 0; i < cells.length; i++) {
                const colName = columns.get(i);
                if (colName) {
                    cellMap.set(colName, cells[i]);
                }
            }

            // Extract week number
            const weekStr =
                cellMap.get("week_num") ?? cellMap.get("game_num") ?? "0";
            const week = parseInt(weekStr) || 0;

            if (week === 0) {
                return null;
            }

            // Extract game location
            const gameLocation = cellMap.get("game_location") ?? "";
            const location: "H" | "A" = gameLocation === "@" ? "A" : "H";

            // Extract opponent
            const opponent = cellMap.get("opp") ?? cellMap.get("opp_id") ?? "";

            // Extract result
            const result = cellMap.get("game_result") ?? "";

            // Extract stats
            const stats: Record<string, number> = {};

            // Passing stats
            stats.pass_cmp = parseInt(cellMap.get("pass_cmp") ?? "0") || 0;
            stats.pass_att = parseInt(cellMap.get("pass_att") ?? "0") || 0;
            stats.pass_yds = parseInt(cellMap.get("pass_yds") ?? "0") || 0;
            stats.pass_td = parseInt(cellMap.get("pass_td") ?? "0") || 0;
            stats.pass_int = parseInt(cellMap.get("pass_int") ?? "0") || 0;

            // Rushing stats
            stats.rush_att = parseInt(cellMap.get("rush_att") ?? "0") || 0;
            stats.rush_yds = parseInt(cellMap.get("rush_yds") ?? "0") || 0;
            stats.rush_td = parseInt(cellMap.get("rush_td") ?? "0") || 0;

            // Receiving stats
            stats.targets = parseInt(cellMap.get("targets") ?? "0") || 0;
            stats.rec = parseInt(cellMap.get("rec") ?? "0") || 0;
            stats.rec_yds = parseInt(cellMap.get("rec_yds") ?? "0") || 0;
            stats.rec_td = parseInt(cellMap.get("rec_td") ?? "0") || 0;

            return {
                week,
                date: cellMap.get("game_date") ?? "",
                team: cellMap.get("team") ?? "",
                location,
                opponent,
                result,
                stats,
            };
        } catch (error) {
            log.warn({ error }, "Failed to parse table row");
            return null;
        }
    }

    /**
     * Fetch with rate limiting
     */
    private async fetchWithRateLimit(url: string): Promise<Response> {
        const rateLimiter = getRateLimiter();

        return rateLimiter.execute("pfr", async () => {
            const response = await fetch(url, {
                headers: {
                    // Identify as a bot (non-deceptive)
                    "User-Agent":
                        "StatLine/1.0 (NFL Stats Aggregator; +https://checkstatline.com)",
                    Accept: "text/html,application/xhtml+xml",
                },
            });

            if (!response.ok) {
                throw new Error(
                    `PFR error: ${response.status} ${response.statusText}`
                );
            }

            return response;
        });
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
            case "HB":
                return "RB";
            case "WR":
            case "FL":
            case "SE":
                return "WR";
            case "TE":
                return "TE";
            default:
                return "WR";
        }
    }

    /**
     * Normalize team abbreviation to standard format
     */
    private normalizeTeam(team: string): NFLTeam {
        const teamMap: Record<string, NFLTeam> = {
            // Standard abbreviations
            ARI: "ARI",
            ATL: "ATL",
            BAL: "BAL",
            BUF: "BUF",
            CAR: "CAR",
            CHI: "CHI",
            CIN: "CIN",
            CLE: "CLE",
            DAL: "DAL",
            DEN: "DEN",
            DET: "DET",
            GB: "GB",
            GNB: "GB",
            HOU: "HOU",
            IND: "IND",
            JAX: "JAX",
            JAC: "JAX",
            KC: "KC",
            KAN: "KC",
            LAC: "LAC",
            SDG: "LAC",
            LAR: "LAR",
            STL: "LAR",
            LV: "LV",
            LVR: "LV",
            OAK: "LV",
            MIA: "MIA",
            MIN: "MIN",
            NE: "NE",
            NWE: "NE",
            NO: "NO",
            NOR: "NO",
            NYG: "NYG",
            NYJ: "NYJ",
            PHI: "PHI",
            PIT: "PIT",
            SEA: "SEA",
            SF: "SF",
            SFO: "SF",
            TB: "TB",
            TAM: "TB",
            TEN: "TEN",
            WAS: "WAS",
            WSH: "WAS",
            // Full names (for parsing)
            ARIZONA: "ARI",
            CARDINALS: "ARI",
            ATLANTA: "ATL",
            FALCONS: "ATL",
            BALTIMORE: "BAL",
            RAVENS: "BAL",
            BUFFALO: "BUF",
            BILLS: "BUF",
            CAROLINA: "CAR",
            PANTHERS: "CAR",
            CHICAGO: "CHI",
            BEARS: "CHI",
            CINCINNATI: "CIN",
            BENGALS: "CIN",
            CLEVELAND: "CLE",
            BROWNS: "CLE",
            DALLAS: "DAL",
            COWBOYS: "DAL",
            DENVER: "DEN",
            BRONCOS: "DEN",
            DETROIT: "DET",
            LIONS: "DET",
            "GREEN BAY": "GB",
            PACKERS: "GB",
            HOUSTON: "HOU",
            TEXANS: "HOU",
            INDIANAPOLIS: "IND",
            COLTS: "IND",
            JACKSONVILLE: "JAX",
            JAGUARS: "JAX",
            "KANSAS CITY": "KC",
            CHIEFS: "KC",
            "LOS ANGELES CHARGERS": "LAC",
            CHARGERS: "LAC",
            "LOS ANGELES RAMS": "LAR",
            RAMS: "LAR",
            "LAS VEGAS": "LV",
            RAIDERS: "LV",
            MIAMI: "MIA",
            DOLPHINS: "MIA",
            MINNESOTA: "MIN",
            VIKINGS: "MIN",
            "NEW ENGLAND": "NE",
            PATRIOTS: "NE",
            "NEW ORLEANS": "NO",
            SAINTS: "NO",
            "NEW YORK GIANTS": "NYG",
            GIANTS: "NYG",
            "NEW YORK JETS": "NYJ",
            JETS: "NYJ",
            PHILADELPHIA: "PHI",
            EAGLES: "PHI",
            PITTSBURGH: "PIT",
            STEELERS: "PIT",
            SEATTLE: "SEA",
            SEAHAWKS: "SEA",
            "SAN FRANCISCO": "SF",
            "49ERS": "SF",
            "TAMPA BAY": "TB",
            BUCCANEERS: "TB",
            TENNESSEE: "TEN",
            TITANS: "TEN",
            WASHINGTON: "WAS",
            COMMANDERS: "WAS",
        };

        const normalized = team.toUpperCase().trim();
        return teamMap[normalized] ?? ("WAS" as NFLTeam); // Default fallback
    }
}

// ============================================================================
// Known PFR Player Slugs
// ============================================================================

/**
 * Map of well-known player names to PFR slugs
 * Used for initial data loading
 */
export const KNOWN_PFR_SLUGS: Record<string, string> = {
    // Quarterbacks
    "patrick mahomes": "MahoPa00",
    "josh allen": "AlleJo02",
    "lamar jackson": "JackLa00",
    "joe burrow": "BurrJo01",
    "jalen hurts": "HurtJa00",
    "justin herbert": "HerbJu00",
    "dak prescott": "PresDa01",
    "tua tagovailoa": "TagoTu00",
    "trevor lawrence": "LawrTr00",
    "kyler murray": "MurrKy00",

    // Running Backs
    "derrick henry": "HenrDe00",
    "saquon barkley": "BarkSa00",
    "jahmyr gibbs": "GibbJa00",
    "breece hall": "HallBr00",
    "bijan robinson": "RobiBi00",
    "christian mccaffrey": "McCaCh01",
    "josh jacobs": "JacoJo01",
    "tony pollard": "PollTo00",
    "nick chubb": "ChubNi00",
    "jonathan taylor": "TaylJo02",

    // Wide Receivers
    "tyreek hill": "HillTy00",
    "ceedee lamb": "LambCe00",
    "ja'marr chase": "ChasJa00",
    "amon-ra st. brown": "St.BAm00",
    "a.j. brown": "BrowAJ00",
    "davante adams": "AdamDa01",
    "stefon diggs": "DiggSt00",
    "justin jefferson": "JeffJu00",
    "deebo samuel": "SamuDe00",
    "mike evans": "EvanMi00",

    // Tight Ends
    "travis kelce": "KelcTr00",
    "sam laporta": "LaPo Sa00",
    "t.j. hockenson": "HockTJ00",
    "george kittle": "KittGe00",
    "mark andrews": "AndrMa00",
    "dallas goedert": "GoedDa00",
    "evan engram": "EngrEv00",
    "david njoku": "NjokDa00",
};
