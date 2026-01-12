# Pokemon Draft League - User Workflow Documentation

## Complete User Journey: Authentication to Discord to In-App Usage

---

## Overview

This document describes the complete user experience from initial registration through Discord integration to full app functionality within the Pokemon Draft League application.

---

## 1. Initial User Registration & Authentication

### Step 1.1: Landing Page Discovery
**User arrives at**: `https://your-app.vercel.app`

**Experience**:
- Hero section: "Average at Best Draft League"
- Stats overview: Total teams, matches played, top performers
- Recent match results preview
- Call-to-action buttons: "View Standings" and "Match Schedule"

**Available Actions** (Unauthenticated):
- Browse standings (read-only)
- View team rosters (read-only)
- Check match schedule (read-only)
- View playoff bracket (read-only)
- Browse MVP leaderboard (read-only)
- Read Pokedex information (without AI assistant)

**Restricted Actions** (Require Auth):
- Submit match results
- Build teams with draft budget
- Access admin dashboard
- Use AI features (chat, coach, weekly recaps)
- View insights and predictions

### Step 1.2: User Clicks "Login" or Accesses Protected Route
**Navigation**: User clicks "Admin" link or "Submit Match" → Redirected to `/auth/login`

**Login Page Components**:
```
┌────────────────────────────────────────┐
│  Average at Best Draft League Logo     │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  Sign in to your account         │ │
│  │                                  │ │
│  │  [Continue with Discord]  ←─────┼─┼── Primary CTA
│  │                                  │ │
│  │  ─────────── OR ───────────      │ │
│  │                                  │ │
│  │  Email: [________________]       │ │
│  │  Password: [____________]        │ │
│  │  [ ] Remember me                 │ │
│  │                                  │ │
│  │  [Sign In with Email]            │ │
│  │                                  │ │
│  │  Don't have an account? Sign up  │ │
│  └──────────────────────────────────┘ │
└────────────────────────────────────────┘
```

**Powered by**: `components/auth/supabase-auth-ui.tsx` (Supabase UI Library)

### Step 1.3: Discord OAuth Flow (Recommended Path)

**Flow Sequence**:
```
User clicks "Continue with Discord"
   ↓
Supabase Auth initiates OAuth
   ↓
Redirect to Discord OAuth consent page
   ↓
User authorizes app permissions:
  - Identify user (email, username, avatar)
  - Read server roles
   ↓
Discord returns authorization code
   ↓
Supabase exchanges code for Discord user data
   ↓
Supabase creates/updates user record
   ↓
User redirected back to app with session cookie
   ↓
Middleware verifies session
   ↓
User lands on homepage (now authenticated)
```

**Technical Details**:
- OAuth Provider: Discord
- Scopes: `identify`, `email`, `guilds.members.read`
- Redirect URI: `https://your-app.vercel.app/auth/callback`
- Session stored in HTTP-only cookie
- Session duration: 7 days (refreshable)

### Step 1.4: First-Time User Profile Setup

**Automatic Actions**:
1. Supabase creates user in `auth.users` table
2. Trigger creates profile in `public.profiles` table:
   ```sql
   INSERT INTO profiles (id, discord_id, discord_username, avatar_url, role)
   VALUES (user.id, metadata->>'provider_id', metadata->>'username', metadata->>'avatar_url', 'viewer')
   ```
3. Default role assigned: `viewer` (read-only access)

**Profile Data Captured**:
- User ID (Supabase auth UUID)
- Discord ID (provider ID)
- Discord username
- Discord discriminator
- Avatar URL
- Email
- Created timestamp

---

## 2. Discord Integration & Role Sync

### Step 2.1: User Joins Discord Server

**Discord Server**: "Average at Best Draft League"
**Server ID**: Configured in `DISCORD_GUILD_ID` environment variable

**When user joins server**:
1. Discord bot detects `guildMemberAdd` event
2. Bot fetches user's Supabase profile via Discord ID lookup
3. Bot checks if user has app account:
   - **Yes**: Sync Discord roles to app
   - **No**: Welcome message with app signup link

### Step 2.2: Role Synchronization (Discord → App)

**Discord Bot Command** (automatic on join):
```typescript
// In lib/discord-bot.ts
async function syncUserRoles(discordUserId: string) {
  // 1. Fetch user from Supabase by discord_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('discord_id', discordUserId)
    .single()

  // 2. Fetch Discord server member
  const member = await guild.members.fetch(discordUserId)
  
  // 3. Map Discord roles to app roles
  const appRole = determineAppRole(member.roles.cache)
  
  // 4. Update Supabase profile
  await supabase
    .from('profiles')
    .update({ role: appRole })
    .eq('id', profile.id)
}
```

**Role Mapping Logic**:
```
Discord Role              → App Role
─────────────────────────────────────
@Commissioner            → admin
@League Admin            → admin
@Coach                   → coach
@Spectator               → viewer
(no special role)        → viewer
```

**Automatic Sync Triggers**:
- User joins Discord server
- User's Discord roles change
- User logs into app (checks for role drift)
- Manual sync via `/sync-roles` command

### Step 2.3: Discord Bot Commands Available to Users

**Public Commands** (all authenticated users):
```
/matchups week:<number>
  → Shows week's matchups with teams and coaches

/standings
  → Displays current league standings (top 10)

/schedule
  → Shows upcoming matches for current week

/pokemon name:<pokemon-name>
  → Lookup Pokemon stats and info via Pokedex

/my-team
  → Shows user's team (if they are a coach)
```

**Coach Commands** (role: coach):
```
/submit-result
  → Opens result submission form (Discord modal or web link)
  
/my-roster
  → Shows detailed roster with Pokemon and draft costs

/trade-request team:<team> offer:<pokemon>
  → Initiates trade request
```

**Admin Commands** (role: admin):
```
/create-match week:<number> team1:<name> team2:<name>
  → Creates a scheduled match

/approve-trade trade-id:<id>
  → Approves pending trade

/sync-roles
  → Manually syncs all Discord roles to app

/recap week:<number>
  → Generates AI-powered weekly recap and posts to channel

/broadcast message:<text>
  → Sends announcement to all coaches
```

---

## 3. In-App User Experience by Role

### 3.1: Viewer (Default Role)

**Access Level**: Read-only

**Available Features**:
- View all public pages:
  - Homepage with stats overview
  - League standings (sortable, filterable)
  - Team directory and individual team pages
  - Match schedule (past and upcoming)
  - Playoff bracket visualization
  - MVP leaderboard
  - Pokedex (without AI assistant)

**Restricted Features**:
- Cannot submit match results
- Cannot access admin dashboard
- Cannot use AI features (coach, recaps, predictions)
- Cannot build teams or access team builder
- Cannot view insights dashboard

**User Sees**:
- Banner prompts: "Join as a coach to build your team!"
- Disabled buttons with tooltip: "Coach access required"

### 3.2: Coach (Assigned to Team)

**Access Level**: Team management + standard features

**How Role is Granted**:
1. Commissioner assigns coach to a team in admin panel
2. Coach Discord role added in Discord server
3. Role sync updates app profile: `role = 'coach'`
4. Coach linked to team: `profiles.team_id = <team_id>`

**Available Features** (in addition to Viewer):

**Team Management**:
- `/teams/builder` - Team builder with draft budget
  - View available Pokemon with costs
  - Add/remove Pokemon from roster
  - See remaining draft points
  - Type coverage analysis
  - Moveset recommendations

**Match Participation**:
- `/matches/submit` - Submit match results
  - Select opponent
  - Enter scores (wins/losses)
  - Calculate differential (KOs)
  - Optional: Add replay link
  - AI parse from Discord text

**AI Features**:
- `/pokedex` - AI assistant tab for strategy questions
- Request coaching advice via `/insights`
- View personalized team insights

**Battle System**:
- Create official battles via `/api/battle/create`
- Play turn-by-turn battles with AI or human opponents

**Profile**:
- View personal dashboard
- See team performance stats
- Track season progress

### 3.3: Commissioner (Admin Role)

**Access Level**: Full control

**How Role is Granted**:
1. Manually set in Supabase: `UPDATE profiles SET role = 'admin' WHERE id = '...'`
2. Or assigned via Discord role sync (if has @Commissioner role)

**Available Features** (in addition to Coach):

**Admin Dashboard** (`/admin`):
- Overview statistics (teams, matches, users)
- Quick action cards:
  - Sync Google Sheets
  - View users
  - Manage matches
  - Configure settings

**Platform Kit Integration**:
- **Database Tab**:
  - AI-powered SQL query generator (natural language → SQL)
  - Execute queries directly
  - View/edit data in tables
  - Export results

- **Auth Tab**:
  - Configure OAuth providers (Discord, Google, etc.)
  - Set redirect URLs
  - Manage auth settings

- **Users Tab**:
  - View all registered users
  - See Discord linkage
  - Manually assign roles
  - Ban/unban users

- **Storage Tab**:
  - Manage file uploads (team logos, replay files)
  - Set bucket policies
  - View storage usage

- **Secrets Tab**:
  - View/edit environment variables
  - Add API keys (OpenAI, Discord, Google)
  - Manage integration secrets

- **Logs Tab**:
  - Real-time Supabase logs
  - Filter by event type
  - Debug issues

**Match Management**:
- Approve/reject submitted results
- Edit match scores
- Resolve disputes
- Mark matches as official

**Team Management**:
- Create/edit teams
- Assign coaches to teams
- Adjust draft budgets
- Override roster rules

**Draft Management**:
- Configure draft settings (point costs, tiers)
- Run live draft sessions
- Audit draft history

**Discord Bot Control**:
- Manage bot commands
- Create/edit Discord roles programmatically
- Send bulk announcements
- Configure role-permission mapping

**AI Administration**:
- Generate league-wide weekly recaps
- Trigger insight generation for all teams
- Configure AI model selection (GPT-4 vs GPT-5)
- View AI usage and costs

**Google Sheets Sync**:
- One-click sync from master spreadsheet
- View sync logs and errors
- Configure column mapping
- Export app data back to sheets

---

## 4. Detailed Feature Workflows

### 4.1: Coach Submits Match Result

**Scenario**: Coach wants to submit result for Week 5 match

**Workflow**:
```
1. Coach navigates to /matches/submit

2. Form loads with:
   - Week selector (dropdown)
   - Team A selector (auto-populated with coach's team)
   - Team B selector (opponent from schedule)
   - Score inputs (Team A score, Team B score)
   - Differential (auto-calculated)
   - Optional replay link
   - Optional notes

3. Coach can either:
   Option A: Manual entry
     - Fill out form fields
     - Click "Submit Result"
   
   Option B: AI-powered parsing
     - Click "Paste from Discord"
     - Paste Discord message: "Week 5: Detroit Drakes beat Grand Rapids Garchomp 6-4"
     - AI parses and fills form
     - Coach reviews and confirms

4. On submit:
   - POST to /api/matches/submit
   - Validates team IDs and scores
   - Creates match record with status: 'pending'
   - Sends Discord webhook notification to commissioner channel
   - Shows success toast: "Result submitted for review"

5. Commissioner reviews in admin panel:
   - Approves → status: 'completed', standings update
   - Rejects → status: 'disputed', notifies coach
```

**Technical Flow**:
```typescript
// Client: app/matches/submit/page.tsx
async function handleSubmit(formData) {
  const response = await fetch('/api/matches/submit', {
    method: 'POST',
    body: JSON.stringify({
      week: formData.week,
      team1_id: formData.team1_id,
      team2_id: formData.team2_id,
      team1_score: formData.team1_score,
      team2_score: formData.team2_score,
      differential: Math.abs(formData.team1_score - formData.team2_score),
      replay_url: formData.replay_url,
      submitted_by: user.id
    })
  })
}

// Server: app/api/matches/submit/route.ts
export async function POST(request: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Verify user is a coach
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, team_id')
    .eq('id', user.id)
    .single()
  
  if (profile.role !== 'coach' && profile.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  
  // Create match record
  const { data: match } = await supabase
    .from('matches')
    .insert({ ...matchData, status: 'pending' })
    .select()
    .single()
  
  // Send Discord notification
  await sendDiscordWebhook({
    content: `New match result submitted by ${profile.discord_username}`,
    embeds: [{
      title: `Week ${matchData.week} Result`,
      fields: [
        { name: 'Team 1', value: `${team1.name}: ${matchData.team1_score}` },
        { name: 'Team 2', value: `${team2.name}: ${matchData.team2_score}` }
      ]
    }]
  })
  
  return NextResponse.json({ success: true, match })
}
```

### 4.2: User Asks AI Pokedex Question

**Scenario**: User wants strategy advice for Gengar

**Workflow**:
```
1. User navigates to /pokedex

2. Searches for "Gengar" in search bar
   - Results show: Gengar card with stats, types, abilities

3. Clicks "AI Assistant" tab

4. Types question: "What's a good moveset for Gengar in Gen 9 OU?"

5. AI Flow:
   - POST to /api/ai/pokedex
   - GPT-4.1 receives question
   - Model calls function: get_pokemon("gengar")
   - Backend fetches cached Gengar data from Supabase
   - Returns stats, moves, abilities to model
   - Model synthesizes grounded answer
   - Response streams back to client

6. User sees answer:
   "Based on Gengar's stats and available moves in Gen 9 OU:
   
   Moveset:
   - Shadow Ball (STAB ghost move)
   - Sludge Bomb (STAB poison move)
   - Focus Blast (coverage vs dark/steel)
   - Substitute/Hex (utility)
   
   Ability: Levitate (immunity to ground)
   Nature: Timid (max speed)
   EVs: 252 SpA / 4 SpD / 252 Spe"

7. User can ask follow-up questions
```

**Technical Flow**:
```typescript
// Client: app/pokedex/page.tsx
async function askQuestion(question: string) {
  const response = await fetch('/api/ai/pokedex', {
    method: 'POST',
    body: JSON.stringify({ question, pokemon_name: 'gengar' })
  })
  
  const reader = response.body.getReader()
  // Stream response tokens
}

// Server: app/api/ai/pokedex/route.ts
export async function POST(request: Request) {
  const { question, pokemon_name } = await request.json()
  
  // Call OpenAI with function calling
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4.1',
      messages: [
        { role: 'system', content: 'You are a Pokedex assistant. Use tools for facts.' },
        { role: 'user', content: question }
      ],
      tools: [{
        type: 'function',
        function: {
          name: 'get_pokemon',
          description: 'Fetch Pokemon data',
          parameters: {
            type: 'object',
            properties: {
              pokemon_name: { type: 'string' }
            }
          }
        }
      }]
    })
  })
  
  // If model calls function, execute and return result
  // Stream final answer back to client
}
```

### 4.3: Commissioner Generates Weekly Recap

**Scenario**: Week 5 just finished, commissioner wants AI recap

**Workflow**:
```
1. Commissioner navigates to /insights

2. Sees "Generate Weekly Recap" section

3. Clicks "Generate Recap for Week 5"

4. AI Flow (GPT-5.2):
   - POST to /api/ai/weekly-recap
   - Fetch week 5 match results from Supabase
   - Fetch standings changes (before/after week 5)
   - Fetch top performers (highest KOs this week)
   - Fetch streak data (teams on win/loss streaks)
   - Pass all data to GPT-5.2 as structured JSON
   - Model generates narrative recap

5. Recap appears on page:
   "Week 5 Recap: Upset City
   
   The Detroit Drakes shocked the league with a dominant 7-2 victory over 
   previously undefeated Grand Rapids Garchomp, led by Salamence's 4 KOs...
   
   Standings Shakeup:
   - Detroit jumps from 8th to 4th
   - Grand Rapids drops to 2nd
   
   Hot Streak Alert:
   - Cleveland Charizards extend win streak to 5
   
   MVP Race:
   - Garchomp still leads with 42 total KOs
   - But Salamence closing gap (38 KOs)
   
   Next Week Preview:
   - Cleveland vs Detroit (battle of hot teams)
   - Grand Rapids seeks bounce-back vs Columbus"

6. Commissioner options:
   - [Post to Discord] - Sends recap to #announcements channel
   - [Copy to Clipboard]
   - [Regenerate] - Generate new version
   - [Edit] - Manually adjust before posting

7. On "Post to Discord":
   - Discord webhook sends formatted embed
   - Recap saved to database for archives
```

### 4.4: Discord Role Change Syncs to App

**Scenario**: Commissioner promotes a spectator to coach in Discord

**Workflow**:
```
1. In Discord server, commissioner right-clicks user "JohnDoe#1234"

2. Selects "Roles" → Adds @Coach role

3. Discord fires roleUpdate event

4. Discord bot detects event:
   - Event: guildMemberUpdate
   - User: JohnDoe#1234 (Discord ID: 123456789)
   - Roles added: @Coach (role ID: 987654321)

5. Bot calls syncUserRoles(discordId):
   - Query Supabase: SELECT * FROM profiles WHERE discord_id = '123456789'
   - Determine new app role based on Discord roles
   - Discord @Coach role → app role 'coach'
   - UPDATE profiles SET role = 'coach' WHERE discord_id = '123456789'

6. Bot sends DM to user:
   "🎉 You've been promoted to Coach! You now have access to:
   - Team builder
   - Match submission
   - AI coaching features
   
   Visit the app to get started: [Link]"

7. Next time user opens app:
   - Middleware checks session
   - Fetches updated profile (role = 'coach')
   - User now sees coach features unlocked
```

---

## 5. Navigation Flow Map

```
Homepage (/)
├─ [View Standings] → /standings
│  ├─ [Team Name Click] → /teams/[id]
│  └─ [Back to Home]
├─ [Match Schedule] → /schedule
│  ├─ [Week Tab Click] → Filters matches
│  └─ [Match Click] → Match details modal
├─ [Playoff Bracket] → /playoffs
├─ [MVP Leaderboard] → /mvp
├─ [Pokedex] → /pokedex
│  ├─ [Search Pokemon] → Pokemon details
│  └─ [AI Assistant] → Ask questions (requires auth)
└─ [Admin] → /admin (requires auth)
   ├─ Platform Kit tabs
   └─ Management tools

Header Navigation (always visible):
├─ Home
├─ Standings
├─ Teams → /teams
│  └─ Team Builder (coach only) → /teams/builder
├─ Schedule
├─ Playoffs
├─ MVP
├─ Matches (coach/admin only) → /matches
│  └─ Submit Result → /matches/submit
├─ Insights (coach/admin only) → /insights
├─ Pokedex
└─ Admin (admin only)
```

---

## 6. Real-Time Features (Supabase Realtime)

### 6.1: Online Presence (Avatar Stack)

**Where**: All pages (top-right corner)

**Behavior**:
- Shows avatars of currently online users
- Updates in real-time as users join/leave
- Hover shows username
- Max 5 avatars visible ("+3 more" indicator)

**Technical**:
```typescript
// components/realtime/realtime-avatar-stack.tsx
const channel = supabase.channel('presence')

channel
  .on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState()
    setOnlineUsers(Object.values(state).flat())
  })
  .subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      channel.track({ user_id: user.id, username: profile.discord_username })
    }
  })
```

### 6.2: Collaborative Cursors (Admin Dashboard)

**Where**: Admin dashboard (Platform Kit database tab)

**Behavior**:
- See other admins' cursors in real-time
- Color-coded per user
- Shows username label above cursor
- "Google Docs-style" collaboration indicator

**Use Case**: Multiple commissioners editing match results simultaneously

### 6.3: Real-Time Chat (Match Pages)

**Where**: Individual match pages, draft sessions

**Behavior**:
- Live chat widget in sidebar
- Messages appear instantly
- Typing indicators
- Persistent message history

**Use Case**: Coaches can discuss matches, strategies, or coordinate trades

---

## 7. Mobile Experience

### Responsive Breakpoints:
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

### Mobile-Specific Features:
- Collapsible navigation menu (hamburger icon)
- Simplified tables (horizontal scroll or stacked cards)
- Touch-optimized buttons and tap targets
- Bottom navigation bar for key actions
- Swipe gestures for tabs (standings, schedule)

### Mobile-Optimized Pages:
- Homepage: Stacked stat cards
- Standings: Swipeable division tabs
- Schedule: Weekly carousel view
- Team Builder: Vertical Pokemon list with sticky budget bar

---

## 8. Notification System

### In-App Toasts (Sonner):
- Success: "Match result submitted successfully"
- Error: "Failed to sync roles. Please try again"
- Info: "New week started. Check your matchup!"
- Warning: "Draft budget exceeded by 5 points"

### Discord Notifications (Webhook):
- Match result submitted → #results channel
- Trade request → #trades channel
- Weekly recap → #announcements channel
- New user joined → #welcome channel
- Role change → DM to user

### Email Notifications (Future):
- Match scheduled
- Result approved/disputed
- Trade offer received
- Weekly recap digest

---

## 9. Error Handling & Edge Cases

### Session Expiration:
**Scenario**: User's session expires while browsing

**Behavior**:
1. Middleware detects invalid/expired session
2. Redirects to `/auth/login` with return URL
3. Banner shows: "Your session expired. Please log in again."
4. After login, user returns to original page

### Role Mismatch:
**Scenario**: User has coach role in Discord but viewer in app

**Behavior**:
1. On next login, middleware checks role drift
2. Triggers automatic role sync
3. Updates profile in database
4. Refreshes page with new permissions

### Offline Mode:
**Scenario**: User loses internet connection

**Behavior**:
- Read-only cached data remains visible
- Forms disable with message: "Offline. Changes will sync when online."
- Supabase Realtime features pause
- Reconnects automatically when online

### Discord Bot Offline:
**Scenario**: Bot crashes or server restarts

**Behavior**:
- App continues functioning (bot is supplementary)
- Role syncs queue and process when bot reconnects
- Webhook notifications retry with exponential backoff
- Status indicator in admin panel shows bot health

---

## 10. User Workflow Summary by Role

### Viewer Journey:
```
Visit homepage
  → Browse public data (standings, schedule, rosters)
  → View Pokedex (basic lookup only)
  → See prompt to join as coach
  → Click "Login" if interested
```

### Coach Journey:
```
Login via Discord OAuth
  → Role syncs from Discord (@Coach role)
  → Dashboard shows team assignment
  → Access team builder
  → Add Pokemon to roster within budget
  → Check weekly matchup
  → Play official battle (or external)
  → Submit result via form or Discord parse
  → Track MVP race
  → Use AI Pokedex for strategy
  → View insights and predictions
```

### Commissioner Journey:
```
Login via Discord OAuth (admin role)
  → Access admin dashboard
  → Sync Google Sheets data (one-time or periodic)
  → Review submitted match results
  → Approve/dispute results
  → Manage teams and coaches
  → Use Platform Kit for database queries
  → Generate AI weekly recap
  → Post recap to Discord
  → Manage Discord roles via bot commands
  → Configure draft settings
  → Monitor app health via logs
```

---

## Conclusion

This workflow demonstrates a seamless integration between Discord community management and web application functionality. Users benefit from:

- Single sign-on via Discord OAuth
- Automatic role synchronization
- Bidirectional communication (web ↔ Discord)
- Real-time collaboration features
- AI-powered insights and automation

The system is designed to reduce administrative burden while providing a rich, interactive experience for league participants.
