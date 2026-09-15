# Fitness OS

A premium, dark-first fitness tracking platform — workouts, nutrition, habits, progress analytics and gamification in one place.

This repository currently contains **Phase 0: project foundation and design system**. It is a standalone project, independent of any other repository.

## Tech Stack

- **React 19 + TypeScript (strict) + Vite**
- **Tailwind CSS v4** (CSS-first theme, dark-first design tokens)
- **Framer Motion** for page/card/modal transitions and micro-interactions
- **Lucide React** for icons
- **Recharts** for progress charts
- **Vitest + React Testing Library** for unit/component tests
- **Playwright** for end-to-end smoke tests

## Getting Started

```bash
npm install
npm run dev         # start the dev server
npm run build        # typecheck + production build
npm run preview      # preview the production build
```

## Validation

```bash
npm run typecheck    # tsc -b --noEmit
npm run lint         # oxlint
npm test             # vitest run
npm run test:e2e     # playwright test (builds/serves first via webServer)
```

## Project Structure

```
src/
  components/
    ui/           # Design system: Button, Card, Badge, ProgressBar, ProgressRing,
                   # Modal, Input, Select, Tabs, Toggle, Avatar, StatCard,
                   # EmptyState, LoadingState, Toast
    navigation/    # Sidebar (desktop), BottomNavigation (mobile)
    workout/       # Workout-specific presentational components
  layouts/         # AppLayout (sidebar/bottom nav + page transitions)
  pages/           # Dashboard, Workout, Nutrition, Progress, Habits, Achievements, Settings
  hooks/           # useMediaQuery, useToast
  data/            # Mock data, separated from components
  types/           # Domain types per feature area
  animations/       # Shared Framer Motion variants
  lib/             # Navigation config and other small app-wide config
  utils/           # cn(), formatting/number helpers
```

## Design System

Dark-first palette (see `src/index.css` `@theme` block):

- Background `#0B0F14` · Surface `#141A21` · Elevated surface `#1B232C`
- Accent (lime) `#B7F34A` · Secondary (cyan) `#45D6FF` · Purple `#9B7BFF`

Typography: Inter (body) + Manrope (display/headings). Reduced-motion is respected globally via `prefers-reduced-motion`.

## Scope of this phase

This phase ships the app shell, design system, routing and polished placeholder pages with realistic **mock data only**. Explicitly out of scope for this phase:

- Firebase / authentication / real persistence
- Samsung Health / Android Health Connect integration
- Real workout, nutrition, or habit tracking logic

These will be built in later phases.
