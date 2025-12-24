-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================
-- This migration enables RLS on all tables with the following access patterns:
--
-- PUBLIC TABLES (anonymous read access):
--   - sports, players, player_profiles
--   - nfl_player_seasons, nfl_weekly_stats
--
-- INTERNAL TABLES (service role only, no public access):
--   - etl_runs (audit log)
--   - api_response_cache (cached API responses)
--   - player_identity_mappings (cross-source ID mappings)
--
-- Service role bypasses RLS automatically for all tables.
-- ============================================================================

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================================

ALTER TABLE sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfl_player_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfl_weekly_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE etl_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_response_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_identity_mappings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PUBLIC READ POLICIES
-- ============================================================================
-- Allow anonymous users to read public data.
-- Write operations are implicitly denied (no INSERT/UPDATE/DELETE policies).
-- ============================================================================

-- Sports reference table - public read
CREATE POLICY "Allow public read access on sports"
    ON sports
    FOR SELECT
    USING (true);

-- Players table - public read
CREATE POLICY "Allow public read access on players"
    ON players
    FOR SELECT
    USING (true);

-- Player profiles - public read
CREATE POLICY "Allow public read access on player_profiles"
    ON player_profiles
    FOR SELECT
    USING (true);

-- NFL player seasons - public read
CREATE POLICY "Allow public read access on nfl_player_seasons"
    ON nfl_player_seasons
    FOR SELECT
    USING (true);

-- NFL weekly stats - public read
CREATE POLICY "Allow public read access on nfl_weekly_stats"
    ON nfl_weekly_stats
    FOR SELECT
    USING (true);

-- ============================================================================
-- INTERNAL TABLES (SERVICE ROLE ONLY)
-- ============================================================================
-- These tables have RLS enabled but NO policies for anon/authenticated users.
-- This means all access is denied except for the service role (which bypasses RLS).
-- ============================================================================

-- etl_runs: No policy = no access for anon/authenticated users
-- api_response_cache: No policy = no access for anon/authenticated users
-- player_identity_mappings: No policy = no access for anon/authenticated users

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. Views that reference internal tables (api_cache_stats, player_identity_coverage)
--    will return empty results for non-service-role users due to RLS on underlying tables.
--
-- 2. The service role automatically bypasses RLS, so ETL operations using
--    the SUPABASE_SERVICE_ROLE_KEY will have full read/write access to ALL tables.
--
-- 3. Anonymous/authenticated users using the anon key:
--    - CAN SELECT from: sports, players, player_profiles, nfl_player_seasons,
--      nfl_weekly_stats
--    - CANNOT access: etl_runs, api_response_cache, player_identity_mappings
--    - CANNOT INSERT, UPDATE, or DELETE on any table
-- ============================================================================

