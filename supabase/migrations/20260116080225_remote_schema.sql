-- Wrap all free_agency_transactions operations in conditional checks
DO $$
BEGIN
  -- Drop policies only if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'free_agency_transactions'
  ) THEN
    -- Drop dependent view first
    DROP VIEW IF EXISTS "public"."ownership_history";
    
    DROP POLICY IF EXISTS "Free agency transactions are viewable by authenticated users" ON "public"."free_agency_transactions";
    DROP POLICY IF EXISTS "Service role can update transactions" ON "public"."free_agency_transactions";
    DROP POLICY IF EXISTS "Users can create transactions for their team" ON "public"."free_agency_transactions";
    
    -- Revoke permissions
    REVOKE DELETE ON TABLE "public"."free_agency_transactions" FROM "anon";
    REVOKE INSERT ON TABLE "public"."free_agency_transactions" FROM "anon";
    REVOKE REFERENCES ON TABLE "public"."free_agency_transactions" FROM "anon";
    REVOKE SELECT ON TABLE "public"."free_agency_transactions" FROM "anon";
    REVOKE TRIGGER ON TABLE "public"."free_agency_transactions" FROM "anon";
    REVOKE TRUNCATE ON TABLE "public"."free_agency_transactions" FROM "anon";
    REVOKE UPDATE ON TABLE "public"."free_agency_transactions" FROM "anon";
    
    REVOKE DELETE ON TABLE "public"."free_agency_transactions" FROM "authenticated";
    REVOKE INSERT ON TABLE "public"."free_agency_transactions" FROM "authenticated";
    REVOKE REFERENCES ON TABLE "public"."free_agency_transactions" FROM "authenticated";
    REVOKE SELECT ON TABLE "public"."free_agency_transactions" FROM "authenticated";
    REVOKE TRIGGER ON TABLE "public"."free_agency_transactions" FROM "authenticated";
    REVOKE TRUNCATE ON TABLE "public"."free_agency_transactions" FROM "authenticated";
    REVOKE UPDATE ON TABLE "public"."free_agency_transactions" FROM "authenticated";
    
    REVOKE DELETE ON TABLE "public"."free_agency_transactions" FROM "service_role";
    REVOKE INSERT ON TABLE "public"."free_agency_transactions" FROM "service_role";
    REVOKE REFERENCES ON TABLE "public"."free_agency_transactions" FROM "service_role";
    REVOKE SELECT ON TABLE "public"."free_agency_transactions" FROM "service_role";
    REVOKE TRIGGER ON TABLE "public"."free_agency_transactions" FROM "service_role";
    REVOKE TRUNCATE ON TABLE "public"."free_agency_transactions" FROM "service_role";
    REVOKE UPDATE ON TABLE "public"."free_agency_transactions" FROM "service_role";
    
    -- Drop constraints
    ALTER TABLE "public"."free_agency_transactions" DROP CONSTRAINT IF EXISTS "free_agency_transactions_added_pokemon_id_fkey";
    ALTER TABLE "public"."free_agency_transactions" DROP CONSTRAINT IF EXISTS "free_agency_transactions_created_by_fkey";
    ALTER TABLE "public"."free_agency_transactions" DROP CONSTRAINT IF EXISTS "free_agency_transactions_dropped_pokemon_id_fkey";
    ALTER TABLE "public"."free_agency_transactions" DROP CONSTRAINT IF EXISTS "free_agency_transactions_season_id_fkey";
    ALTER TABLE "public"."free_agency_transactions" DROP CONSTRAINT IF EXISTS "free_agency_transactions_status_check";
    ALTER TABLE "public"."free_agency_transactions" DROP CONSTRAINT IF EXISTS "free_agency_transactions_team_id_fkey";
    ALTER TABLE "public"."free_agency_transactions" DROP CONSTRAINT IF EXISTS "free_agency_transactions_transaction_type_check";
    ALTER TABLE "public"."free_agency_transactions" DROP CONSTRAINT IF EXISTS "valid_transaction";
    ALTER TABLE "public"."free_agency_transactions" DROP CONSTRAINT IF EXISTS "free_agency_transactions_pkey";
    
    -- Drop indexes
    DROP INDEX IF EXISTS "public"."free_agency_transactions_pkey";
    DROP INDEX IF EXISTS "public"."idx_free_agency_transactions_created_at";
    DROP INDEX IF EXISTS "public"."idx_free_agency_transactions_status";
    DROP INDEX IF EXISTS "public"."idx_free_agency_transactions_team_season";
    
    -- Drop table
    DROP TABLE "public"."free_agency_transactions";
  END IF;
  
  -- Handle team_transaction_counts
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'team_transaction_counts'
  ) THEN
    DROP POLICY IF EXISTS "Service role can update transaction counts" ON "public"."team_transaction_counts";
    DROP POLICY IF EXISTS "Transaction counts are viewable by authenticated users" ON "public"."team_transaction_counts";
    
    REVOKE DELETE ON TABLE "public"."team_transaction_counts" FROM "anon";
    REVOKE INSERT ON TABLE "public"."team_transaction_counts" FROM "anon";
    REVOKE REFERENCES ON TABLE "public"."team_transaction_counts" FROM "anon";
    REVOKE SELECT ON TABLE "public"."team_transaction_counts" FROM "anon";
    REVOKE TRIGGER ON TABLE "public"."team_transaction_counts" FROM "anon";
    REVOKE TRUNCATE ON TABLE "public"."team_transaction_counts" FROM "anon";
    REVOKE UPDATE ON TABLE "public"."team_transaction_counts" FROM "anon";
    
    REVOKE DELETE ON TABLE "public"."team_transaction_counts" FROM "authenticated";
    REVOKE INSERT ON TABLE "public"."team_transaction_counts" FROM "authenticated";
    REVOKE REFERENCES ON TABLE "public"."team_transaction_counts" FROM "authenticated";
    REVOKE SELECT ON TABLE "public"."team_transaction_counts" FROM "authenticated";
    REVOKE TRIGGER ON TABLE "public"."team_transaction_counts" FROM "authenticated";
    REVOKE TRUNCATE ON TABLE "public"."team_transaction_counts" FROM "authenticated";
    REVOKE UPDATE ON TABLE "public"."team_transaction_counts" FROM "authenticated";
    
    REVOKE DELETE ON TABLE "public"."team_transaction_counts" FROM "service_role";
    REVOKE INSERT ON TABLE "public"."team_transaction_counts" FROM "service_role";
    REVOKE REFERENCES ON TABLE "public"."team_transaction_counts" FROM "service_role";
    REVOKE SELECT ON TABLE "public"."team_transaction_counts" FROM "service_role";
    REVOKE TRIGGER ON TABLE "public"."team_transaction_counts" FROM "service_role";
    REVOKE TRUNCATE ON TABLE "public"."team_transaction_counts" FROM "service_role";
    REVOKE UPDATE ON TABLE "public"."team_transaction_counts" FROM "service_role";
    
    ALTER TABLE "public"."team_transaction_counts" DROP CONSTRAINT IF EXISTS "team_transaction_counts_season_id_fkey";
    ALTER TABLE "public"."team_transaction_counts" DROP CONSTRAINT IF EXISTS "team_transaction_counts_team_id_fkey";
    ALTER TABLE "public"."team_transaction_counts" DROP CONSTRAINT IF EXISTS "team_transaction_counts_pkey";
    
    DROP INDEX IF EXISTS "public"."team_transaction_counts_pkey";
    
    DROP TABLE "public"."team_transaction_counts";
  END IF;
  
  -- Drop ownership_history view if it exists but table doesn't (edge case)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'free_agency_transactions'
  ) THEN
    DROP VIEW IF EXISTS "public"."ownership_history";
  END IF;
END $$;

  create table "public"."replayplayers" (
    "playerid" character varying(45) not null,
    "formatid" character varying(45) not null,
    "id" character varying(255) not null,
    "rating" bigint,
    "uploadtime" bigint not null,
    "private" smallint not null,
    "password" character varying(31),
    "format" character varying(255) not null,
    "players" character varying(255) not null
      );


alter table "public"."replayplayers" enable row level security;


  create table "public"."replays" (
    "id" character varying(255) not null,
    "format" character varying(45) not null,
    "players" character varying(255) not null,
    "log" text not null,
    "inputlog" text,
    "uploadtime" bigint not null,
    "views" bigint not null default 0,
    "formatid" character varying(45) not null,
    "rating" bigint,
    "private" bigint not null default 0,
    "password" character varying(31)
      );


alter table "public"."replays" enable row level security;


  create table "public"."showdown_client_teams" (
    "teamid" text not null,
    "ownerid" text not null,
    "team" text not null,
    "format" text not null,
    "title" text not null,
    "private" text not null default ''::text,
    "views" integer not null default 0,
    "date" bigint not null default (EXTRACT(epoch FROM now()))::bigint,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."showdown_client_teams" enable row level security;


  create table "public"."team_categories" (
    "category_id" text not null,
    "category_name" text not null,
    "description" text,
    "icon_url" text,
    "color" text,
    "sort_order" integer not null default 0,
    "is_featured" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."team_categories" enable row level security;


  create table "public"."team_formats" (
    "format_id" text not null,
    "format_name" text not null,
    "generation" integer,
    "tier" text,
    "category" text,
    "is_active" boolean not null default true,
    "description" text,
    "rules_url" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."team_formats" enable row level security;


  create table "public"."team_tag_assignments" (
    "teamid" text not null,
    "tag_id" text not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."team_tag_assignments" enable row level security;


  create table "public"."team_tags" (
    "tag_id" text not null,
    "tag_name" text not null,
    "tag_type" text not null,
    "color" text,
    "description" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."team_tags" enable row level security;

CREATE INDEX idx_replayplayers_formatid_playerid_rating ON public.replayplayers USING btree (formatid, playerid, rating);

CREATE INDEX idx_replayplayers_formatid_playerid_uploadtime ON public.replayplayers USING btree (formatid, playerid, uploadtime);

CREATE INDEX idx_replayplayers_playerid_rating ON public.replayplayers USING btree (playerid, rating);

CREATE INDEX idx_replayplayers_playerid_uploadtime ON public.replayplayers USING btree (playerid, uploadtime);

CREATE INDEX idx_replays_log_gin ON public.replays USING gin (to_tsvector('english'::regconfig, log));

CREATE INDEX idx_replays_private_formatid_rating ON public.replays USING btree (private, formatid, rating);

CREATE INDEX idx_replays_private_formatid_uploadtime ON public.replays USING btree (private, formatid, uploadtime);

CREATE INDEX idx_replays_private_uploadtime ON public.replays USING btree (private, uploadtime);

CREATE INDEX idx_showdown_client_teams_date ON public.showdown_client_teams USING btree (date DESC);

CREATE INDEX idx_showdown_client_teams_format ON public.showdown_client_teams USING btree (format);

CREATE INDEX idx_showdown_client_teams_ownerid ON public.showdown_client_teams USING btree (ownerid);

CREATE INDEX idx_team_categories_featured ON public.team_categories USING btree (is_featured);

CREATE INDEX idx_team_categories_sort ON public.team_categories USING btree (sort_order);

CREATE INDEX idx_team_formats_active ON public.team_formats USING btree (is_active);

CREATE INDEX idx_team_formats_category ON public.team_formats USING btree (category);

CREATE INDEX idx_team_formats_generation ON public.team_formats USING btree (generation);

CREATE INDEX idx_team_formats_tier ON public.team_formats USING btree (tier);

CREATE INDEX idx_team_tag_assignments_tag ON public.team_tag_assignments USING btree (tag_id);

CREATE INDEX idx_team_tag_assignments_teamid ON public.team_tag_assignments USING btree (teamid);

CREATE INDEX idx_team_tags_name ON public.team_tags USING btree (tag_name);

CREATE INDEX idx_team_tags_type ON public.team_tags USING btree (tag_type);

CREATE UNIQUE INDEX replayplayers_pkey ON public.replayplayers USING btree (id, playerid);

CREATE UNIQUE INDEX replays_pkey ON public.replays USING btree (id);

CREATE UNIQUE INDEX showdown_client_teams_pkey ON public.showdown_client_teams USING btree (teamid);

CREATE UNIQUE INDEX team_categories_pkey ON public.team_categories USING btree (category_id);

CREATE UNIQUE INDEX team_formats_pkey ON public.team_formats USING btree (format_id);

CREATE UNIQUE INDEX team_tag_assignments_pkey ON public.team_tag_assignments USING btree (teamid, tag_id);

CREATE UNIQUE INDEX team_tags_pkey ON public.team_tags USING btree (tag_id);

alter table "public"."replayplayers" add constraint "replayplayers_pkey" PRIMARY KEY using index "replayplayers_pkey";

alter table "public"."replays" add constraint "replays_pkey" PRIMARY KEY using index "replays_pkey";

alter table "public"."showdown_client_teams" add constraint "showdown_client_teams_pkey" PRIMARY KEY using index "showdown_client_teams_pkey";

alter table "public"."team_categories" add constraint "team_categories_pkey" PRIMARY KEY using index "team_categories_pkey";

alter table "public"."team_formats" add constraint "team_formats_pkey" PRIMARY KEY using index "team_formats_pkey";

alter table "public"."team_tag_assignments" add constraint "team_tag_assignments_pkey" PRIMARY KEY using index "team_tag_assignments_pkey";

alter table "public"."team_tags" add constraint "team_tags_pkey" PRIMARY KEY using index "team_tags_pkey";

alter table "public"."team_tag_assignments" add constraint "team_tag_assignments_tag_id_fkey" FOREIGN KEY (tag_id) REFERENCES public.team_tags(tag_id) ON DELETE CASCADE not valid;

alter table "public"."team_tag_assignments" validate constraint "team_tag_assignments_tag_id_fkey";

alter table "public"."team_tag_assignments" add constraint "team_tag_assignments_teamid_fkey" FOREIGN KEY (teamid) REFERENCES public.showdown_client_teams(teamid) ON DELETE CASCADE not valid;

alter table "public"."team_tag_assignments" validate constraint "team_tag_assignments_teamid_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.update_showdown_client_teams_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_team_categories_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_team_formats_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_team_tags_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$function$
;

create or replace view "public"."ownership_history" as  SELECT pokemon_id,
    team_id,
    'draft'::text AS source,
    draft_round,
    draft_order,
    created_at AS acquired_at
   FROM public.team_rosters
  WHERE (draft_round IS NOT NULL);


grant delete on table "public"."replayplayers" to "anon";

grant insert on table "public"."replayplayers" to "anon";

grant references on table "public"."replayplayers" to "anon";

grant select on table "public"."replayplayers" to "anon";

grant trigger on table "public"."replayplayers" to "anon";

grant truncate on table "public"."replayplayers" to "anon";

grant update on table "public"."replayplayers" to "anon";

grant delete on table "public"."replayplayers" to "authenticated";

grant insert on table "public"."replayplayers" to "authenticated";

grant references on table "public"."replayplayers" to "authenticated";

grant select on table "public"."replayplayers" to "authenticated";

grant trigger on table "public"."replayplayers" to "authenticated";

grant truncate on table "public"."replayplayers" to "authenticated";

grant update on table "public"."replayplayers" to "authenticated";

grant delete on table "public"."replayplayers" to "service_role";

grant insert on table "public"."replayplayers" to "service_role";

grant references on table "public"."replayplayers" to "service_role";

grant select on table "public"."replayplayers" to "service_role";

grant trigger on table "public"."replayplayers" to "service_role";

grant truncate on table "public"."replayplayers" to "service_role";

grant update on table "public"."replayplayers" to "service_role";

grant delete on table "public"."replays" to "anon";

grant insert on table "public"."replays" to "anon";

grant references on table "public"."replays" to "anon";

grant select on table "public"."replays" to "anon";

grant trigger on table "public"."replays" to "anon";

grant truncate on table "public"."replays" to "anon";

grant update on table "public"."replays" to "anon";

grant delete on table "public"."replays" to "authenticated";

grant insert on table "public"."replays" to "authenticated";

grant references on table "public"."replays" to "authenticated";

grant select on table "public"."replays" to "authenticated";

grant trigger on table "public"."replays" to "authenticated";

grant truncate on table "public"."replays" to "authenticated";

grant update on table "public"."replays" to "authenticated";

grant delete on table "public"."replays" to "service_role";

grant insert on table "public"."replays" to "service_role";

grant references on table "public"."replays" to "service_role";

grant select on table "public"."replays" to "service_role";

grant trigger on table "public"."replays" to "service_role";

grant truncate on table "public"."replays" to "service_role";

grant update on table "public"."replays" to "service_role";

grant delete on table "public"."showdown_client_teams" to "anon";

grant insert on table "public"."showdown_client_teams" to "anon";

grant references on table "public"."showdown_client_teams" to "anon";

grant select on table "public"."showdown_client_teams" to "anon";

grant trigger on table "public"."showdown_client_teams" to "anon";

grant truncate on table "public"."showdown_client_teams" to "anon";

grant update on table "public"."showdown_client_teams" to "anon";

grant delete on table "public"."showdown_client_teams" to "authenticated";

grant insert on table "public"."showdown_client_teams" to "authenticated";

grant references on table "public"."showdown_client_teams" to "authenticated";

grant select on table "public"."showdown_client_teams" to "authenticated";

grant trigger on table "public"."showdown_client_teams" to "authenticated";

grant truncate on table "public"."showdown_client_teams" to "authenticated";

grant update on table "public"."showdown_client_teams" to "authenticated";

grant delete on table "public"."showdown_client_teams" to "service_role";

grant insert on table "public"."showdown_client_teams" to "service_role";

grant references on table "public"."showdown_client_teams" to "service_role";

grant select on table "public"."showdown_client_teams" to "service_role";

grant trigger on table "public"."showdown_client_teams" to "service_role";

grant truncate on table "public"."showdown_client_teams" to "service_role";

grant update on table "public"."showdown_client_teams" to "service_role";

grant delete on table "public"."team_categories" to "anon";

grant insert on table "public"."team_categories" to "anon";

grant references on table "public"."team_categories" to "anon";

grant select on table "public"."team_categories" to "anon";

grant trigger on table "public"."team_categories" to "anon";

grant truncate on table "public"."team_categories" to "anon";

grant update on table "public"."team_categories" to "anon";

grant delete on table "public"."team_categories" to "authenticated";

grant insert on table "public"."team_categories" to "authenticated";

grant references on table "public"."team_categories" to "authenticated";

grant select on table "public"."team_categories" to "authenticated";

grant trigger on table "public"."team_categories" to "authenticated";

grant truncate on table "public"."team_categories" to "authenticated";

grant update on table "public"."team_categories" to "authenticated";

grant delete on table "public"."team_categories" to "service_role";

grant insert on table "public"."team_categories" to "service_role";

grant references on table "public"."team_categories" to "service_role";

grant select on table "public"."team_categories" to "service_role";

grant trigger on table "public"."team_categories" to "service_role";

grant truncate on table "public"."team_categories" to "service_role";

grant update on table "public"."team_categories" to "service_role";

grant delete on table "public"."team_formats" to "anon";

grant insert on table "public"."team_formats" to "anon";

grant references on table "public"."team_formats" to "anon";

grant select on table "public"."team_formats" to "anon";

grant trigger on table "public"."team_formats" to "anon";

grant truncate on table "public"."team_formats" to "anon";

grant update on table "public"."team_formats" to "anon";

grant delete on table "public"."team_formats" to "authenticated";

grant insert on table "public"."team_formats" to "authenticated";

grant references on table "public"."team_formats" to "authenticated";

grant select on table "public"."team_formats" to "authenticated";

grant trigger on table "public"."team_formats" to "authenticated";

grant truncate on table "public"."team_formats" to "authenticated";

grant update on table "public"."team_formats" to "authenticated";

grant delete on table "public"."team_formats" to "service_role";

grant insert on table "public"."team_formats" to "service_role";

grant references on table "public"."team_formats" to "service_role";

grant select on table "public"."team_formats" to "service_role";

grant trigger on table "public"."team_formats" to "service_role";

grant truncate on table "public"."team_formats" to "service_role";

grant update on table "public"."team_formats" to "service_role";

grant delete on table "public"."team_tag_assignments" to "anon";

grant insert on table "public"."team_tag_assignments" to "anon";

grant references on table "public"."team_tag_assignments" to "anon";

grant select on table "public"."team_tag_assignments" to "anon";

grant trigger on table "public"."team_tag_assignments" to "anon";

grant truncate on table "public"."team_tag_assignments" to "anon";

grant update on table "public"."team_tag_assignments" to "anon";

grant delete on table "public"."team_tag_assignments" to "authenticated";

grant insert on table "public"."team_tag_assignments" to "authenticated";

grant references on table "public"."team_tag_assignments" to "authenticated";

grant select on table "public"."team_tag_assignments" to "authenticated";

grant trigger on table "public"."team_tag_assignments" to "authenticated";

grant truncate on table "public"."team_tag_assignments" to "authenticated";

grant update on table "public"."team_tag_assignments" to "authenticated";

grant delete on table "public"."team_tag_assignments" to "service_role";

grant insert on table "public"."team_tag_assignments" to "service_role";

grant references on table "public"."team_tag_assignments" to "service_role";

grant select on table "public"."team_tag_assignments" to "service_role";

grant trigger on table "public"."team_tag_assignments" to "service_role";

grant truncate on table "public"."team_tag_assignments" to "service_role";

grant update on table "public"."team_tag_assignments" to "service_role";

grant delete on table "public"."team_tags" to "anon";

grant insert on table "public"."team_tags" to "anon";

grant references on table "public"."team_tags" to "anon";

grant select on table "public"."team_tags" to "anon";

grant trigger on table "public"."team_tags" to "anon";

grant truncate on table "public"."team_tags" to "anon";

grant update on table "public"."team_tags" to "anon";

grant delete on table "public"."team_tags" to "authenticated";

grant insert on table "public"."team_tags" to "authenticated";

grant references on table "public"."team_tags" to "authenticated";

grant select on table "public"."team_tags" to "authenticated";

grant trigger on table "public"."team_tags" to "authenticated";

grant truncate on table "public"."team_tags" to "authenticated";

grant update on table "public"."team_tags" to "authenticated";

grant delete on table "public"."team_tags" to "service_role";

grant insert on table "public"."team_tags" to "service_role";

grant references on table "public"."team_tags" to "service_role";

grant select on table "public"."team_tags" to "service_role";

grant trigger on table "public"."team_tags" to "service_role";

grant truncate on table "public"."team_tags" to "service_role";

grant update on table "public"."team_tags" to "service_role";


  create policy "Allow insert replayplayers"
  on "public"."replayplayers"
  as permissive
  for insert
  to public
with check (true);



  create policy "Allow read non-private replayplayers"
  on "public"."replayplayers"
  as permissive
  for select
  to public
using ((private = 0));



  create policy "Allow insert replays"
  on "public"."replays"
  as permissive
  for insert
  to public
with check (true);



  create policy "Allow read non-private replays"
  on "public"."replays"
  as permissive
  for select
  to public
using ((private = 0));



  create policy "Allow update replays"
  on "public"."replays"
  as permissive
  for update
  to public
using (true)
with check (true);



  create policy "Allow all client team operations"
  on "public"."showdown_client_teams"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Allow all category operations"
  on "public"."team_categories"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Allow all format operations"
  on "public"."team_formats"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Allow all tag assignment operations"
  on "public"."team_tag_assignments"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Allow all tag operations"
  on "public"."team_tags"
  as permissive
  for all
  to public
using (true)
with check (true);


CREATE TRIGGER trigger_update_showdown_client_teams_updated_at BEFORE UPDATE ON public.showdown_client_teams FOR EACH ROW EXECUTE FUNCTION public.update_showdown_client_teams_updated_at();

CREATE TRIGGER trigger_update_team_categories_updated_at BEFORE UPDATE ON public.team_categories FOR EACH ROW EXECUTE FUNCTION public.update_team_categories_updated_at();

CREATE TRIGGER trigger_update_team_formats_updated_at BEFORE UPDATE ON public.team_formats FOR EACH ROW EXECUTE FUNCTION public.update_team_formats_updated_at();

CREATE TRIGGER trigger_update_team_tags_updated_at BEFORE UPDATE ON public.team_tags FOR EACH ROW EXECUTE FUNCTION public.update_team_tags_updated_at();

