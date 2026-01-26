"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Home,
  User,
  Users,
  Trophy,
  Calendar,
  BarChart3,
  Settings,
  LogOut,
  Sword,
  BookOpen,
  Sparkles,
  ClipboardList,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { getCurrentUserProfile, type UserProfile } from "@/lib/rbac"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import { ProfileSheet } from "@/components/profile/profile-sheet"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter()
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [profileSheetOpen, setProfileSheetOpen] = React.useState(false)

  React.useEffect(() => {
    async function loadUser() {
      const supabase = createClient()
      const profile = await getCurrentUserProfile(supabase)
      setUserProfile(profile)
      setLoading(false)
    }
    loadUser()
  }, [])

  // Dashboard-only navigation items (all routes must be within /dashboard/*)
  const navItems = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
      isActive: true,
      items: [
        {
          title: "Overview",
          url: "/dashboard",
        },
        {
          title: "My Stats",
          url: "/dashboard/stats",
        },
        {
          title: "Activity",
          url: "/dashboard/activity",
        },
      ],
    },
  ]

  // Add Teams section (all users - general/showdown teams)
  navItems.push({
    title: "Teams",
    url: "/dashboard/teams",
    icon: Users,
    items: [
      {
        title: "My Teams",
        url: "/dashboard/teams",
      },
      {
        title: "Team Library",
        url: "/dashboard/teams/library",
      },
      {
        title: "Create Team",
        url: "/dashboard/teams/create",
      },
      {
        title: "Team Builder",
        url: "/dashboard/teams/builder",
      },
    ],
  })

  // Add League Team section (coach-specific - drafted/league teams)
  // League teams are bound by rules, draft picks, and official competition
  if (userProfile?.role === "coach" && userProfile?.team_id) {
    navItems.push({
      title: "My League Team",
      url: "/dashboard/league-team",
      icon: Trophy,
      items: [
        {
          title: "View Team",
          url: "/dashboard/league-team",
        },
        {
          title: "Roster",
          url: "/dashboard/league-team/roster",
        },
        {
          title: "Free Agency",
          url: "/dashboard/free-agency",
        },
        {
          title: "Team Stats",
          url: "/dashboard/league-team/stats",
        },
      ],
    })
  }

  // Add Draft section (available to all users)
  navItems.push({
    title: "Draft",
    url: "/dashboard/draft",
    icon: ClipboardList,
    items: [
      {
        title: "Draft Planning",
        url: "/dashboard/draft",
      },
      {
        title: "Draft Board",
        url: "/dashboard/draft/board",
      },
      {
        title: "My Roster",
        url: "/dashboard/draft/roster",
      },
    ],
  })

  // Add calculator link (available to all users)
  navItems.push({
    title: "Damage Calculator",
    url: "/calc",
    icon: Sparkles,
  })

  // Add dashboard-specific items
  navItems.push(
    {
      title: "Weekly Matches",
      url: "/dashboard/weekly-matches",
      icon: Sword,
      items: [
        {
          title: "All Matches",
          url: "/dashboard/weekly-matches",
        },
        {
          title: "Submit Result",
          url: "/dashboard/weekly-matches/submit",
        },
        {
          title: "Match History",
          url: "/dashboard/weekly-matches/history",
        },
      ],
    },
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: Settings,
      items: [
        {
          title: "Account",
          url: "/dashboard/settings",
        },
        {
          title: "Notifications",
          url: "/dashboard/settings#notifications",
        },
        {
          title: "Preferences",
          url: "/dashboard/settings#preferences",
        },
      ],
    }
  )

  // Prepare user data for NavUser
  const userData = userProfile
    ? {
        name: userProfile.display_name || userProfile.discord_username || "Member",
        email: userProfile.discord_username || "",
        avatar: userProfile.avatar_url || userProfile.discord_avatar || "",
      }
    : {
        name: "Loading...",
        email: "",
        avatar: "",
      }

  // Prepare team data for TeamSwitcher (if coach)
  const teamData =
    userProfile?.role === "coach" && userProfile?.team_id
      ? [
          {
            name: userProfile.display_name || "My Team",
            logo: Trophy,
            plan: "Coach",
          },
        ]
      : []

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {teamData.length > 0 ? (
          <TeamSwitcher teams={teamData} />
        ) : (
          <div className="px-4 py-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <span className="font-semibold">POKE MNKY</span>
            </div>
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} onProfileClick={() => setProfileSheetOpen(true)} />
      </SidebarContent>
      <SidebarFooter>
        {!loading && <NavUser user={userData} onProfileClick={() => setProfileSheetOpen(true)} />}
      </SidebarFooter>
      <SidebarRail />
      <ProfileSheet open={profileSheetOpen} onOpenChange={setProfileSheetOpen} />
    </Sidebar>
  )
}
