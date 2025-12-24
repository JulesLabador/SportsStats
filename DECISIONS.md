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

### Mock Data First
**Decision**: Build with mock data before API integration.

**Reasoning**:
- Validate UI/UX before API costs
- Faster development iteration
- No external dependencies for development
- Easy to replace with real data later

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

---

## 9. Future Considerations

### Real Data Source Integration
**Planned**: Add adapters for SportsDataIO, Sportradar, or FantasyData.

**Approach**:
- Implement sport-specific adapter interface (e.g., `NFLDataSourceAdapter`)
- Register in adapter registry
- No changes to runner/transformer/loader needed

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

---

## 10. File Organization

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
├── adapters/              # Data source implementations
│   ├── base.ts            # Interface definitions (base + sport-specific)
│   ├── index.ts           # Adapter registry
│   └── nfl-mock.adapter.ts # NFL mock adapter
├── transformers/          # Raw -> DB format conversion
│   └── stats.ts           # Multi-sport transformers
├── loaders/               # Database operations
│   └── supabase.ts        # Multi-sport loader
├── runner.ts              # Main orchestrator (sport-aware)
└── types.ts               # ETL-specific types (multi-sport)
```

**Reasoning**:
- Clear separation of concerns
- Easy to add new adapters per sport
- Sport-specific adapters follow naming convention: `{sport}-{source}.adapter.ts`
- Testable in isolation
- Follows ETL best practices

---

*Last updated: December 2024*

