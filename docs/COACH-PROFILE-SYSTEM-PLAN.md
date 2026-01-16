# Coach/Player Profile System - Comprehensive Implementation Plan

> **Status**: 📋 Planning Phase  
> **Last Updated**: 2026-01-16  
> **Priority**: High - Core User Experience Feature

---

## 🎯 Executive Summary

Transform the user profile page into a comprehensive **Coach/Player Card** system where users can:
- Manage their coach persona and team information
- Upload and manage team avatars/logos
- Review and manage Showdown teams
- Automatically sync with Discord role assignments
- View team statistics, matches, and roster

**Key Innovation**: Discord role changes automatically trigger coach assignment and team creation, creating a seamless onboarding experience.

---

## 📊 Current State Analysis

### ✅ What Exists

1. **Profile System** (`app/profile/page.tsx`)
   - Basic fields: `display_name`, `username`, `bio`
   - Discord integration: `discord_id`, `discord_username`, `discord_avatar`
   - Showdown sync: `showdown_username`, `showdown_account_synced`
   - Role display: Shows current role (admin, commissioner, coach, viewer)

2. **Database Schema**
   - `profiles` table: User profile data
   - `coaches` table: Separate coach records (linked via `user_id`)
   - `teams` table: Team data with `coach_id` referencing `coaches.id`
   - `showdown_teams` table: Showdown team exports

3. **Discord Integration**
   - OAuth authentication ✅
   - Role sync API (`/api/discord/sync-roles`) ✅
   - Role mapping logic (`lib/discord-role-sync.ts`) ✅
   - **Missing**: Real-time Discord bot event handler for role changes

4. **File Upload**
   - `FileDropzone` component exists ✅
   - Supabase Storage integration ✅
   - Team asset upload (`team-assets` bucket) ✅

5. **Team Pages**
   - Team detail page (`app/teams/[id]/page.tsx`) shows coach name
   - Team builder (`app/teams/builder/page.tsx`) for Showdown teams
   - Teams listing page shows coach badges

### ❌ What's Missing

1. **Profile Page Enhancements**
   - No coach card/team management section
   - No team avatar upload UI
   - No team name editing
   - No Showdown team review/management
   - No connection between `profiles` and `coaches` tables

2. **Discord Role Change Automation**
   - No `guildMemberUpdate` event handler
   - Role changes require manual sync
   - No automatic coach entry creation when role = "Coach"

3. **Team Management**
   - No UI to assign user to team
   - No UI to create team from profile
   - No team avatar upload in profile

4. **Database Schema Gaps**
   - Teams table has `logo_url` but no `avatar_url` or `banner_url`
   - No direct link between `profiles.team_id` and `teams.id` (only via coaches)

---

## 🔄 Complete User Flow (Start to Finish)

### **Flow 1: New User Onboarding**

```
1. User clicks "Sign in with Discord"
   ↓
2. Discord OAuth flow completes
   ↓
3. Supabase creates auth.users entry
   ↓
4. Trigger creates profiles entry (role = 'viewer')
   ↓
5. User lands on homepage
   ↓
6. User navigates to /profile
   ↓
7. Profile page shows:
   - Basic profile info (Discord avatar, username)
   - Role badge: "Viewer"
   - No coach card (not a coach yet)
   ↓
8. User joins Discord server
   ↓
9. Admin assigns "Coach" role in Discord
   ↓
10. Discord bot detects guildMemberUpdate event
    ↓
11. Bot syncs role: profiles.role = 'coach'
    ↓
12. Bot creates coaches entry (if doesn't exist)
    ↓
13. Bot assigns user to team (or creates team)
    ↓
14. User refreshes /profile page
    ↓
15. Profile page now shows:
    - Coach card with team info
    - Team avatar upload
    - Team name editing
    - Showdown teams section
```

### **Flow 2: Existing Coach Profile Management**

```
1. User logs in (already has coach role)
   ↓
2. Navigates to /profile
   ↓
3. Sees coach card section:
   ┌─────────────────────────────────┐
   │  🎮 Coach Card                  │
   │  ─────────────────────────────  │
   │  Team: [Team Name] [Edit]       │
   │  Avatar: [Upload Avatar]        │
   │  Record: 5-3 (+12)              │
   │  Division: Kanto                │
   │  ─────────────────────────────  │
   │  [View Team Page] [Edit Team]   │
   └─────────────────────────────────┘
   ↓
4. User clicks "Upload Avatar"
   ↓
5. FileDropzone opens
   ↓
6. User selects image file
   ↓
7. Image uploads to Supabase Storage
   ↓
8. teams.avatar_url updated
   ↓
9. Profile page refreshes with new avatar
   ↓
10. User clicks "Edit Team Name"
    ↓
11. Input field becomes editable
    ↓
12. User types new name
    ↓
13. Saves → teams.name updated
    ↓
14. Profile page refreshes
```

### **Flow 3: Showdown Team Management**

```
1. User is on /profile page
   ↓
2. Scrolls to "Showdown Teams" section
   ↓
3. Sees list of saved teams:
   ┌─────────────────────────────────┐
   │  📋 Showdown Teams              │
   │  ─────────────────────────────  │
   │  [Gen 9 OU] My Team             │
   │  Created: 2 days ago           │
   │  [View] [Edit] [Delete]         │
   │  ─────────────────────────────  │
   │  [Gen 9 VGC] Tournament Team    │
   │  Created: 1 week ago            │
   │  [View] [Edit] [Delete]         │
   └─────────────────────────────────┘
   ↓
4. User clicks "View" on a team
   ↓
5. Modal opens showing team export
   ↓
6. User can copy team text
   ↓
7. User clicks "Edit"
   ↓
8. Redirects to /teams/builder with team loaded
   ↓
9. User makes changes
   ↓
10. Saves → showdown_teams table updated
```

---

## 🏗️ Architecture & Database Changes

### **Phase 1: Database Schema Updates**

#### **1.1 Add Team Avatar Fields**

```sql
-- Migration: add_team_avatar_fields.sql
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- Add comment
COMMENT ON COLUMN public.teams.avatar_url IS 'Team avatar/logo URL (square, for profile cards)';
COMMENT ON COLUMN public.teams.banner_url IS 'Team banner URL (wide, for team pages)';
```

#### **1.2 Link Profiles to Teams Directly**

```sql
-- Migration: link_profiles_to_teams.sql
-- Add team_id to profiles (already exists but verify)
-- Ensure foreign key constraint exists
ALTER TABLE public.profiles
ADD CONSTRAINT IF NOT EXISTS profiles_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;
```

#### **1.3 Create Coach Assignment Function**

```sql
-- Migration: create_coach_assignment_function.sql
CREATE OR REPLACE FUNCTION public.assign_coach_to_team(
  p_user_id UUID,
  p_team_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_coach_id UUID;
  v_team_id UUID;
BEGIN
  -- Get or create coach entry
  SELECT id INTO v_coach_id
  FROM public.coaches
  WHERE user_id = p_user_id;
  
  IF v_coach_id IS NULL THEN
    INSERT INTO public.coaches (user_id, display_name, email)
    SELECT 
      p_user_id,
      p.display_name,
      p.email
    FROM public.profiles p
    WHERE p.id = p_user_id
    RETURNING id INTO v_coach_id;
  END IF;
  
  -- Assign to team
  IF p_team_id IS NOT NULL THEN
    UPDATE public.teams
    SET coach_id = v_coach_id
    WHERE id = p_team_id AND coach_id IS NULL;
    
    v_team_id := p_team_id;
  ELSE
    -- Find unassigned team or create one
    SELECT id INTO v_team_id
    FROM public.teams
    WHERE coach_id IS NULL
    LIMIT 1;
    
    IF v_team_id IS NULL THEN
      -- Create new team (requires season_id, division_id)
      -- This should be handled by admin or during draft
      RAISE EXCEPTION 'No unassigned teams available. Please contact admin.';
    ELSE
      UPDATE public.teams
      SET coach_id = v_coach_id
      WHERE id = v_team_id;
    END IF;
  END IF;
  
  -- Update profile team_id
  UPDATE public.profiles
  SET team_id = v_team_id
  WHERE id = p_user_id;
  
  RETURN v_coach_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### **Phase 2: Discord Bot Event Handler**

#### **2.1 Create Discord Bot Service**

**File**: `lib/discord-bot-service.ts`

```typescript
import { Client, GatewayIntentBits, Events, GuildMember } from "discord.js"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { syncDiscordRoleToApp } from "@/lib/discord-role-sync"
import { assignCoachToTeam } from "@/lib/coach-assignment"

let discordClient: Client | null = null

export async function initializeDiscordBot(): Promise<Client> {
  if (discordClient?.isReady()) {
    return discordClient
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
    ],
  })

  // Handle role changes
  client.on(Events.GuildMemberUpdate, async (oldMember: GuildMember, newMember: GuildMember) => {
    await handleRoleChange(oldMember, newMember)
  })

  // Handle member joins
  client.on(Events.GuildMemberAdd, async (member: GuildMember) => {
    await handleRoleChange(null, member)
  })

  await client.login(process.env.DISCORD_BOT_TOKEN)
  discordClient = client
  
  return client
}

async function handleRoleChange(
  oldMember: GuildMember | null,
  newMember: GuildMember
) {
  const supabase = createServiceRoleClient()
  
  // Check if roles changed
  if (oldMember && oldMember.roles.cache.size === newMember.roles.cache.size) {
    const oldRoleIds = oldMember.roles.cache.map(r => r.id).sort()
    const newRoleIds = newMember.roles.cache.map(r => r.id).sort()
    if (JSON.stringify(oldRoleIds) === JSON.stringify(newRoleIds)) {
      return // No role change
    }
  }

  // Sync role to app
  const syncResult = await syncDiscordRoleToApp(newMember.id)
  
  if (!syncResult.success || !syncResult.appRole) {
    console.warn(`[Discord Bot] Failed to sync role for ${newMember.id}: ${syncResult.message}`)
    return
  }

  // If role is "coach", ensure coach entry and team assignment
  if (syncResult.appRole === "coach") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, team_id")
      .eq("discord_id", newMember.id)
      .single()

    if (profile && !profile.team_id) {
      // Assign coach to team
      await assignCoachToTeam(profile.id)
    }
  }
}
```

#### **2.2 Create Coach Assignment Helper**

**File**: `lib/coach-assignment.ts`

```typescript
import { createServiceRoleClient } from "@/lib/supabase/service"

export async function assignCoachToTeam(userId: string, teamId?: string) {
  const supabase = createServiceRoleClient()
  
  // Call database function
  const { data, error } = await supabase.rpc("assign_coach_to_team", {
    p_user_id: userId,
    p_team_id: teamId || null,
  })

  if (error) {
    console.error("[Coach Assignment] Error:", error)
    throw error
  }

  return data
}
```

#### **2.3 Start Bot in API Route or Edge Function**

**Option A: API Route** (`app/api/discord/bot/route.ts`)

```typescript
import { initializeDiscordBot } from "@/lib/discord-bot-service"

export async function POST() {
  try {
    const client = await initializeDiscordBot()
    return Response.json({ 
      success: true, 
      message: "Discord bot initialized",
      ready: client.isReady()
    })
  } catch (error: any) {
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
```

**Option B: Edge Function** (Recommended for production)

Create `supabase/functions/discord-bot/index.ts` that runs continuously.

---

### **Phase 3: Profile Page Enhancements**

#### **3.1 Add Coach Card Component**

**File**: `components/profile/coach-card.tsx`

```typescript
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FileDropzone } from "@/components/upload/file-dropzone"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Edit2, Upload, ExternalLink } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import Link from "next/link"

interface CoachCardProps {
  team: {
    id: string
    name: string
    avatar_url?: string | null
    wins: number
    losses: number
    differential: number
    division?: string
    conference?: string
  } | null
  userId: string
}

export function CoachCard({ team, userId }: CoachCardProps) {
  const [editingName, setEditingName] = useState(false)
  const [teamName, setTeamName] = useState(team?.name || "")
  const [uploading, setUploading] = useState(false)
  const supabase = createBrowserClient()

  const handleSaveName = async () => {
    if (!team) return
    
    const { error } = await supabase
      .from("teams")
      .update({ name: teamName })
      .eq("id", team.id)

    if (error) {
      toast.error("Failed to update team name")
    } else {
      toast.success("Team name updated")
      setEditingName(false)
    }
  }

  const handleAvatarUpload = async (url: string) => {
    if (!team) return
    
    setUploading(true)
    const { error } = await supabase
      .from("teams")
      .update({ avatar_url: url })
      .eq("id", team.id)

    if (error) {
      toast.error("Failed to update avatar")
    } else {
      toast.success("Avatar updated")
    }
    setUploading(false)
  }

  if (!team) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">
            You're not assigned to a team yet. Contact an admin to get assigned.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🎮 Coach Card
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Team Avatar */}
        <div className="flex items-center gap-4">
          <Avatar className="h-24 w-24">
            <AvatarImage src={team.avatar_url || undefined} />
            <AvatarFallback>{team.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <FileDropzone
              bucket="team-assets"
              path={`teams/${team.id}`}
              accept="image/*"
              maxSize={5 * 1024 * 1024} // 5MB
              onUploadComplete={handleAvatarUpload}
            >
              <Button variant="outline" size="sm" disabled={uploading}>
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? "Uploading..." : "Upload Avatar"}
              </Button>
            </FileDropzone>
          </div>
        </div>

        {/* Team Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Team Name</label>
          {editingName ? (
            <div className="flex gap-2">
              <Input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName()
                  if (e.key === "Escape") {
                    setEditingName(false)
                    setTeamName(team.name)
                  }
                }}
                autoFocus
              />
              <Button size="sm" onClick={handleSaveName}>Save</Button>
              <Button size="sm" variant="outline" onClick={() => {
                setEditingName(false)
                setTeamName(team.name)
              }}>Cancel</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">{team.name}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditingName(true)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Team Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-2xl font-bold">
              {team.wins}-{team.losses}
            </div>
            <div className="text-xs text-muted-foreground">Record</div>
          </div>
          <div>
            <div className={`text-2xl font-bold ${team.differential > 0 ? "text-green-500" : team.differential < 0 ? "text-red-500" : ""}`}>
              {team.differential > 0 ? "+" : ""}{team.differential}
            </div>
            <div className="text-xs text-muted-foreground">Differential</div>
          </div>
          <div>
            {team.division && (
              <>
                <Badge variant="outline">{team.division}</Badge>
                {team.conference && (
                  <Badge variant="outline" className="ml-1">{team.conference}</Badge>
                )}
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button asChild variant="outline" className="flex-1">
            <Link href={`/teams/${team.id}`}>
              <ExternalLink className="h-4 w-4 mr-2" />
              View Team Page
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

#### **3.2 Add Showdown Teams Section**

**File**: `components/profile/showdown-teams-section.tsx`

```typescript
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createBrowserClient } from "@/lib/supabase/client"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { ExternalLink, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface ShowdownTeam {
  id: string
  team_name: string
  team_text: string
  tags: string[]
  created_at: string
}

export function ShowdownTeamsSection({ userId }: { userId: string }) {
  const [teams, setTeams] = useState<ShowdownTeam[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserClient()

  useEffect(() => {
    loadTeams()
  }, [userId])

  async function loadTeams() {
    const { data, error } = await supabase
      .from("showdown_teams")
      .select("*")
      .eq("coach_id", userId) // Assuming coach_id links to user
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error loading teams:", error)
    } else {
      setTeams(data || [])
    }
    setLoading(false)
  }

  async function deleteTeam(teamId: string) {
    if (!confirm("Are you sure you want to delete this team?")) return

    const { error } = await supabase
      .from("showdown_teams")
      .delete()
      .eq("id", teamId)

    if (error) {
      toast.error("Failed to delete team")
    } else {
      toast.success("Team deleted")
      loadTeams()
    }
  }

  if (loading) {
    return <div>Loading teams...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>📋 Showdown Teams</CardTitle>
      </CardHeader>
      <CardContent>
        {teams.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No Showdown teams saved yet</p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/teams/builder">Create Your First Team</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {teams.map((team) => (
              <div
                key={team.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{team.team_name}</span>
                    {team.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Created {formatDistanceToNow(new Date(team.created_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <Link href={`/teams/builder?team=${team.id}`}>
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteTeam(team.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

#### **3.3 Update Profile Page**

**File**: `app/profile/page.tsx` (additions)

```typescript
// Add imports
import { CoachCard } from "@/components/profile/coach-card"
import { ShowdownTeamsSection } from "@/components/profile/showdown-teams-section"

// In component, add after existing tabs:
{profile.role === "coach" && (
  <div className="space-y-4">
    <CoachCard 
      team={currentTeam} // Fetch from teams table
      userId={profile.id}
    />
    <ShowdownTeamsSection userId={profile.id} />
  </div>
)}
```

---

## 🎨 UI/UX Design Specifications

### **Profile Page Layout**

```
┌─────────────────────────────────────────────────┐
│  Profile Header                                 │
│  [Avatar] [Name] [Role Badge]                  │
└─────────────────────────────────────────────────┘
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │  🎮 Coach Card                            │ │
│  │  ────────────────────────────────────────  │ │
│  │  [Team Avatar] [Upload Avatar]            │ │
│  │  Team Name: [Team Name] [Edit]           │ │
│  │  Record: 5-3 | Diff: +12 | Kanto Div     │ │
│  │  [View Team Page]                        │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │  📋 Showdown Teams                        │ │
│  │  ────────────────────────────────────────  │ │
│  │  [Gen 9 OU] My Team                       │ │
│  │  Created 2 days ago                       │ │
│  │  [View] [Delete]                          │ │
│  │  ────────────────────────────────────────  │ │
│  │  [Gen 9 VGC] Tournament Team              │ │
│  │  Created 1 week ago                       │ │
│  │  [View] [Delete]                          │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  [Existing Tabs: General, Permissions, Activity]│
└─────────────────────────────────────────────────┘
```

---

## 🔧 Implementation Phases

### **Phase 1: Database & Core Functions** (2-3 hours)
- [ ] Add `avatar_url` and `banner_url` to teams table
- [ ] Create `assign_coach_to_team` database function
- [ ] Test function with sample data

### **Phase 2: Discord Bot Integration** (3-4 hours)
- [ ] Create `discord-bot-service.ts`
- [ ] Implement `guildMemberUpdate` handler
- [ ] Create `coach-assignment.ts` helper
- [ ] Test role change → coach assignment flow

### **Phase 3: Profile Page Components** (4-5 hours)
- [ ] Create `CoachCard` component
- [ ] Create `ShowdownTeamsSection` component
- [ ] Update profile page to include coach card
- [ ] Add team data fetching logic

### **Phase 4: File Upload Integration** (2-3 hours)
- [ ] Integrate `FileDropzone` into `CoachCard`
- [ ] Create API route for team avatar upload
- [ ] Test upload flow

### **Phase 5: Testing & Polish** (2-3 hours)
- [ ] Test complete user flow
- [ ] Test Discord role change automation
- [ ] Add error handling and loading states
- [ ] Mobile responsiveness

**Total Estimated Time**: 13-18 hours

---

## 🚀 Next Steps

1. **Review this plan** - Confirm approach and priorities
2. **Start with Phase 1** - Database changes are foundational
3. **Test Discord bot** - Ensure role change detection works
4. **Build UI components** - Coach card and Showdown teams section
5. **Integrate everything** - Connect all pieces together

---

## 📚 Related Documentation

- `docs/DISCORD-ROLE-SYNC-SETUP.md` - Discord role sync configuration
- `docs/RBAC-ANALYSIS-AND-DISCORD-SYNC.md` - Role-based access control
- `USER-WORKFLOW.md` - Current user workflow documentation

---

**Ready to implement?** Let me know if you'd like me to start with Phase 1 (database changes) or if you have any questions about the plan!
