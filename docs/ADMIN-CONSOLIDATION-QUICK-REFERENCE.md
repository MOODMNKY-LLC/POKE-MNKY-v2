# Admin Consolidation - Quick Reference

## Current vs Proposed Structure

### Current: 16 Pages
```
/admin
├── page.tsx (main dashboard)
├── users/page.tsx
├── pokemon/page.tsx
├── pokepedia-dashboard/page.tsx
├── google-sheets/page.tsx
├── draft/sessions/page.tsx
├── playoffs/page.tsx
├── teams/page.tsx ❌ (placeholder)
├── matches/page.tsx ❌ (placeholder)
├── stats/page.tsx ❌ (placeholder)
├── sync-logs/page.tsx ❌ (placeholder)
└── discord/
    ├── roles/page.tsx ❌ (merge)
    ├── bot/page.tsx ❌ (merge)
    ├── config/page.tsx ❌ (merge)
    └── webhooks/page.tsx ❌ (merge)
```

### Proposed: 8 Pages
```
/admin
├── page.tsx (main dashboard + upcoming features)
├── users/page.tsx
├── pokemon/page.tsx
├── pokepedia-dashboard/page.tsx
├── google-sheets/page.tsx
├── draft/sessions/page.tsx
├── playoffs/page.tsx
└── discord/page.tsx ✨ (unified with tabs)
    ├── Tab: Roles & Sync
    ├── Tab: Bot Status
    ├── Tab: Configuration
    └── Tab: Webhooks
```

## Key Changes

### 1. Discord Consolidation (4 → 1)
- **Before:** 4 separate pages
- **After:** 1 page with 4 tabs
- **Benefit:** Related functionality grouped together

### 2. Placeholder Pages Removal (4 → 0)
- **Before:** Teams, Matches, Stats, Sync-logs (all "Coming Soon")
- **After:** Moved to "Upcoming Features" section in main dashboard
- **Benefit:** Reduces clutter, clearer what's actually functional

### 3. Modal/Drawer Conversion
- Role mapping form → Modal
- Bot status → Collapsible card
- Config viewing → Drawer (optional)
- **Benefit:** Context preservation, less navigation

## Implementation Priority

### 🔴 High Priority (Week 1)
1. Consolidate Discord pages (biggest impact)
2. Create reusable components

### 🟡 Medium Priority (Week 2)
3. Remove placeholder pages
4. Convert actions to modals

### 🟢 Low Priority (Week 3)
5. Standardize existing pages
6. Polish & testing

## Component Status

### ✅ Already Exists
- `AdminLayout` - Header with breadcrumbs and back button (`components/admin/admin-layout.tsx`)
- `StatCard` - Basic stat card (`components/stat-card.tsx`)
- `DiscordManagementSection` - Tabbed Discord management (`components/admin/discord-management-section.tsx`)

### 🔨 Need to Create
- [ ] `AdminStatCard` - Icon-based stat card variant (or adapt existing StatCard)
- [ ] `ComingSoonCard` - Feature placeholder card
- [ ] `QuickLinksCard` - Navigation links card (optional)
- [ ] `DiscordRoleMappingModal` - Role mapping form modal
- [ ] `BotStatusCard` - Collapsible bot status display

## Navigation Updates Needed

### Links to Update
- Main dashboard cards → Update Discord links
- User management → Update Discord section links
- Any external docs → Update admin page references

### Redirects to Add
- `/admin/teams` → `/admin#teams` or `/admin/users`
- `/admin/matches` → `/admin#upcoming-features`
- `/admin/stats` → `/admin#upcoming-features`
- `/admin/sync-logs` → `/admin#upcoming-features`
- `/admin/discord/roles` → `/admin/discord#roles`
- `/admin/discord/bot` → `/admin/discord#bot`
- `/admin/discord/config` → `/admin/discord#config`
- `/admin/discord/webhooks` → `/admin/discord#webhooks`

## Quick Wins

1. **Extract AdminPageHeader** - Used in 8+ pages, immediate code reduction
2. **Merge Discord pages** - Highest user impact, reduces confusion
3. **Remove placeholder pages** - Cleanest, easiest to implement
4. **Convert forms to modals** - Better UX, maintains context

## Testing Checklist

- [ ] All Discord functionality works in tabs
- [ ] Navigation links updated correctly
- [ ] Modals open/close properly
- [ ] No broken links
- [ ] RBAC/permissions still work
- [ ] Responsive design maintained
- [ ] Accessibility (keyboard nav, screen readers)
