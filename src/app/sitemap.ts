import type { MetadataRoute } from "next";
import {
    getAvailableHistoricSeasons,
    getAvailableWeeksForSeason,
    getAllGameIds,
    getAllPlayerIds,
    getAllTeamSlugs,
} from "@/lib/data";

/**
 * Generate sitemap for the entire site
 * Includes all pages for SEO indexing:
 * - Static pages (home, history browser)
 * - History pages (season/week combinations)
 * - Team pages (all 32 NFL teams)
 * - Matchup pages (all games)
 * - Player pages (all active players)
 *
 * @returns Sitemap entries for all pages
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL || "https://www.checkstatline.com";
    const currentYear = new Date().getFullYear();

    // Static pages
    const staticPages: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 1,
        },
        {
            url: `${baseUrl}/nfl/history`,
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 0.9,
        },
    ];

    // Team pages - fetch slugs from database
    const teamSlugs = await getAllTeamSlugs();
    const teamPages: MetadataRoute.Sitemap = teamSlugs.map((slug) => ({
        url: `${baseUrl}/nfl/team/${slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
    }));

    // Dynamic pages - fetched from database
    const historyPages: MetadataRoute.Sitemap = [];
    const matchupPages: MetadataRoute.Sitemap = [];
    const playerPages: MetadataRoute.Sitemap = [];

    try {
        // Generate history page URLs for all season/week combinations
        const seasons = await getAvailableHistoricSeasons();

        for (const season of seasons) {
            const weeks = await getAvailableWeeksForSeason(season);

            for (const week of weeks) {
                historyPages.push({
                    url: `${baseUrl}/nfl/history/${season}/${week}`,
                    lastModified: new Date(),
                    // Older seasons change less frequently
                    changeFrequency:
                        season >= currentYear ? "weekly" : "yearly",
                    // Current season pages have higher priority
                    priority: season >= currentYear ? 0.8 : 0.6,
                });
            }
        }

        // Generate matchup page URLs for all games
        const gameIds = await getAllGameIds();

        for (const gameId of gameIds) {
            matchupPages.push({
                url: `${baseUrl}/nfl/matchup/${gameId}`,
                lastModified: new Date(),
                changeFrequency: "daily",
                priority: 0.7,
            });
        }

        // Generate player page URLs for all active players
        const playerIds = await getAllPlayerIds();

        for (const playerId of playerIds) {
            playerPages.push({
                url: `${baseUrl}/nfl/player/${playerId}`,
                lastModified: new Date(),
                changeFrequency: "weekly",
                priority: 0.7,
            });
        }
    } catch (error) {
        console.error("Error generating sitemap:", error);
    }

    return [
        ...staticPages,
        ...teamPages,
        ...historyPages,
        ...matchupPages,
        ...playerPages,
    ];
}
