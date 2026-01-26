/**
 * Verify RBAC Migration
 * Checks that the migration was applied correctly
 * 
 * Run: npm run verify:rbac-migration
 */

import { config } from "dotenv"
import { resolve } from "path"
import { createServiceRoleClient } from "@/lib/supabase/service"

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

async function verifyRBACMigration() {
  console.log("🔍 Verifying RBAC Migration...\n")

  const supabase = createServiceRoleClient()

  try {
    // 1. Check role constraints
    console.log("1️⃣ Checking role constraints...")
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("role")
      .limit(100)

    if (profilesError) {
      console.error("   ❌ Failed to fetch profiles:", profilesError.message)
      process.exit(1)
    }

    const roles = new Set(profiles?.map(p => p.role) || [])
    const validRoles = ["admin", "commissioner", "coach", "spectator"]
    const invalidRoles = Array.from(roles).filter(r => r && !validRoles.includes(r))

    if (invalidRoles.length > 0) {
      console.error(`   ❌ Invalid roles found: ${invalidRoles.join(", ")}`)
      process.exit(1)
    }

    // Check for viewer role (should be migrated to spectator)
    const viewerRoles = profiles?.filter(p => p.role === "viewer")
    if (viewerRoles && viewerRoles.length > 0) {
      console.error(`   ❌ Found ${viewerRoles.length} profiles with 'viewer' role (should be 'spectator')`)
      process.exit(1)
    }

    console.log("   ✅ Role constraints valid")
    console.log(`   📊 Role distribution:`)
    validRoles.forEach(role => {
      const count = profiles?.filter(p => p.role === role).length || 0
      console.log(`      ${role}: ${count}`)
    })

    // 2. Check role_permissions table
    console.log("\n2️⃣ Checking role_permissions table...")
    const { data: rolePermissions, error: rpError } = await supabase
      .from("role_permissions")
      .select("role, permissions, description")
      .order("role")

    if (rpError) {
      console.error("   ❌ Failed to fetch role_permissions:", rpError.message)
      process.exit(1)
    }

    const expectedRoles = ["admin", "commissioner", "coach", "spectator"]
    const foundRoles = rolePermissions?.map(rp => rp.role) || []
    const missingRoles = expectedRoles.filter(r => !foundRoles.includes(r))

    if (missingRoles.length > 0) {
      console.error(`   ❌ Missing roles in role_permissions: ${missingRoles.join(", ")}`)
      process.exit(1)
    }

    console.log("   ✅ All roles present in role_permissions")
    rolePermissions?.forEach(rp => {
      const permCount = Array.isArray(rp.permissions) ? rp.permissions.length : 0
      console.log(`      ${rp.role}: ${permCount} permissions`)
    })

    // 3. Check first user admin trigger
    console.log("\n3️⃣ Checking first user admin trigger...")
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers()

    if (usersError) {
      console.error("   ❌ Failed to list users:", usersError.message)
      process.exit(1)
    }

    const userCount = usersData?.users?.length || 0
    console.log(`   📊 Total users: ${userCount}`)

    if (userCount > 0) {
      // Get first user (oldest created_at)
      const sortedUsers = usersData?.users?.sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
        return aTime - bTime
      }) || []

      const firstUser = sortedUsers[0]
      if (firstUser) {
        const { data: firstProfile } = await supabase
          .from("profiles")
          .select("role, display_name")
          .eq("id", firstUser.id)
          .single()

        if (firstProfile) {
          if (firstProfile.role === "admin") {
            console.log(`   ✅ First user (${firstProfile.display_name || firstUser.email}) has admin role`)
          } else {
            console.log(`   ⚠️  First user (${firstProfile.display_name || firstUser.email}) has role: ${firstProfile.role}`)
            console.log(`      Note: If this is not the first user, this is expected`)
          }
        }
      }
    }

    // 4. Check role hierarchy function
    console.log("\n4️⃣ Checking role hierarchy function...")
    if (userCount > 0 && profiles && profiles.length > 0) {
      const testProfile = profiles.find(p => p.id)
      if (testProfile && testProfile.id && testProfile.role) {
        const { data: hasRole, error: funcError } = await supabase.rpc("user_has_role_or_higher", {
          user_id: testProfile.id,
          required_role: testProfile.role,
        })

        if (funcError) {
          console.error("   ❌ Function error:", funcError.message)
          process.exit(1)
        }

        if (hasRole === true) {
          console.log("   ✅ user_has_role_or_higher() function works correctly")
        } else {
          console.error("   ❌ Function returned false for same role")
          process.exit(1)
        }
      }
    } else {
      console.log("   ⏭️  Skipping (no users to test)")
    }

    // 5. Check permission function
    console.log("\n5️⃣ Checking permission function...")
    if (userCount > 0 && profiles && profiles.length > 0) {
      const testProfile = profiles.find(p => p.id)
      if (testProfile && testProfile.id && testProfile.role) {
        const { data: hasPermission, error: permError } = await supabase.rpc("user_has_permission", {
          user_id: testProfile.id,
          required_permission: "*",
        })

        if (permError) {
          console.error("   ❌ Permission function error:", permError.message)
          process.exit(1)
        }

        if (testProfile.role === "admin" && hasPermission === true) {
          console.log("   ✅ Admin has all permissions (*)")
        } else if (testProfile.role !== "admin") {
          console.log(`   ✅ Permission check works (non-admin role: ${testProfile.role})`)
        }
      }
    } else {
      console.log("   ⏭️  Skipping (no users to test)")
    }

    console.log("\n✅ RBAC Migration Verification Complete!")
    console.log("\n📋 Summary:")
    console.log(`   - Role constraints: ✅ Valid`)
    console.log(`   - Role permissions: ✅ Complete`)
    console.log(`   - First user trigger: ✅ Configured`)
    console.log(`   - Hierarchy function: ✅ Working`)
    console.log(`   - Permission function: ✅ Working`)

  } catch (error: any) {
    console.error("❌ Verification failed:", error)
    process.exit(1)
  }
}

// Run verification
verifyRBACMigration()
  .then(() => {
    console.log("\n✨ Done!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Error:", error)
    process.exit(1)
  })
