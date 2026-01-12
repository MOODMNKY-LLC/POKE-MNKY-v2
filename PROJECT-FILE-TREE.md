# Pokemon Draft League - Complete File Tree

## Project Structure Overview

```
pokemon-draft-league/
├── 📄 Configuration Files
│   ├── package.json                          # Dependencies and scripts
│   ├── tsconfig.json                         # TypeScript configuration
│   ├── components.json                       # Shadcn UI config
│   ├── proxy.ts                              # Next.js middleware for auth
│   ├── .cursorrules                          # Cursor IDE rules
│   ├── README.md                             # Main project documentation
│   ├── ARCHITECTURE-BREAKDOWN.md             # Auth and architecture details
│   ├── SUPABASE-UI-PLATFORM-KIT.md          # Supabase UI integration guide
│   └── DISCORD-ROLE-MANAGEMENT-PLAN.md      # Discord RBAC integration plan
│
├── 📁 app/                                   # Next.js App Router pages
│   ├── layout.tsx                            # Root layout with fonts
│   ├── page.tsx                              # Homepage (hero, stats, recent matches)
│   │
│   ├── 🔐 auth/                             # Authentication pages
│   │   └── login/
│   │       └── page.tsx                      # Login with Supabase Auth UI
│   │
│   ├── 🛡️ admin/                            # Protected admin section
│   │   └── page.tsx                          # Admin dashboard with Platform Kit
│   │
│   ├── 📊 standings/                        # League standings
│   │   └── page.tsx                          # Divisional/conference standings
│   │
│   ├── 👥 teams/                            # Team management
│   │   ├── page.tsx                          # Team directory grid
│   │   ├── [id]/page.tsx                     # Individual team page with roster
│   │   └── builder/page.tsx                  # Team builder with draft budget
│   │
│   ├── 📅 schedule/                         # Match schedule
│   │   └── page.tsx                          # Weekly matchups
│   │
│   ├── 🏆 playoffs/                         # Playoff bracket
│   │   └── page.tsx                          # Tournament bracket visualization
│   │
│   ├── 🌟 mvp/                              # MVP leaderboard
│   │   └── page.tsx                          # Top performers by KOs
│   │
│   ├── ⚔️ matches/                          # Match center
│   │   ├── page.tsx                          # Match list and status
│   │   └── submit/page.tsx                   # Result submission form
│   │
│   ├── 📖 pokedex/                          # Pokemon encyclopedia
│   │   ├── page.tsx                          # Pokedex with AI assistant
│   │   └── loading.tsx                       # Loading state
│   │
│   ├── 💡 insights/                         # AI-powered insights
│   │   ├── page.tsx                          # Weekly recaps and predictions
│   │   └── loading.tsx                       # Loading state
│   │
│   └── 🔌 api/                              # API routes
│       ├── auth/
│       │   └── signout/route.ts              # Sign out endpoint
│       ├── sync/
│       │   ├── route.ts                      # Legacy sync (commented out)
│       │   └── google-sheets/route.ts        # Google Sheets sync
│       ├── battle/
│       │   ├── create/route.ts               # Create battle session
│       │   └── [id]/step/route.ts            # Execute battle turn
│       ├── ai/
│       │   ├── pokedex/route.ts              # AI Pokedex Q&A (GPT-4.1)
│       │   ├── weekly-recap/route.ts         # Weekly recap gen (GPT-5.2)
│       │   ├── coach/route.ts                # Strategic analysis (GPT-5.2)
│       │   ├── parse-result/route.ts         # Parse Discord results (GPT-4.1)
│       │   └── sql/route.ts                  # Natural language to SQL (GPT-4.1)
│       └── supabase-proxy/
│           └── [...path]/route.ts            # Supabase Management API proxy
│
├── 📁 components/                            # React components
│   ├── site-header.tsx                       # Main navigation header
│   ├── stat-card.tsx                         # Statistics display card
│   ├── bracket-match.tsx                     # Playoff bracket match component
│   ├── theme-provider.tsx                    # Theme context provider
│   │
│   ├── 🎨 ui/                               # Shadcn UI components (90+ components)
│   │   ├── accordion.tsx
│   │   ├── alert-dialog.tsx
│   │   ├── alert.tsx
│   │   ├── aspect-ratio.tsx
│   │   ├── avatar.tsx
│   │   ├── badge.tsx
│   │   ├── breadcrumb.tsx
│   │   ├── button-group.tsx                  # NEW: Grouped buttons
│   │   ├── button.tsx
│   │   ├── calendar.tsx
│   │   ├── card.tsx
│   │   ├── carousel.tsx
│   │   ├── chart.tsx
│   │   ├── checkbox.tsx
│   │   ├── collapsible.tsx
│   │   ├── command.tsx
│   │   ├── context-menu.tsx
│   │   ├── dialog.tsx
│   │   ├── drawer.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── empty.tsx                         # NEW: Empty states
│   │   ├── field.tsx                         # NEW: Form field wrapper
│   │   ├── form.tsx
│   │   ├── hover-card.tsx
│   │   ├── input-group.tsx                   # NEW: Input with addons
│   │   ├── input-otp.tsx
│   │   ├── input.tsx
│   │   ├── item.tsx                          # NEW: List item component
│   │   ├── kbd.tsx                           # NEW: Keyboard shortcuts
│   │   ├── label.tsx
│   │   ├── menubar.tsx
│   │   ├── navigation-menu.tsx
│   │   ├── pagination.tsx
│   │   ├── popover.tsx
│   │   ├── progress.tsx
│   │   ├── radio-group.tsx
│   │   ├── resizable.tsx
│   │   ├── scroll-area.tsx
│   │   ├── select.tsx
│   │   ├── separator.tsx
│   │   ├── sheet.tsx
│   │   ├── sidebar.tsx
│   │   ├── skeleton.tsx
│   │   ├── slider.tsx
│   │   ├── sonner.tsx
│   │   ├── spinner.tsx                       # NEW: Loading spinner
│   │   ├── switch.tsx
│   │   ├── table.tsx
│   │   ├── tabs.tsx
│   │   ├── textarea.tsx
│   │   ├── toast.tsx
│   │   ├── toaster.tsx
│   │   ├── toggle-group.tsx
│   │   ├── toggle.tsx
│   │   ├── tooltip.tsx
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   │
│   ├── 🔐 auth/                             # Authentication components
│   │   └── supabase-auth-ui.tsx              # Enhanced Supabase Auth UI
│   │
│   ├── 🔧 platform/                         # Supabase Platform Kit components
│   │   ├── supabase-manager.tsx              # Main Platform Kit interface
│   │   ├── database-tab.tsx                  # SQL editor with AI assist
│   │   ├── auth-tab.tsx                      # Auth provider config
│   │   ├── users-tab.tsx                     # User management
│   │   ├── storage-tab.tsx                   # File storage management
│   │   ├── secrets-tab.tsx                   # Environment variables
│   │   └── logs-tab.tsx                      # Realtime logs viewer
│   │
│   ├── 🔴 realtime/                         # Supabase Realtime components
│   │   ├── realtime-avatar-stack.tsx         # Show online users
│   │   ├── realtime-cursor.tsx               # Collaborative cursors
│   │   └── realtime-chat.tsx                 # Chat widget
│   │
│   └── 📤 upload/                           # File upload components
│       └── file-dropzone.tsx                 # Drag-and-drop uploader
│
├── 📁 lib/                                   # Core utilities and integrations
│   ├── utils.ts                              # Utility functions (cn, etc.)
│   ├── types.ts                              # TypeScript type definitions
│   ├── mock-data.ts                          # Mock data for v0 preview
│   │
│   ├── 🗄️ supabase/                        # Supabase client wrappers
│   │   ├── client.ts                         # Browser client
│   │   ├── server.ts                         # Server client (RSC/API)
│   │   └── proxy.ts                          # Middleware helper
│   │
│   ├── 🤖 AI Integration
│   │   ├── openai-client.ts                  # OpenAI API wrapper (GPT-4/5)
│   │   └── pokemon-api.ts                    # Pokenode-TS cache layer
│   │
│   ├── ⚔️ Battle System
│   │   └── battle-engine.ts                  # Showdown-inspired battle engine
│   │
│   ├── 💬 Discord Integration
│   │   ├── discord-bot.ts                    # Discord bot with slash commands
│   │   └── discord-notifications.ts          # Webhook notifications
│   │
│   ├── 📊 Google Sheets Integration
│   │   ├── google-sheets.ts                  # googleapis wrapper (disabled for v0)
│   │   └── google-sheets-sync.ts             # node-google-spreadsheet sync
│   │
│   └── 🔧 Platform Kit
│       └── management-api-schema.d.ts        # Supabase Management API types
│
├── 📁 scripts/                               # Database and automation scripts
│   ├── 001_create_schema.sql                # Initial database schema
│   ├── 002_enhanced_schema.sql               # Enhanced schema with RBAC
│   └── start-discord-bot.ts                  # Discord bot startup script
│
├── 📁 hooks/                                 # React hooks
│   ├── use-mobile.ts                         # Mobile detection hook
│   └── use-toast.ts                          # Toast notification hook
│
└── 📁 public/                                # Static assets (not shown)
    └── (images, icons, etc.)
```

## Key File Categories

### 1. Authentication & Authorization (🔐)
- `app/auth/login/page.tsx` - Login interface
- `components/auth/supabase-auth-ui.tsx` - Enhanced auth UI with Discord OAuth
- `lib/supabase/` - Supabase client wrappers
- `proxy.ts` - Middleware for auth protection

### 2. League Management (📊)
- `app/standings/page.tsx` - League standings
- `app/teams/` - Team directory and rosters
- `app/schedule/page.tsx` - Match schedule
- `app/playoffs/page.tsx` - Playoff bracket
- `app/mvp/page.tsx` - MVP leaderboard

### 3. Battle System (⚔️)
- `lib/battle-engine.ts` - Showdown-accurate battle simulation
- `app/api/battle/` - Battle API endpoints
- `app/matches/` - Match center and submission

### 4. AI Features (🤖)
- `lib/openai-client.ts` - OpenAI GPT-4/5 integration
- `app/api/ai/` - AI endpoints (Q&A, recaps, analysis, parsing)
- `app/insights/page.tsx` - AI-powered insights dashboard
- `app/pokedex/page.tsx` - AI Pokedex assistant

### 5. Discord Integration (💬)
- `lib/discord-bot.ts` - Bot with slash commands
- `lib/discord-notifications.ts` - Webhook system
- `scripts/start-discord-bot.ts` - Bot startup

### 6. Data Sync (📊)
- `lib/google-sheets-sync.ts` - Google Sheets → Supabase sync
- `app/api/sync/google-sheets/route.ts` - Sync API endpoint

### 7. Admin Tools (🛡️)
- `app/admin/page.tsx` - Admin dashboard with Platform Kit
- `components/platform/` - Embedded Supabase management console
- `app/api/supabase-proxy/` - Management API proxy

### 8. UI Components (🎨)
- `components/ui/` - 90+ Shadcn components
- `components/realtime/` - Realtime collaboration features
- `components/upload/` - File upload components

## Database Schema Files

### Migration Scripts
1. `scripts/001_create_schema.sql` - Initial schema
   - Basic tables: teams, pokemon, rosters, matches
   
2. `scripts/002_enhanced_schema.sql` - Enhanced schema
   - Seasons, conferences, divisions
   - Draft system with point budgets
   - Battle sessions and logs
   - Stat tracking and sync logs
   - RLS policies for all tables
   - RBAC with profiles and role_permissions tables

## Configuration Files

### Essential Config
- `package.json` - Dependencies (Next.js, Supabase, OpenAI, Discord, etc.)
- `tsconfig.json` - TypeScript configuration
- `components.json` - Shadcn UI configuration
- `.cursorrules` - Cursor IDE rules and guidelines

### Documentation
- `README.md` - Project overview and setup
- `ARCHITECTURE-BREAKDOWN.md` - Auth and architecture deep dive
- `SUPABASE-UI-PLATFORM-KIT.md` - Supabase UI integration guide
- `DISCORD-ROLE-MANAGEMENT-PLAN.md` - Discord RBAC plan
- `PROJECT-FILE-TREE.md` - This file
- `USER-WORKFLOW.md` - User journey documentation
- `PROJECT-ROADMAP.md` - Development roadmap

## File Naming Conventions

### Pages (App Router)
- `page.tsx` - Route page component
- `layout.tsx` - Layout wrapper
- `loading.tsx` - Loading state
- `error.tsx` - Error boundary (not yet implemented)

### API Routes
- `route.ts` - API endpoint handler
- Pattern: `app/api/[feature]/[action]/route.ts`

### Components
- `kebab-case.tsx` - Component files
- Located in `/components` or `/components/[category]`

### Libraries
- `kebab-case.ts` - Utility/library files
- Located in `/lib` or `/lib/[category]`

### Scripts
- `NNN_description.sql` - Database migrations (numbered)
- `kebab-case.ts` - Utility scripts

## Import Path Aliases

```typescript
@/app/*              // App directory
@/components/*       // Components
@/lib/*              // Libraries and utilities
@/hooks/*            // React hooks
```

## Notes

- All `.tsx` files use TypeScript with React
- All `.ts` files are pure TypeScript
- API routes must export named functions: `GET`, `POST`, `PUT`, `DELETE`
- Server components use `await createClient()` from `@/lib/supabase/server`
- Client components use `createBrowserClient()` from `@/lib/supabase/client`
- Mock data is used in v0 preview (toggle `USE_MOCK_DATA = true`)
- Google API imports are disabled for v0 compatibility
