# Pokeball Assets Integration Plan

## Assets Overview

1. **gym-leader-badge.webp** - Gym Leader Badge for coaches/commissioners/admins
2. **pokeball-normal.svg** - Normal Pokeball (Viewer role)
3. **pokeball-ultra.svg** - Ultra Ball (Coach role)
4. **pokeball-master.svg** - Master Ball (Commissioner/Admin role)

## UI/UX Integration Strategy

### Role-Based Visual Hierarchy

**Pokeball Icons** represent user roles:
- **Normal Pokeball** → Viewer (standard users)
- **Ultra Ball** → Coach (team managers)
- **Master Ball** → Commissioner/Admin (league leaders)

**Gym Leader Badge** identifies coaches and league leaders (coaches, commissioners, admins)

### Integration Points

#### 1. **User Avatars & Profile Pages**
- **Location**: `app/profile/page.tsx`, `components/site-header.tsx`
- **Implementation**: 
  - Enhanced `UserAvatar` component with gym leader badge overlay
  - Pokeball icon next to role badge
  - Visual role identification at a glance

#### 2. **Navbar/Header**
- **Location**: `components/site-header.tsx`
- **Implementation**:
  - User avatar with gym leader badge for coaches/admins
  - Role indicator in dropdown menu

#### 3. **Standings & Team Lists**
- **Location**: `app/standings/page.tsx`, `app/teams/page.tsx`
- **Implementation**:
  - Pokeball icon next to coach names
  - Visual role hierarchy in team displays

#### 4. **Match Cards & Team Detail Pages**
- **Location**: `app/matches/page.tsx`, `app/teams/[id]/page.tsx`
- **Implementation**:
  - Coach identification with pokeball icons
  - Gym leader badge for team coaches

#### 5. **Admin Panels & User Management**
- **Location**: `app/admin/users/page.tsx`, `components/platform/users-tab.tsx`
- **Implementation**:
  - Pokeball icons in user role columns
  - Visual role hierarchy in tables

#### 6. **Match Status Indicators** (Future Enhancement)
- Use pokeballs for match status:
  - Normal Pokeball = Scheduled
  - Ultra Ball = In Progress
  - Master Ball = Completed

## Components Created

1. **`components/ui/pokeball-icon.tsx`**
   - Displays pokeball SVG based on role
   - Auto-determines type from role or accepts explicit variant

2. **`components/ui/gym-leader-badge.tsx`**
   - Displays gym leader badge for coaches/admins
   - Configurable visibility by role

3. **`components/ui/user-avatar.tsx`**
   - Enhanced avatar with badge and pokeball overlays
   - Combines avatar, gym leader badge, and pokeball icon

## Implementation Status

✅ **Completed**:
- Assets copied to `/public`
- Component library created
- Profile page updated
- Navbar updated

🔄 **In Progress**:
- Standings page coach indicators
- Team cards coach indicators
- User management tables

📋 **Future Enhancements**:
- Match status pokeball indicators
- Achievement system integration
- Team quality rankings

## Usage Examples

```tsx
// Basic pokeball icon
<PokeballIcon role={userRole} size="md" />

// Gym leader badge
<GymLeaderBadge role={userRole} size="sm" />

// Enhanced avatar
<UserAvatar 
  src={avatarUrl}
  role={userRole}
  size="lg"
  showBadge={true}
  showPokeball={false}
/>
```

## Design Principles

1. **Visual Hierarchy**: Pokeball types create clear role distinction
2. **Consistency**: Same icons used across all user displays
3. **Accessibility**: Icons supplement text, don't replace it
4. **Performance**: SVG assets are lightweight and scalable
5. **Branding**: Pokémon-themed assets enhance league identity
