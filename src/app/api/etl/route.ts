/**
 * ETL API Route
 *
 * Provides HTTP endpoints for triggering and monitoring ETL runs.
 * Can be used with Vercel Cron for scheduled data ingestion.
 *
 * Endpoints:
 * - POST /api/etl - Trigger an ETL run
 * - GET /api/etl - Get recent ETL run history
 *
 * To set up Vercel Cron, add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/etl?adapter=nfl-mock&cron=true",
 *     "schedule": "0 6 * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { runETL } from "@/etl/runner";
import {
    getAdapterNames,
    hasAdapter,
    getAdapterNamesBySport,
} from "@/etl/adapters";
import { createAdminClient } from "@/lib/supabase";
import { SupabaseLoader } from "@/etl/loaders/supabase";
import type { SportId } from "@/lib/database.types";

/**
 * Secret key for authorizing ETL runs
 * Set this in your environment variables
 */
const ETL_SECRET = process.env.ETL_SECRET;

/**
 * Validate the request is authorized
 */
function isAuthorized(request: NextRequest): boolean {
    // If no secret is configured, allow all requests (development mode)
    if (!ETL_SECRET) {
        console.warn(
            "[ETL API] No ETL_SECRET configured - allowing all requests"
        );
        return true;
    }

    // Check for secret in header or query param
    const headerSecret = request.headers.get("x-etl-secret");
    const querySecret = request.nextUrl.searchParams.get("secret");

    // Also allow Vercel Cron requests (they have a special header)
    const isVercelCron = request.headers.get("x-vercel-cron") === "true";

    return (
        headerSecret === ETL_SECRET ||
        querySecret === ETL_SECRET ||
        isVercelCron
    );
}

/**
 * POST /api/etl - Trigger an ETL run
 *
 * Query params:
 * - adapter: Adapter name (required)
 * - season: Season year (optional, defaults to current year)
 * - week: Specific week to fetch (optional)
 * - dryRun: If "true", don't write to database (optional)
 *
 * Headers:
 * - x-etl-secret: Authorization secret
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    // Check authorization
    if (!isAuthorized(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse parameters
    const searchParams = request.nextUrl.searchParams;
    const adapterName = searchParams.get("adapter");
    const seasonParam = searchParams.get("season");
    const weekParam = searchParams.get("week");
    const dryRunParam = searchParams.get("dryRun");

    // Validate adapter
    if (!adapterName) {
        return NextResponse.json(
            {
                error: "Missing adapter parameter",
                availableAdapters: getAdapterNames(),
                adaptersBySport: {
                    nfl: getAdapterNamesBySport("nfl"),
                    mlb: getAdapterNamesBySport("mlb"),
                    nba: getAdapterNamesBySport("nba"),
                    f1: getAdapterNamesBySport("f1"),
                },
            },
            { status: 400 }
        );
    }

    if (!hasAdapter(adapterName)) {
        return NextResponse.json(
            {
                error: `Unknown adapter: ${adapterName}`,
                availableAdapters: getAdapterNames(),
            },
            { status: 400 }
        );
    }

    // Parse optional parameters
    const season = seasonParam ? parseInt(seasonParam, 10) : undefined;
    const week = weekParam ? parseInt(weekParam, 10) : undefined;
    const dryRun = dryRunParam === "true";

    // Validate season if provided
    if (
        season !== undefined &&
        (isNaN(season) || season < 2000 || season > 2100)
    ) {
        return NextResponse.json(
            { error: "Invalid season parameter" },
            { status: 400 }
        );
    }

    // Validate week if provided
    if (week !== undefined && (isNaN(week) || week < 1 || week > 18)) {
        return NextResponse.json(
            { error: "Invalid week parameter (must be 1-18)" },
            { status: 400 }
        );
    }

    try {
        // Run ETL
        const result = await runETL({
            adapterName,
            season,
            week,
            dryRun,
        });

        // Return appropriate status based on result
        const status = result.success ? 200 : 500;

        return NextResponse.json(result, { status });
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Unknown error";
        console.error(`[ETL API] Error: ${message}`);

        return NextResponse.json(
            {
                error: "ETL run failed",
                message,
            },
            { status: 500 }
        );
    }
}

/**
 * GET /api/etl - Get recent ETL run history
 *
 * Query params:
 * - limit: Number of runs to fetch (optional, default 10)
 * - sport: Filter by sport ID (optional)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
    // Check authorization
    if (!isAuthorized(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limitParam = request.nextUrl.searchParams.get("limit");
    const sportParam = request.nextUrl.searchParams.get("sport");

    const limit = limitParam ? parseInt(limitParam, 10) : 10;

    if (isNaN(limit) || limit < 1 || limit > 100) {
        return NextResponse.json(
            { error: "Invalid limit parameter (must be 1-100)" },
            { status: 400 }
        );
    }

    // Validate sport if provided
    const validSports: SportId[] = ["nfl", "mlb", "nba", "f1"];
    if (sportParam && !validSports.includes(sportParam as SportId)) {
        return NextResponse.json(
            {
                error: `Invalid sport parameter. Valid options: ${validSports.join(
                    ", "
                )}`,
            },
            { status: 400 }
        );
    }

    try {
        const supabase = createAdminClient();
        const loader = new SupabaseLoader(supabase);
        const runs = await loader.getRecentRuns(
            limit,
            sportParam as SportId | undefined
        );

        return NextResponse.json({
            runs,
            availableAdapters: getAdapterNames(),
            adaptersBySport: {
                nfl: getAdapterNamesBySport("nfl"),
                mlb: getAdapterNamesBySport("mlb"),
                nba: getAdapterNamesBySport("nba"),
                f1: getAdapterNamesBySport("f1"),
            },
        });
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Unknown error";
        console.error(`[ETL API] Error fetching runs: ${message}`);

        return NextResponse.json(
            {
                error: "Failed to fetch ETL runs",
                message,
            },
            { status: 500 }
        );
    }
}
