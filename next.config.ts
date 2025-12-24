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
    /* config options here */
};

export default nextConfig;
