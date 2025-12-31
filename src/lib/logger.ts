/**
 * Application Logger
 *
 * Centralized logging using Pino for structured, performant logging.
 * Provides consistent log formatting across the application with
 * support for child loggers and contextual metadata.
 *
 * Features:
 * - Structured JSON logging in production
 * - Pretty-printed output in development
 * - Child loggers for component-specific context
 * - Log levels: trace, debug, info, warn, error, fatal
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.info({ playerId: '123' }, 'Fetching player data');
 *
 *   // Create child logger with context
 *   const etlLogger = logger.child({ component: 'etl' });
 *   etlLogger.info('Starting ETL run');
 */

import pino, { type Logger, type LoggerOptions } from "pino";

/**
 * Determine if we're in a development environment
 */
const isDevelopment = process.env.NODE_ENV !== "production";

/**
 * Get log level from environment or default based on environment
 */
const getLogLevel = (): string => {
    if (process.env.LOG_LEVEL) {
        return process.env.LOG_LEVEL;
    }
    return isDevelopment ? "debug" : "info";
};

/**
 * Base Pino configuration options
 */
const baseOptions: LoggerOptions = {
    level: getLogLevel(),
    // Add timestamp to all logs
    timestamp: pino.stdTimeFunctions.isoTime,
    // Base context added to all logs
    base: {
        app: "statline",
        env: process.env.NODE_ENV || "development",
    },
    // Format error objects properly
    formatters: {
        level: (label) => ({ level: label }),
    },
};

/**
 * Development transport configuration (pretty printing)
 */
const devTransport: LoggerOptions["transport"] = {
    target: "pino-pretty",
    options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname,app,env",
        messageFormat: "{msg}",
    },
};

/**
 * Create the root logger instance
 *
 * In development: Uses pino-pretty for human-readable output
 * In production: Uses standard JSON output for log aggregation
 */
const createLogger = (): Logger => {
    if (isDevelopment) {
        return pino({
            ...baseOptions,
            transport: devTransport,
        });
    }

    // Production: JSON output
    return pino(baseOptions);
};

/**
 * Root logger instance
 * Use this directly or create child loggers for specific components
 */
export const logger = createLogger();

/**
 * Pre-configured child loggers for common components
 */
export const etlLogger = logger.child({ component: "etl" });
export const apiLogger = logger.child({ component: "api" });
export const dbLogger = logger.child({ component: "db" });

/**
 * Create a child logger with custom context
 *
 * @param bindings - Key-value pairs to add to all log entries
 * @returns Child logger instance
 *
 * @example
 * const adapterLogger = createChildLogger({ adapter: 'nfl-espn' });
 * adapterLogger.info('Fetching players');
 * // Output: { adapter: 'nfl-espn', msg: 'Fetching players', ... }
 */
export function createChildLogger(
    bindings: Record<string, string | number | boolean>
): Logger {
    return logger.child(bindings);
}

/**
 * Log levels available for configuration
 */
export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

/**
 * Set the log level at runtime
 *
 * @param level - New log level to set
 */
export function setLogLevel(level: LogLevel): void {
    logger.level = level;
}

export type { Logger };
