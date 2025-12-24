-- ============================================================================
-- Caching and Player Identity Schema
-- ============================================================================
-- This migration adds tables for:
-- 1. API response caching (ESPN/PFR responses)
-- 2. Player identity mapping (linking ESPN IDs to PFR slugs)
-- ============================================================================

-- ============================================================================
-- API_RESPONSE_CACHE TABLE
-- ============================================================================
-- Stores raw API/scrape responses to avoid redundant requests.
-- Supports TTL-based expiration and queryable metadata.

CREATE TABLE api_response_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source TEXT NOT NULL CHECK (source IN ('espn', 'pfr')),
    endpoint TEXT NOT NULL,                       -- API endpoint or URL path
    params_hash TEXT NOT NULL,                    -- SHA256 hash of request params
    response_data JSONB NOT NULL,                 -- Raw response (JSON or HTML as string)
    season INTEGER,                               -- Season year (nullable for non-seasonal data)
    week INTEGER,                                 -- Week number (nullable)
    game_id TEXT,                                 -- Game identifier (nullable)
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,              -- When this cache entry expires

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure unique cache entries per source/endpoint/params combination
    CONSTRAINT unique_cache_entry UNIQUE (source, endpoint, params_hash)
);

-- Indexes for efficient cache lookups
CREATE INDEX idx_api_cache_source_endpoint ON api_response_cache (source, endpoint);
CREATE INDEX idx_api_cache_expires_at ON api_response_cache (expires_at);
CREATE INDEX idx_api_cache_season_week ON api_response_cache (season, week);
CREATE INDEX idx_api_cache_game_id ON api_response_cache (game_id);

-- ============================================================================
-- PLAYER_IDENTITY_MAPPINGS TABLE
-- ============================================================================
-- Links player identities across different data sources.
-- Enables matching ESPN player IDs to PFR slugs.

CREATE TABLE player_identity_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,

    -- Source-specific identifiers
    espn_player_id TEXT,                          -- ESPN's numeric player ID
    pfr_player_slug TEXT,                         -- PFR URL slug (e.g., "MahoPa00")

    -- Matching metadata
    match_confidence TEXT NOT NULL DEFAULT 'medium'
        CHECK (match_confidence IN ('exact', 'high', 'medium', 'low')),
    match_method TEXT,                            -- How the match was determined
    matched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    manual_override BOOLEAN NOT NULL DEFAULT FALSE,

    -- Additional identifiers for future sources
    extra_ids JSONB DEFAULT '{}',                 -- Flexible storage for other source IDs

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Each player should have at most one mapping
    CONSTRAINT unique_player_mapping UNIQUE (player_id)
);

-- Indexes for lookups by source ID
CREATE INDEX idx_identity_espn_id ON player_identity_mappings (espn_player_id);
CREATE INDEX idx_identity_pfr_slug ON player_identity_mappings (pfr_player_slug);
CREATE INDEX idx_identity_confidence ON player_identity_mappings (match_confidence);

-- Apply updated_at trigger
CREATE TRIGGER update_player_identity_mappings_updated_at
    BEFORE UPDATE ON player_identity_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- CACHE CLEANUP FUNCTION
-- ============================================================================
-- Function to delete expired cache entries.
-- Can be called periodically via cron or manually.

CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM api_response_cache
    WHERE expires_at < NOW();

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- USEFUL VIEWS
-- ============================================================================

-- View for cache statistics
CREATE VIEW api_cache_stats AS
SELECT
    source,
    COUNT(*) AS total_entries,
    COUNT(*) FILTER (WHERE expires_at > NOW()) AS valid_entries,
    COUNT(*) FILTER (WHERE expires_at <= NOW()) AS expired_entries,
    MIN(fetched_at) AS oldest_fetch,
    MAX(fetched_at) AS newest_fetch
FROM api_response_cache
GROUP BY source;

-- View for player identity coverage
CREATE VIEW player_identity_coverage AS
SELECT
    COUNT(*) AS total_players,
    COUNT(pim.id) AS mapped_players,
    COUNT(*) FILTER (WHERE pim.espn_player_id IS NOT NULL) AS has_espn_id,
    COUNT(*) FILTER (WHERE pim.pfr_player_slug IS NOT NULL) AS has_pfr_slug,
    COUNT(*) FILTER (WHERE pim.match_confidence = 'exact') AS exact_matches,
    COUNT(*) FILTER (WHERE pim.match_confidence = 'high') AS high_matches,
    COUNT(*) FILTER (WHERE pim.match_confidence = 'medium') AS medium_matches,
    COUNT(*) FILTER (WHERE pim.match_confidence = 'low') AS low_matches
FROM players p
LEFT JOIN player_identity_mappings pim ON p.id = pim.player_id;

