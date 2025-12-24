/**
 * NFL Mock Data Source Adapter
 *
 * Reference implementation of the NFLDataSourceAdapter interface.
 * Generates realistic mock NFL data for testing the ETL pipeline.
 *
 * Use this adapter to:
 * - Test the ETL pipeline without external API calls
 * - Develop and debug transformers/loaders
 * - Seed the database with sample data
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
    NFLTeam,
    NFLPosition,
} from "../types";

/**
 * Mock player data - represents what we'd get from an external API
 */
const MOCK_PLAYERS: Array<{
    name: string;
    position: NFLPosition;
    team: NFLTeam;
    jerseyNumber: number;
}> = [
    { name: "Patrick Mahomes", position: "QB", team: "KC", jerseyNumber: 15 },
    { name: "Josh Allen", position: "QB", team: "BUF", jerseyNumber: 17 },
    { name: "Lamar Jackson", position: "QB", team: "BAL", jerseyNumber: 8 },
    { name: "Joe Burrow", position: "QB", team: "CIN", jerseyNumber: 9 },
    { name: "Jalen Hurts", position: "QB", team: "PHI", jerseyNumber: 1 },
    { name: "Derrick Henry", position: "RB", team: "BAL", jerseyNumber: 22 },
    { name: "Saquon Barkley", position: "RB", team: "PHI", jerseyNumber: 26 },
    { name: "Jahmyr Gibbs", position: "RB", team: "DET", jerseyNumber: 26 },
    { name: "Breece Hall", position: "RB", team: "NYJ", jerseyNumber: 20 },
    { name: "Bijan Robinson", position: "RB", team: "ATL", jerseyNumber: 7 },
    { name: "Tyreek Hill", position: "WR", team: "MIA", jerseyNumber: 10 },
    { name: "CeeDee Lamb", position: "WR", team: "DAL", jerseyNumber: 88 },
    { name: "Ja'Marr Chase", position: "WR", team: "CIN", jerseyNumber: 1 },
    {
        name: "Amon-Ra St. Brown",
        position: "WR",
        team: "DET",
        jerseyNumber: 14,
    },
    { name: "A.J. Brown", position: "WR", team: "PHI", jerseyNumber: 11 },
    { name: "Travis Kelce", position: "TE", team: "KC", jerseyNumber: 87 },
    { name: "Sam LaPorta", position: "TE", team: "DET", jerseyNumber: 87 },
    { name: "T.J. Hockenson", position: "TE", team: "MIN", jerseyNumber: 87 },
    { name: "George Kittle", position: "TE", team: "SF", jerseyNumber: 85 },
    { name: "Mark Andrews", position: "TE", team: "BAL", jerseyNumber: 89 },
];

/**
 * NFL teams for generating opponents
 */
const NFL_TEAMS: NFLTeam[] = [
    "ARI",
    "ATL",
    "BAL",
    "BUF",
    "CAR",
    "CHI",
    "CIN",
    "CLE",
    "DAL",
    "DEN",
    "DET",
    "GB",
    "HOU",
    "IND",
    "JAX",
    "KC",
    "LAC",
    "LAR",
    "LV",
    "MIA",
    "MIN",
    "NE",
    "NO",
    "NYG",
    "NYJ",
    "PHI",
    "PIT",
    "SEA",
    "SF",
    "TB",
    "TEN",
    "WAS",
];

/**
 * NFL Mock adapter for testing the ETL pipeline
 */
export class NFLMockAdapter extends NFLBaseAdapter {
    readonly name = "nfl-mock";
    readonly version = "2.0.0";
    readonly description = "Mock NFL data adapter for testing and development";

    /**
     * Fetch mock player data (core identity only)
     */
    async fetchPlayers(_options: AdapterFetchOptions): Promise<RawPlayer[]> {
        // Simulate network latency
        await this.simulateLatency();

        return MOCK_PLAYERS.map((player) => ({
            externalId: this.generatePlayerId(player.name),
            name: player.name,
            imageUrl: undefined, // Mock doesn't have images
        }));
    }

    /**
     * Fetch mock player profiles (NFL-specific data)
     */
    async fetchPlayerProfiles(
        _options: AdapterFetchOptions
    ): Promise<RawPlayerProfile[]> {
        await this.simulateLatency();

        return MOCK_PLAYERS.map((player) => ({
            playerExternalId: this.generatePlayerId(player.name),
            sportId: "nfl" as const,
            position: player.position,
            metadata: {
                // Mock metadata
                college: this.getMockCollege(player.name),
                draft_year: 2020 + Math.floor(Math.random() * 4),
            },
        }));
    }

    /**
     * Fetch mock NFL player season data
     */
    async fetchPlayerSeasons(
        options: AdapterFetchOptions
    ): Promise<RawNFLPlayerSeason[]> {
        await this.simulateLatency();

        return MOCK_PLAYERS.map((player) => ({
            playerExternalId: this.generatePlayerId(player.name),
            season: options.season,
            team: player.team,
            jerseyNumber: player.jerseyNumber,
            isActive: true,
        }));
    }

    /**
     * Fetch mock NFL weekly stats
     * Generates realistic stats based on position
     */
    async fetchWeeklyStats(
        options: AdapterFetchOptions
    ): Promise<RawNFLWeeklyStat[]> {
        await this.simulateLatency();

        const stats: RawNFLWeeklyStat[] = [];
        const weeksToGenerate = options.week
            ? [options.week]
            : this.getWeeksForSeason(options.season);

        for (const player of MOCK_PLAYERS) {
            const playerId = this.generatePlayerId(player.name);

            for (const week of weeksToGenerate) {
                // Generate opponent (not the player's team)
                const opponent = this.getRandomOpponent(player.team);

                // Generate position-specific stats
                const weekStats = this.generateWeeklyStats(
                    playerId,
                    options.season,
                    week,
                    opponent,
                    player.position
                );

                stats.push(weekStats);
            }
        }

        return stats;
    }

    /**
     * Health check - mock always returns healthy
     */
    async healthCheck(): Promise<HealthCheckResult> {
        const start = Date.now();
        await this.simulateLatency(50); // Minimal latency for health check

        return {
            healthy: true,
            message: "NFL Mock adapter is ready",
            latencyMs: Date.now() - start,
        };
    }

    // =========================================================================
    // Private helper methods
    // =========================================================================

    /**
     * Simulate network latency for realistic testing
     */
    private async simulateLatency(ms: number = 100): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Get a mock college name based on player name hash
     */
    private getMockCollege(name: string): string {
        const colleges = [
            "Alabama",
            "Georgia",
            "Ohio State",
            "LSU",
            "Clemson",
            "Michigan",
            "Texas",
            "Oklahoma",
            "USC",
            "Notre Dame",
        ];
        const hash = this.hashCode(name);
        return colleges[hash % colleges.length];
    }

    /**
     * Get weeks to generate based on season
     * Current season may have fewer weeks played
     */
    private getWeeksForSeason(season: number): number[] {
        const currentSeason = this.getCurrentSeason();
        const currentWeek = this.getCurrentWeek();

        // If current season, only generate up to current week
        const maxWeek = season === currentSeason ? currentWeek : 17;

        return Array.from({ length: maxWeek }, (_, i) => i + 1);
    }

    /**
     * Get approximate current NFL week
     */
    private getCurrentWeek(): number {
        const now = new Date();
        const seasonStart = new Date(now.getFullYear(), 8, 1); // September 1

        if (now < seasonStart) {
            return 0; // Pre-season
        }

        const weeksSinceStart = Math.floor(
            (now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000)
        );

        return Math.min(Math.max(weeksSinceStart, 1), 18);
    }

    /**
     * Get a random opponent that isn't the player's team
     */
    private getRandomOpponent(playerTeam: NFLTeam): NFLTeam {
        const opponents = NFL_TEAMS.filter((t) => t !== playerTeam);
        return opponents[Math.floor(Math.random() * opponents.length)];
    }

    /**
     * Generate realistic weekly stats based on position
     */
    private generateWeeklyStats(
        playerId: string,
        season: number,
        week: number,
        opponent: NFLTeam,
        position: NFLPosition
    ): RawNFLWeeklyStat {
        // Use deterministic randomness based on player/week for consistency
        const seed = this.hashCode(`${playerId}-${season}-${week}`);
        const random = this.seededRandom(seed);

        // Determine if this was a good or bad game (60% good)
        const isGoodGame = random() > 0.4;
        const multiplier = isGoodGame ? 1.2 : 0.8;

        // Generate game result
        const teamScore = Math.round(17 + random() * 20);
        const oppScore = Math.round(14 + random() * 20);
        const won = teamScore > oppScore;
        const result = won
            ? `W ${teamScore}-${oppScore}`
            : `L ${oppScore}-${teamScore}`;

        // Base stats object
        const stats: RawNFLWeeklyStat = {
            playerExternalId: playerId,
            season,
            week,
            opponent,
            location: random() > 0.5 ? "H" : "A",
            result,
        };

        // Add position-specific stats
        switch (position) {
            case "QB":
                return {
                    ...stats,
                    passingYards: Math.round(
                        (220 + random() * 150) * multiplier
                    ),
                    passingTDs: Math.round((1.5 + random() * 2) * multiplier),
                    interceptions: isGoodGame
                        ? Math.round(random() * 1)
                        : Math.round(random() * 2),
                    completions: Math.round((18 + random() * 15) * multiplier),
                    attempts: Math.round(28 + random() * 15),
                    rushingYards: Math.round((5 + random() * 40) * multiplier),
                    rushingTDs: random() > 0.7 ? 1 : 0,
                };

            case "RB":
                return {
                    ...stats,
                    rushingYards: Math.round((50 + random() * 80) * multiplier),
                    rushingTDs: isGoodGame
                        ? Math.round(random() * 2)
                        : Math.round(random() * 1),
                    carries: Math.round(12 + random() * 12),
                    receivingYards: Math.round(
                        (10 + random() * 40) * multiplier
                    ),
                    receivingTDs: random() > 0.85 ? 1 : 0,
                    receptions: Math.round(1 + random() * 5),
                    targets: Math.round(2 + random() * 6),
                };

            case "WR":
                return {
                    ...stats,
                    receivingYards: Math.round(
                        (40 + random() * 80) * multiplier
                    ),
                    receivingTDs: isGoodGame
                        ? Math.round(random() * 2)
                        : Math.round(random() * 0.5),
                    receptions: Math.round((3 + random() * 6) * multiplier),
                    targets: Math.round(5 + random() * 8),
                    rushingYards:
                        random() > 0.8 ? Math.round(random() * 20) : 0,
                    rushingTDs: random() > 0.95 ? 1 : 0,
                };

            case "TE":
                return {
                    ...stats,
                    receivingYards: Math.round(
                        (25 + random() * 60) * multiplier
                    ),
                    receivingTDs: isGoodGame
                        ? Math.round(random() * 1.5)
                        : Math.round(random() * 0.5),
                    receptions: Math.round((2 + random() * 5) * multiplier),
                    targets: Math.round(4 + random() * 6),
                };
        }
    }

    /**
     * Simple hash function for deterministic randomness
     */
    private hashCode(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    /**
     * Seeded random number generator for consistent mock data
     */
    private seededRandom(seed: number): () => number {
        let state = seed;
        return () => {
            state = (state * 1103515245 + 12345) & 0x7fffffff;
            return state / 0x7fffffff;
        };
    }
}
