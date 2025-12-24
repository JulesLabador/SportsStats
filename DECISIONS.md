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

## 7. Future Considerations

### Supabase Integration
**Planned**: Replace mock data with Supabase Postgres database.

**Approach**:
- Keep same TypeScript interfaces
- Add database schema matching types
- Implement cron jobs for data sync
- Use Supabase client in Server Components

### SportsDataIO API
**Planned**: Integrate real NFL data from SportsDataIO.

**Approach**:
- Background sync via cron jobs
- Never fetch on user request
- Store in Supabase for fast queries
- Rate limit aware scheduling

### Search Optimization
**Planned**: Implement proper search indexing.

**Approach**:
- Postgres full-text search or Supabase search
- Debounced API calls
- Client-side filtering for small datasets

---

## 8. File Organization

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

---

*Last updated: December 2024*

