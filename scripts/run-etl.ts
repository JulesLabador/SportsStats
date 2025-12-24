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
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY - Supabase anon key
 *   SUPABASE_SERVICE_ROLE_KEY - Supabase service role key (required for writes)
 */

import { runETL, runDryRun } from "../src/etl/runner";
import {
    getAdapterNames,
    hasAdapter,
    getAdapterNamesBySport,
} from "../src/etl/adapters";

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
} {
    const args = process.argv.slice(2);
    const result = {
        adapter: undefined as string | undefined,
        season: undefined as number | undefined,
        week: undefined as number | undefined,
        dryRun: false,
        listAdapters: false,
        help: false,
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

            case "--help":
            case "-h":
                result.help = true;
                break;

            default:
                if (arg.startsWith("-")) {
                    console.error(`Unknown argument: ${arg}`);
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
  --help, -h              Show this help message

Examples:
  # Run full ETL with NFL mock adapter
  npx tsx scripts/run-etl.ts --adapter nfl-mock

  # Run for specific season and week
  npx tsx scripts/run-etl.ts --adapter nfl-mock --season 2024 --week 15

  # Dry run (no database writes)
  npx tsx scripts/run-etl.ts --adapter nfl-mock --dry-run

  # List available adapters
  npx tsx scripts/run-etl.ts --list-adapters

Environment Variables:
  NEXT_PUBLIC_SUPABASE_URL      Supabase project URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY Supabase anon key
  SUPABASE_SERVICE_ROLE_KEY     Service role key (required for writes)
`);
}

/**
 * Print available adapters grouped by sport
 */
function printAdapters(): void {
    const allAdapters = getAdapterNames();
    const sports = ["nfl", "mlb", "nba", "f1"];

    console.log("\nAvailable adapters:");
    console.log("=".repeat(40));

    for (const sport of sports) {
        const sportAdapters = getAdapterNamesBySport(sport);
        if (sportAdapters.length > 0) {
            console.log(`\n${sport.toUpperCase()}:`);
            for (const name of sportAdapters) {
                console.log(`  - ${name}`);
            }
        }
    }

    // Show any adapters not categorized
    const categorized = sports.flatMap((s) => getAdapterNamesBySport(s));
    const uncategorized = allAdapters.filter((a) => !categorized.includes(a));
    if (uncategorized.length > 0) {
        console.log("\nOther:");
        for (const name of uncategorized) {
            console.log(`  - ${name}`);
        }
    }

    console.log("");
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
    const args = parseArgs();

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
        console.error("Error: --adapter is required\n");
        printHelp();
        process.exit(1);
    }

    if (!hasAdapter(args.adapter)) {
        console.error(`Error: Unknown adapter '${args.adapter}'`);
        printAdapters();
        process.exit(1);
    }

    // Validate season
    if (args.season !== undefined) {
        if (isNaN(args.season) || args.season < 2000 || args.season > 2100) {
            console.error(
                "Error: Invalid season (must be between 2000 and 2100)"
            );
            process.exit(1);
        }
    }

    // Validate week
    if (args.week !== undefined) {
        if (isNaN(args.week) || args.week < 1 || args.week > 18) {
            console.error("Error: Invalid week (must be between 1 and 18)");
            process.exit(1);
        }
    }

    // Check environment variables for non-dry-run
    if (!args.dryRun) {
        const requiredEnvVars = [
            "NEXT_PUBLIC_SUPABASE_URL",
            "NEXT_PUBLIC_SUPABASE_ANON_KEY",
            "SUPABASE_SERVICE_ROLE_KEY",
        ];

        const missing = requiredEnvVars.filter((v) => !process.env[v]);
        if (missing.length > 0) {
            console.error("Error: Missing required environment variables:");
            for (const v of missing) {
                console.error(`  - ${v}`);
            }
            console.error(
                "\nUse --dry-run to test without database connection."
            );
            process.exit(1);
        }
    }

    // Run ETL
    console.log("=".repeat(60));
    console.log("Multi-Sport Stats ETL Runner");
    console.log("=".repeat(60));
    console.log(`Adapter:  ${args.adapter}`);
    console.log(`Season:   ${args.season ?? "current"}`);
    console.log(`Week:     ${args.week ?? "all"}`);
    console.log(`Dry Run:  ${args.dryRun}`);
    console.log("=".repeat(60));
    console.log("");

    try {
        const result = args.dryRun
            ? await runDryRun(args.adapter, args.season)
            : await runETL({
                  adapterName: args.adapter,
                  season: args.season,
                  week: args.week,
              });

        console.log("");
        console.log("=".repeat(60));
        console.log("ETL Run Complete");
        console.log("=".repeat(60));
        console.log(`Success:  ${result.success}`);
        console.log(`Sport:    ${result.sportId}`);
        console.log(`Run ID:   ${result.runId || "N/A (dry run)"}`);
        console.log(`Records:  ${result.recordsProcessed}`);
        console.log(`Duration: ${result.duration}ms`);

        if (result.errors.length > 0) {
            console.log(`\nErrors (${result.errors.length}):`);
            for (const error of result.errors) {
                console.log(`  - ${error}`);
            }
        }

        console.log("=".repeat(60));

        process.exit(result.success ? 0 : 1);
    } catch (error) {
        console.error("\nFatal error:", error);
        process.exit(1);
    }
}

// Run main
main();
