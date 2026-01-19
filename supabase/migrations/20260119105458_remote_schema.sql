create type "public"."draft_pool_status" as enum ('available', 'drafted', 'banned', 'unavailable');

alter table "public"."draft_pool" drop constraint "draft_pool_generation_check";

alter table "public"."draft_pool" drop constraint "draft_pool_sheet_name_pokemon_name_point_value_key";

alter table "public"."binary_data" drop constraint "CHK_binary_data_sourceType";

alter table "public"."workflow_publish_history" drop constraint "CHK_workflow_publish_history_event";

drop function if exists "public"."get_available_pokemon_for_free_agency"(p_season_id uuid, p_min_points integer, p_max_points integer, p_generation integer, p_search text);

drop index if exists "public"."draft_pool_sheet_name_pokemon_name_point_value_key";

drop index if exists "public"."idx_draft_pool_available";

drop index if exists "public"."idx_draft_pool_generation";

drop index if exists "public"."idx_draft_pool_sheet_name";


  create table "public"."sheets_draft_pool" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "pokemon_name" text not null,
    "point_value" integer not null,
    "is_available" boolean default true,
    "generation" integer,
    "sheet_name" text not null,
    "sheet_row" integer,
    "sheet_column" text,
    "extracted_at" timestamp with time zone default now(),
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "pokemon_id" integer
      );


alter table "public"."sheets_draft_pool" enable row level security;

alter table "public"."draft_pool" drop column "extracted_at";

alter table "public"."draft_pool" drop column "generation";

alter table "public"."draft_pool" drop column "sheet_column";

alter table "public"."draft_pool" drop column "sheet_name";

alter table "public"."draft_pool" drop column "sheet_row";

alter table "public"."draft_pool" add column "banned_reason" text;

alter table "public"."draft_pool" add column "draft_pick_number" integer;

alter table "public"."draft_pool" add column "draft_round" integer;

alter table "public"."draft_pool" add column "drafted_at" timestamp with time zone;

alter table "public"."draft_pool" add column "drafted_by_team_id" uuid;

alter table "public"."draft_pool" add column "season_id" uuid not null;

alter table "public"."draft_pool" add column "status" public.draft_pool_status default 'available'::public.draft_pool_status;

alter table "public"."draft_pool" alter column "created_at" set not null;

-- Conditionally alter is_available column (may not exist if migrations ran in different order)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'draft_pool' 
      AND column_name = 'is_available'
  ) THEN
    ALTER TABLE "public"."draft_pool" ALTER COLUMN "is_available" SET NOT NULL;
  END IF;
END $$;

alter table "public"."draft_pool" alter column "updated_at" set not null;

CREATE UNIQUE INDEX draft_pool_pokemon_name_point_value_key ON public.draft_pool USING btree (pokemon_name, point_value);

CREATE UNIQUE INDEX draft_pool_season_pokemon_unique ON public.draft_pool USING btree (season_id, pokemon_name);

CREATE INDEX idx_draft_pool_draft_pick ON public.draft_pool USING btree (draft_pick_number) WHERE (draft_pick_number IS NOT NULL);

CREATE INDEX idx_draft_pool_draft_round ON public.draft_pool USING btree (draft_round) WHERE (draft_round IS NOT NULL);

CREATE INDEX idx_draft_pool_drafted_by ON public.draft_pool USING btree (drafted_by_team_id) WHERE (drafted_by_team_id IS NOT NULL);

-- Conditionally create index on is_available (may not exist)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'draft_pool' 
      AND column_name = 'is_available'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_draft_pool_is_available ON public.draft_pool USING btree (is_available) WHERE (is_available = true);
  END IF;
END $$;

CREATE INDEX idx_draft_pool_season ON public.draft_pool USING btree (season_id);

CREATE INDEX idx_draft_pool_status ON public.draft_pool USING btree (status) WHERE (status = 'available'::public.draft_pool_status);

CREATE INDEX idx_sheets_draft_pool_available ON public.sheets_draft_pool USING btree (is_available) WHERE (is_available = true);

CREATE INDEX idx_sheets_draft_pool_generation ON public.sheets_draft_pool USING btree (generation);

CREATE INDEX idx_sheets_draft_pool_point_value ON public.sheets_draft_pool USING btree (point_value);

CREATE INDEX idx_sheets_draft_pool_pokemon_id ON public.sheets_draft_pool USING btree (pokemon_id) WHERE (pokemon_id IS NOT NULL);

CREATE INDEX idx_sheets_draft_pool_pokemon_name ON public.sheets_draft_pool USING btree (pokemon_name);

CREATE INDEX idx_sheets_draft_pool_sheet_name ON public.sheets_draft_pool USING btree (sheet_name);

CREATE UNIQUE INDEX sheets_draft_pool_pkey ON public.sheets_draft_pool USING btree (id);

CREATE UNIQUE INDEX sheets_draft_pool_sheet_name_pokemon_name_point_value_key ON public.sheets_draft_pool USING btree (sheet_name, pokemon_name, point_value);

alter table "public"."sheets_draft_pool" add constraint "sheets_draft_pool_pkey" PRIMARY KEY using index "sheets_draft_pool_pkey";

alter table "public"."draft_pool" add constraint "draft_pool_draft_pick_number_check" CHECK ((draft_pick_number >= 1)) not valid;

alter table "public"."draft_pool" validate constraint "draft_pool_draft_pick_number_check";

alter table "public"."draft_pool" add constraint "draft_pool_draft_round_check" CHECK ((draft_round >= 1)) not valid;

alter table "public"."draft_pool" validate constraint "draft_pool_draft_round_check";

alter table "public"."draft_pool" add constraint "draft_pool_drafted_by_team_id_fkey" FOREIGN KEY (drafted_by_team_id) REFERENCES public.teams(id) ON DELETE SET NULL not valid;

alter table "public"."draft_pool" validate constraint "draft_pool_drafted_by_team_id_fkey";

alter table "public"."draft_pool" add constraint "draft_pool_season_id_fkey" FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE CASCADE not valid;

alter table "public"."draft_pool" validate constraint "draft_pool_season_id_fkey";

alter table "public"."draft_pool" add constraint "draft_pool_season_pokemon_unique" UNIQUE using index "draft_pool_season_pokemon_unique";

alter table "public"."sheets_draft_pool" add constraint "sheets_draft_pool_generation_check" CHECK (((generation >= 1) AND (generation <= 9))) not valid;

alter table "public"."sheets_draft_pool" validate constraint "sheets_draft_pool_generation_check";

alter table "public"."sheets_draft_pool" add constraint "sheets_draft_pool_point_value_check" CHECK (((point_value >= 1) AND (point_value <= 20))) not valid;

alter table "public"."sheets_draft_pool" validate constraint "sheets_draft_pool_point_value_check";

alter table "public"."sheets_draft_pool" add constraint "sheets_draft_pool_pokemon_id_fkey" FOREIGN KEY (pokemon_id) REFERENCES public.pokemon_cache(pokemon_id) ON DELETE SET NULL not valid;

alter table "public"."sheets_draft_pool" validate constraint "sheets_draft_pool_pokemon_id_fkey";

alter table "public"."sheets_draft_pool" add constraint "sheets_draft_pool_sheet_name_pokemon_name_point_value_key" UNIQUE using index "sheets_draft_pool_sheet_name_pokemon_name_point_value_key";

alter table "public"."binary_data" add constraint "CHK_binary_data_sourceType" CHECK ((("sourceType")::text = ANY ((ARRAY['execution'::character varying, 'chat_message_attachment'::character varying])::text[]))) not valid;

alter table "public"."binary_data" validate constraint "CHK_binary_data_sourceType";

alter table "public"."workflow_publish_history" add constraint "CHK_workflow_publish_history_event" CHECK (((event)::text = ANY ((ARRAY['activated'::character varying, 'deactivated'::character varying])::text[]))) not valid;

alter table "public"."workflow_publish_history" validate constraint "CHK_workflow_publish_history_event";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_available_pokemon_for_free_agency(p_season_id uuid, p_min_points integer, p_max_points integer, p_generation integer, p_search text)
 RETURNS TABLE(pokemon_id integer, pokemon_name text, point_value integer, generation integer)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    dp.pokemon_id,
    dp.pokemon_name,
    dp.point_value,
    dp.generation
  FROM sheets_draft_pool dp
  WHERE dp.is_available = true
    AND dp.pokemon_id IS NOT NULL
    AND (p_min_points IS NULL OR dp.point_value >= p_min_points)
    AND (p_max_points IS NULL OR dp.point_value <= p_max_points)
    AND (p_generation IS NULL OR dp.generation = p_generation)
    AND (p_search IS NULL OR dp.pokemon_name ILIKE '%' || p_search || '%')
    AND dp.pokemon_id NOT IN (
      SELECT tr.pokemon_id
      FROM team_rosters tr
      INNER JOIN teams t ON tr.team_id = t.id
      WHERE t.season_id = p_season_id
        AND tr.pokemon_id IS NOT NULL
    )
  ORDER BY dp.point_value DESC, dp.pokemon_name ASC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_pokemon_by_tier(tier_points integer)
 RETURNS TABLE(pokemon_name text, point_value integer, generation integer, pokemon_cache_id integer)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    dp.pokemon_name,
    dp.point_value,
    dp.generation,
    pc.pokemon_id as pokemon_cache_id
  FROM sheets_draft_pool dp
  LEFT JOIN pokemon_cache pc ON LOWER(pc.name) = LOWER(dp.pokemon_name)
  WHERE dp.point_value = tier_points
    AND dp.is_available = true
  ORDER BY dp.pokemon_name;
END;
$function$
;

grant delete on table "public"."sheets_draft_pool" to "anon";

grant insert on table "public"."sheets_draft_pool" to "anon";

grant references on table "public"."sheets_draft_pool" to "anon";

grant select on table "public"."sheets_draft_pool" to "anon";

grant trigger on table "public"."sheets_draft_pool" to "anon";

grant truncate on table "public"."sheets_draft_pool" to "anon";

grant update on table "public"."sheets_draft_pool" to "anon";

grant delete on table "public"."sheets_draft_pool" to "authenticated";

grant insert on table "public"."sheets_draft_pool" to "authenticated";

grant references on table "public"."sheets_draft_pool" to "authenticated";

grant select on table "public"."sheets_draft_pool" to "authenticated";

grant trigger on table "public"."sheets_draft_pool" to "authenticated";

grant truncate on table "public"."sheets_draft_pool" to "authenticated";

grant update on table "public"."sheets_draft_pool" to "authenticated";

grant delete on table "public"."sheets_draft_pool" to "service_role";

grant insert on table "public"."sheets_draft_pool" to "service_role";

grant references on table "public"."sheets_draft_pool" to "service_role";

grant select on table "public"."sheets_draft_pool" to "service_role";

grant trigger on table "public"."sheets_draft_pool" to "service_role";

grant truncate on table "public"."sheets_draft_pool" to "service_role";

grant update on table "public"."sheets_draft_pool" to "service_role";


  create policy "Sheets draft pool is deletable by service role"
  on "public"."sheets_draft_pool"
  as permissive
  for delete
  to service_role
using (true);



  create policy "Sheets draft pool is insertable by service role"
  on "public"."sheets_draft_pool"
  as permissive
  for insert
  to service_role
with check (true);



  create policy "Sheets draft pool is updatable by service role"
  on "public"."sheets_draft_pool"
  as permissive
  for update
  to service_role
using (true)
with check (true);



  create policy "Sheets draft pool is viewable by authenticated users"
  on "public"."sheets_draft_pool"
  as permissive
  for select
  to authenticated
using (true);



