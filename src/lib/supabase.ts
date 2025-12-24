/**
 * Supabase Client Configuration
 *
 * Provides server-side and client-side Supabase clients for database operations.
 * Used by the ETL pipeline and application queries.
 *
 * Note: Environment variables are read at function call time (not module load time)
 * to support dotenv loading in CLI scripts.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Gets environment variables at call time
 * This allows dotenv to load before these are accessed
 */
function getEnvVars() {
    return {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseAnonKey:
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
        supabaseSecretKey: process.env.SUPABASE_SECRET_KEY,
    };
}

/**
 * Validates that required environment variables are set
 * @throws Error if required variables are missing
 */
function validateEnvVars(): { supabaseUrl: string; supabaseAnonKey: string } {
    const { supabaseUrl, supabaseAnonKey } = getEnvVars();

    if (!supabaseUrl) {
        throw new Error(
            "Missing NEXT_PUBLIC_SUPABASE_URL environment variable"
        );
    }
    if (!supabaseAnonKey) {
        throw new Error(
            "Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY environment variable"
        );
    }

    return { supabaseUrl, supabaseAnonKey };
}

/**
 * Creates a Supabase client for client-side operations
 * Uses the anon key with Row Level Security
 */
export function createBrowserClient() {
    const { supabaseUrl, supabaseAnonKey } = validateEnvVars();
    return createClient<Database>(supabaseUrl, supabaseAnonKey);
}

/**
 * Creates a Supabase client for server-side operations
 * Uses the anon key - suitable for Server Components and API routes
 */
export function createServerClient() {
    const { supabaseUrl, supabaseAnonKey } = validateEnvVars();
    return createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: false,
        },
    });
}

/**
 * Creates a Supabase client with admin privileges for ETL operations
 * Uses the secret key - bypasses Row Level Security
 * ONLY use this for server-side ETL operations, never expose to client
 */
export function createAdminClient() {
    const { supabaseUrl } = validateEnvVars();
    const { supabaseSecretKey } = getEnvVars();

    if (!supabaseSecretKey) {
        throw new Error(
            "Missing SUPABASE_SECRET_KEY environment variable - required for admin operations"
        );
    }

    return createClient<Database>(supabaseUrl, supabaseSecretKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });
}

// Re-export types for convenience
export type { Database };
