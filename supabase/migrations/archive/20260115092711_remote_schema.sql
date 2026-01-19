create extension if not exists "pg_cron" with schema "pg_catalog";

create extension if not exists "wrappers" with schema "extensions";

create schema if not exists "pgmq";

create extension if not exists "pgmq" with schema "pgmq";

drop trigger if exists "trigger_broadcast_match_updates" on "public"."matches";

drop trigger if exists "trigger_refresh_standings_on_completion" on "public"."matches";

drop trigger if exists "trigger_auto_validate_team" on "public"."showdown_teams";

drop index if exists "public"."idx_mv_standings_conference";

drop index if exists "public"."idx_mv_standings_division";

drop index if exists "public"."idx_mv_standings_ranking";

drop index if exists "public"."idx_mv_standings_season";

drop index if exists "public"."idx_mv_standings_season_conf_div";

drop index if exists "public"."idx_mv_standings_team";

drop index if exists "public"."idx_mv_standings_team_unique";

drop function if exists "public"."auto_validate_team"();

drop function if exists "public"."broadcast_match_update"();

drop view if exists "public"."league_standings";

drop materialized view if exists "public"."mv_league_standings";

drop function if exists "public"."refresh_standings_materialized_view"();

drop function if exists "public"."refresh_standings_on_match_completion"();

drop function if exists "public"."validate_and_update_team"(p_team_id uuid);

drop function if exists "public"."validate_team_composition"(p_team_text text, p_coach_id uuid, p_season_id uuid);

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

drop policy "Users can receive match broadcasts" on "realtime"."messages";

-- Storage triggers: only create if storage schema exists (for local dev compatibility)
DO $$
BEGIN
  -- Check if storage.buckets exists before creating trigger
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
    DROP TRIGGER IF EXISTS enforce_bucket_name_length_trigger ON storage.buckets;
    CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();
  END IF;

  -- Check if storage.objects exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
    DROP TRIGGER IF EXISTS objects_delete_delete_prefix ON storage.objects;
    CREATE TRIGGER objects_delete_delete_prefix AFTER DELETE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();

    DROP TRIGGER IF EXISTS objects_insert_create_prefix ON storage.objects;
    CREATE TRIGGER objects_insert_create_prefix BEFORE INSERT ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.objects_insert_prefix_trigger();

    DROP TRIGGER IF EXISTS objects_update_create_prefix ON storage.objects;
    CREATE TRIGGER objects_update_create_prefix BEFORE UPDATE ON storage.objects FOR EACH ROW WHEN (((new.name <> old.name) OR (new.bucket_id <> old.bucket_id))) EXECUTE FUNCTION storage.objects_update_prefix_trigger();

    DROP TRIGGER IF EXISTS update_objects_updated_at ON storage.objects;
    CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();
  END IF;

  -- Check if storage.prefixes exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'prefixes') THEN
    DROP TRIGGER IF EXISTS prefixes_create_hierarchy ON storage.prefixes;
    CREATE TRIGGER prefixes_create_hierarchy BEFORE INSERT ON storage.prefixes FOR EACH ROW WHEN ((pg_trigger_depth() < 1)) EXECUTE FUNCTION storage.prefixes_insert_trigger();

    DROP TRIGGER IF EXISTS prefixes_delete_hierarchy ON storage.prefixes;
    CREATE TRIGGER prefixes_delete_hierarchy AFTER DELETE ON storage.prefixes FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();
  END IF;
END $$;


