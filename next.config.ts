import type { NextConfig } from "next";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Get ESM-compatible __dirname
const __filename_esm = fileURLToPath(import.meta.url);
const __dirname_esm = dirname(__filename_esm);

// Load environment variables from envs/.env.local using dotenv
config({ path: resolve(__dirname_esm, "envs", ".env.local") });

const nextConfig: NextConfig = {
    /**
     * Permanent redirects for team URLs
     * Redirects old abbreviation-based URLs to new SEO-friendly slug URLs
     * Includes both current and historical team abbreviations
     */
    async redirects() {
        return [
            // Current team abbreviation redirects
            {
                source: "/nfl/team/ARI",
                destination: "/nfl/team/arizona-cardinals",
                permanent: true,
            },
            {
                source: "/nfl/team/ATL",
                destination: "/nfl/team/atlanta-falcons",
                permanent: true,
            },
            {
                source: "/nfl/team/BAL",
                destination: "/nfl/team/baltimore-ravens",
                permanent: true,
            },
            {
                source: "/nfl/team/BUF",
                destination: "/nfl/team/buffalo-bills",
                permanent: true,
            },
            {
                source: "/nfl/team/CAR",
                destination: "/nfl/team/carolina-panthers",
                permanent: true,
            },
            {
                source: "/nfl/team/CHI",
                destination: "/nfl/team/chicago-bears",
                permanent: true,
            },
            {
                source: "/nfl/team/CIN",
                destination: "/nfl/team/cincinnati-bengals",
                permanent: true,
            },
            {
                source: "/nfl/team/CLE",
                destination: "/nfl/team/cleveland-browns",
                permanent: true,
            },
            {
                source: "/nfl/team/DAL",
                destination: "/nfl/team/dallas-cowboys",
                permanent: true,
            },
            {
                source: "/nfl/team/DEN",
                destination: "/nfl/team/denver-broncos",
                permanent: true,
            },
            {
                source: "/nfl/team/DET",
                destination: "/nfl/team/detroit-lions",
                permanent: true,
            },
            {
                source: "/nfl/team/GB",
                destination: "/nfl/team/green-bay-packers",
                permanent: true,
            },
            {
                source: "/nfl/team/HOU",
                destination: "/nfl/team/houston-texans",
                permanent: true,
            },
            {
                source: "/nfl/team/IND",
                destination: "/nfl/team/indianapolis-colts",
                permanent: true,
            },
            {
                source: "/nfl/team/JAX",
                destination: "/nfl/team/jacksonville-jaguars",
                permanent: true,
            },
            {
                source: "/nfl/team/KC",
                destination: "/nfl/team/kansas-city-chiefs",
                permanent: true,
            },
            {
                source: "/nfl/team/LAC",
                destination: "/nfl/team/los-angeles-chargers",
                permanent: true,
            },
            {
                source: "/nfl/team/LAR",
                destination: "/nfl/team/los-angeles-rams",
                permanent: true,
            },
            {
                source: "/nfl/team/LV",
                destination: "/nfl/team/las-vegas-raiders",
                permanent: true,
            },
            {
                source: "/nfl/team/MIA",
                destination: "/nfl/team/miami-dolphins",
                permanent: true,
            },
            {
                source: "/nfl/team/MIN",
                destination: "/nfl/team/minnesota-vikings",
                permanent: true,
            },
            {
                source: "/nfl/team/NE",
                destination: "/nfl/team/new-england-patriots",
                permanent: true,
            },
            {
                source: "/nfl/team/NO",
                destination: "/nfl/team/new-orleans-saints",
                permanent: true,
            },
            {
                source: "/nfl/team/NYG",
                destination: "/nfl/team/new-york-giants",
                permanent: true,
            },
            {
                source: "/nfl/team/NYJ",
                destination: "/nfl/team/new-york-jets",
                permanent: true,
            },
            {
                source: "/nfl/team/PHI",
                destination: "/nfl/team/philadelphia-eagles",
                permanent: true,
            },
            {
                source: "/nfl/team/PIT",
                destination: "/nfl/team/pittsburgh-steelers",
                permanent: true,
            },
            {
                source: "/nfl/team/SEA",
                destination: "/nfl/team/seattle-seahawks",
                permanent: true,
            },
            {
                source: "/nfl/team/SF",
                destination: "/nfl/team/san-francisco-49ers",
                permanent: true,
            },
            {
                source: "/nfl/team/TB",
                destination: "/nfl/team/tampa-bay-buccaneers",
                permanent: true,
            },
            {
                source: "/nfl/team/TEN",
                destination: "/nfl/team/tennessee-titans",
                permanent: true,
            },
            {
                source: "/nfl/team/WAS",
                destination: "/nfl/team/washington-commanders",
                permanent: true,
            },

            // Historical team abbreviation redirects (relocated franchises)
            {
                source: "/nfl/team/STL",
                destination: "/nfl/team/los-angeles-rams",
                permanent: true,
            },
            {
                source: "/nfl/team/OAK",
                destination: "/nfl/team/las-vegas-raiders",
                permanent: true,
            },
            {
                source: "/nfl/team/SD",
                destination: "/nfl/team/los-angeles-chargers",
                permanent: true,
            },
        ];
    },
};

export default nextConfig;
