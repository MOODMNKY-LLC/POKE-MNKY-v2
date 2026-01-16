# Priority 1.2: RLS Policy Testing and Validation Plan

**Date**: January 2026  
**Status**: Implementation Ready  
**Priority**: Critical Production Blocker  
**Estimated Effort**: 1 week

---

## Executive Summary

Row Level Security (RLS) policies are written but completely untested (0% tested). This represents a critical security risk - policies may be incorrectly configured, allowing unauthorized access or blocking legitimate operations. Without comprehensive testing, we cannot guarantee data security or proper access control.

This document provides a complete testing framework, test cases for all roles, automated testing scripts, and a validation checklist to ensure RLS policies work correctly before production deployment.

---

## Current State Analysis

### RLS Policies Inventory

Based on migration file analysis, the following tables have RLS enabled:

#### Core League Tables
1. **`teams`** - Public read, authenticated write (needs role-based restrictions)
2. **`matches`** - Public read, authenticated write (needs role-based restrictions)
3. **`team_rosters`** - Public read (needs coach restrictions for updates)
4. **`pokemon_stats`** - Public read, authenticated insert

#### User Management Tables
5. **`profiles`** - Public read, users can update own, admins can update any
6. **`role_permissions`** - Public read, admin-only modify
7. **`user_activity_log`** - Users view own, admins view all, authenticated insert

#### Draft System Tables
8. **`draft_pool`** - Authenticated read, service role write
9. **`draft_sessions`** - Authenticated read, service role write

#### Showdown Integration Tables
10. **`showdown_teams`** - Users view/update own teams

#### Pokepedia Tables (50+ tables)
11. All Pokepedia tables - Public read, service role write

### Identified Issues

1. **Teams Table**: Current policy allows ANY authenticated user to insert/update teams
   - **Risk**: Any user can modify any team
   - **Fix Needed**: Restrict to coaches of that team or admins/commissioners

2. **Matches Table**: Current policy allows ANY authenticated user to insert/update matches
   - **Risk**: Any user can modify match results
   - **Fix Needed**: Restrict to coaches in the match or admins/commissioners

3. **Team Rosters**: No update/delete policies
   - **Risk**: No way to update rosters through RLS
   - **Fix Needed**: Add policies for coaches to update own team rosters

4. **Missing Role Checks**: Policies don't check `profiles.role` field
   - **Risk**: Role-based access control not enforced
   - **Fix Needed**: Update policies to check role from profiles table

---

## Testing Framework

### Test Architecture

```
┌─────────────────────────────────────────────────────────┐
│              RLS TEST FRAMEWORK                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  1. Test User Creation                           │  │
│  │     - Create test users for each role            │  │
│  │     - viewer, coach, commissioner, admin        │  │
│  └──────────────────┬───────────────────────────────┘  │
│  ┌──────────────────┴───────────────────────────────┐  │
│  │  2. Test Matrix Execution                        │  │
│  │     - For each table × role × operation          │  │
│  │     - Test SELECT, INSERT, UPDATE, DELETE        │  │
│  └──────────────────┬───────────────────────────────┘  │
│  ┌──────────────────┴───────────────────────────────┐  │
│  │  3. Assertion & Reporting                        │  │
│  │     - Verify expected access granted/denied      │  │
│  │     - Generate test report                      │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Test User Setup

Create test users for each role:
- `test-viewer@example.com` - Role: viewer
- `test-coach@example.com` - Role: coach (with team_id)
- `test-commissioner@example.com` - Role: commissioner
- `test-admin@example.com` - Role: admin

---

## Implementation Plan

### Phase 1: Test Infrastructure Setup (Day 1-2)

#### Step 1.1: Create Test Utilities

Create `scripts/test-rls-policies.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

interface TestUser {
  email: string;
  password: string;
  role: 'viewer' | 'coach' | 'commissioner' | 'admin';
  teamId?: string;
}

interface TestResult {
  table: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  role: string;
  expected: 'ALLOW' | 'DENY';
  actual: 'ALLOW' | 'DENY';
  passed: boolean;
  error?: string;
}

export class RLSTestFramework {
  private supabase: ReturnType<typeof createClient>;
  private testUsers: Map<string, ReturnType<typeof createClient>> = new Map();
  private results: TestResult[] = [];

  constructor(supabaseUrl: string, serviceRoleKey: string) {
    this.supabase = createClient(supabaseUrl, serviceRoleKey);
  }

  /**
   * Create test users with different roles
   */
  async setupTestUsers(): Promise<void> {
    const testUsers: TestUser[] = [
      { email: 'test-viewer@example.com', password: 'test-password-123', role: 'viewer' },
      { email: 'test-coach@example.com', password: 'test-password-123', role: 'coach' },
      { email: 'test-commissioner@example.com', password: 'test-password-123', role: 'commissioner' },
      { email: 'test-admin@example.com', password: 'test-password-123', role: 'admin' },
    ];

    for (const user of testUsers) {
      // Create auth user
      const { data: authUser, error: authError } = await this.supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
      });

      if (authError) {
        console.error(`Failed to create user ${user.email}:`, authError);
        continue;
      }

      // Update profile with role
      const { error: profileError } = await this.supabase
        .from('profiles')
        .update({ role: user.role })
        .eq('id', authUser.user.id);

      if (profileError) {
        console.error(`Failed to update profile for ${user.email}:`, profileError);
        continue;
      }

      // Create Supabase client for this user
      const userClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // Sign in as this user
      const { data: signInData, error: signInError } = await userClient.auth.signInWithPassword({
        email: user.email,
        password: user.password,
      });

      if (signInError) {
        console.error(`Failed to sign in ${user.email}:`, signInError);
        continue;
      }

      this.testUsers.set(user.role, userClient);
      console.log(`✅ Created test user: ${user.email} (${user.role})`);
    }
  }

  /**
   * Test a specific operation on a table
   */
  async testOperation(
    table: string,
    operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
    role: string,
    expected: 'ALLOW' | 'DENY',
    testData?: any
  ): Promise<TestResult> {
    const client = this.testUsers.get(role);
    if (!client) {
      return {
        table,
        operation,
        role,
        expected,
        actual: 'DENY',
        passed: false,
        error: 'Test user not found',
      };
    }

    let error: string | undefined;
    let allowed = false;

    try {
      switch (operation) {
        case 'SELECT':
          const { error: selectError } = await client.from(table).select('*').limit(1);
          allowed = !selectError;
          error = selectError?.message;
          break;

        case 'INSERT':
          const { error: insertError } = await client.from(table).insert(testData || {});
          allowed = !insertError;
          error = insertError?.message;
          break;

        case 'UPDATE':
          const { error: updateError } = await client
            .from(table)
            .update(testData || {})
            .limit(1);
          allowed = !updateError;
          error = updateError?.message;
          break;

        case 'DELETE':
          const { error: deleteError } = await client.from(table).delete().limit(1);
          allowed = !deleteError;
          error = deleteError?.message;
          break;
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      allowed = false;
    }

    const actual = allowed ? 'ALLOW' : 'DENY';
    const passed = actual === expected;

    const result: TestResult = {
      table,
      operation,
      role,
      expected,
      actual,
      passed,
      error: !passed ? error : undefined,
    };

    this.results.push(result);
    return result;
  }

  /**
   * Run comprehensive test suite
   */
  async runTestSuite(): Promise<void> {
    console.log('\n🧪 Starting RLS Policy Test Suite...\n');

    // Test matrix: table × role × operation
    const testMatrix = [
      // Teams table
      { table: 'teams', role: 'viewer', operation: 'SELECT' as const, expected: 'ALLOW' as const },
      { table: 'teams', role: 'viewer', operation: 'INSERT' as const, expected: 'DENY' as const },
      { table: 'teams', role: 'viewer', operation: 'UPDATE' as const, expected: 'DENY' as const },
      { table: 'teams', role: 'coach', operation: 'SELECT' as const, expected: 'ALLOW' as const },
      { table: 'teams', role: 'coach', operation: 'INSERT' as const, expected: 'DENY' as const }, // Should only update own team
      { table: 'teams', role: 'commissioner', operation: 'SELECT' as const, expected: 'ALLOW' as const },
      { table: 'teams', role: 'commissioner', operation: 'UPDATE' as const, expected: 'ALLOW' as const },
      { table: 'teams', role: 'admin', operation: 'SELECT' as const, expected: 'ALLOW' as const },
      { table: 'teams', role: 'admin', operation: 'UPDATE' as const, expected: 'ALLOW' as const },

      // Matches table
      { table: 'matches', role: 'viewer', operation: 'SELECT' as const, expected: 'ALLOW' as const },
      { table: 'matches', role: 'viewer', operation: 'INSERT' as const, expected: 'DENY' as const },
      { table: 'matches', role: 'coach', operation: 'SELECT' as const, expected: 'ALLOW' as const },
      { table: 'matches', role: 'coach', operation: 'INSERT' as const, expected: 'DENY' as const }, // Should only submit own matches
      { table: 'matches', role: 'commissioner', operation: 'UPDATE' as const, expected: 'ALLOW' as const },
      { table: 'matches', role: 'admin', operation: 'UPDATE' as const, expected: 'ALLOW' as const },

      // Team Rosters table
      { table: 'team_rosters', role: 'viewer', operation: 'SELECT' as const, expected: 'ALLOW' as const },
      { table: 'team_rosters', role: 'viewer', operation: 'UPDATE' as const, expected: 'DENY' as const },
      { table: 'team_rosters', role: 'coach', operation: 'SELECT' as const, expected: 'ALLOW' as const },
      // Coach should only update own team rosters - needs specific test

      // Profiles table
      { table: 'profiles', role: 'viewer', operation: 'SELECT' as const, expected: 'ALLOW' as const },
      { table: 'profiles', role: 'viewer', operation: 'UPDATE' as const, expected: 'ALLOW' as const }, // Own profile
      { table: 'profiles', role: 'admin', operation: 'UPDATE' as const, expected: 'ALLOW' as const }, // Any profile

      // Role Permissions table
      { table: 'role_permissions', role: 'viewer', operation: 'SELECT' as const, expected: 'ALLOW' as const },
      { table: 'role_permissions', role: 'viewer', operation: 'UPDATE' as const, expected: 'DENY' as const },
      { table: 'role_permissions', role: 'admin', operation: 'UPDATE' as const, expected: 'ALLOW' as const },
    ];

    for (const test of testMatrix) {
      const result = await this.testOperation(
        test.table,
        test.operation,
        test.role,
        test.expected
      );

      const icon = result.passed ? '✅' : '❌';
      console.log(
        `${icon} ${test.table}.${test.operation} as ${test.role}: ${result.actual} (expected ${test.expected})`
      );
      if (!result.passed && result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }
  }

  /**
   * Generate test report
   */
  generateReport(): void {
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;

    console.log('\n' + '='.repeat(80));
    console.log('RLS POLICY TEST REPORT');
    console.log('='.repeat(80));
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} (${((passed / total) * 100).toFixed(1)}%)`);
    console.log(`Failed: ${failed} (${((failed / total) * 100).toFixed(1)}%)`);
    console.log('='.repeat(80));

    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:\n');
      for (const result of this.results.filter(r => !r.passed)) {
        console.log(`Table: ${result.table}`);
        console.log(`Operation: ${result.operation}`);
        console.log(`Role: ${result.role}`);
        console.log(`Expected: ${result.expected}, Actual: ${result.actual}`);
        if (result.error) {
          console.log(`Error: ${result.error}`);
        }
        console.log('');
      }
    }
  }

  /**
   * Cleanup test users
   */
  async cleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up test users...');
    // Delete test users via service role
    const testEmails = [
      'test-viewer@example.com',
      'test-coach@example.com',
      'test-commissioner@example.com',
      'test-admin@example.com',
    ];

    for (const email of testEmails) {
      const { data: users } = await this.supabase.auth.admin.listUsers();
      const user = users?.users.find(u => u.email === email);
      if (user) {
        await this.supabase.auth.admin.deleteUser(user.id);
        console.log(`✅ Deleted test user: ${email}`);
      }
    }
  }
}

// Main execution
async function main() {
  const framework = new RLSTestFramework(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    await framework.setupTestUsers();
    await framework.runTestSuite();
    framework.generateReport();
  } finally {
    await framework.cleanup();
  }
}

if (require.main === module) {
  main().catch(console.error);
}
```

---

### Phase 2: Policy Fixes (Day 3-4)

#### Step 2.1: Fix Teams Table Policies

Create migration: `supabase/migrations/20260120000001_fix_teams_rls_policies.sql`:

```sql
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Allow authenticated insert on teams" ON public.teams;
DROP POLICY IF EXISTS "Allow authenticated update on teams" ON public.teams;

-- Coaches can only update their own team
CREATE POLICY "Coaches can update own team"
  ON public.teams FOR UPDATE
  USING (
    id IN (
      SELECT team_id FROM public.profiles
      WHERE id = auth.uid() AND role = 'coach'
    )
  )
  WITH CHECK (
    id IN (
      SELECT team_id FROM public.profiles
      WHERE id = auth.uid() AND role = 'coach'
    )
  );

-- Commissioners and admins can update any team
CREATE POLICY "Commissioners and admins can update teams"
  ON public.teams FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('commissioner', 'admin')
    )
  );

-- Only commissioners and admins can insert teams
CREATE POLICY "Commissioners and admins can insert teams"
  ON public.teams FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('commissioner', 'admin')
    )
  );
```

#### Step 2.2: Fix Matches Table Policies

Create migration: `supabase/migrations/20260120000002_fix_matches_rls_policies.sql`:

```sql
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Allow authenticated insert on matches" ON public.matches;
DROP POLICY IF EXISTS "Allow authenticated update on matches" ON public.matches;

-- Coaches can insert matches for their own team
CREATE POLICY "Coaches can insert own team matches"
  ON public.matches FOR INSERT
  WITH CHECK (
    team1_id IN (
      SELECT team_id FROM public.profiles
      WHERE id = auth.uid() AND role = 'coach'
    ) OR
    team2_id IN (
      SELECT team_id FROM public.profiles
      WHERE id = auth.uid() AND role = 'coach'
    )
  );

-- Coaches can update matches involving their team
CREATE POLICY "Coaches can update own team matches"
  ON public.matches FOR UPDATE
  USING (
    team1_id IN (
      SELECT team_id FROM public.profiles
      WHERE id = auth.uid() AND role = 'coach'
    ) OR
    team2_id IN (
      SELECT team_id FROM public.profiles
      WHERE id = auth.uid() AND role = 'coach'
    )
  );

-- Commissioners and admins can insert/update any match
CREATE POLICY "Commissioners and admins can manage matches"
  ON public.matches FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('commissioner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('commissioner', 'admin')
    )
  );
```

#### Step 2.3: Fix Team Rosters Policies

Create migration: `supabase/migrations/20260120000003_fix_team_rosters_rls_policies.sql`:

```sql
-- Add update and delete policies for team rosters
CREATE POLICY "Coaches can update own team rosters"
  ON public.team_rosters FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id FROM public.profiles
      WHERE id = auth.uid() AND role = 'coach'
    )
  )
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM public.profiles
      WHERE id = auth.uid() AND role = 'coach'
    )
  );

CREATE POLICY "Coaches can delete own team rosters"
  ON public.team_rosters FOR DELETE
  USING (
    team_id IN (
      SELECT team_id FROM public.profiles
      WHERE id = auth.uid() AND role = 'coach'
    )
  );

-- Commissioners and admins can manage any team roster
CREATE POLICY "Commissioners and admins can manage team rosters"
  ON public.team_rosters FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('commissioner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('commissioner', 'admin')
    )
  );
```

---

### Phase 3: Comprehensive Testing (Day 5)

#### Step 3.1: Run Test Suite

```bash
pnpm tsx scripts/test-rls-policies.ts
```

#### Step 3.2: Manual Testing Checklist

- [ ] Viewer can read all public data
- [ ] Viewer cannot modify any data
- [ ] Coach can read all public data
- [ ] Coach can update own team
- [ ] Coach cannot update other teams
- [ ] Coach can update own team rosters
- [ ] Coach can submit matches for own team
- [ ] Commissioner can read all data
- [ ] Commissioner can modify teams
- [ ] Commissioner can modify matches
- [ ] Admin can read all data
- [ ] Admin can modify all data
- [ ] Admin can delete profiles

---

### Phase 4: Documentation and Reporting (Day 6-7)

#### Step 4.1: Document Test Results

Create `docs/RLS-POLICY-TEST-RESULTS.md` with:
- Test execution summary
- Pass/fail breakdown by table and role
- Identified issues and fixes
- Remaining gaps

#### Step 4.2: Create Policy Reference

Create `docs/RLS-POLICY-REFERENCE.md` with:
- Complete policy inventory
- Access matrix (table × role × operation)
- Policy explanations
- Edge cases and exceptions

---

## Expected Test Results

### Success Criteria

- ✅ 100% of policies tested
- ✅ All expected ALLOW operations succeed
- ✅ All expected DENY operations fail with appropriate errors
- ✅ No unauthorized access possible
- ✅ All legitimate operations work correctly

### Risk Assessment

**High Risk**:
- Teams table allowing any authenticated user to modify teams
- Matches table allowing any authenticated user to modify results

**Medium Risk**:
- Team rosters missing update/delete policies
- Role checks not properly implemented

**Low Risk**:
- Pokepedia tables (read-only, less critical)
- Activity log (mostly insert operations)

---

## Next Steps After Testing

1. **Fix Failed Policies**: Update migrations based on test results
2. **Re-test**: Run test suite again after fixes
3. **Document**: Create policy reference guide
4. **Monitor**: Set up alerts for RLS policy violations
5. **Review**: Regular policy audits as features are added

---

**Status**: Ready for Implementation  
**Next Action**: Run test suite to identify policy gaps
