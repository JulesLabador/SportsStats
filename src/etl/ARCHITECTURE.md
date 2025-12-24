# ETL Pipeline Architecture

This document provides visual diagrams of the ETL pipeline architecture using Mermaid.

---

## High-Level Overview

```mermaid
flowchart TB
    subgraph Entry["Entry Points"]
        API["/api/etl Route<br/>(Vercel Cron)"]
        Script["scripts/run-etl.ts<br/>(CLI)"]
        Edge["Supabase Edge<br/>Functions"]
    end

    subgraph Runner["Runner (Orchestrator)"]
        R[runner.ts]
    end

    subgraph Adapters["Adapters (Data Sources)"]
        direction TB
        subgraph Simple["Simple (Registry)"]
            Mock[nfl-mock]
        end
        subgraph Configured["Configured (Factory)"]
            ESPN[nfl-espn]
            PFR[nfl-pfr]
            Composite[nfl-composite]
        end
    end

    subgraph Services["Shared Services"]
        Cache[cache.service.ts]
        RateLimit[rate-limiter.service.ts]
        PlayerMatch[player-matcher.service.ts]
    end

    subgraph Transform["Transformers"]
        Stats[stats.ts]
    end

    subgraph Load["Loaders"]
        Supabase[supabase.ts]
    end

    subgraph DB["Database (Supabase)"]
        Players[(players)]
        Profiles[(player_profiles)]
        Seasons[(nfl_player_seasons)]
        Weekly[(nfl_weekly_stats)]
        ETLRuns[(etl_runs)]
        APICache[(api_response_cache)]
    end

    Entry --> Runner
    Runner --> Adapters
    Configured --> Services
    Adapters --> Transform
    Transform --> Load
    Load --> DB
    Services --> APICache
```

---

## Adapter Pattern Detail

```mermaid
classDiagram
    class DataSourceAdapter {
        <<interface>>
        +name: string
        +version: string
        +description: string
        +sportId: SportId
        +fetchPlayers(options) Promise~RawPlayer[]~
        +fetchPlayerProfiles(options) Promise~RawPlayerProfile[]~
        +healthCheck() Promise~HealthCheckResult~
    }

    class NFLDataSourceAdapter {
        <<interface>>
        +sportId: "nfl"
        +fetchPlayerSeasons(options) Promise~RawNFLPlayerSeason[]~
        +fetchWeeklyStats(options) Promise~RawNFLWeeklyStat[]~
    }

    class BaseAdapter {
        <<abstract>>
        #generatePlayerId(name) string
        #getCurrentSeason() number
        #isValidSeason(season) boolean
    }

    class NFLBaseAdapter {
        <<abstract>>
        +sportId: "nfl"
        #getCurrentSeason() number
        #isValidWeek(week) boolean
    }

    class NFLMockAdapter {
        +name: "nfl-mock"
        +version: "1.0.0"
    }

    class NFLESPNAdapter {
        +name: "nfl-espn"
        -cacheService: CacheService
        +withCache(supabase) NFLESPNAdapter
    }

    class NFLPFRAdapter {
        +name: "nfl-pfr"
        -cacheService: CacheService
        -playerSlugs: Map
        +withCache(supabase) NFLPFRAdapter
        +addPlayerSlug(name, slug) void
    }

    class NFLCompositeAdapter {
        +name: "nfl-composite"
        -espnAdapter: NFLESPNAdapter
        -pfrAdapter: NFLPFRAdapter
        -playerMatcher: PlayerMatcherService
    }

    DataSourceAdapter <|-- NFLDataSourceAdapter
    DataSourceAdapter <|.. BaseAdapter
    BaseAdapter <|-- NFLBaseAdapter
    NFLDataSourceAdapter <|.. NFLBaseAdapter
    NFLBaseAdapter <|-- NFLMockAdapter
    NFLBaseAdapter <|-- NFLESPNAdapter
    NFLBaseAdapter <|-- NFLPFRAdapter
    NFLBaseAdapter <|-- NFLCompositeAdapter
```

---

## Two-Tier Adapter Instantiation

```mermaid
flowchart LR
    subgraph Request["ETL Request"]
        Name["adapterName"]
    end

    subgraph Check["Runner Check"]
        IsConfigured{Is Configured<br/>Adapter?}
    end

    subgraph Registry["Adapter Registry"]
        GetAdapter["getAdapter(name)"]
        PreInstantiated["Pre-instantiated<br/>Instance"]
    end

    subgraph Factory["Factory Functions"]
        CreateAdapter["createConfiguredAdapter()"]
        subgraph FactoryMethods["Factory Methods"]
            CreateESPN["createESPNAdapter()"]
            CreatePFR["createPFRAdapter()"]
            CreateComposite["createDefaultCompositeAdapter()"]
        end
        NewInstance["New Instance<br/>with Services"]
    end

    subgraph Services["Injected Services"]
        Supabase["Supabase Client"]
        Cache["CacheService"]
        RateLimiter["RateLimiterService"]
        PlayerMatcher["PlayerMatcherService"]
    end

    Name --> IsConfigured
    IsConfigured -->|No| GetAdapter
    GetAdapter --> PreInstantiated
    IsConfigured -->|Yes| CreateAdapter
    CreateAdapter --> FactoryMethods
    FactoryMethods --> NewInstance
    Services --> NewInstance

    style PreInstantiated fill:#90EE90
    style NewInstance fill:#87CEEB
```

---

## Data Flow Pipeline

```mermaid
flowchart TB
    subgraph External["External Data Sources"]
        ESPNAPI["ESPN JSON API"]
        PFRHTML["PFR HTML Pages"]
        MockData["Mock Data"]
    end

    subgraph Fetch["1. FETCH (Adapters)"]
        direction TB
        F1["fetchPlayers()"]
        F2["fetchPlayerProfiles()"]
        F3["fetchPlayerSeasons()"]
        F4["fetchWeeklyStats()"]
    end

    subgraph Raw["Raw Types"]
        RawPlayer["RawPlayer[]"]
        RawProfile["RawPlayerProfile[]"]
        RawSeason["RawNFLPlayerSeason[]"]
        RawStats["RawNFLWeeklyStat[]"]
    end

    subgraph Transform["2. TRANSFORM"]
        direction TB
        T1["transformPlayers()"]
        T2["transformPlayerProfiles()"]
        T3["transformNFLPlayerSeasons()"]
        T4["transformNFLWeeklyStats()"]
    end

    subgraph Db["Database Types"]
        DbPlayer["DbPlayer[]"]
        DbProfile["DbPlayerProfile[]"]
        DbSeason["DbNFLPlayerSeason[]"]
        DbStats["DbNFLWeeklyStat[]"]
    end

    subgraph Load["3. LOAD"]
        direction TB
        L1["loadPlayers()"]
        L2["loadPlayerProfiles()"]
        L3["loadNFLPlayerSeasons()"]
        L4["loadNFLWeeklyStats()"]
    end

    subgraph Database["Supabase Database"]
        Players[(players)]
        Profiles[(player_profiles)]
        Seasons[(nfl_player_seasons)]
        Weekly[(nfl_weekly_stats)]
    end

    External --> Fetch
    F1 --> RawPlayer
    F2 --> RawProfile
    F3 --> RawSeason
    F4 --> RawStats

    RawPlayer --> T1
    RawProfile --> T2
    RawSeason --> T3
    RawStats --> T4

    T1 --> DbPlayer
    T2 --> DbProfile
    T3 --> DbSeason
    T4 --> DbStats

    DbPlayer --> L1
    DbProfile --> L2
    DbSeason --> L3
    DbStats --> L4

    L1 --> Players
    L2 --> Profiles
    L3 --> Seasons
    L4 --> Weekly
```

---

## ID Mapping Flow

```mermaid
flowchart TB
    subgraph Step1["Step 1: Load Players"]
        Raw1["RawPlayer<br/>(externalId)"]
        Transform1["transformPlayers()"]
        Db1["DbPlayer<br/>(id = UUID)"]
        Map1["ExternalIdMap<br/>externalId → playerId"]
    end

    subgraph Step2["Step 2: Load Profiles"]
        Raw2["RawPlayerProfile<br/>(playerExternalId)"]
        Lookup2["Lookup playerId<br/>from ExternalIdMap"]
        Db2["DbPlayerProfile<br/>(player_id)"]
        Map2["PlayerProfileIdMap<br/>playerId → profileId"]
    end

    subgraph Step3["Step 3: Load Seasons"]
        Raw3["RawNFLPlayerSeason<br/>(playerExternalId)"]
        Lookup3["Lookup profileId<br/>from PlayerProfileIdMap"]
        Db3["DbNFLPlayerSeason<br/>(player_profile_id)"]
        Map3["PlayerSeasonIdMap<br/>profileId:season → seasonId"]
    end

    subgraph Step4["Step 4: Load Weekly Stats"]
        Raw4["RawNFLWeeklyStat<br/>(playerExternalId, season)"]
        Lookup4["Lookup seasonId<br/>from PlayerSeasonIdMap"]
        Db4["DbNFLWeeklyStat<br/>(player_season_id)"]
    end

    Raw1 --> Transform1 --> Db1
    Transform1 --> Map1

    Raw2 --> Lookup2
    Map1 -.-> Lookup2
    Lookup2 --> Db2
    Db2 --> Map2

    Raw3 --> Lookup3
    Map2 -.-> Lookup3
    Lookup3 --> Db3
    Db3 --> Map3

    Raw4 --> Lookup4
    Map3 -.-> Lookup4
    Lookup4 --> Db4

    style Map1 fill:#FFD700
    style Map2 fill:#FFD700
    style Map3 fill:#FFD700
```

---

## Services Architecture

```mermaid
flowchart TB
    subgraph CacheService["CacheService"]
        direction TB
        CacheGet["get(source, endpoint, params)"]
        CacheSet["set(source, endpoint, params, data)"]
        CacheHash["SHA256 Hash<br/>for cache key"]
        CacheTTL["TTL Management<br/>24h games / 7d historical"]
    end

    subgraph RateLimiter["RateLimiterService"]
        direction TB
        RLAcquire["acquire(source)"]
        RLRelease["release(source)"]
        RLBackoff["Exponential Backoff"]
        RLConfig["Config per Source<br/>ESPN: 5/s, PFR: 1/s"]
    end

    subgraph PlayerMatcher["PlayerMatcherService"]
        direction TB
        PMMatch["matchPlayer(espnId, pfrSlug)"]
        PMNormalize["Normalize Names<br/>(lowercase, remove suffixes)"]
        PMScore["Confidence Scoring<br/>exact/high/medium/low"]
        PMStore["Store Mappings<br/>player_identity_mappings"]
    end

    subgraph Adapters["Configured Adapters"]
        ESPN["NFLESPNAdapter"]
        PFR["NFLPFRAdapter"]
        Composite["NFLCompositeAdapter"]
    end

    subgraph Database["Database Tables"]
        APICache[(api_response_cache)]
        IdentityMap[(player_identity_mappings)]
    end

    ESPN --> CacheService
    ESPN --> RateLimiter
    PFR --> CacheService
    PFR --> RateLimiter
    Composite --> PlayerMatcher
    Composite --> ESPN
    Composite --> PFR

    CacheService --> APICache
    PlayerMatcher --> IdentityMap
```

---

## Composite Adapter Strategy

```mermaid
flowchart TB
    subgraph Request["Data Request"]
        Season["season: 2024"]
        Week["week: 10"]
    end

    subgraph Composite["NFLCompositeAdapter"]
        SourceSelect{Source Selection<br/>Based on Season}
    end

    subgraph CurrentSeason["Current Season (2024+)"]
        ESPN1["ESPN Primary"]
        PFR1["PFR Fallback"]
    end

    subgraph RecentSeason["Recent (2022-2023)"]
        ESPN2["ESPN Primary"]
        PFR2["PFR Fallback"]
    end

    subgraph Historical["Historical (<2022)"]
        PFR3["PFR Primary"]
        ESPN3["ESPN Fallback"]
    end

    subgraph Fallback["Fallback Logic"]
        TryPrimary["Try Primary Source"]
        CheckFail{Failed?}
        TryFallback["Try Fallback Source"]
        Return["Return Data"]
    end

    Request --> Composite
    SourceSelect -->|"≥2024"| CurrentSeason
    SourceSelect -->|"2022-2023"| RecentSeason
    SourceSelect -->|"<2022"| Historical

    CurrentSeason --> TryPrimary
    RecentSeason --> TryPrimary
    Historical --> TryPrimary

    TryPrimary --> CheckFail
    CheckFail -->|Yes| TryFallback
    CheckFail -->|No| Return
    TryFallback --> Return

    style ESPN1 fill:#90EE90
    style ESPN2 fill:#90EE90
    style PFR3 fill:#90EE90
    style PFR1 fill:#FFB6C1
    style PFR2 fill:#FFB6C1
    style ESPN3 fill:#FFB6C1
```

---

## Database Schema (NFL)

```mermaid
erDiagram
    players ||--o{ player_profiles : "has"
    player_profiles ||--o{ nfl_player_seasons : "has"
    nfl_player_seasons ||--o{ nfl_weekly_stats : "has"
    sports ||--o{ player_profiles : "categorizes"
    sports ||--o{ etl_runs : "tracks"

    players {
        uuid id PK
        text name
        text image_url
        timestamp created_at
        timestamp updated_at
    }

    sports {
        text id PK
        text name
        text abbreviation
    }

    player_profiles {
        uuid id PK
        uuid player_id FK
        text sport_id FK
        text position
        jsonb metadata
    }

    nfl_player_seasons {
        uuid id PK
        uuid player_profile_id FK
        int season
        text team
        int jersey_number
        boolean is_active
    }

    nfl_weekly_stats {
        uuid id PK
        uuid player_season_id FK
        int week
        text opponent
        text location
        text result
        int passing_yards
        int passing_tds
        int interceptions
        int completions
        int attempts
        int rushing_yards
        int rushing_tds
        int carries
        int receiving_yards
        int receiving_tds
        int receptions
        int targets
    }

    etl_runs {
        uuid id PK
        text adapter_name
        text sport_id FK
        timestamp started_at
        timestamp completed_at
        text status
        int records_processed
        text error_message
    }

    api_response_cache {
        uuid id PK
        text source
        text endpoint
        text params_hash
        jsonb response_data
        int season
        int week
        timestamp fetched_at
        timestamp expires_at
    }
```

---

## File Structure

```
src/etl/
├── adapters/                      # Data source implementations
│   ├── base.ts                    # Interface definitions & base classes
│   ├── index.ts                   # Registry + factory functions
│   ├── nfl-mock.adapter.ts        # Mock data (simple)
│   ├── nfl-espn.adapter.ts        # ESPN JSON API (configured)
│   ├── nfl-pfr.adapter.ts         # PFR scraping (configured)
│   └── nfl-composite.adapter.ts   # Multi-source orchestrator (configured)
│
├── services/                      # Shared services
│   ├── index.ts                   # Service exports
│   ├── cache.service.ts           # Response caching (Postgres)
│   ├── rate-limiter.service.ts    # Per-source rate limiting
│   └── player-matcher.service.ts  # Cross-source identity matching
│
├── transformers/                  # Raw → DB format conversion
│   └── stats.ts                   # Multi-sport transformers
│
├── loaders/                       # Database operations
│   └── supabase.ts                # Supabase upsert operations
│
├── runner.ts                      # Main orchestrator
├── types.ts                       # ETL-specific types
└── ARCHITECTURE.md                # This file
```

---

*Last updated: December 2024*

