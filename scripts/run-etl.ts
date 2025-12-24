#!/usr/bin/env npx tsx
/**
 * Standalone ETL Runner Script
 *
 * Run ETL pipeline from the command line.
 * Useful for local development, manual runs, and debugging.
 *
 * Usage:
 *   npx tsx scripts/run-etl.ts --adapter nfl-mock
 *   npx tsx scripts/run-etl.ts --adapter nfl-mock --season 2024
 *   npx tsx scripts/run-etl.ts --adapter nfl-mock --season 2024 --week 15
 *   npx tsx scripts/run-etl.ts --adapter nfl-mock --dry-run
 *   npx tsx scripts/run-etl.ts --list-adapters
 *
 * Environment variables:
 *   NEXT_PUBLIC_SUPABASE_URL - Supabase project URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY - Supabase anon key
 *   SUPABASE_SECRET_KEY - Supabase secret key (required for writes)
 */

// Load environment variables from .env.local
import { config } from "dotenv";
config({ path: "./envs/.env.local" });

import { runETL, runDryRun } from "../src/etl/runner";
import {
    getAdapterNames,
    hasAdapter,
    getAdapterNamesBySport,
} from "../src/etl/adapters";
import { logger, setLogLevel, type LogLevel } from "../src/lib/logger";

/**
 * Valid log levels for CLI argument
 */
const VALID_LOG_LEVELS: LogLevel[] = [
    "trace",
    "debug",
    "info",
    "warn",
    "error",
    "fatal",
];

/**
 * Parse command line arguments
 */
function parseArgs(): {
    adapter?: string;
    season?: number;
    week?: number;
    dryRun: boolean;
    listAdapters: boolean;
    help: boolean;
    logLevel?: LogLevel;
} {
    const args = process.argv.slice(2);
    const result = {
        adapter: undefined as string | undefined,
        season: undefined as number | undefined,
        week: undefined as number | undefined,
        dryRun: false,
        listAdapters: false,
        help: false,
        logLevel: undefined as LogLevel | undefined,
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        switch (arg) {
            case "--adapter":
            case "-a":
                result.adapter = args[++i];
                break;

            case "--season":
            case "-s":
                result.season = parseInt(args[++i], 10);
                break;

            case "--week":
            case "-w":
                result.week = parseInt(args[++i], 10);
                break;

            case "--dry-run":
            case "-d":
                result.dryRun = true;
                break;

            case "--list-adapters":
            case "-l":
                result.listAdapters = true;
                break;

            case "--log-level":
            case "-v":
                const level = args[++i] as LogLevel;
                if (VALID_LOG_LEVELS.includes(level)) {
                    result.logLevel = level;
                } else {
                    logger.error(
                        { level, valid: VALID_LOG_LEVELS },
                        "Invalid log level"
                    );
                    result.help = true;
                }
                break;

            case "--help":
            case "-h":
                result.help = true;
                break;

            default:
                if (arg.startsWith("-")) {
                    logger.error({ arg }, "Unknown argument");
                    result.help = true;
                }
        }
    }

    return result;
}

/**
 * Print usage information
 */
function printHelp(): void {
    console.log(`
Multi-Sport Stats ETL Runner

Usage:
  npx tsx scripts/run-etl.ts [options]

Options:
  --adapter, -a <name>    Adapter to use (required unless --list-adapters)
  --season, -s <year>     Season year (default: current year)
  --week, -w <number>     Specific week to fetch (1-18 for NFL)
  --dry-run, -d           Run without writing to database
  --list-adapters, -l     List available adapters
  --log-level, -v <level> Set log level (trace, debug, info, warn, error, fatal)
  --help, -h              Show this help message

Examples:
  # Run full ETL with NFL mock adapter
  npx tsx scripts/run-etl.ts --adapter nfl-mock

  # Run for specific season and week
  npx tsx scripts/run-etl.ts --adapter nfl-mock --season 2024 --week 15

  # Dry run (no database writes)
  npx tsx scripts/run-etl.ts --adapter nfl-mock --dry-run

  # Run with debug logging
  npx tsx scripts/run-etl.ts --adapter nfl-mock --log-level debug

  # List available adapters
  npx tsx scripts/run-etl.ts --list-adapters

Environment Variables:
  NEXT_PUBLIC_SUPABASE_URL      Supabase project URL
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY Supabase anon key
  SUPABASE_SECRET_KEY           Secret key (required for writes)
  LOG_LEVEL                     Default log level (default: debug in dev, info in prod)
`);
}

/**
 * Print available adapters grouped by sport
 */
function printAdapters(): void {
    const allAdapters = getAdapterNames();
    const sports = ["nfl", "mlb", "nba", "f1"];

    logger.info("\nAvailable adapters:");
    logger.info("=".repeat(40));

    for (const sport of sports) {
        const sportAdapters = getAdapterNamesBySport(sport);
        if (sportAdapters.length > 0) {
            logger.info(`\n${sport.toUpperCase()}:`);
            for (const name of sportAdapters) {
                logger.info(`  - ${name}`);
            }
        }
    }

    // Show any adapters not categorized
    const categorized = sports.flatMap((s) => getAdapterNamesBySport(s));
    const uncategorized = allAdapters.filter((a) => !categorized.includes(a));
    if (uncategorized.length > 0) {
        logger.info("\nOther:");
        for (const name of uncategorized) {
            logger.info(`  - ${name}`);
        }
    }

    logger.info("");
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
    const args = parseArgs();

    // Set log level if specified
    if (args.logLevel) {
        setLogLevel(args.logLevel);
    }

    // Handle help
    if (args.help) {
        printHelp();
        process.exit(0);
    }

    // Handle list adapters
    if (args.listAdapters) {
        printAdapters();
        process.exit(0);
    }

    // Validate adapter
    if (!args.adapter) {
        logger.error("--adapter is required");
        printHelp();
        process.exit(1);
    }

    if (!hasAdapter(args.adapter)) {
        logger.error({ adapter: args.adapter }, "Unknown adapter");
        printAdapters();
        process.exit(1);
    }

    // Validate season
    if (args.season !== undefined) {
        if (isNaN(args.season) || args.season < 2000 || args.season > 2100) {
            logger.error(
                { season: args.season },
                "Invalid season (must be between 2000 and 2100)"
            );
            process.exit(1);
        }
    }

    // Validate week
    if (args.week !== undefined) {
        if (isNaN(args.week) || args.week < 1 || args.week > 18) {
            logger.error(
                { week: args.week },
                "Invalid week (must be between 1 and 18)"
            );
            process.exit(1);
        }
    }

    // Check environment variables for non-dry-run
    if (!args.dryRun) {
        const requiredEnvVars = [
            "NEXT_PUBLIC_SUPABASE_URL",
            "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
            "SUPABASE_SECRET_KEY",
        ];

        const missing = requiredEnvVars.filter((v) => !process.env[v]);
        if (missing.length > 0) {
            logger.error({ missing }, "Missing required environment variables");
            logger.info("Use --dry-run to test without database connection.");
            process.exit(1);
        }
    }

    // Log run configuration
    logger.info("=".repeat(60));
    logger.info("Multi-Sport Stats ETL Runner");
    logger.info("=".repeat(60));
    logger.info(
        {
            adapter: args.adapter,
            season: args.season ?? "current",
            week: args.week ?? "all",
            dryRun: args.dryRun,
        },
        "Starting ETL run"
    );

    try {
        const result = args.dryRun
            ? await runDryRun(args.adapter, args.season)
            : await runETL({
                  adapterName: args.adapter,
                  season: args.season,
                  week: args.week,
              });

        logger.info("=".repeat(60));
        logger.info("ETL Run Complete");
        logger.info("=".repeat(60));
        logger.info(
            {
                success: result.success,
                sport: result.sportId,
                runId: result.runId || "N/A (dry run)",
                records: result.recordsProcessed,
                duration: `${result.duration}ms`,
            },
            "Run summary"
        );

        if (result.errors.length > 0) {
            logger.warn(
                { errorCount: result.errors.length, errors: result.errors },
                "ETL completed with errors"
            );
        }

        logger.info("=".repeat(60));

        process.exit(result.success ? 0 : 1);
    } catch (error) {
        logger.fatal({ error }, "Fatal error during ETL run");
        process.exit(1);
    }
}

// Run main
main();
