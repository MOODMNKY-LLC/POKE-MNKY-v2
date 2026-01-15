# Implementation Plan: Admin Panel & Platform Kit Completion

## Summary

Based on comprehensive analysis, here's what needs to be implemented to achieve full Supabase Platform Kit utilization and Discord admin configuration:

---

## Phase 1: Complete Platform Kit Tabs (Priority: HIGH)

### 1.1 Auth Tab Enhancement
**Current:** Basic status badges only  
**Target:** Full auth configuration UI

**Features to Add:**
- Provider configuration (Discord OAuth setup form)
- Redirect URL management (add/edit/delete)
- Session settings (JWT expiry, refresh intervals)
- User management (list, edit roles, view details)
- OAuth callback testing

**Files to Update:**
- `components/platform/auth-tab.tsx`

### 1.2 Storage Tab Implementation
**Current:** Placeholder  
**Target:** Full storage management

**Features to Add:**
- List all buckets
- Create/edit/delete buckets
- File browser with search
- Upload interface
- Policy editor
- Storage usage stats

**Files to Update:**
- `components/platform/storage-tab.tsx`

### 1.3 Users Tab Enhancement
**Current:** Queries wrong table (coaches instead of profiles)  
**Target:** Full user management

**Features to Add:**
- Query `profiles` table (not coaches)
- Display Discord linkage
- Role assignment interface
- Activity logs per user
- Search and pagination

**Files to Update:**
- `components/platform/users-tab.tsx`

### 1.4 Secrets Tab Implementation
**Current:** Placeholder  
**Target:** Environment variable viewer

**Features to Add:**
- List environment variables (read-only for security)
- Integration status indicators
- API key validation/testing
- Secret rotation reminders

**Files to Update:**
- `components/platform/secrets-tab.tsx`

### 1.5 Logs Tab Implementation
**Current:** Placeholder  
**Target:** Real-time log viewer

**Features to Add:**
- Real-time log streaming
- Filter by service (auth, api, postgres, storage)
- Search functionality
- Log export
- Error aggregation

**Files to Update:**
- `components/platform/logs-tab.tsx`

---

## Phase 2: Discord Admin UI (Priority: HIGH)

### 2.1 Discord Configuration Page
**Route:** `/admin/discord/config`

**Features:**
- View/edit Discord credentials (Client ID, Secret, Token)
- Test bot connection status
- Configure OAuth redirect URLs
- View bot permissions
- Test OAuth flow

**Files to Create:**
- `app/admin/discord/config/page.tsx`
- `components/discord/config-form.tsx`
- `components/discord/bot-status-card.tsx`

### 2.2 Role Sync Management Page
**Route:** `/admin/discord/roles`

**Features:**
- Map Discord roles → App roles
- Manual sync trigger button
- Sync status/history
- Conflict resolution UI
- Bulk role assignment

**Files to Create:**
- `app/admin/discord/roles/page.tsx`
- `components/discord/role-mapping.tsx`
- `components/discord/sync-status.tsx`
- `app/api/discord/sync-roles/route.ts`

### 2.3 Webhook Management Page
**Route:** `/admin/discord/webhooks`

**Features:**
- List all webhooks from `discord_webhooks` table
- Add/edit/delete webhooks
- Test webhook delivery
- Configure webhook events
- Webhook delivery logs

**Files to Create:**
- `app/admin/discord/webhooks/page.tsx`
- `components/discord/webhook-form.tsx`
- `components/discord/webhook-list.tsx`
- `app/api/discord/webhooks/route.ts`

### 2.4 Bot Status Page
**Route:** `/admin/discord/bot-status`

**Features:**
- Bot online/offline status
- Command usage statistics
- Error logs from bot
- Uptime monitoring
- Recent command executions

**Files to Create:**
- `app/admin/discord/bot-status/page.tsx`
- `components/discord/bot-health.tsx`
- `components/discord/command-stats.tsx`
- `app/api/discord/bot-status/route.ts`

---

## Phase 3: Admin Sub-Pages (Priority: MEDIUM)

### 3.1 Match Management
**Route:** `/admin/matches`

**Features:**
- List all matches with filters
- Create/edit matches
- Approve/reject submitted results
- Resolve disputes
- Bulk operations

**Files to Create:**
- `app/admin/matches/page.tsx`
- `components/admin/match-table.tsx`
- `components/admin/match-form.tsx`

### 3.2 Team Management
**Route:** `/admin/teams`

**Features:**
- List all teams
- Create/edit teams
- Assign coaches
- Adjust draft budgets
- View team rosters

**Files to Create:**
- `app/admin/teams/page.tsx`
- `components/admin/team-table.tsx`
- `components/admin/team-form.tsx`

### 3.3 User Management
**Route:** `/admin/users`

**Features:**
- List all users with search
- Edit user roles
- View user activity
- Ban/unban users
- Link Discord accounts

**Files to Create:**
- `app/admin/users/page.tsx`
- `components/admin/user-table.tsx`
- `components/admin/user-form.tsx`

### 3.4 Playoff Management
**Route:** `/admin/playoffs`

**Features:**
- View playoff bracket
- Set up playoff matches
- Update bracket results
- Generate bracket visualization

**Files to Create:**
- `app/admin/playoffs/page.tsx`
- `components/admin/playoff-bracket.tsx`

### 3.5 Sync Logs Viewer
**Route:** `/admin/sync-logs`

**Features:**
- List all sync jobs
- View sync details
- Filter by status/type
- Export sync logs

**Files to Create:**
- `app/admin/sync-logs/page.tsx`
- `components/admin/sync-log-table.tsx`

---

## Implementation Order

### Week 1: Platform Kit Tabs
1. Day 1: Auth Tab (provider config, user management)
2. Day 2: Storage Tab (bucket management, file browser)
3. Day 3: Users Tab (fix query, add features)
4. Day 4: Secrets Tab (environment viewer)
5. Day 5: Logs Tab (real-time streaming)

### Week 2: Discord Admin UI
1. Day 1: Discord Config Page
2. Day 2: Role Sync Page
3. Day 3: Webhook Management Page
4. Day 4: Bot Status Page
5. Day 5: Testing & Polish

### Week 3: Admin Sub-Pages
1. Day 1-2: Match Management
2. Day 3: Team Management
3. Day 4: User Management
4. Day 5: Playoffs & Sync Logs

---

## Component Library Usage

### Shadcn UI (Already Installed)
- `Form`, `Input`, `Select`, `Switch` - Forms
- `Table`, `Card`, `Dialog` - Layout
- `Button`, `Badge`, `Tabs` - UI elements

### Magic UI (Available)
- `magic-card` - Enhanced cards
- `border-beam` - Animated borders
- `shimmer-button` - Enhanced buttons

### Supabase MCP Tools
- Use for Management API calls
- Database queries
- Auth configuration
- Logs retrieval

---

## Estimated Timeline

**Total Time:** 15-20 days of focused development

**Breakdown:**
- Platform Kit Tabs: 5 days
- Discord Admin UI: 5 days
- Admin Sub-Pages: 5 days
- Testing & Polish: 2-3 days

---

## Success Criteria

✅ All Platform Kit tabs functional  
✅ Discord configuration manageable via UI  
✅ Role sync working end-to-end  
✅ Webhook management operational  
✅ All admin sub-pages implemented  
✅ No broken links in admin dashboard
