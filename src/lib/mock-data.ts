import type {
  Player,
  PlayerWithStats,
  WeeklyStat,
  SeasonSummary,
  QBStats,
  RBStats,
  WRStats,
  TEStats,
  NFLTeam,
} from "./types";

/**
 * Mock NFL players for development and testing
 */
export const mockPlayers: Player[] = [
  {
    id: "patrick-mahomes",
    name: "Patrick Mahomes",
    team: "KC",
    position: "QB",
    jerseyNumber: 15,
  },
  {
    id: "josh-allen",
    name: "Josh Allen",
    team: "BUF",
    position: "QB",
    jerseyNumber: 17,
  },
  {
    id: "lamar-jackson",
    name: "Lamar Jackson",
    team: "BAL",
    position: "QB",
    jerseyNumber: 8,
  },
  {
    id: "derrick-henry",
    name: "Derrick Henry",
    team: "BAL",
    position: "RB",
    jerseyNumber: 22,
  },
  {
    id: "saquon-barkley",
    name: "Saquon Barkley",
    team: "PHI",
    position: "RB",
    jerseyNumber: 26,
  },
  {
    id: "jahmyr-gibbs",
    name: "Jahmyr Gibbs",
    team: "DET",
    position: "RB",
    jerseyNumber: 26,
  },
  {
    id: "tyreek-hill",
    name: "Tyreek Hill",
    team: "MIA",
    position: "WR",
    jerseyNumber: 10,
  },
  {
    id: "ceedee-lamb",
    name: "CeeDee Lamb",
    team: "DAL",
    position: "WR",
    jerseyNumber: 88,
  },
  {
    id: "ja-marr-chase",
    name: "Ja&apos;Marr Chase",
    team: "CIN",
    position: "WR",
    jerseyNumber: 1,
  },
  {
    id: "travis-kelce",
    name: "Travis Kelce",
    team: "KC",
    position: "TE",
    jerseyNumber: 87,
  },
];

/**
 * NFL team opponents for generating realistic schedules
 */
const opponents: NFLTeam[] = [
  "ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE",
  "DAL", "DEN", "DET", "GB", "HOU", "IND", "JAX", "KC",
  "LAC", "LAR", "LV", "MIA", "MIN", "NE", "NO", "NYG",
  "NYJ", "PHI", "PIT", "SEA", "SF", "TB", "TEN", "WAS",
];

/**
 * Generate random QB stats for a game
 */
function generateQBStats(isGoodGame: boolean): QBStats {
  const multiplier = isGoodGame ? 1.2 : 0.85;
  return {
    passingYards: Math.round((220 + Math.random() * 150) * multiplier),
    passingTDs: Math.round((1.5 + Math.random() * 2) * multiplier),
    interceptions: isGoodGame ? Math.round(Math.random() * 1) : Math.round(Math.random() * 2),
    completions: Math.round((18 + Math.random() * 15) * multiplier),
    attempts: Math.round((28 + Math.random() * 15)),
    rushingYards: Math.round((5 + Math.random() * 40) * multiplier),
    rushingTDs: Math.random() > 0.7 ? 1 : 0,
  };
}

/**
 * Generate random RB stats for a game
 */
function generateRBStats(isGoodGame: boolean): RBStats {
  const multiplier = isGoodGame ? 1.25 : 0.8;
  return {
    rushingYards: Math.round((50 + Math.random() * 80) * multiplier),
    rushingTDs: isGoodGame ? Math.round(Math.random() * 2) : Math.round(Math.random() * 1),
    carries: Math.round((12 + Math.random() * 12)),
    receivingYards: Math.round((10 + Math.random() * 40) * multiplier),
    receivingTDs: Math.random() > 0.85 ? 1 : 0,
    receptions: Math.round((1 + Math.random() * 5)),
    targets: Math.round((2 + Math.random() * 6)),
  };
}

/**
 * Generate random WR stats for a game
 */
function generateWRStats(isGoodGame: boolean): WRStats {
  const multiplier = isGoodGame ? 1.3 : 0.75;
  return {
    receivingYards: Math.round((40 + Math.random() * 80) * multiplier),
    receivingTDs: isGoodGame ? Math.round(Math.random() * 2) : Math.round(Math.random() * 0.5),
    receptions: Math.round((3 + Math.random() * 6) * multiplier),
    targets: Math.round((5 + Math.random() * 8)),
    rushingYards: Math.random() > 0.8 ? Math.round(Math.random() * 20) : 0,
    rushingTDs: Math.random() > 0.95 ? 1 : 0,
  };
}

/**
 * Generate random TE stats for a game
 */
function generateTEStats(isGoodGame: boolean): TEStats {
  const multiplier = isGoodGame ? 1.25 : 0.8;
  return {
    receivingYards: Math.round((25 + Math.random() * 60) * multiplier),
    receivingTDs: isGoodGame ? Math.round(Math.random() * 1.5) : Math.round(Math.random() * 0.5),
    receptions: Math.round((2 + Math.random() * 5) * multiplier),
    targets: Math.round((4 + Math.random() * 6)),
  };
}

/**
 * Generate weekly stats for a player
 */
function generateWeeklyStats(
  player: Player,
  season: number,
  weeksPlayed: number = 17
): WeeklyStat[] {
  const stats: WeeklyStat[] = [];
  const playerTeamIndex = opponents.indexOf(player.team);
  const availableOpponents = opponents.filter((_, i) => i !== playerTeamIndex);

  for (let week = 1; week <= weeksPlayed; week++) {
    // Randomize good/bad games (roughly 60% good games for star players)
    const isGoodGame = Math.random() > 0.4;
    const isHome = Math.random() > 0.5;
    const opponent = availableOpponents[Math.floor(Math.random() * availableOpponents.length)];

    let gameStats;
    switch (player.position) {
      case "QB":
        gameStats = generateQBStats(isGoodGame);
        break;
      case "RB":
        gameStats = generateRBStats(isGoodGame);
        break;
      case "WR":
        gameStats = generateWRStats(isGoodGame);
        break;
      case "TE":
        gameStats = generateTEStats(isGoodGame);
        break;
    }

    // Generate realistic game result
    const teamScore = Math.round(17 + Math.random() * 20);
    const oppScore = Math.round(14 + Math.random() * 20);
    const won = teamScore > oppScore;
    const result = won
      ? `W ${teamScore}-${oppScore}`
      : `L ${oppScore}-${teamScore}`;

    stats.push({
      week,
      season,
      opponent,
      location: isHome ? "H" : "A",
      result,
      stats: gameStats,
    });
  }

  return stats;
}

/**
 * Calculate season summary from weekly stats
 */
function calculateSeasonSummary(
  weeklyStats: WeeklyStat[],
  season: number
): SeasonSummary {
  const gamesPlayed = weeklyStats.length;

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
    totalStats: totalStats as unknown as QBStats | RBStats | WRStats | TEStats,
    averageStats: averageStats as unknown as QBStats | RBStats | WRStats | TEStats,
  };
}

/**
 * Get full player data with stats
 */
export function getPlayerWithStats(
  playerId: string,
  season: number = 2024
): PlayerWithStats | undefined {
  const player = mockPlayers.find((p) => p.id === playerId);
  if (!player) return undefined;

  // Use seeded random for consistent data per player/season
  const seed = playerId.length + season;
  const weeksPlayed = season === 2024 ? 15 : 17; // Current season has fewer games

  const weeklyStats = generateWeeklyStats(player, season, weeksPlayed);
  const seasonSummary = calculateSeasonSummary(weeklyStats, season);

  return {
    ...player,
    weeklyStats,
    seasonSummary,
  };
}

/**
 * Search players by name
 */
export function searchPlayers(query: string): Player[] {
  if (!query.trim()) return [];

  const normalizedQuery = query.toLowerCase().trim();

  return mockPlayers.filter((player) =>
    player.name.toLowerCase().includes(normalizedQuery) ||
    player.team.toLowerCase().includes(normalizedQuery) ||
    player.position.toLowerCase().includes(normalizedQuery)
  );
}

/**
 * Get available seasons for a player
 */
export function getAvailableSeasons(): number[] {
  return [2024, 2023, 2022, 2021];
}

/**
 * Get popular/featured players for home page
 */
export function getFeaturedPlayers(): Player[] {
  return mockPlayers.slice(0, 6);
}

