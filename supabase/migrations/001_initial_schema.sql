-- ============================================================================
-- Multi-Sport Stats Database Schema
-- ============================================================================
-- This migration creates the core tables for storing player statistics
-- across multiple sports (NFL, MLB, NBA, F1, etc.)
-- Designed to support the ETL pipeline with upsert-friendly constraints.
-- ============================================================================

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- SPORTS TABLE
-- ============================================================================
-- Reference table for supported sports.

CREATE TABLE sports (
    id TEXT PRIMARY KEY,                          -- Slug like "nfl", "mlb"
    name TEXT NOT NULL,                           -- Full name "National Football League"
    abbreviation TEXT NOT NULL,                   -- Short form "NFL"
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial sports
INSERT INTO sports (id, name, abbreviation) VALUES
    ('nfl', 'National Football League', 'NFL'),
    ('mlb', 'Major League Baseball', 'MLB'),
    ('nba', 'National Basketball Association', 'NBA'),
    ('f1', 'Formula 1', 'F1');

-- ============================================================================
-- PLAYERS TABLE
-- ============================================================================
-- Core player identity shared across sports.
-- A player can have profiles in multiple sports (rare but possible).

CREATE TABLE players (
    id TEXT PRIMARY KEY,                          -- Slug like "patrick-mahomes"
    name TEXT NOT NULL,                           -- Full player name
    image_url TEXT,                               -- Player headshot URL (nullable)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for searching by name
CREATE INDEX idx_players_name ON players (name);

-- ============================================================================
-- PLAYER_PROFILES TABLE
-- ============================================================================
-- Links a player to a sport with sport-specific metadata.
-- One player can have multiple profiles (one per sport).

CREATE TABLE player_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    sport_id TEXT NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
    position TEXT NOT NULL,                       -- QB, Pitcher, Point Guard, Driver, etc.
    metadata JSONB DEFAULT '{}',                  -- Sport-specific extras (college, draft info, etc.)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One profile per player per sport
    CONSTRAINT unique_player_sport UNIQUE (player_id, sport_id)
);

-- Indexes for common queries
CREATE INDEX idx_player_profiles_player_id ON player_profiles (player_id);
CREATE INDEX idx_player_profiles_sport_id ON player_profiles (sport_id);
CREATE INDEX idx_player_profiles_position ON player_profiles (position);

-- ============================================================================
-- NFL_PLAYER_SEASONS TABLE
-- ============================================================================
-- Season-specific snapshot of NFL player state.
-- Tracks team changes, jersey number changes, and whether player was active.

CREATE TABLE nfl_player_seasons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_profile_id UUID NOT NULL REFERENCES player_profiles(id) ON DELETE CASCADE,
    season INTEGER NOT NULL,                      -- e.g., 2024
    team TEXT NOT NULL,                           -- NFL team abbreviation
    jersey_number INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,      -- Whether player was active this season
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure one record per player profile per season
    CONSTRAINT unique_nfl_player_season UNIQUE (player_profile_id, season)
);

-- Indexes for common queries
CREATE INDEX idx_nfl_player_seasons_profile_id ON nfl_player_seasons (player_profile_id);
CREATE INDEX idx_nfl_player_seasons_season ON nfl_player_seasons (season);
CREATE INDEX idx_nfl_player_seasons_team ON nfl_player_seasons (team);

-- ============================================================================
-- NFL_WEEKLY_STATS TABLE
-- ============================================================================
-- Per-game statistics for NFL players.
-- All stat columns default to 0 - unused stats for a position remain 0.

CREATE TABLE nfl_weekly_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_season_id UUID NOT NULL REFERENCES nfl_player_seasons(id) ON DELETE CASCADE,
    week INTEGER NOT NULL CHECK (week >= 1 AND week <= 18),
    opponent TEXT NOT NULL,                       -- Team abbreviation
    location TEXT NOT NULL CHECK (location IN ('H', 'A')),
    result TEXT,                                  -- "W 24-17" or "L 14-21" format

    -- Passing stats (primarily QB)
    passing_yards INTEGER NOT NULL DEFAULT 0,
    passing_tds INTEGER NOT NULL DEFAULT 0,
    interceptions INTEGER NOT NULL DEFAULT 0,
    completions INTEGER NOT NULL DEFAULT 0,
    attempts INTEGER NOT NULL DEFAULT 0,

    -- Rushing stats (QB, RB, WR)
    rushing_yards INTEGER NOT NULL DEFAULT 0,
    rushing_tds INTEGER NOT NULL DEFAULT 0,
    carries INTEGER NOT NULL DEFAULT 0,

    -- Receiving stats (RB, WR, TE)
    receiving_yards INTEGER NOT NULL DEFAULT 0,
    receiving_tds INTEGER NOT NULL DEFAULT 0,
    receptions INTEGER NOT NULL DEFAULT 0,
    targets INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure one record per player per week per season
    CONSTRAINT unique_nfl_player_season_week UNIQUE (player_season_id, week)
);

-- Indexes for common queries
CREATE INDEX idx_nfl_weekly_stats_player_season_id ON nfl_weekly_stats (player_season_id);
CREATE INDEX idx_nfl_weekly_stats_week ON nfl_weekly_stats (week);

-- ============================================================================
-- ETL_RUNS TABLE
-- ============================================================================
-- Audit log for tracking ETL pipeline executions.

CREATE TABLE etl_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    adapter_name TEXT NOT NULL,                   -- Which data source adapter was used
    sport_id TEXT REFERENCES sports(id),          -- Which sport (nullable for multi-sport runs)
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,                     -- NULL while running
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed')),
    records_processed INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,                           -- Error details if failed

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying recent runs
CREATE INDEX idx_etl_runs_started_at ON etl_runs (started_at DESC);
CREATE INDEX idx_etl_runs_adapter_name ON etl_runs (adapter_name);
CREATE INDEX idx_etl_runs_sport_id ON etl_runs (sport_id);

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================
-- Automatically updates the updated_at column on row changes.

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_sports_updated_at
    BEFORE UPDATE ON sports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_players_updated_at
    BEFORE UPDATE ON players
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_profiles_updated_at
    BEFORE UPDATE ON player_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nfl_player_seasons_updated_at
    BEFORE UPDATE ON nfl_player_seasons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nfl_weekly_stats_updated_at
    BEFORE UPDATE ON nfl_weekly_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- USEFUL VIEWS
-- ============================================================================

-- View that joins player info with profile and season data for NFL
CREATE VIEW nfl_player_season_details AS
SELECT
    p.id AS player_id,
    p.name,
    p.image_url,
    pp.id AS player_profile_id,
    pp.position,
    pp.metadata AS profile_metadata,
    ps.id AS player_season_id,
    ps.season,
    ps.team,
    ps.jersey_number,
    ps.is_active
FROM players p
JOIN player_profiles pp ON p.id = pp.player_id AND pp.sport_id = 'nfl'
JOIN nfl_player_seasons ps ON pp.id = ps.player_profile_id;

-- View for complete NFL weekly stats with player info
CREATE VIEW nfl_weekly_stats_with_player AS
SELECT
    ws.*,
    p.id AS player_id,
    p.name,
    p.image_url,
    pp.position,
    ps.season,
    ps.team,
    ps.jersey_number
FROM nfl_weekly_stats ws
JOIN nfl_player_seasons ps ON ws.player_season_id = ps.id
JOIN player_profiles pp ON ps.player_profile_id = pp.id
JOIN players p ON pp.player_id = p.id;
