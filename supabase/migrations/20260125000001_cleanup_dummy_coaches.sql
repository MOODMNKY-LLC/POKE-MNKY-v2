-- Migration to cleanup dummy/test coaches
-- This removes test users created by seed scripts and test setup scripts
-- Run this migration to clean up test data from the database

-- List of test coach emails to remove
DO $$
DECLARE
  test_emails TEXT[] := ARRAY[
    'coach1@example.com',
    'coach2@example.com',
    'coach3@example.com',
    'coach4@example.com',
    'test-coach-1@example.com',
    'test-coach-2@example.com',
    'test-coach-3@example.com',
    'test-coach@example.com'
  ];
  user_id UUID;
  test_email TEXT;
BEGIN
  FOR test_email IN SELECT unnest(test_emails)
  LOOP
    -- Find user by email (requires auth.users access)
    -- Note: This requires service role or admin access
    SELECT id INTO user_id
    FROM auth.users
    WHERE auth.users.email = test_email
    LIMIT 1;
    
    IF user_id IS NOT NULL THEN
      -- Remove team assignment from profiles
      UPDATE profiles
      SET team_id = NULL
      WHERE id = user_id;
      
      -- Remove coach_id from teams if this user was assigned as coach
      UPDATE teams
      SET coach_id = NULL
      WHERE coach_id = user_id;
      
      -- Delete profile
      DELETE FROM profiles
      WHERE id = user_id;
      
      -- Note: auth.users deletion must be done via Supabase Admin API
      -- This SQL only handles the profiles and teams cleanup
      RAISE NOTICE 'Cleaned up profile and team assignments for user: %', test_email;
    ELSE
      RAISE NOTICE 'User not found: %', test_email;
    END IF;
  END LOOP;
END $$;

-- Note: To fully delete auth users, use the cleanup script:
-- npm run cleanup:dummy-coaches
-- Or use Supabase Admin API to delete auth.users records
--
-- This migration only cleans up profiles and team assignments.
-- The TypeScript script (scripts/cleanup-dummy-coaches.ts) handles
-- complete deletion including auth.users records.
