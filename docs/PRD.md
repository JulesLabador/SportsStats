# Product Requirements Document (PRD)
## Sports Betting Stats App (NFL-focused, v1)

---

## 1. Overview

This product is a **mobile-first, minimalist NFL player stats web app** designed for sports bettors who rely on data—not gut feelings—to make informed bets.

The app enables users to quickly:
- Search for an NFL player
- Instantly understand their performance through **clear visual statistics**
- Analyze week-by-week and season-level trends
- Make faster, more confident betting decisions

The app will be **free to use**, monetized via **ads**, and built with **Next.js + Supabase (Postgres)**.

---

## 2. Problem Statement

Most sports betting workflows involve jumping between:
- Sportsbooks
- Box score websites
- Advanced stats sites that are cluttered, slow, or not mobile-friendly

This creates friction when users want to:
- Quickly validate a bet idea
- Compare player performance over time
- Understand trends without reading dense tables

**Goal:** Create a clean, fast, visually intuitive interface that surfaces the *most important stats* for betting decisions—especially on mobile.

---

## 3. Target Audience

### Primary Users
- NFL sports bettors
- Semi-serious to advanced bettors
- Users who reference stats before placing bets
- Mobile-heavy users (checking stats on the go)

### User Mindset
- Data-driven
- Time-sensitive
- Wants clarity, not information overload
- Comfortable with numbers but prefers visuals

---

## 4. Design System & Visual Language

### 4.1 Overall Design Philosophy

The app adopts a **dark-mode-first, minimalist, performance-oriented design**, heavily inspired by:

- Push (iOS workout app)
- AniList.co (clean layout, strong hierarchy)

The design prioritizes:
- Clarity over decoration
- Visual comprehension over raw numbers
- Calm, focused interaction (no visual noise)

The UI should feel **premium, confident, and analytical**, appealing to users who make data-driven decisions.

---

### 4.2 Color System

#### Dark Mode (Primary Mode)

- Dark mode is **not optional** — it is the default and primary experience.
- Background colors are near-black, not gray.

**Base Colors (Approximate):**
- App background: `#0B0B0C` – `#111113`
- Card background: `#151518` – `#1A1A1E`

Cards are slightly lighter than the background to create structure without borders.

---

#### Accent & Semantic Colors

Colors are used **only to convey meaning**, never decoration.

Primary accent usage:
- **Cool blues** → baseline / neutral / inactive stats
- **Greens → yellows** → positive performance / growth / strong trends
- Reds are used minimally or avoided entirely

Important rules:
- No neon or oversaturated colors
- No unnecessary gradients
- Color communicates *state*, not style

---

### 4.3 Typography

#### Font Choice
- System font stack (SF Pro on Apple devices, system equivalent elsewhere)
- No custom or novelty fonts

#### Hierarchy
Hierarchy is achieved through:
- Font weight
- Opacity
- Spacing

Not aggressive size jumps.

**Guidelines:**
- Primary headers: Medium / Semibold
- Secondary labels: Regular
- Metadata (weeks, reps, averages): Lower opacity, lighter weight

Avoid pure white text except for:
- Primary CTAs
- Most important stat values

---

### 4.4 Cards & Layout Structure

The UI is **card-driven**.

- Nearly all content lives inside cards:
  - Player stat summaries
  - Weekly breakdowns
  - Comparison blocks
- Cards create structure instead of borders or dividers

**Card Properties:**
- Background slightly lighter than app background
- No visible borders
- Soft elevation achieved through contrast only

---

### 4.5 Corner Radii & Shape Language

Corner radius is a defining visual trait.

**Standards:**
- Cards: 16–20px radius
- Buttons: same radius as cards
- Tabs / segmented controls: same radius

Consistency is critical — no mixing sharp and soft corners.

The rounded shapes:
- Reduce visual harshness
- Improve mobile friendliness
- Create a modern, premium feel

---

### 4.6 Buttons & CTAs

#### Primary CTA (e.g. actions like “Compare”, “View Player”)

- High contrast
- Typically:
  - Light background
  - Dark text
- Large tap area
- Full-width on mobile where appropriate

Secondary actions:
- Icon-based
- Muted colors
- Never compete visually with primary data

---

### 4.7 Data Visualization Principles

Stats should be understandable **without reading numbers**.

Visualization techniques include:
- Horizontal bars
- Progress indicators
- Color-coded performance ranges
- Relative sizing (better vs worse weeks)

Rules:
- No dense tables by default
- Visual first, numeric second
- Numbers are confirmations, not the primary signal

This mirrors the Push app’s approach to muscle volume and growth zones.

---

### 4.8 Contrast, Opacity & Focus

- Primary content: high contrast
- Secondary content: reduced opacity (60–70%)
- Tertiary / metadata: lower opacity

This creates:
- Visual depth
- Clear focal points
- Reduced cognitive load

No heavy shadows or drop effects are used.

---

### 4.9 Mobile-First Execution

The design is optimized for mobile before desktop.

Mobile considerations:
- Vertical scrolling
- Large tap targets
- Thumb-friendly navigation
- Generous padding and spacing

Desktop:
- Expanded layouts
- More horizontal breathing room
- Same design language, no “desktop-only” UI patterns

---

### 4.10 Emotional & Brand Tone

The UI should feel:
- Calm
- Analytical
- Confident
- Performance-focused

It should **not** feel:
- Flashy
- Gamified
- Loud
- “Sports hype” driven

This aligns the product with serious bettors who value logic and data over excitement.

---

## 5. Core Features (MVP)

### 5.1 Player Search

- Search NFL players by name
- Fast, type-ahead experience
- Results show:
  - Player name
  - Team
  - Position

---

### 5.2 Player Profile Page

#### Header Section (Above the Fold)
Displays:
- Player name
- Jersey number
- Team
- Position
- Season selector (default: current season)

#### Key Stat Summary (Position-Based)
Displayed as large, visual metrics:

| Position        | Key Stats |
|----------------|----------|
| QB             | Passing yards, passing TDs |
| RB             | Rushing yards, rushing TDs |
| WR / TE        | Receiving yards, receiving TDs |

- Visual bars / progress indicators
- Color-coded performance indicators
- Immediate “bet-readiness” insight

---

### 5.3 Week-by-Week Breakdown

As the user scrolls:

- Weekly stat cards
- One card per game/week
- Shows:
  - Opponent
  - Week number
  - Relevant stats (yards, TDs, etc.)
- Visual indicators:
  - Above/below average
  - Trend indicators (up/down)

---

### 5.4 Season Filtering

- Dropdown or segmented control
- Allows switching between:
  - Current season
  - Past seasons
- Updates all stats dynamically

---

## 6. Mobile-First UX

### Mobile Priority
- Designed for small screens first
- Vertical scrolling
- Thumb-friendly tap targets
- Fast load times

### Desktop Support
- Responsive layout
- Wider stat grids
- Same core functionality

### UX Considerations
- Sticky player header on scroll (optional)
- Minimal navigation
- No clutter or pop-ups interrupting data viewing

---

## 7. Data Collection & Architecture

### 7.1 Data Sources (APIs)

Potential NFL data providers:
- SportsDataIO
- Sportradar
- FantasyData

Selection criteria:
- Player-level stats
- Weekly breakdowns
- Historical seasons
- Reasonable pricing for early-stage project

---

### 7.2 Data Sync Strategy

#### Cron-Based Data Ingestion
- No user-initiated refreshes
- Background updates via scheduled jobs

#### Update Frequency
- In-season:
  - Daily
  - More frequent on game days
- Off-season:
  - Reduced frequency

#### Flow
1. Cron job triggers
2. Fetch latest data from API
3. Normalize + map data
4. Upsert into Supabase (Postgres)
5. App reads from local database only

---

## 8. Technical Stack

### Frontend
- Next.js (App Router)
- Mobile-first responsive design
- Charting / visualization library (TBD)

### Backend
- Supabase
  - Postgres database
  - Auth (future)
  - Scheduled functions / cron jobs

### Hosting
- Vercel (frontend)
- Supabase (backend)

---

## 9. Monetization

- Free for all users
- Monetized via ads
- Ad placements:
  - Non-intrusive
  - Between sections
  - Never blocking stats

---

## 10. Future Enhancements (Post-MVP)

- Player vs player comparison
- Team-level stats
- Advanced betting indicators
- Favorites / saved players
- Prop-specific views (e.g. over/under focused stats)
- Other leagues (NBA, MLB)

---

## 11. Success Metrics

- Page load speed (especially mobile)
- Time on player profile page
- Return usage during game days
- Ad engagement (without hurting UX)

---

## 12. Non-Goals (v1)

- Paid subscriptions
- User accounts
- Live betting integration
- Predictions or betting advice

---

## 13. Summary

This product focuses on **clarity, speed, and usability** for sports bettors who want better insights without friction. By combining clean design, smart data visualization, and reliable background data updates, it aims to become a go-to stat reference during betting workflows—especially on mobile.