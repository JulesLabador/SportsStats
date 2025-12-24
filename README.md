# NFL Stats

A mobile-first, minimalist NFL player statistics web app designed for sports bettors who rely on data—not gut feelings—to make informed bets.

## Features

- **Player Search**: Fast, type-ahead search for NFL players
- **Visual Statistics**: Clear, color-coded stat visualization
- **Week-by-Week Analysis**: Detailed game-by-game performance breakdown
- **Season Trends**: Track player performance across seasons
- **Mobile-First**: Optimized for quick lookups on mobile devices

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4
- **Components**: shadcn/ui (New York style)
- **State Management**: Zustand
- **Database**: Supabase (PostgreSQL)
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account with project set up

### Environment Setup

Create a `.env.local` file in the project root with your Supabase credentials:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-anon-key
SUPABASE_SECRET_KEY=your-secret-key
```

You can find these values in your Supabase project dashboard under Settings > API.

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd SportsStats

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Database Setup

Run the migrations in `supabase/migrations/` in order to set up the database schema:

1. `001_initial_schema.sql` - Core tables
2. `002_caching_and_identity.sql` - Caching and identity mappings
3. `003_row_level_security.sql` - Row level security policies

### Populating Data

Run the ETL pipeline to fetch and load player data:

```bash
# Run the ETL pipeline
npx tsx scripts/run-etl.ts --adapter nfl-composite --season 2024
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout with dark theme
│   ├── page.tsx            # Home page with search
│   └── player/[id]/        # Player profile page
├── components/
│   ├── ui/                 # shadcn/ui + custom components
│   ├── player/             # Player-specific components
│   └── search/             # Search components
├── lib/
│   ├── types.ts            # TypeScript interfaces
│   ├── database.types.ts   # Supabase database types
│   ├── supabase.ts         # Supabase client configuration
│   ├── data.ts             # Data access layer
│   └── utils.ts            # Utility functions
├── etl/                    # ETL pipeline
│   ├── adapters/           # Data source adapters
│   ├── services/           # ETL services
│   └── runner.ts           # ETL runner
└── stores/
    ├── player-store.ts     # Player data cache
    └── search-store.ts     # Search state & recent searches
```

## Design System

The app uses a dark-mode-first design inspired by the Push app and AniList.co:

- **Background**: Near-black (#0B0B0C)
- **Cards**: Slightly lighter (#151518)
- **Accent Colors**: Semantic meaning only
  - Green: Positive performance
  - Blue: Baseline/neutral
  - Yellow: Growth/trends

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Future Enhancements

- [x] Supabase database integration
- [ ] SportsDataIO API integration
- [ ] Player vs player comparison
- [ ] Favorites/saved players
- [ ] Prop-specific views

## License

Private - All rights reserved
