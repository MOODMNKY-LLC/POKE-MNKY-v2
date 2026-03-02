-- Optional backfill: set coaches.discord_user_id from discord_id so existing
-- linked coaches work with /whoami and other bot flows without re-linking.

UPDATE public.coaches
SET discord_user_id = discord_id
WHERE discord_user_id IS NULL
  AND discord_id IS NOT NULL;
