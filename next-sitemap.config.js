/** @type {import('next-sitemap').IConfig} */
module.exports = {
    siteUrl:
        process.env.NEXT_PUBLIC_BASE_URL || "https://www.checkstatline.com",
    generateRobotsTxt: false, // We already have robots.ts in the app directory
    generateIndexSitemap: true, // Generate sitemap index for large sites
    sitemapSize: 5000, // Split sitemap if more than 5000 URLs
    exclude: [
        "/api/*", // Exclude API routes
    ],
    // Use Next.js App Router sitemap generation
    // This config is mainly for post-build optimization
    transform: async (config, path) => {
        // Default transformation
        return {
            loc: path,
            changefreq: config.changefreq,
            priority: config.priority,
            lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
        };
    },
};
