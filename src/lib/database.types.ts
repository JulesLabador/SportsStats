/**
 * Database Types for Supabase
 *
 * These types are manually defined to match the multi-sport database schema.
 * In production, you would generate these using:
 * npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts
 */

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

/** Supported sport IDs */
export type SportId = "nfl" | "mlb" | "nba" | "f1";

export type Database = {
    public: {
        Tables: {
            sports: {
                Row: {
                    id: string;
                    name: string;
                    abbreviation: string;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id: string;
                    name: string;
                    abbreviation: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    abbreviation?: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            players: {
                Row: {
                    id: string;
                    name: string;
                    image_url: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id: string;
                    name: string;
                    image_url?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    image_url?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            player_profiles: {
                Row: {
                    id: string;
                    player_id: string;
                    sport_id: string;
                    position: string;
                    metadata: Json;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    player_id: string;
                    sport_id: string;
                    position: string;
                    metadata?: Json;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    player_id?: string;
                    sport_id?: string;
                    position?: string;
                    metadata?: Json;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "player_profiles_player_id_fkey";
                        columns: ["player_id"];
                        isOneToOne: false;
                        referencedRelation: "players";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "player_profiles_sport_id_fkey";
                        columns: ["sport_id"];
                        isOneToOne: false;
                        referencedRelation: "sports";
                        referencedColumns: ["id"];
                    }
                ];
            };
            nfl_player_seasons: {
                Row: {
                    id: string;
                    player_profile_id: string;
                    season: number;
                    team: string;
                    jersey_number: number;
                    is_active: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    player_profile_id: string;
                    season: number;
                    team: string;
                    jersey_number?: number;
                    is_active?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    player_profile_id?: string;
                    season?: number;
                    team?: string;
                    jersey_number?: number;
                    is_active?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "nfl_player_seasons_player_profile_id_fkey";
                        columns: ["player_profile_id"];
                        isOneToOne: false;
                        referencedRelation: "player_profiles";
                        referencedColumns: ["id"];
                    }
                ];
            };
            nfl_weekly_stats: {
                Row: {
                    id: string;
                    player_season_id: string;
                    week: number;
                    opponent: string;
                    location: "H" | "A";
                    result: string | null;
                    passing_yards: number;
                    passing_tds: number;
                    interceptions: number;
                    completions: number;
                    attempts: number;
                    rushing_yards: number;
                    rushing_tds: number;
                    carries: number;
                    receiving_yards: number;
                    receiving_tds: number;
                    receptions: number;
                    targets: number;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    player_season_id: string;
                    week: number;
                    opponent: string;
                    location: "H" | "A";
                    result?: string | null;
                    passing_yards?: number;
                    passing_tds?: number;
                    interceptions?: number;
                    completions?: number;
                    attempts?: number;
                    rushing_yards?: number;
                    rushing_tds?: number;
                    carries?: number;
                    receiving_yards?: number;
                    receiving_tds?: number;
                    receptions?: number;
                    targets?: number;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    player_season_id?: string;
                    week?: number;
                    opponent?: string;
                    location?: "H" | "A";
                    result?: string | null;
                    passing_yards?: number;
                    passing_tds?: number;
                    interceptions?: number;
                    completions?: number;
                    attempts?: number;
                    rushing_yards?: number;
                    rushing_tds?: number;
                    carries?: number;
                    receiving_yards?: number;
                    receiving_tds?: number;
                    receptions?: number;
                    targets?: number;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "nfl_weekly_stats_player_season_id_fkey";
                        columns: ["player_season_id"];
                        isOneToOne: false;
                        referencedRelation: "nfl_player_seasons";
                        referencedColumns: ["id"];
                    }
                ];
            };
            etl_runs: {
                Row: {
                    id: string;
                    adapter_name: string;
                    sport_id: string | null;
                    started_at: string;
                    completed_at: string | null;
                    status: "running" | "success" | "failed";
                    records_processed: number;
                    error_message: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    adapter_name: string;
                    sport_id?: string | null;
                    started_at?: string;
                    completed_at?: string | null;
                    status?: "running" | "success" | "failed";
                    records_processed?: number;
                    error_message?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    adapter_name?: string;
                    sport_id?: string | null;
                    started_at?: string;
                    completed_at?: string | null;
                    status?: "running" | "success" | "failed";
                    records_processed?: number;
                    error_message?: string | null;
                    created_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "etl_runs_sport_id_fkey";
                        columns: ["sport_id"];
                        isOneToOne: false;
                        referencedRelation: "sports";
                        referencedColumns: ["id"];
                    }
                ];
            };
            api_response_cache: {
                Row: {
                    id: string;
                    source: "espn" | "pfr";
                    endpoint: string;
                    params_hash: string;
                    response_data: Json;
                    season: number | null;
                    week: number | null;
                    game_id: string | null;
                    fetched_at: string;
                    expires_at: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    source: "espn" | "pfr";
                    endpoint: string;
                    params_hash: string;
                    response_data: Json;
                    season?: number | null;
                    week?: number | null;
                    game_id?: string | null;
                    fetched_at?: string;
                    expires_at: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    source?: "espn" | "pfr";
                    endpoint?: string;
                    params_hash?: string;
                    response_data?: Json;
                    season?: number | null;
                    week?: number | null;
                    game_id?: string | null;
                    fetched_at?: string;
                    expires_at?: string;
                    created_at?: string;
                };
                Relationships: [];
            };
            player_identity_mappings: {
                Row: {
                    id: string;
                    player_id: string;
                    espn_player_id: string | null;
                    pfr_player_slug: string | null;
                    match_confidence: "exact" | "high" | "medium" | "low";
                    match_method: string | null;
                    matched_at: string;
                    manual_override: boolean;
                    extra_ids: Json;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    player_id: string;
                    espn_player_id?: string | null;
                    pfr_player_slug?: string | null;
                    match_confidence?: "exact" | "high" | "medium" | "low";
                    match_method?: string | null;
                    matched_at?: string;
                    manual_override?: boolean;
                    extra_ids?: Json;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    player_id?: string;
                    espn_player_id?: string | null;
                    pfr_player_slug?: string | null;
                    match_confidence?: "exact" | "high" | "medium" | "low";
                    match_method?: string | null;
                    matched_at?: string;
                    manual_override?: boolean;
                    extra_ids?: Json;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "player_identity_mappings_player_id_fkey";
                        columns: ["player_id"];
                        isOneToOne: true;
                        referencedRelation: "players";
                        referencedColumns: ["id"];
                    }
                ];
            };
            nfl_games: {
                Row: {
                    id: string;
                    espn_game_id: string;
                    season: number;
                    week: number;
                    home_team: string;
                    away_team: string;
                    home_score: number | null;
                    away_score: number | null;
                    game_date: string;
                    venue_name: string | null;
                    venue_city: string | null;
                    venue_state: string | null;
                    status: "scheduled" | "in_progress" | "final";
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    espn_game_id: string;
                    season: number;
                    week: number;
                    home_team: string;
                    away_team: string;
                    home_score?: number | null;
                    away_score?: number | null;
                    game_date: string;
                    venue_name?: string | null;
                    venue_city?: string | null;
                    venue_state?: string | null;
                    status?: "scheduled" | "in_progress" | "final";
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    espn_game_id?: string;
                    season?: number;
                    week?: number;
                    home_team?: string;
                    away_team?: string;
                    home_score?: number | null;
                    away_score?: number | null;
                    game_date?: string;
                    venue_name?: string | null;
                    venue_city?: string | null;
                    venue_state?: string | null;
                    status?: "scheduled" | "in_progress" | "final";
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
        };
        Views: {
            nfl_player_season_details: {
                Row: {
                    player_id: string | null;
                    name: string | null;
                    image_url: string | null;
                    player_profile_id: string | null;
                    position: string | null;
                    profile_metadata: Json | null;
                    player_season_id: string | null;
                    season: number | null;
                    team: string | null;
                    jersey_number: number | null;
                    is_active: boolean | null;
                };
                Relationships: [];
            };
            nfl_weekly_stats_with_player: {
                Row: {
                    id: string | null;
                    player_season_id: string | null;
                    week: number | null;
                    opponent: string | null;
                    location: "H" | "A" | null;
                    result: string | null;
                    passing_yards: number | null;
                    passing_tds: number | null;
                    interceptions: number | null;
                    completions: number | null;
                    attempts: number | null;
                    rushing_yards: number | null;
                    rushing_tds: number | null;
                    carries: number | null;
                    receiving_yards: number | null;
                    receiving_tds: number | null;
                    receptions: number | null;
                    targets: number | null;
                    created_at: string | null;
                    updated_at: string | null;
                    player_id: string | null;
                    name: string | null;
                    image_url: string | null;
                    position: string | null;
                    season: number | null;
                    team: string | null;
                    jersey_number: number | null;
                };
                Relationships: [];
            };
            api_cache_stats: {
                Row: {
                    source: string | null;
                    total_entries: number | null;
                    valid_entries: number | null;
                    expired_entries: number | null;
                    oldest_fetch: string | null;
                    newest_fetch: string | null;
                };
                Relationships: [];
            };
            player_identity_coverage: {
                Row: {
                    total_players: number | null;
                    mapped_players: number | null;
                    has_espn_id: number | null;
                    has_pfr_slug: number | null;
                    exact_matches: number | null;
                    high_matches: number | null;
                    medium_matches: number | null;
                    low_matches: number | null;
                };
                Relationships: [];
            };
            nfl_team_details: {
                Row: {
                    abbreviation: string | null;
                    season: number | null;
                    wins: number | null;
                    losses: number | null;
                    ties: number | null;
                    roster_size: number | null;
                };
                Relationships: [];
            };
            nfl_upcoming_games: {
                Row: {
                    id: string | null;
                    espn_game_id: string | null;
                    season: number | null;
                    week: number | null;
                    home_team: string | null;
                    away_team: string | null;
                    game_date: string | null;
                    venue_name: string | null;
                    venue_city: string | null;
                    venue_state: string | null;
                    status: string | null;
                };
                Relationships: [];
            };
            nfl_recent_games: {
                Row: {
                    id: string | null;
                    espn_game_id: string | null;
                    season: number | null;
                    week: number | null;
                    home_team: string | null;
                    away_team: string | null;
                    home_score: number | null;
                    away_score: number | null;
                    game_date: string | null;
                    venue_name: string | null;
                    venue_city: string | null;
                    venue_state: string | null;
                    status: string | null;
                };
                Relationships: [];
            };
        };
        Functions: {
            cleanup_expired_cache: {
                Args: Record<string, never>;
                Returns: number;
            };
        };
        Enums: Record<string, never>;
        CompositeTypes: Record<string, never>;
    };
};

// ============================================================================
// Convenience type aliases
// ============================================================================

// Sports
export type Sport = Database["public"]["Tables"]["sports"]["Row"];
export type SportInsert = Database["public"]["Tables"]["sports"]["Insert"];
export type SportUpdate = Database["public"]["Tables"]["sports"]["Update"];

// Players (core identity)
export type Player = Database["public"]["Tables"]["players"]["Row"];
export type PlayerInsert = Database["public"]["Tables"]["players"]["Insert"];
export type PlayerUpdate = Database["public"]["Tables"]["players"]["Update"];

// Player Profiles (sport-specific)
export type PlayerProfile =
    Database["public"]["Tables"]["player_profiles"]["Row"];
export type PlayerProfileInsert =
    Database["public"]["Tables"]["player_profiles"]["Insert"];
export type PlayerProfileUpdate =
    Database["public"]["Tables"]["player_profiles"]["Update"];

// NFL Player Seasons
export type NFLPlayerSeason =
    Database["public"]["Tables"]["nfl_player_seasons"]["Row"];
export type NFLPlayerSeasonInsert =
    Database["public"]["Tables"]["nfl_player_seasons"]["Insert"];
export type NFLPlayerSeasonUpdate =
    Database["public"]["Tables"]["nfl_player_seasons"]["Update"];

// NFL Weekly Stats
export type NFLWeeklyStat =
    Database["public"]["Tables"]["nfl_weekly_stats"]["Row"];
export type NFLWeeklyStatInsert =
    Database["public"]["Tables"]["nfl_weekly_stats"]["Insert"];
export type NFLWeeklyStatUpdate =
    Database["public"]["Tables"]["nfl_weekly_stats"]["Update"];

// ETL Runs
export type EtlRun = Database["public"]["Tables"]["etl_runs"]["Row"];
export type EtlRunInsert = Database["public"]["Tables"]["etl_runs"]["Insert"];
export type EtlRunUpdate = Database["public"]["Tables"]["etl_runs"]["Update"];

// API Response Cache
export type ApiResponseCache =
    Database["public"]["Tables"]["api_response_cache"]["Row"];
export type ApiResponseCacheInsert =
    Database["public"]["Tables"]["api_response_cache"]["Insert"];
export type ApiResponseCacheUpdate =
    Database["public"]["Tables"]["api_response_cache"]["Update"];

// Player Identity Mappings
export type PlayerIdentityMapping =
    Database["public"]["Tables"]["player_identity_mappings"]["Row"];
export type PlayerIdentityMappingInsert =
    Database["public"]["Tables"]["player_identity_mappings"]["Insert"];
export type PlayerIdentityMappingUpdate =
    Database["public"]["Tables"]["player_identity_mappings"]["Update"];

// NFL Games
export type NFLGameRow = Database["public"]["Tables"]["nfl_games"]["Row"];
export type NFLGameInsert = Database["public"]["Tables"]["nfl_games"]["Insert"];
export type NFLGameUpdate = Database["public"]["Tables"]["nfl_games"]["Update"];

// Views
export type NFLPlayerSeasonDetails =
    Database["public"]["Views"]["nfl_player_season_details"]["Row"];
export type NFLWeeklyStatsWithPlayer =
    Database["public"]["Views"]["nfl_weekly_stats_with_player"]["Row"];
export type ApiCacheStats =
    Database["public"]["Views"]["api_cache_stats"]["Row"];
export type PlayerIdentityCoverage =
    Database["public"]["Views"]["player_identity_coverage"]["Row"];
export type NFLTeamDetails =
    Database["public"]["Views"]["nfl_team_details"]["Row"];
export type NFLUpcomingGames =
    Database["public"]["Views"]["nfl_upcoming_games"]["Row"];
export type NFLRecentGames =
    Database["public"]["Views"]["nfl_recent_games"]["Row"];

// ============================================================================
// Profile Metadata Types (for JSONB column)
// ============================================================================

/** NFL player profile metadata */
export interface NFLProfileMetadata {
    college?: string;
    draft_year?: number;
    draft_round?: number;
    draft_pick?: number;
    height_inches?: number;
    weight_lbs?: number;
    birth_date?: string;
}

/** MLB player profile metadata */
export interface MLBProfileMetadata {
    bats?: "L" | "R" | "S";
    throws?: "L" | "R";
    college?: string;
    draft_year?: number;
    draft_round?: number;
    draft_pick?: number;
    height_inches?: number;
    weight_lbs?: number;
    birth_date?: string;
}

/** NBA player profile metadata */
export interface NBAProfileMetadata {
    college?: string;
    draft_year?: number;
    draft_round?: number;
    draft_pick?: number;
    height_inches?: number;
    weight_lbs?: number;
    wingspan_inches?: number;
    birth_date?: string;
}

/** F1 driver profile metadata */
export interface F1ProfileMetadata {
    nationality?: string;
    permanent_number?: number;
    debut_year?: number;
    world_championships?: number;
    birth_date?: string;
    helmet_design_url?: string;
}
