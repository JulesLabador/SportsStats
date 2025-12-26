-- ============================================================================
-- NFL Games Schema
-- ============================================================================
-- This migration adds tables for storing NFL game/matchup data.
-- Supports upcoming, in-progress, and completed games.
-- ============================================================================

-- ============================================================================
-- NFL_GAMES TABLE
-- ============================================================================
-- Stores all NFL games with schedule and result information.
-- Used for upcoming matches display and matchup pages.

CREATE TABLE nfl_games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    espn_game_id TEXT NOT NULL UNIQUE,            -- ESPN's game identifier
    season INTEGER NOT NULL,                       -- Season year (e.g., 2024)
    week INTEGER NOT NULL CHECK (week >= 1 AND week <= 22), -- Week 1-18 regular, 19-22 playoffs

    -- Team information
    home_team TEXT NOT NULL,                       -- Home team abbreviation
    away_team TEXT NOT NULL,                       -- Away team abbreviation

    -- Score (nullable for upcoming games)
    home_score INTEGER,                            -- Home team score
    away_score INTEGER,                            -- Away team score

    -- Schedule information
    game_date TIMESTAMPTZ NOT NULL,                -- Game date and time

    -- Venue information
    venue_name TEXT,                               -- Stadium name
    venue_city TEXT,                               -- City
    venue_state TEXT,                              -- State

    -- Game status
    status TEXT NOT NULL DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'in_progress', 'final')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure one record per season/week/team combination
    CONSTRAINT unique_nfl_game UNIQUE (season, week, home_team, away_team)
);

-- Indexes for common queries
CREATE INDEX idx_nfl_games_season_week ON nfl_games (season, week);
CREATE INDEX idx_nfl_games_status ON nfl_games (status);
CREATE INDEX idx_nfl_games_game_date ON nfl_games (game_date);
CREATE INDEX idx_nfl_games_home_team ON nfl_games (home_team);
CREATE INDEX idx_nfl_games_away_team ON nfl_games (away_team);
CREATE INDEX idx_nfl_games_espn_id ON nfl_games (espn_game_id);

-- Apply updated_at trigger
CREATE TRIGGER update_nfl_games_updated_at
    BEFORE UPDATE ON nfl_games
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- NFL_TEAM_DETAILS VIEW
-- ============================================================================
-- Aggregates team information including roster and win/loss record.

CREATE VIEW nfl_team_details AS
WITH team_records AS (
    -- Calculate win/loss/tie record for each team
    SELECT
        team,
        season,
        COUNT(*) FILTER (WHERE won = TRUE) AS wins,
        COUNT(*) FILTER (WHERE won = FALSE AND tied = FALSE) AS losses,
        COUNT(*) FILTER (WHERE tied = TRUE) AS ties
    FROM (
        -- Home games
        SELECT
            home_team AS team,
            season,
            home_score > away_score AS won,
            home_score = away_score AS tied
        FROM nfl_games
        WHERE status = 'final'

        UNION ALL

        -- Away games
        SELECT
            away_team AS team,
            season,
            away_score > home_score AS won,
            away_score = home_score AS tied
        FROM nfl_games
        WHERE status = 'final'
    ) game_results
    GROUP BY team, season
),
team_rosters AS (
    -- Get player count per team per season
    SELECT
        team,
        season,
        COUNT(DISTINCT player_id) AS player_count
    FROM nfl_player_season_details
    WHERE is_active = TRUE
    GROUP BY team, season
)
SELECT
    tr.team AS abbreviation,
    tr.season,
    COALESCE(rec.wins, 0) AS wins,
    COALESCE(rec.losses, 0) AS losses,
    COALESCE(rec.ties, 0) AS ties,
    COALESCE(tr.player_count, 0) AS roster_size
FROM team_rosters tr
LEFT JOIN team_records rec ON tr.team = rec.team AND tr.season = rec.season;

-- ============================================================================
-- NFL_UPCOMING_GAMES VIEW
-- ============================================================================
-- Convenience view for fetching upcoming games ordered by date.

CREATE VIEW nfl_upcoming_games AS
SELECT
    id,
    espn_game_id,
    season,
    week,
    home_team,
    away_team,
    game_date,
    venue_name,
    venue_city,
    venue_state,
    status
FROM nfl_games
WHERE status = 'scheduled'
  AND game_date > NOW()
ORDER BY game_date ASC;

-- ============================================================================
-- NFL_RECENT_GAMES VIEW
-- ============================================================================
-- Convenience view for fetching recent completed games.

CREATE VIEW nfl_recent_games AS
SELECT
    id,
    espn_game_id,
    season,
    week,
    home_team,
    away_team,
    home_score,
    away_score,
    game_date,
    venue_name,
    venue_city,
    venue_state,
    status
FROM nfl_games
WHERE status = 'final'
ORDER BY game_date DESC;

