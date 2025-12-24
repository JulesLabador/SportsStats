/**
 * Rate Limiter Service
 *
 * Manages request rate limiting for external data sources.
 * Implements per-source rate limits with exponential backoff.
 *
 * Key features:
 * - Per-source rate limiting (ESPN: 5 req/s, PFR: 1 req/s)
 * - Request queue with concurrency control
 * - Exponential backoff on failures
 * - Request tracking and statistics
 */

import type { DataSource, RateLimitConfig } from "../types";
import { RATE_LIMITS } from "../types";
import { createChildLogger } from "@/lib/logger";

/** Logger for rate limiter service */
const log = createChildLogger({ service: "rate-limiter" });

/**
 * Request task in the queue
 */
interface QueuedRequest<T> {
    /** Unique request ID */
    id: string;
    /** The async function to execute */
    execute: () => Promise<T>;
    /** Resolve function for the promise */
    resolve: (value: T) => void;
    /** Reject function for the promise */
    reject: (error: Error) => void;
    /** Number of retry attempts */
    retries: number;
    /** Timestamp when request was queued */
    queuedAt: number;
}

/**
 * Statistics for a rate limiter
 */
export interface RateLimiterStats {
    /** Total requests processed */
    totalRequests: number;
    /** Successful requests */
    successfulRequests: number;
    /** Failed requests */
    failedRequests: number;
    /** Requests currently in queue */
    queuedRequests: number;
    /** Active concurrent requests */
    activeRequests: number;
    /** Average response time (ms) */
    avgResponseTimeMs: number;
    /** Total retries */
    totalRetries: number;
}

/**
 * Rate Limiter for a single data source
 */
class SourceRateLimiter {
    private config: RateLimitConfig;
    private queue: QueuedRequest<unknown>[] = [];
    private activeRequests: number = 0;
    private lastRequestTime: number = 0;
    private processing: boolean = false;
    private consecutiveFailures: number = 0;

    // Statistics
    private stats: RateLimiterStats = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        queuedRequests: 0,
        activeRequests: 0,
        avgResponseTimeMs: 0,
        totalRetries: 0,
    };
    private totalResponseTime: number = 0;

    constructor(config: RateLimitConfig) {
        this.config = config;
    }

    /**
     * Execute a request with rate limiting
     *
     * @param execute - Async function to execute
     * @param maxRetries - Maximum retry attempts (default: 3)
     * @returns Promise resolving to the request result
     */
    async execute<T>(
        execute: () => Promise<T>,
        maxRetries: number = 3
    ): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const request: QueuedRequest<T> = {
                id: this.generateRequestId(),
                execute,
                resolve: resolve as (value: unknown) => void,
                reject,
                retries: 0,
                queuedAt: Date.now(),
            };

            this.queue.push(request as QueuedRequest<unknown>);
            this.stats.queuedRequests = this.queue.length;

            // Start processing if not already
            this.processQueue();
        });
    }

    /**
     * Process queued requests respecting rate limits
     */
    private async processQueue(): Promise<void> {
        // Prevent multiple processors
        if (this.processing) return;
        this.processing = true;

        while (this.queue.length > 0) {
            // Check if we can make a request
            if (this.activeRequests >= this.config.maxConcurrent) {
                // Wait for a slot to open
                await this.sleep(100);
                continue;
            }

            // Calculate delay based on rate limit
            const minInterval = 1000 / this.config.requestsPerSecond;
            const timeSinceLastRequest = Date.now() - this.lastRequestTime;

            if (timeSinceLastRequest < minInterval) {
                await this.sleep(minInterval - timeSinceLastRequest);
            }

            // Apply backoff if we have consecutive failures
            if (this.consecutiveFailures > 0) {
                const backoffDelay = Math.min(
                    this.config.baseBackoffMs *
                        Math.pow(2, this.consecutiveFailures - 1),
                    this.config.maxBackoffMs
                );
                await this.sleep(backoffDelay);
            }

            // Get next request
            const request = this.queue.shift();
            if (!request) continue;

            this.stats.queuedRequests = this.queue.length;
            this.activeRequests++;
            this.stats.activeRequests = this.activeRequests;
            this.lastRequestTime = Date.now();

            // Execute request
            this.executeRequest(request);
        }

        this.processing = false;
    }

    /**
     * Execute a single request with retry logic
     */
    private async executeRequest(
        request: QueuedRequest<unknown>
    ): Promise<void> {
        const startTime = Date.now();

        try {
            const result = await request.execute();

            // Success - reset failure counter
            this.consecutiveFailures = 0;
            this.stats.successfulRequests++;
            this.stats.totalRequests++;

            // Update response time stats
            const responseTime = Date.now() - startTime;
            this.totalResponseTime += responseTime;
            this.stats.avgResponseTimeMs =
                this.totalResponseTime / this.stats.totalRequests;

            request.resolve(result);
        } catch (error) {
            this.consecutiveFailures++;

            // Check if we should retry
            if (request.retries < 3) {
                request.retries++;
                this.stats.totalRetries++;

                // Re-queue the request
                this.queue.unshift(request);
                this.stats.queuedRequests = this.queue.length;

                log.warn(
                    { requestId: request.id, attempt: request.retries },
                    "Request failed, retrying"
                );
            } else {
                // Max retries exceeded
                this.stats.failedRequests++;
                this.stats.totalRequests++;

                request.reject(
                    error instanceof Error ? error : new Error(String(error))
                );
            }
        } finally {
            this.activeRequests--;
            this.stats.activeRequests = this.activeRequests;

            // Continue processing queue
            if (this.queue.length > 0 && !this.processing) {
                this.processQueue();
            }
        }
    }

    /**
     * Get current statistics
     */
    getStats(): RateLimiterStats {
        return { ...this.stats };
    }

    /**
     * Reset statistics
     */
    resetStats(): void {
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            queuedRequests: this.queue.length,
            activeRequests: this.activeRequests,
            avgResponseTimeMs: 0,
            totalRetries: 0,
        };
        this.totalResponseTime = 0;
    }

    /**
     * Clear the request queue
     */
    clearQueue(): void {
        // Reject all pending requests
        for (const request of this.queue) {
            request.reject(new Error("Queue cleared"));
        }
        this.queue = [];
        this.stats.queuedRequests = 0;
    }

    /**
     * Helper to sleep for a given duration
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Generate a unique request ID
     */
    private generateRequestId(): string {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

/**
 * Rate Limiter Service managing rate limits for all data sources
 */
export class RateLimiterService {
    private limiters: Map<DataSource, SourceRateLimiter> = new Map();

    constructor() {
        // Initialize limiters for each source
        for (const [source, config] of Object.entries(RATE_LIMITS)) {
            this.limiters.set(
                source as DataSource,
                new SourceRateLimiter(config)
            );
        }
    }

    /**
     * Execute a request with rate limiting for the specified source
     *
     * @param source - Data source (espn/pfr)
     * @param execute - Async function to execute
     * @param maxRetries - Maximum retry attempts
     * @returns Promise resolving to the request result
     */
    async execute<T>(
        source: DataSource,
        execute: () => Promise<T>,
        maxRetries: number = 3
    ): Promise<T> {
        const limiter = this.limiters.get(source);
        if (!limiter) {
            throw new Error(`No rate limiter configured for source: ${source}`);
        }

        return limiter.execute(execute, maxRetries);
    }

    /**
     * Get statistics for a specific source
     *
     * @param source - Data source
     * @returns Rate limiter statistics
     */
    getStats(source: DataSource): RateLimiterStats | null {
        const limiter = this.limiters.get(source);
        return limiter?.getStats() ?? null;
    }

    /**
     * Get statistics for all sources
     *
     * @returns Map of source to statistics
     */
    getAllStats(): Map<DataSource, RateLimiterStats> {
        const stats = new Map<DataSource, RateLimiterStats>();
        for (const [source, limiter] of this.limiters) {
            stats.set(source, limiter.getStats());
        }
        return stats;
    }

    /**
     * Reset statistics for a specific source
     *
     * @param source - Data source
     */
    resetStats(source: DataSource): void {
        const limiter = this.limiters.get(source);
        limiter?.resetStats();
    }

    /**
     * Reset statistics for all sources
     */
    resetAllStats(): void {
        for (const limiter of this.limiters.values()) {
            limiter.resetStats();
        }
    }

    /**
     * Clear the request queue for a specific source
     *
     * @param source - Data source
     */
    clearQueue(source: DataSource): void {
        const limiter = this.limiters.get(source);
        limiter?.clearQueue();
    }

    /**
     * Clear all request queues
     */
    clearAllQueues(): void {
        for (const limiter of this.limiters.values()) {
            limiter.clearQueue();
        }
    }
}

// Export singleton instance for convenience
let rateLimiterInstance: RateLimiterService | null = null;

/**
 * Get the singleton rate limiter service instance
 */
export function getRateLimiter(): RateLimiterService {
    if (!rateLimiterInstance) {
        rateLimiterInstance = new RateLimiterService();
    }
    return rateLimiterInstance;
}
