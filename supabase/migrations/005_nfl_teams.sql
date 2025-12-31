-- ============================================================================
-- NFL Teams Schema
-- ============================================================================
-- This migration adds the nfl_teams table to store team metadata.
-- Centralizes team information including names, slugs, and historical aliases.
-- ============================================================================

-- ============================================================================
-- NFL_TEAMS TABLE
-- ============================================================================
-- Master table for all NFL teams with metadata for display and routing.
-- Includes support for historical team abbreviations (relocated franchises).

CREATE TABLE nfl_teams (
    -- Primary identifier (current team abbreviation)
    abbreviation TEXT PRIMARY KEY,

    -- Display information
    name TEXT NOT NULL,                              -- Full team name (e.g., "Kansas City Chiefs")
    city TEXT NOT NULL,                              -- City name (e.g., "Kansas City")
    mascot TEXT NOT NULL,                            -- Team mascot (e.g., "Chiefs")

    -- URL routing
    slug TEXT NOT NULL UNIQUE,                       -- URL-friendly slug (e.g., "kansas-city-chiefs")

    -- Organization
    conference TEXT NOT NULL CHECK (conference IN ('AFC', 'NFC')),
    division TEXT NOT NULL CHECK (division IN ('North', 'South', 'East', 'West')),

    -- Historical data for relocated franchises
    -- Array of previous abbreviations that should resolve to this team
    -- e.g., ['STL'] for LAR (St. Louis Rams → Los Angeles Rams)
    historical_abbreviations TEXT[] NOT NULL DEFAULT '{}',

    -- Metadata
    founded_year INTEGER,                            -- Year team was founded/joined NFL
    stadium TEXT,                                    -- Current home stadium name

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for slug lookups (used in URL routing)
CREATE INDEX idx_nfl_teams_slug ON nfl_teams (slug);

-- Index for conference/division queries
CREATE INDEX idx_nfl_teams_conference_division ON nfl_teams (conference, division);

-- Apply updated_at trigger
CREATE TRIGGER update_nfl_teams_updated_at
    BEFORE UPDATE ON nfl_teams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA: All 32 NFL Teams
-- ============================================================================

INSERT INTO nfl_teams (abbreviation, name, city, mascot, slug, conference, division, historical_abbreviations, stadium) VALUES
    -- AFC East
    ('BUF', 'Buffalo Bills', 'Buffalo', 'Bills', 'buffalo-bills', 'AFC', 'East', '{}', 'Highmark Stadium'),
    ('MIA', 'Miami Dolphins', 'Miami', 'Dolphins', 'miami-dolphins', 'AFC', 'East', '{}', 'Hard Rock Stadium'),
    ('NE', 'New England Patriots', 'New England', 'Patriots', 'new-england-patriots', 'AFC', 'East', '{}', 'Gillette Stadium'),
    ('NYJ', 'New York Jets', 'New York', 'Jets', 'new-york-jets', 'AFC', 'East', '{}', 'MetLife Stadium'),

    -- AFC North
    ('BAL', 'Baltimore Ravens', 'Baltimore', 'Ravens', 'baltimore-ravens', 'AFC', 'North', '{}', 'M&T Bank Stadium'),
    ('CIN', 'Cincinnati Bengals', 'Cincinnati', 'Bengals', 'cincinnati-bengals', 'AFC', 'North', '{}', 'Paycor Stadium'),
    ('CLE', 'Cleveland Browns', 'Cleveland', 'Browns', 'cleveland-browns', 'AFC', 'North', '{}', 'Cleveland Browns Stadium'),
    ('PIT', 'Pittsburgh Steelers', 'Pittsburgh', 'Steelers', 'pittsburgh-steelers', 'AFC', 'North', '{}', 'Acrisure Stadium'),

    -- AFC South
    ('HOU', 'Houston Texans', 'Houston', 'Texans', 'houston-texans', 'AFC', 'South', '{}', 'NRG Stadium'),
    ('IND', 'Indianapolis Colts', 'Indianapolis', 'Colts', 'indianapolis-colts', 'AFC', 'South', '{}', 'Lucas Oil Stadium'),
    ('JAX', 'Jacksonville Jaguars', 'Jacksonville', 'Jaguars', 'jacksonville-jaguars', 'AFC', 'South', '{}', 'EverBank Stadium'),
    ('TEN', 'Tennessee Titans', 'Tennessee', 'Titans', 'tennessee-titans', 'AFC', 'South', '{}', 'Nissan Stadium'),

    -- AFC West
    ('DEN', 'Denver Broncos', 'Denver', 'Broncos', 'denver-broncos', 'AFC', 'West', '{}', 'Empower Field at Mile High'),
    ('KC', 'Kansas City Chiefs', 'Kansas City', 'Chiefs', 'kansas-city-chiefs', 'AFC', 'West', '{}', 'GEHA Field at Arrowhead Stadium'),
    ('LV', 'Las Vegas Raiders', 'Las Vegas', 'Raiders', 'las-vegas-raiders', 'AFC', 'West', ARRAY['OAK'], 'Allegiant Stadium'),
    ('LAC', 'Los Angeles Chargers', 'Los Angeles', 'Chargers', 'los-angeles-chargers', 'AFC', 'West', ARRAY['SD'], 'SoFi Stadium'),

    -- NFC East
    ('DAL', 'Dallas Cowboys', 'Dallas', 'Cowboys', 'dallas-cowboys', 'NFC', 'East', '{}', 'AT&T Stadium'),
    ('NYG', 'New York Giants', 'New York', 'Giants', 'new-york-giants', 'NFC', 'East', '{}', 'MetLife Stadium'),
    ('PHI', 'Philadelphia Eagles', 'Philadelphia', 'Eagles', 'philadelphia-eagles', 'NFC', 'East', '{}', 'Lincoln Financial Field'),
    ('WAS', 'Washington Commanders', 'Washington', 'Commanders', 'washington-commanders', 'NFC', 'East', '{}', 'Northwest Stadium'),

    -- NFC North
    ('CHI', 'Chicago Bears', 'Chicago', 'Bears', 'chicago-bears', 'NFC', 'North', '{}', 'Soldier Field'),
    ('DET', 'Detroit Lions', 'Detroit', 'Lions', 'detroit-lions', 'NFC', 'North', '{}', 'Ford Field'),
    ('GB', 'Green Bay Packers', 'Green Bay', 'Packers', 'green-bay-packers', 'NFC', 'North', '{}', 'Lambeau Field'),
    ('MIN', 'Minnesota Vikings', 'Minnesota', 'Vikings', 'minnesota-vikings', 'NFC', 'North', '{}', 'U.S. Bank Stadium'),

    -- NFC South
    ('ATL', 'Atlanta Falcons', 'Atlanta', 'Falcons', 'atlanta-falcons', 'NFC', 'South', '{}', 'Mercedes-Benz Stadium'),
    ('CAR', 'Carolina Panthers', 'Carolina', 'Panthers', 'carolina-panthers', 'NFC', 'South', '{}', 'Bank of America Stadium'),
    ('NO', 'New Orleans Saints', 'New Orleans', 'Saints', 'new-orleans-saints', 'NFC', 'South', '{}', 'Caesars Superdome'),
    ('TB', 'Tampa Bay Buccaneers', 'Tampa Bay', 'Buccaneers', 'tampa-bay-buccaneers', 'NFC', 'South', '{}', 'Raymond James Stadium'),

    -- NFC West
    ('ARI', 'Arizona Cardinals', 'Arizona', 'Cardinals', 'arizona-cardinals', 'NFC', 'West', '{}', 'State Farm Stadium'),
    ('LAR', 'Los Angeles Rams', 'Los Angeles', 'Rams', 'los-angeles-rams', 'NFC', 'West', ARRAY['STL'], 'SoFi Stadium'),
    ('SF', 'San Francisco 49ers', 'San Francisco', '49ers', 'san-francisco-49ers', 'NFC', 'West', '{}', 'Levi''s Stadium'),
    ('SEA', 'Seattle Seahawks', 'Seattle', 'Seahawks', 'seattle-seahawks', 'NFC', 'West', '{}', 'Lumen Field');

-- ============================================================================
-- HELPER FUNCTION: Get team by slug
-- ============================================================================
-- Returns the team abbreviation for a given URL slug.
-- Used for resolving team page routes.

CREATE OR REPLACE FUNCTION get_team_by_slug(team_slug TEXT)
RETURNS TEXT AS $$
    SELECT abbreviation FROM nfl_teams WHERE slug = team_slug;
$$ LANGUAGE SQL STABLE;

-- ============================================================================
-- HELPER FUNCTION: Resolve team abbreviation
-- ============================================================================
-- Resolves a team abbreviation (current or historical) to the current abbreviation.
-- Used for querying historical game data.
-- Returns NULL if the abbreviation is not recognized.

CREATE OR REPLACE FUNCTION resolve_team_abbreviation(abbr TEXT)
RETURNS TEXT AS $$
    SELECT
        CASE
            -- Check if it's a current abbreviation
            WHEN EXISTS (SELECT 1 FROM nfl_teams WHERE abbreviation = abbr) THEN abbr
            -- Check if it's a historical abbreviation
            ELSE (SELECT abbreviation FROM nfl_teams WHERE abbr = ANY(historical_abbreviations) LIMIT 1)
        END;
$$ LANGUAGE SQL STABLE;

-- ============================================================================
-- HELPER FUNCTION: Get all franchise abbreviations
-- ============================================================================
-- Returns all abbreviations (current + historical) for a given team.
-- Used for querying historical game data that may use old abbreviations.

CREATE OR REPLACE FUNCTION get_franchise_abbreviations(team_abbr TEXT)
RETURNS TEXT[] AS $$
    SELECT ARRAY[abbreviation] || historical_abbreviations
    FROM nfl_teams
    WHERE abbreviation = team_abbr;
$$ LANGUAGE SQL STABLE;

-- ============================================================================
-- VIEW: NFL Teams with full details
-- ============================================================================
-- Convenience view for fetching team data with computed fields.

CREATE VIEW nfl_teams_full AS
SELECT
    t.*,
    ARRAY[t.abbreviation] || t.historical_abbreviations AS all_abbreviations
FROM nfl_teams t;

-- ============================================================================
-- Add foreign key constraints to existing tables (optional, for data integrity)
-- ============================================================================
-- Note: These are commented out as they would require existing data to be valid.
-- Uncomment if you want to enforce referential integrity after data cleanup.

-- ALTER TABLE nfl_games
--     ADD CONSTRAINT fk_nfl_games_home_team
--     FOREIGN KEY (home_team) REFERENCES nfl_teams(abbreviation);

-- ALTER TABLE nfl_games
--     ADD CONSTRAINT fk_nfl_games_away_team
--     FOREIGN KEY (away_team) REFERENCES nfl_teams(abbreviation);

-- ALTER TABLE nfl_player_seasons
--     ADD CONSTRAINT fk_nfl_player_seasons_team
--     FOREIGN KEY (team) REFERENCES nfl_teams(abbreviation);

