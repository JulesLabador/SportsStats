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
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

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
│   ├── mock-data.ts        # Mock NFL player data
│   └── utils.ts            # Utility functions
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

- [ ] Supabase database integration
- [ ] SportsDataIO API integration
- [ ] Player vs player comparison
- [ ] Favorites/saved players
- [ ] Prop-specific views

## License

Private - All rights reserved
