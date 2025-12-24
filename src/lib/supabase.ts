/**
 * Supabase Client Configuration
 *
 * Provides server-side and client-side Supabase clients for database operations.
 * Used by the ETL pipeline and application queries.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Environment variables for Supabase connection
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Validates that required environment variables are set
 * @throws Error if required variables are missing
 */
function validateEnvVars(): void {
    if (!supabaseUrl) {
        throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
    }
    if (!supabaseAnonKey) {
        throw new Error(
            "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable"
        );
    }
}

/**
 * Creates a Supabase client for client-side operations
 * Uses the anon key with Row Level Security
 */
export function createBrowserClient() {
    validateEnvVars();
    return createClient<Database>(supabaseUrl!, supabaseAnonKey!);
}

/**
 * Creates a Supabase client for server-side operations
 * Uses the anon key - suitable for Server Components and API routes
 */
export function createServerClient() {
    validateEnvVars();
    return createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
        auth: {
            persistSession: false,
        },
    });
}

/**
 * Creates a Supabase client with admin privileges for ETL operations
 * Uses the service role key - bypasses Row Level Security
 * ONLY use this for server-side ETL operations, never expose to client
 */
export function createAdminClient() {
    validateEnvVars();
    if (!supabaseServiceRoleKey) {
        throw new Error(
            "Missing SUPABASE_SERVICE_ROLE_KEY environment variable - required for admin operations"
        );
    }
    return createClient<Database>(supabaseUrl!, supabaseServiceRoleKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });
}

// Re-export types for convenience
export type { Database };

