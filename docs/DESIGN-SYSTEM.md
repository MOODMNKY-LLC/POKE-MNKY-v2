# POKE MNKY v3 Design System

This document describes design tokens, components, and motion used across the app. Use it when building or refining UI to keep the experience consistent.

## Design tokens

Tokens are defined in `app/globals.css` and exposed via Tailwind v4 `@theme inline`.

### Color

- **Light theme**: Authentic Pokémon Red/White. Primary is Pokémon Red (`#CC0000` → OKLCH). Accent is Pokémon Blue (`#3B4CCA`). Charts use Yellow, Red, Blue, Green, Purple.
- **Dark theme**: Master Ball palette (gold/black/white). Primary is Pokémon Gold. Background and cards use deep black and dark grays; borders use `oklch(0.28 0.015 80)`.
- **Semantic**: `background`, `foreground`, `card`, `muted`, `primary`, `accent`, `destructive`, `border`, `input`, `ring`. Sidebar variants for nav.
- **Charts**: `chart-1`–`chart-5` for data viz (yellow, red, blue, green, purple).

Use Tailwind classes: `bg-background`, `text-foreground`, `bg-primary`, `text-primary-foreground`, `border-border`, `bg-muted`, etc.

### Typography

- **Sans**: Fredoka (Pokémon-inspired), with system fallbacks. Used for body and UI.
- **Marker**: Permanent Marker for display/headings where appropriate.
- **Mono**: Geist Mono for code and data.

Fonts are wired in `app/layout.tsx` and referenced in `@theme` as `--font-sans`, `--font-marker`, `--font-mono`.

### Radius and spacing

- **Radius**: `--radius: 0.75rem`; derived `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl` for components.
- Use Tailwind spacing scale for padding/margin; container uses `px-4 md:px-6 py-8` for page content.

## Components

- **Source**: Shadcn UI (`components/ui/`). Use existing primitives (Button, Card, Dialog, Form, Table, Tabs, etc.) before introducing new patterns.
- **Layout**: `components/ui/sidebar`, `AppSidebar`, `DashboardDock` for dashboard; container + grid for public pages.
- **Brand**: `PokeMnkyAssistant`, `PokeMnkyPremium` (gold/black) for AI and premium contexts. League logo and Pokéball assets in `public/`.
- **Loading**: Skeleton pattern: `animate-pulse` + `bg-muted` blocks. Each major route has a `loading.tsx` that mirrors approximate layout (see `app/standings/loading.tsx` as reference).

## Motion

- **Loading states**: `animate-pulse` on skeletons; root loading uses `animate-fade-in`, `animate-slide-up`, `animate-fade-in-delay`, and a slow spin on the Pokéball.
- **Theme keyframes** (in `@theme`): `shimmer-slide`, `spin-around`, `gradient`, `shine`. Use via `--animate-*` or Tailwind animation utilities.
- **tw-animate-css**: Imported in `globals.css` for consistent enter/leave and transition utilities.
- Prefer one clear loading or transition per view; avoid many competing animations.

## Accessibility and theming

- **Contrast**: Foreground on background and primary on primary-foreground meet contrast requirements in both themes.
- **Focus**: Ring uses `outline-ring/50`; ensure focusable elements have visible focus styles.
- **Dark mode**: Toggle via `dark` class (e.g. `next-themes`). All tokens have light and dark values in `:root` and `.dark`.

## Account, Profile, and Coach Profile

The dashboard separates these concepts:

| Term | Scope | Editable in |
|------|-------|-------------|
| **Account** | Auth identity, email/Discord link, security | Settings → Account |
| **User Profile** | display_name, bio, user avatar | ProfileSheet / Profile |
| **Coach Profile** | League team: name, avatar, logo; coach persona | CoachCard (inside ProfileSheet when coach) |
| **Showdown Teams** | Export lists; optional avatar | My Teams, Team Builder, Upload |
| **League Team** | Drafted roster, standings; branding from Coach Profile | league-team pages |

- **ProfileSheet** is the single place for profile and coach editing; `/dashboard/profile` redirects to dashboard and opens it.
- **Settings** tabs: Account | Profile | Notifications | Preferences | Guides.
- **User avatar**: Upload to `user-avatars` bucket; fallback to Discord avatar when null.
- **League team branding**: Coach-only; stored in `teams` (avatar_url, logo_url, name).

## Where to change things

| Change        | File / location                    |
|---------------|------------------------------------|
| Colors/tokens | `app/globals.css` (`:root`, `.dark`, `@theme`) |
| Fonts         | `app/layout.tsx` (load), `app/globals.css` (`@theme`) |
| New UI piece  | Prefer `components/ui/` (Shadcn); then `components/` |
| Page loading  | Add or edit `loading.tsx` in the route segment |
| Motion        | `app/globals.css` (`@theme` keyframes), Tailwind `animate-*` |
