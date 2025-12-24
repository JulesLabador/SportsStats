# Architecture & Design Decisions

This document captures all key decisions made during development and the reasoning behind them.

---

## 1. Framework & Stack

### Next.js 16 with App Router
**Decision**: Use Next.js 16 with the App Router for the frontend framework.

**Reasoning**:
- Server Components by default for better performance
- Built-in routing with dynamic segments (`/player/[id]`)
- Excellent TypeScript support
- Easy deployment to Vercel
- Future-ready for React Server Components patterns

### Tailwind CSS v4
**Decision**: Use Tailwind CSS v4 with the new configuration format.

**Reasoning**:
- Utility-first approach speeds up development
- Built-in dark mode support
- CSS variables for theming
- Excellent shadcn/ui integration

---

## 2. Component Library

### shadcn/ui
**Decision**: Use shadcn/ui as the component foundation.

**Reasoning**:
- Components are copied into the project (full ownership)
- Accessible by default (Radix UI primitives)
- Easy customization via CSS variables
- No runtime dependency on external library
- New York style matches our premium aesthetic

### Custom Components Built on shadcn
**Decision**: Build custom components (StatBar, WeeklyCard, TrendIndicator) on top of shadcn primitives.

**Reasoning**:
- Domain-specific visualization needs
- Consistent styling with base components
- Reusable across the application
- Type-safe with full TypeScript support

---

## 3. State Management

### Zustand
**Decision**: Use Zustand for client-side state management.

**Reasoning**:
- Lightweight (~1KB) with minimal boilerplate
- No providers needed - works seamlessly with Next.js App Router
- Built-in persistence middleware for caching
- Simple API that scales well
- Selective subscriptions prevent unnecessary re-renders

### Store Architecture
**Decision**: Separate stores for player data and search state.

**Reasoning**:
- Separation of concerns
- Independent persistence strategies (search persists to localStorage)
- Easier testing and maintenance
- Clear ownership of state

### Cache-First Strategy
**Decision**: Check Zustand store before fetching data.

**Reasoning**:
- Reduces API calls (important for paid data APIs)
- Instant data display for previously viewed players
- Better perceived performance
- Graceful offline experience for cached data

---

## 4. Design System

### Dark Mode First
**Decision**: Dark mode is the default and primary experience.

**Reasoning**:
- PRD specifies dark mode as primary (Section 4.2)
- Matches target user preferences (betting apps are often dark)
- Reduces eye strain during extended use
- Creates premium, analytical aesthetic

### Color Usage
**Decision**: Colors convey meaning only, never decoration.

**Reasoning**:
- Green = positive performance (above average)
- Blue = baseline/neutral stats
- Yellow = growth/trends
- Minimizes visual noise
- Faster comprehension of data

### 16px Border Radius
**Decision**: Use 1rem (16px) border radius consistently.

**Reasoning**:
- Creates modern, premium feel
- Improves mobile touch targets
- Consistent visual language
- Matches inspiration apps (Push, AniList)

---

## 5. Data Architecture

### TypeScript Interfaces
**Decision**: Strongly typed interfaces for all data structures.

**Reasoning**:
- Catch errors at compile time
- Better IDE support and autocomplete
- Self-documenting code
- Easier refactoring

### Position-Specific Stats
**Decision**: Separate stat interfaces for QB, RB, WR, TE.

**Reasoning**:
- Different positions have different relevant stats
- Type guards ensure correct stat access
- Cleaner component logic
- Matches betting use cases (position-specific props)

### Database-First Data Access
**Decision**: Connect directly to Supabase for all data operations.

**Reasoning**:
- Real data provides accurate testing environment
- ETL pipeline populates production data
- Data access layer (`src/lib/data.ts`) abstracts database queries
- Transforms database records to application types
- Mock data file retained for reference but no longer used in app

---

## 6. Performance Optimizations

### Server Components Default
**Decision**: Use Server Components where possible, Client Components only when needed.

**Reasoning**:
- Smaller JavaScript bundle
- Faster initial page load
- Better SEO (though less critical for this app)
- Future-proof architecture

### Selective Zustand Subscriptions
**Decision**: Use selector hooks for store access.

**Reasoning**:
- Components only re-render when their specific slice changes
- Better performance with large stores
- Cleaner component code

### Simulated Loading States
**Decision**: Include 300ms delay in mock data fetching.

**Reasoning**:
- Realistic UX testing
- Ensures loading states work correctly
- Prepares for real API latency
- Better user feedback patterns

---

## 7. Multi-Sport Database Architecture

### Unified Player Identity
**Decision**: Single `players` table for core identity, shared across all sports.

**Reasoning**:
- Multi-sport athletes (rare but possible) can share one identity
- Single search experience across all sports
- Core attributes (name, image) don't need duplication
- Simplifies player lookup and deduplication

### Sport-Specific Tables
**Decision**: Separate tables per sport for seasons and stats (e.g., `nfl_player_seasons`, `nfl_weekly_stats`).

**Reasoning**:
- Type-safe, queryable stats with explicit columns
- Each sport has unique stat requirements (NFL passing yards vs MLB batting average)
- No JSONB for stats - better for aggregations and indexing
- Easy to add new sports without schema changes to existing tables

### Player Profiles
**Decision**: `player_profiles` table links players to sports with sport-specific metadata.

**Structure**:
- `player_id` + `sport_id` (unique together)
- `position` (varies by sport: QB, Pitcher, Point Guard, Driver)
- `metadata` (JSONB for extras like college, draft info)

**Reasoning**:
- Position is common across sports but values differ
- JSONB for metadata is appropriate (rarely queried, varies significantly)
- Clean separation between identity and sport-specific data

### Sports Reference Table
**Decision**: `sports` table with predefined sports (NFL, MLB, NBA, F1).

**Reasoning**:
- Foreign key constraints ensure data integrity
- Easy to add new sports by inserting rows
- Consistent sport IDs across the system

---

## 8. ETL Pipeline Architecture

### Sport-Specific Adapters
**Decision**: Each adapter is tied to one sport (e.g., `NFLMockAdapter`, `MLBSportsDataIOAdapter`).

**Reasoning**:
- Clear responsibility per adapter
- Sport-specific methods (NFL has `fetchWeeklyStats`, F1 would have `fetchRaceStats`)
- Type safety with sport-specific interfaces
- Easy to add new data sources per sport

### Adapter Interface Hierarchy
**Decision**: Base `DataSourceAdapter` interface with sport-specific extensions.

**Structure**:
```typescript
interface DataSourceAdapter {
  sportId: SportId;
  fetchPlayers(): Promise<RawPlayer[]>;
  fetchPlayerProfiles(): Promise<RawPlayerProfile[]>;
  healthCheck(): Promise<HealthCheckResult>;
}

interface NFLDataSourceAdapter extends DataSourceAdapter {
  sportId: "nfl";
  fetchPlayerSeasons(): Promise<RawNFLPlayerSeason[]>;
  fetchWeeklyStats(): Promise<RawNFLWeeklyStat[]>;
}
```

**Reasoning**:
- Common methods shared across sports
- Sport-specific methods only where needed
- Type guards enable safe casting

### Explicit Stat Columns
**Decision**: Use explicit columns for all stats instead of JSONB.

**Reasoning**:
- Easier SQL queries without JSON operators
- Better for aggregations (`SUM(rushing_yards)`)
- Schema documents exactly what stats exist
- Columns can be indexed individually
- Unused stats default to 0 (not null)

### ETL Run Tracking
**Decision**: Log all ETL runs in `etl_runs` table with sport reference.

**Reasoning**:
- Audit trail for data ingestion per sport
- Debug failed runs with error messages
- Monitor pipeline health over time
- Filter runs by sport

### Environment-Agnostic Runner
**Decision**: Runner can execute from multiple environments.

**Supported Environments**:
- Vercel Cron (via `/api/etl` route)
- Supabase Edge Functions
- Standalone Node.js script (`scripts/run-etl.ts`)

### Adapter Instantiation Strategy
**Decision**: Two-tier adapter system - simple (registry) and configured (factory).

**Simple Adapters** (from registry):
- `nfl-mock` - No external dependencies, used for testing
- Retrieved via `getAdapter()` from registry

**Configured Adapters** (via factory):
- `nfl-espn`, `nfl-pfr`, `nfl-composite`
- Require Supabase client for caching and services
- Created via `createConfiguredAdapter()` in runner
- Automatically get caching, rate limiting, and player matching

**Reasoning**:
- Simple adapters work without database connection (good for dry runs)
- Configured adapters need services for production use
- Runner auto-detects adapter type and instantiates appropriately
- No manual configuration needed when running ETL

---

## 9. ESPN + PFR Data Adapters

### Multi-Source Data Strategy
**Decision**: Use ESPN as primary source for current season, PFR for historical backfill.

**Reasoning**:
- ESPN provides structured JSON endpoints (unofficial but stable)
- PFR has consistent historical data going back many years
- Fallback strategy ensures data availability if one source fails
- Both sources are free, avoiding paid API costs

### Adapter Architecture
**Decision**: Three adapters - ESPN, PFR, and Composite orchestrator.

**Structure**:
```
src/etl/adapters/
├── nfl-espn.adapter.ts      # ESPN JSON API adapter
├── nfl-pfr.adapter.ts       # PFR HTML scraping adapter
├── nfl-composite.adapter.ts # Orchestrates ESPN + PFR
└── nfl-mock.adapter.ts      # Mock data for testing
```

**Reasoning**:
- Separation allows independent testing and maintenance
- Composite adapter handles source selection and fallback logic
- Each adapter can be used standalone or through composite

### Response Caching
**Decision**: Cache all API/scrape responses in Postgres with TTL.

**Implementation**:
- `api_response_cache` table stores raw responses
- SHA256 hash of params for cache key
- TTL varies by data type: 24h for completed games, 7d for historical
- Prevents redundant requests to external sources

**Reasoning**:
- Never fetch same data twice
- Reduces load on ESPN/PFR
- Enables offline development with cached data
- Queryable cache for debugging

### Rate Limiting
**Decision**: Per-source rate limiting with exponential backoff.

**Configuration**:
- ESPN: 5 requests/second, 3 concurrent
- PFR: 1 request/second, 1 concurrent (respectful scraping)
- Exponential backoff on failures (up to 60s for PFR)

**Reasoning**:
- Avoid getting blocked by sources
- PFR explicitly requests slow scraping
- Backoff handles temporary failures gracefully

### Player Identity Matching
**Decision**: Heuristic matching with confidence scoring.

**Algorithm**:
1. Normalize names (lowercase, remove Jr./III suffixes)
2. Match on name + position + team
3. Fuzzy matching for variations (Levenshtein distance)
4. Score: exact (100%), high (>90%), medium (>75%), low (<75%)

**Storage**: `player_identity_mappings` table links ESPN IDs to PFR slugs.

**Reasoning**:
- Automatic matching reduces manual work
- Confidence scores enable review of uncertain matches
- Manual override for edge cases
- Enables cross-source data merging

### Source Selection Logic
**Decision**: Automatic source selection based on season.

**Rules**:
- Current season (2024+): ESPN primary, PFR fallback
- Recent seasons (2022-2023): ESPN primary, PFR fallback
- Historical (<2022): PFR primary, ESPN fallback

**Reasoning**:
- ESPN has best current data
- PFR has most consistent historical data
- Fallback ensures data availability

### Known PFR Slugs
**Decision**: Maintain map of known player name to PFR slug mappings.

**Location**: `KNOWN_PFR_SLUGS` in `nfl-pfr.adapter.ts`

**Reasoning**:
- PFR slugs are not predictable from names
- Pre-populated for top ~40 players
- Can be extended via player matcher service
- Enables PFR fetching without ESPN dependency

---

## 10. Logging with Pino

### Structured Logging
**Decision**: Use Pino for structured JSON logging instead of `console.log`.

**Reasoning**:
- Structured JSON output for production log aggregation
- Pretty-printed output in development for readability
- Child loggers provide context (component, adapter, etc.)
- Log levels (trace, debug, info, warn, error, fatal) for filtering
- Minimal performance overhead (Pino is the fastest Node.js logger)

### Logger Architecture
**Decision**: Centralized logger module with pre-configured child loggers.

**Structure**:
```typescript
// src/lib/logger.ts
export const logger = pino({ ... });        // Root logger
export const etlLogger = logger.child({ component: 'etl' });
export const apiLogger = logger.child({ component: 'api' });
export const dbLogger = logger.child({ component: 'db' });
```

**Usage**:
```typescript
// Create run-specific logger with context
const log = createChildLogger({
  adapter: 'nfl-espn',
  season: 2024,
  week: 15,
});
log.info({ count: 150 }, 'Fetched players');
// Output: { adapter: 'nfl-espn', season: 2024, week: 15, count: 150, msg: 'Fetched players' }
```

**Reasoning**:
- Consistent logging format across the application
- Context automatically added to all log entries
- Easy to filter logs by component, adapter, etc.
- Environment-aware (pretty in dev, JSON in prod)

### Log Levels
**Decision**: Default to `debug` in development, `info` in production.

**Configurable via**:
- `LOG_LEVEL` environment variable
- `--log-level` CLI flag in ETL script

**Reasoning**:
- Verbose logging in development for debugging
- Reduced noise in production
- Runtime adjustable without code changes

---

## 11. Future Considerations

### Additional Sports
**Planned**: Add MLB, NBA, F1 support.

**Approach**:
- Create sport-specific season and stats tables
- Implement sport-specific adapter interfaces
- Add transformer and loader methods for each sport
- Database schema already supports this via `sports` table

### Search Optimization
**Planned**: Implement proper search indexing.

**Approach**:
- Postgres full-text search or Supabase search
- Debounced API calls
- Client-side filtering for small datasets

### Paid API Integration
**Planned**: Option to add SportsDataIO, Sportradar, or FantasyData.

**Approach**:
- Implement as new adapter following existing patterns
- Can replace or supplement ESPN/PFR
- Cache layer remains unchanged

---

## 12. File Organization

### Feature-Based Components
**Decision**: Organize components by feature (player, search) not type.

**Reasoning**:
- Easier to find related code
- Better encapsulation
- Clearer ownership
- Scales with feature growth

### Centralized Types
**Decision**: Single `types.ts` file for all interfaces.

**Reasoning**:
- Easy to find type definitions
- Prevents circular imports
- Single source of truth
- Simple for current project size

### ETL Module Structure
**Decision**: Organize ETL code in `src/etl/` with clear separation.

**Structure**:
```
src/etl/
├── adapters/                    # Data source implementations
│   ├── base.ts                  # Interface definitions
│   ├── index.ts                 # Adapter registry + factory functions
│   ├── nfl-mock.adapter.ts      # Mock data adapter
│   ├── nfl-espn.adapter.ts      # ESPN JSON API adapter
│   ├── nfl-pfr.adapter.ts       # PFR scraping adapter
│   └── nfl-composite.adapter.ts # Multi-source orchestrator
├── services/                    # Shared services
│   ├── cache.service.ts         # Response caching
│   ├── rate-limiter.service.ts  # Rate limiting
│   ├── player-matcher.service.ts # Identity matching
│   └── index.ts                 # Service exports
├── transformers/                # Raw -> DB format conversion
│   └── stats.ts                 # Multi-sport transformers
├── loaders/                     # Database operations
│   └── supabase.ts              # Multi-sport loader
├── runner.ts                    # Main orchestrator
└── types.ts                     # ETL-specific types
```

**Reasoning**:
- Clear separation of concerns
- Easy to add new adapters per sport
- Sport-specific adapters follow naming convention: `{sport}-{source}.adapter.ts`
- Services are reusable across adapters
- Testable in isolation
- Follows ETL best practices

---

## 13. Row Level Security (RLS)

### Two-Tier Access Model
**Decision**: Enable RLS on all tables with different access levels for public vs internal data.

**Public Tables** (anonymous read access):
- `sports` - Reference data
- `players` - Player identities
- `player_profiles` - Sport-specific player data
- `nfl_player_seasons` - Season snapshots
- `nfl_weekly_stats` - Game statistics

**Internal Tables** (service role only):
- `etl_runs` - ETL audit log (contains operational data)
- `api_response_cache` - Cached API responses (contains raw external data)
- `player_identity_mappings` - Cross-source ID mappings (implementation detail)

**Reasoning**:
- Sports data is public information - no need to restrict reads
- Internal/operational tables should not be exposed to users
- ETL audit logs and cached responses are implementation details
- Writes should only come from the ETL pipeline (server-side)
- Supabase service role automatically bypasses RLS

### Policy Implementation
**Decision**: Use `USING (true)` policies for public tables, no policies for internal tables.

**Reasoning**:
- When RLS is enabled with no policies, all access is denied by default
- Public tables get explicit SELECT policies
- Internal tables have RLS enabled but no policies = completely inaccessible
- Service role bypasses RLS entirely (used by ETL via `createAdminClient()`)
- Views referencing internal tables return empty results for non-service users

### Client Architecture Alignment
**Decision**: Existing Supabase client setup already supports RLS pattern.

**Clients**:
- `createBrowserClient()` / `createServerClient()` - Uses anon key (subject to RLS)
- `createAdminClient()` - Uses service key (bypasses RLS for ETL)

**Reasoning**:
- No code changes needed to support RLS
- ETL pipeline already uses admin client
- Frontend queries use anon-key clients

---

*Last updated: December 2024*

