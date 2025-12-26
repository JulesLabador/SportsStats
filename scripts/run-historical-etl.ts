#!/usr/bin/env npx tsx
/**
 * Historical ETL Runner Script
 *
 * Automates NFL historical data collection from 2021 back to 1970.
 * Tracks progress in a state file to enable resumable runs.
 *
 * Usage:
 *   npx tsx scripts/run-historical-etl.ts              # Resume from last state
 *   npx tsx scripts/run-historical-etl.ts --reset      # Start fresh from 2021
 *   npx tsx scripts/run-historical-etl.ts --year 1985  # Collect specific year
 *   npx tsx scripts/run-historical-etl.ts --dry-run    # Test without DB writes
 *   npx tsx scripts/run-historical-etl.ts --status     # Show current state
 *
 * Environment variables:
 *   NEXT_PUBLIC_SUPABASE_URL - Supabase project URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY - Supabase anon key
 *   SUPABASE_SECRET_KEY - Supabase secret key (required for writes)
 */

// Load environment variables from .env.local
import { config } from "dotenv";
config({ path: "./envs/.env.local" });

import * as fs from "fs";
import * as path from "path";
import { runETL } from "../src/etl/runner";
import { hasAdapter } from "../src/etl/adapters";
import { logger, setLogLevel, type LogLevel } from "../src/lib/logger";

// ============================================================================
// CONFIGURATION
// ============================================================================

/** Default adapter for historical data collection */
const DEFAULT_ADAPTER = "nfl-pfr";

/** Starting year for historical collection */
const START_YEAR = 2021;

/** Ending year for historical collection (NFL merged in 1970) */
const END_YEAR = 1970;

/** Path to the state file */
const STATE_FILE_PATH = path.join(__dirname, "etl-state.json");

/** Delay between years to avoid rate limiting (ms) */
const DELAY_BETWEEN_YEARS_MS = 5000;

/** Maximum retries per year on failure */
const MAX_RETRIES = 3;

/** Delay between retries (ms) */
const RETRY_DELAY_MS = 10000;

// ============================================================================
// TYPES
// ============================================================================

/**
 * Record of a single year's ETL run
 */
interface YearRunRecord {
    year: number;
    status: "success" | "failed" | "skipped";
    timestamp: string;
    recordsProcessed: number;
    duration: number;
    errorMessage?: string;
}

/**
 * State file structure for tracking progress
 */
interface ETLState {
    /** Last year that was successfully collected */
    lastCollectedYear: number | null;
    /** Starting year for collection */
    startYear: number;
    /** Ending year for collection */
    endYear: number;
    /** Adapter being used */
    adapter: string;
    /** History of all runs */
    history: YearRunRecord[];
    /** When state was last updated */
    lastUpdated: string;
}

/**
 * Command line arguments
 */
interface CLIArgs {
    reset: boolean;
    dryRun: boolean;
    status: boolean;
    year?: number;
    help: boolean;
    logLevel?: LogLevel;
}

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

/**
 * Creates a default initial state
 *
 * @returns Default ETL state object
 */
function createDefaultState(): ETLState {
    return {
        lastCollectedYear: null,
        startYear: START_YEAR,
        endYear: END_YEAR,
        adapter: DEFAULT_ADAPTER,
        history: [],
        lastUpdated: new Date().toISOString(),
    };
}

/**
 * Reads the current state from the state file
 *
 * @returns Current ETL state or default state if file doesn't exist
 */
function readState(): ETLState {
    try {
        if (fs.existsSync(STATE_FILE_PATH)) {
            const content = fs.readFileSync(STATE_FILE_PATH, "utf-8");
            const state = JSON.parse(content) as ETLState;
            return state;
        }
    } catch (error) {
        logger.warn({ error }, "Failed to read state file, using defaults");
    }

    return createDefaultState();
}

/**
 * Writes the current state to the state file
 *
 * @param state - State object to persist
 */
function writeState(state: ETLState): void {
    try {
        state.lastUpdated = new Date().toISOString();
        const content = JSON.stringify(state, null, 2);
        fs.writeFileSync(STATE_FILE_PATH, content, "utf-8");
        logger.debug({ path: STATE_FILE_PATH }, "State file updated");
    } catch (error) {
        logger.error({ error }, "Failed to write state file");
        throw error;
    }
}

/**
 * Adds a year run record to the state history
 *
 * @param state - Current state object
 * @param record - Year run record to add
 */
function addHistoryRecord(state: ETLState, record: YearRunRecord): void {
    // Remove any existing record for this year
    state.history = state.history.filter((r) => r.year !== record.year);

    // Add the new record
    state.history.push(record);

    // Sort history by year descending
    state.history.sort((a, b) => b.year - a.year);
}

// ============================================================================
// CLI PARSING
// ============================================================================

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
 * Parses command line arguments
 *
 * @returns Parsed CLI arguments
 */
function parseArgs(): CLIArgs {
    const args = process.argv.slice(2);
    const result: CLIArgs = {
        reset: false,
        dryRun: false,
        status: false,
        year: undefined,
        help: false,
        logLevel: undefined,
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        switch (arg) {
            case "--reset":
            case "-r":
                result.reset = true;
                break;

            case "--dry-run":
            case "-d":
                result.dryRun = true;
                break;

            case "--status":
            case "-s":
                result.status = true;
                break;

            case "--year":
            case "-y":
                result.year = parseInt(args[++i], 10);
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
 * Prints usage information
 */
function printHelp(): void {
    console.log(`
Historical NFL Data ETL Runner

Automates data collection from ${START_YEAR} back to ${END_YEAR}.
Progress is tracked in ${STATE_FILE_PATH}

Usage:
  npx tsx scripts/run-historical-etl.ts [options]

Options:
  --reset, -r             Reset state and start fresh from ${START_YEAR}
  --dry-run, -d           Run without writing to database
  --status, -s            Show current collection state
  --year, -y <year>       Collect a specific year only (${END_YEAR}-${START_YEAR})
  --log-level, -v <level> Set log level (trace, debug, info, warn, error, fatal)
  --help, -h              Show this help message

Examples:
  # Resume historical collection from last state
  npx tsx scripts/run-historical-etl.ts

  # Reset and start fresh from ${START_YEAR}
  npx tsx scripts/run-historical-etl.ts --reset

  # Collect data for 1985 only
  npx tsx scripts/run-historical-etl.ts --year 1985

  # Dry run (no database writes)
  npx tsx scripts/run-historical-etl.ts --dry-run

  # Show current progress
  npx tsx scripts/run-historical-etl.ts --status

Environment Variables:
  NEXT_PUBLIC_SUPABASE_URL      Supabase project URL
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY Supabase anon key
  SUPABASE_SECRET_KEY           Secret key (required for writes)
`);
}

/**
 * Prints current state status
 *
 * @param state - Current ETL state
 */
function printStatus(state: ETLState): void {
    console.log("\n" + "=".repeat(60));
    console.log("Historical ETL Collection Status");
    console.log("=".repeat(60));

    console.log(`\nConfiguration:`);
    console.log(`  Adapter:     ${state.adapter}`);
    console.log(`  Start Year:  ${state.startYear}`);
    console.log(`  End Year:    ${state.endYear}`);
    console.log(`  Last Update: ${state.lastUpdated}`);

    console.log(`\nProgress:`);
    if (state.lastCollectedYear === null) {
        console.log(`  Status: Not started`);
        console.log(`  Next Year: ${state.startYear}`);
    } else if (state.lastCollectedYear <= state.endYear) {
        console.log(`  Status: Complete!`);
        console.log(`  Last Collected: ${state.lastCollectedYear}`);
    } else {
        const nextYear = state.lastCollectedYear - 1;
        const totalYears = state.startYear - state.endYear + 1;
        const completedYears = state.startYear - state.lastCollectedYear + 1;
        const progress = ((completedYears / totalYears) * 100).toFixed(1);

        console.log(`  Status: In Progress`);
        console.log(`  Last Collected: ${state.lastCollectedYear}`);
        console.log(`  Next Year: ${nextYear}`);
        console.log(`  Progress: ${completedYears}/${totalYears} years (${progress}%)`);
    }

    // Show recent history
    if (state.history.length > 0) {
        console.log(`\nRecent History (last 10):`);
        const recentHistory = state.history.slice(0, 10);
        for (const record of recentHistory) {
            const statusIcon =
                record.status === "success"
                    ? "OK"
                    : record.status === "failed"
                    ? "FAIL"
                    : "SKIP";
            console.log(
                `  ${record.year}: [${statusIcon}] ${record.recordsProcessed} records in ${record.duration}ms`
            );
        }
    }

    console.log("\n" + "=".repeat(60) + "\n");
}

// ============================================================================
// ETL EXECUTION
// ============================================================================

/**
 * Sleeps for the specified duration
 *
 * @param ms - Milliseconds to sleep
 */
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs ETL for a single year with retry logic
 *
 * @param year - Year to collect data for
 * @param adapter - Adapter name to use
 * @param dryRun - Whether to run in dry-run mode
 * @returns Year run record with results
 */
async function runYearETL(
    year: number,
    adapter: string,
    dryRun: boolean
): Promise<YearRunRecord> {
    const startTime = Date.now();
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        logger.info(
            { year, attempt, maxRetries: MAX_RETRIES },
            `Running ETL for year ${year}`
        );

        try {
            const result = await runETL({
                adapterName: adapter,
                season: year,
                fetchPlayers: true,
                fetchWeeklyStats: true,
                dryRun,
            });

            if (result.success) {
                return {
                    year,
                    status: "success",
                    timestamp: new Date().toISOString(),
                    recordsProcessed: result.recordsProcessed,
                    duration: Date.now() - startTime,
                };
            }

            // ETL returned but with errors
            lastError = result.errors.join("; ");
            logger.warn(
                { year, attempt, errors: result.errors },
                "ETL completed with errors"
            );
        } catch (error) {
            lastError =
                error instanceof Error ? error.message : "Unknown error";
            logger.error(
                { year, attempt, error: lastError },
                "ETL failed with exception"
            );
        }

        // Wait before retrying (unless this was the last attempt)
        if (attempt < MAX_RETRIES) {
            logger.info(
                { delayMs: RETRY_DELAY_MS },
                `Waiting before retry...`
            );
            await sleep(RETRY_DELAY_MS);
        }
    }

    // All retries exhausted
    return {
        year,
        status: "failed",
        timestamp: new Date().toISOString(),
        recordsProcessed: 0,
        duration: Date.now() - startTime,
        errorMessage: lastError,
    };
}

/**
 * Runs the historical ETL collection
 *
 * @param args - CLI arguments
 */
async function runHistoricalCollection(args: CLIArgs): Promise<void> {
    // Read or create state
    let state = args.reset ? createDefaultState() : readState();

    // Handle specific year request
    if (args.year !== undefined) {
        if (args.year < END_YEAR || args.year > START_YEAR) {
            logger.error(
                { year: args.year, min: END_YEAR, max: START_YEAR },
                "Year out of range"
            );
            process.exit(1);
        }

        logger.info({ year: args.year }, "Collecting specific year");

        const record = await runYearETL(args.year, state.adapter, args.dryRun);
        addHistoryRecord(state, record);

        if (!args.dryRun) {
            writeState(state);
        }

        if (record.status === "success") {
            logger.info(
                { year: args.year, records: record.recordsProcessed },
                "Year collection complete"
            );
        } else {
            logger.error(
                { year: args.year, error: record.errorMessage },
                "Year collection failed"
            );
            process.exit(1);
        }

        return;
    }

    // Determine starting point
    const nextYear =
        state.lastCollectedYear === null
            ? state.startYear
            : state.lastCollectedYear - 1;

    if (nextYear < state.endYear) {
        logger.info("Historical collection already complete!");
        printStatus(state);
        return;
    }

    logger.info("=".repeat(60));
    logger.info("Historical NFL Data ETL Runner");
    logger.info("=".repeat(60));
    logger.info(
        {
            adapter: state.adapter,
            startYear: nextYear,
            endYear: state.endYear,
            dryRun: args.dryRun,
        },
        "Starting historical collection"
    );

    // Iterate through years
    let currentYear = nextYear;
    let consecutiveFailures = 0;
    const maxConsecutiveFailures = 3;

    while (currentYear >= state.endYear) {
        logger.info(
            { year: currentYear, remaining: currentYear - state.endYear + 1 },
            `Processing year ${currentYear}`
        );

        const record = await runYearETL(
            currentYear,
            state.adapter,
            args.dryRun
        );
        addHistoryRecord(state, record);

        if (record.status === "success") {
            state.lastCollectedYear = currentYear;
            consecutiveFailures = 0;

            logger.info(
                {
                    year: currentYear,
                    records: record.recordsProcessed,
                    duration: record.duration,
                },
                `Year ${currentYear} complete`
            );
        } else {
            consecutiveFailures++;

            logger.error(
                {
                    year: currentYear,
                    error: record.errorMessage,
                    consecutiveFailures,
                },
                `Year ${currentYear} failed`
            );

            // Stop if too many consecutive failures
            if (consecutiveFailures >= maxConsecutiveFailures) {
                logger.error(
                    { consecutiveFailures: maxConsecutiveFailures },
                    "Too many consecutive failures, stopping"
                );

                if (!args.dryRun) {
                    writeState(state);
                }

                process.exit(1);
            }
        }

        // Save state after each year (unless dry run)
        if (!args.dryRun) {
            writeState(state);
        }

        // Move to next year
        currentYear--;

        // Delay between years to avoid rate limiting
        if (currentYear >= state.endYear) {
            logger.debug(
                { delayMs: DELAY_BETWEEN_YEARS_MS },
                "Waiting before next year..."
            );
            await sleep(DELAY_BETWEEN_YEARS_MS);
        }
    }

    logger.info("=".repeat(60));
    logger.info("Historical Collection Complete!");
    logger.info("=".repeat(60));
    printStatus(state);
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

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

    // Handle status
    if (args.status) {
        const state = readState();
        printStatus(state);
        process.exit(0);
    }

    // Validate adapter exists
    if (!hasAdapter(DEFAULT_ADAPTER)) {
        logger.error({ adapter: DEFAULT_ADAPTER }, "Adapter not found");
        process.exit(1);
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

    try {
        await runHistoricalCollection(args);
    } catch (error) {
        logger.fatal({ error }, "Fatal error during historical collection");
        process.exit(1);
    }
}

// Run main
main();


