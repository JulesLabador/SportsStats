-- ============================================================================
-- Security Hardening
-- ============================================================================
-- Resolves Supabase Security Advisor ERRORs:
--
-- 1. rls_disabled_in_public  -> nfl_games, nfl_teams
--    These tables (added in 004/005) are in the public schema and exposed via
--    PostgREST, but RLS was never enabled. Migration 003 only covered the
--    original tables. We enable RLS and add the same public-read policy the
--    other public tables use. Writes remain service-role only (no write
--    policy = denied for anon; service role bypasses RLS).
--
-- 2. security_definer_view  -> all 8 public views
--    Postgres views default to security_invoker = off, so they run with the
--    view owner's (postgres) privileges and bypass the caller's RLS. Setting
--    security_invoker = on makes each view enforce the querying user's RLS on
--    the underlying tables. This also stops the internal monitoring views
--    (api_cache_stats, player_identity_coverage) from leaking data sourced
--    from RLS-protected internal tables.
-- ============================================================================

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY ON REMAINING PUBLIC TABLES
-- ============================================================================

ALTER TABLE nfl_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfl_teams ENABLE ROW LEVEL SECURITY;

-- NFL games - public read
CREATE POLICY "Allow public read access on nfl_games"
    ON nfl_games
    FOR SELECT
    USING (true);

-- NFL teams - public read
CREATE POLICY "Allow public read access on nfl_teams"
    ON nfl_teams
    FOR SELECT
    USING (true);

-- ============================================================================
-- ENFORCE security_invoker ON ALL PUBLIC VIEWS
-- ============================================================================
-- With security_invoker = on, each view runs queries with the permissions and
-- RLS of the querying user rather than the view owner. The public-read views
-- continue to work because their underlying tables all have public-read
-- policies (enabled above and in migration 003). The internal monitoring views
-- now correctly return no rows to anon/authenticated users.

ALTER VIEW nfl_player_season_details   SET (security_invoker = on);
ALTER VIEW nfl_weekly_stats_with_player SET (security_invoker = on);
ALTER VIEW nfl_team_details            SET (security_invoker = on);
ALTER VIEW nfl_upcoming_games          SET (security_invoker = on);
ALTER VIEW nfl_recent_games            SET (security_invoker = on);
ALTER VIEW nfl_teams_full              SET (security_invoker = on);
ALTER VIEW api_cache_stats             SET (security_invoker = on);
ALTER VIEW player_identity_coverage    SET (security_invoker = on);

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. ETL writes use SUPABASE_SECRET_KEY (service role), which bypasses RLS, so
--    enabling RLS here does not affect data loading.
--
-- 2. App reads use the anon/publishable key via PostgREST (server-side). They
--    continue to work because every table read through these views/tables has
--    a "FOR SELECT USING (true)" public-read policy.
--
-- 3. api_cache_stats and player_identity_coverage read RLS-protected internal
--    tables (api_response_cache, player_identity_mappings). After this change
--    they return no rows to anon; only the service role sees their data.
-- ============================================================================
