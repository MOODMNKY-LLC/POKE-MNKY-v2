create sequence "public"."battle_events_id_seq";


  create table "public"."abilities" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "ability_id" integer not null,
    "name" text not null,
    "is_main_series" boolean default true,
    "effect_entries" jsonb,
    "flavor_text_entries" jsonb,
    "generation_id" integer,
    "pokemon" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."abilities" enable row level security;


  create table "public"."battle_events" (
    "id" bigint not null default nextval('public.battle_events_id_seq'::regclass),
    "battle_id" uuid not null,
    "turn" integer not null,
    "event_type" text not null,
    "payload" jsonb not null,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."battle_events" enable row level security;


  create table "public"."battle_sessions" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "match_id" uuid,
    "format" text not null,
    "team_a_id" uuid not null,
    "team_b_id" uuid not null,
    "state" jsonb,
    "status" text default 'active'::text,
    "winner_id" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."battle_sessions" enable row level security;


  create table "public"."berries" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "berry_id" integer not null,
    "name" text not null,
    "growth_time" integer,
    "max_harvest" integer,
    "natural_gift_power" integer,
    "size" integer,
    "smoothness" integer,
    "soil_dryness" integer,
    "firmness_id" integer,
    "flavors" jsonb,
    "item_id" integer,
    "natural_gift_type_id" integer,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."berries" enable row level security;


  create table "public"."berry_firmnesses" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "firmness_id" integer not null,
    "name" text not null,
    "berries" jsonb,
    "names" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."berry_firmnesses" enable row level security;


  create table "public"."berry_flavors" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "flavor_id" integer not null,
    "name" text not null,
    "berries" jsonb,
    "contest_type_id" integer,
    "names" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."berry_flavors" enable row level security;


  create table "public"."characteristics" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "characteristic_id" integer not null,
    "gene_modulo" integer,
    "possible_values" jsonb,
    "highest_stat_id" integer,
    "descriptions" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."characteristics" enable row level security;


  create table "public"."coaches" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "discord_id" text,
    "display_name" text not null,
    "email" text,
    "user_id" uuid,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."coaches" enable row level security;


  create table "public"."conferences" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "name" text not null,
    "season_id" uuid not null,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."conferences" enable row level security;


  create table "public"."contest_effects" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "contest_effect_id" integer not null,
    "appeal" integer,
    "jam" integer,
    "effect_entries" jsonb,
    "flavor_text_entries" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."contest_effects" enable row level security;


  create table "public"."contest_types" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "contest_type_id" integer not null,
    "name" text not null,
    "berry_flavor_id" integer,
    "names" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."contest_types" enable row level security;


  create table "public"."discord_webhooks" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "name" text not null,
    "webhook_url" text not null,
    "enabled" boolean default true,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."discord_webhooks" enable row level security;


  create table "public"."divisions" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "name" text not null,
    "conference_id" uuid not null,
    "season_id" uuid not null,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."divisions" enable row level security;


  create table "public"."draft_budgets" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "team_id" uuid not null,
    "season_id" uuid not null,
    "total_points" integer default 120,
    "spent_points" integer default 0,
    "remaining_points" integer generated always as ((total_points - spent_points)) stored,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."draft_budgets" enable row level security;


  create table "public"."draft_pool" (
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
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."draft_pool" enable row level security;


  create table "public"."draft_sessions" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "season_id" uuid,
    "session_name" text,
    "status" text not null default 'pending'::text,
    "draft_type" text default 'snake'::text,
    "total_teams" integer not null default 20,
    "total_rounds" integer not null default 11,
    "current_pick_number" integer default 1,
    "current_team_id" uuid,
    "current_round" integer default 1,
    "turn_order" jsonb default '[]'::jsonb,
    "pick_time_limit_seconds" integer default 45,
    "auto_draft_enabled" boolean default false,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."draft_sessions" enable row level security;


  create table "public"."egg_groups" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "egg_group_id" integer not null,
    "name" text not null,
    "names" jsonb,
    "pokemon_species" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."egg_groups" enable row level security;


  create table "public"."encounter_condition_values" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "encounter_condition_value_id" integer not null,
    "name" text not null,
    "condition_id" integer,
    "names" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."encounter_condition_values" enable row level security;


  create table "public"."encounter_conditions" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "encounter_condition_id" integer not null,
    "name" text not null,
    "values" jsonb,
    "names" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."encounter_conditions" enable row level security;


  create table "public"."encounter_methods" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "encounter_method_id" integer not null,
    "name" text not null,
    "order" integer,
    "names" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."encounter_methods" enable row level security;


  create table "public"."evolution_chains" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "evolution_chain_id" integer not null,
    "baby_trigger_item_id" integer,
    "chain_data" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."evolution_chains" enable row level security;


  create table "public"."evolution_triggers" (
    "trigger_id" integer not null,
    "name" text not null,
    "names" jsonb,
    "pokemon_species" jsonb,
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."evolution_triggers" enable row level security;


  create table "public"."genders" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "gender_id" integer not null,
    "name" text not null,
    "pokemon_species_details" jsonb,
    "required_for_evolution" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."genders" enable row level security;


  create table "public"."generations" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "generation_id" integer not null,
    "name" text not null,
    "abilities" jsonb,
    "main_region_id" integer,
    "moves" jsonb,
    "pokemon_species" jsonb,
    "types" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."generations" enable row level security;


  create table "public"."google_sheets_config" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "spreadsheet_id" text not null,
    "service_account_email" text,
    "service_account_private_key" text,
    "enabled" boolean default true,
    "sync_schedule" text default 'manual'::text,
    "last_sync_at" timestamp with time zone,
    "last_sync_status" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "created_by" uuid
      );


alter table "public"."google_sheets_config" enable row level security;


  create table "public"."growth_rates" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "growth_rate_id" integer not null,
    "name" text not null,
    "formula" text,
    "descriptions" jsonb,
    "levels" jsonb,
    "pokemon_species" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."growth_rates" enable row level security;


  create table "public"."item_attributes" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "item_attribute_id" integer not null,
    "name" text not null,
    "items" jsonb,
    "names" jsonb,
    "descriptions" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."item_attributes" enable row level security;


  create table "public"."item_categories" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "item_category_id" integer not null,
    "name" text not null,
    "items" jsonb,
    "names" jsonb,
    "pocket_id" integer,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."item_categories" enable row level security;


  create table "public"."item_fling_effects" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "item_fling_effect_id" integer not null,
    "name" text not null,
    "effect_entries" jsonb,
    "items" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."item_fling_effects" enable row level security;


  create table "public"."item_pockets" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "item_pocket_id" integer not null,
    "name" text not null,
    "categories" jsonb,
    "names" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."item_pockets" enable row level security;


  create table "public"."items" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "item_id" integer not null,
    "name" text not null,
    "cost" integer,
    "fling_power" integer,
    "fling_effect_id" integer,
    "attributes" jsonb,
    "category_id" integer,
    "effect_entries" jsonb,
    "flavor_text_entries" jsonb,
    "game_indices" jsonb,
    "sprites" jsonb,
    "held_by_pokemon" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."items" enable row level security;


  create table "public"."languages" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "language_id" integer not null,
    "name" text not null,
    "official" boolean default false,
    "iso639" text,
    "iso3166" text,
    "names" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."languages" enable row level security;


  create table "public"."league_config" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "config_type" text not null,
    "section_title" text not null,
    "section_type" text,
    "content" text,
    "subsections" jsonb default '[]'::jsonb,
    "embedded_tables" jsonb default '[]'::jsonb,
    "sheet_name" text,
    "extracted_at" timestamp with time zone default now(),
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."league_config" enable row level security;


  create table "public"."location_areas" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "location_area_id" integer not null,
    "name" text not null,
    "game_index" integer,
    "location_id" integer,
    "encounter_method_rates" jsonb,
    "pokemon_encounters" jsonb,
    "names" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."location_areas" enable row level security;


  create table "public"."locations" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "location_id" integer not null,
    "name" text not null,
    "region_id" integer,
    "names" jsonb,
    "game_indices" jsonb,
    "areas" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."locations" enable row level security;


  create table "public"."machines" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "machine_id" integer not null,
    "item_id" integer,
    "move_id" integer,
    "version_group_id" integer,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."machines" enable row level security;


  create table "public"."matches" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "week" integer not null,
    "team1_id" uuid not null,
    "team2_id" uuid not null,
    "winner_id" uuid,
    "team1_score" integer default 0,
    "team2_score" integer default 0,
    "differential" integer default 0,
    "is_playoff" boolean default false,
    "playoff_round" text,
    "played_at" timestamp with time zone,
    "created_at" timestamp with time zone default now(),
    "matchweek_id" uuid,
    "season_id" uuid,
    "scheduled_time" timestamp with time zone,
    "status" text default 'scheduled'::text,
    "replay_url" text,
    "submitted_by" uuid,
    "approved_by" uuid,
    "notes" text,
    "showdown_room_id" text,
    "showdown_room_url" text
      );


alter table "public"."matches" enable row level security;


  create table "public"."matchweeks" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "season_id" uuid not null,
    "week_number" integer not null,
    "start_date" date not null,
    "end_date" date not null,
    "is_playoff" boolean default false,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."matchweeks" enable row level security;


  create table "public"."move_ailments" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "move_ailment_id" integer not null,
    "name" text not null,
    "moves" jsonb,
    "names" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."move_ailments" enable row level security;


  create table "public"."move_battle_styles" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "move_battle_style_id" integer not null,
    "name" text not null,
    "names" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."move_battle_styles" enable row level security;


  create table "public"."move_categories" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "move_category_id" integer not null,
    "name" text not null,
    "moves" jsonb,
    "descriptions" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."move_categories" enable row level security;


  create table "public"."move_damage_classes" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "move_damage_class_id" integer not null,
    "name" text not null,
    "descriptions" jsonb,
    "moves" jsonb,
    "names" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."move_damage_classes" enable row level security;


  create table "public"."move_learn_methods" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "move_learn_method_id" integer not null,
    "name" text not null,
    "descriptions" jsonb,
    "names" jsonb,
    "version_groups" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."move_learn_methods" enable row level security;


  create table "public"."move_targets" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "move_target_id" integer not null,
    "name" text not null,
    "descriptions" jsonb,
    "moves" jsonb,
    "names" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."move_targets" enable row level security;


  create table "public"."moves" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "move_id" integer not null,
    "name" text not null,
    "accuracy" integer,
    "effect_chance" integer,
    "pp" integer,
    "priority" integer,
    "power" integer,
    "damage_class_id" integer,
    "type_id" integer,
    "target_id" integer,
    "effect_entries" jsonb,
    "flavor_text_entries" jsonb,
    "stat_changes" jsonb,
    "meta" jsonb,
    "generation_id" integer,
    "learned_by_pokemon" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."moves" enable row level security;


  create table "public"."natures" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "nature_id" integer not null,
    "name" text not null,
    "decreased_stat_id" integer,
    "increased_stat_id" integer,
    "hates_flavor_id" integer,
    "likes_flavor_id" integer,
    "pokeathlon_stat_changes" jsonb,
    "move_battle_style_preferences" jsonb,
    "names" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."natures" enable row level security;


  create table "public"."pal_park_areas" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "pal_park_area_id" integer not null,
    "name" text not null,
    "names" jsonb,
    "pokemon_encounters" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."pal_park_areas" enable row level security;


  create table "public"."pokeapi_resource_cache" (
    "url" text not null,
    "etag" text,
    "last_modified" timestamp with time zone,
    "resource_type" text not null,
    "resource_id" integer,
    "resource_name" text,
    "data_hash" text,
    "cached_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."pokeapi_resource_cache" enable row level security;


  create table "public"."pokeapi_resources" (
    "id" bigint generated by default as identity not null,
    "resource_type" text not null,
    "resource_key" text not null,
    "name" text,
    "url" text not null,
    "data" jsonb not null,
    "etag" text,
    "last_modified" text,
    "fetched_at" timestamp with time zone not null default now(),
    "schema_version" integer not null default 1,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."pokeapi_resources" enable row level security;


  create table "public"."pokeathlon_stats" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "pokeathlon_stat_id" integer not null,
    "name" text not null,
    "affecting_natures" jsonb,
    "names" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."pokeathlon_stats" enable row level security;


  create table "public"."pokedexes" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "pokedex_id" integer not null,
    "name" text not null,
    "is_main_series" boolean default false,
    "descriptions" jsonb,
    "names" jsonb,
    "pokemon_entries" jsonb,
    "region_id" integer,
    "version_groups" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."pokedexes" enable row level security;


  create table "public"."pokemon" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "name" text not null,
    "type1" text,
    "type2" text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."pokemon" enable row level security;


  create table "public"."pokemon_abilities" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "pokemon_id" integer,
    "ability_id" integer,
    "is_hidden" boolean default false,
    "slot" integer,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."pokemon_abilities" enable row level security;


  create table "public"."pokemon_cache" (
    "pokemon_id" integer not null,
    "name" text not null,
    "types" text[] not null,
    "base_stats" jsonb not null,
    "abilities" text[] not null,
    "moves" text[] not null,
    "sprite_url" text,
    "draft_cost" integer default 10,
    "tier" text,
    "payload" jsonb not null,
    "fetched_at" timestamp with time zone default now(),
    "expires_at" timestamp with time zone default (now() + '30 days'::interval),
    "sprites" jsonb,
    "ability_details" jsonb[],
    "move_details" jsonb[],
    "evolution_chain" jsonb,
    "regional_forms" text[],
    "hidden_ability" text,
    "gender_rate" integer default '-1'::integer,
    "generation" integer,
    "height" integer,
    "weight" integer,
    "base_experience" integer
      );


alter table "public"."pokemon_cache" enable row level security;


  create table "public"."pokemon_colors" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "color_id" integer not null,
    "name" text not null,
    "names" jsonb,
    "pokemon_species" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."pokemon_colors" enable row level security;


  create table "public"."pokemon_comprehensive" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "pokemon_id" integer not null,
    "name" text not null,
    "base_experience" integer,
    "height" integer,
    "weight" integer,
    "order" integer,
    "is_default" boolean default true,
    "location_area_encounters" text,
    "sprites" jsonb,
    "species_id" integer,
    "form_id" integer,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "cries" jsonb,
    "past_types" jsonb,
    "past_abilities" jsonb,
    "game_indices" jsonb,
    "forms" jsonb
      );


alter table "public"."pokemon_comprehensive" enable row level security;


  create table "public"."pokemon_egg_groups" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "pokemon_species_id" integer not null,
    "egg_group_id" integer not null,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."pokemon_egg_groups" enable row level security;


  create table "public"."pokemon_forms" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "form_id" integer not null,
    "name" text not null,
    "order" integer,
    "form_order" integer,
    "is_default" boolean default false,
    "is_battle_only" boolean default false,
    "is_mega" boolean default false,
    "pokemon_id" integer,
    "version_group_id" integer,
    "form_names" jsonb,
    "form_sprites" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."pokemon_forms" enable row level security;


  create table "public"."pokemon_habitats" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "habitat_id" integer not null,
    "name" text not null,
    "names" jsonb,
    "pokemon_species" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."pokemon_habitats" enable row level security;


  create table "public"."pokemon_items" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "pokemon_id" integer,
    "item_id" integer,
    "version_details" jsonb,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."pokemon_items" enable row level security;


  create table "public"."pokemon_location_areas" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "pokemon_id" integer not null,
    "location_area_id" integer not null,
    "version_details" jsonb,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."pokemon_location_areas" enable row level security;


  create table "public"."pokemon_moves" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "pokemon_id" integer,
    "move_id" integer,
    "version_group_id" integer,
    "move_learn_method_id" integer,
    "level_learned_at" integer,
    "order" integer,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."pokemon_moves" enable row level security;


  create table "public"."pokemon_shapes" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "shape_id" integer not null,
    "name" text not null,
    "awesome_names" jsonb,
    "names" jsonb,
    "pokemon_species" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."pokemon_shapes" enable row level security;


  create table "public"."pokemon_species" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "species_id" integer not null,
    "name" text not null,
    "order" integer,
    "gender_rate" integer,
    "capture_rate" integer,
    "base_happiness" integer,
    "is_baby" boolean default false,
    "is_legendary" boolean default false,
    "is_mythical" boolean default false,
    "hatch_counter" integer,
    "has_gender_differences" boolean default false,
    "forms_switchable" boolean default false,
    "growth_rate_id" integer,
    "habitat_id" integer,
    "generation_id" integer,
    "evolution_chain_id" integer,
    "color_id" integer,
    "shape_id" integer,
    "egg_groups" jsonb,
    "flavor_text_entries" jsonb,
    "form_descriptions" jsonb,
    "genera" jsonb,
    "names" jsonb,
    "pal_park_encounters" jsonb,
    "pokedex_numbers" jsonb,
    "varieties" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "evolves_from_species_id" integer
      );


alter table "public"."pokemon_species" enable row level security;


  create table "public"."pokemon_stats" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "pokemon_id" integer not null,
    "stat_id" integer,
    "base_stat" integer not null,
    "effort" integer default 0,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."pokemon_stats" enable row level security;


  create table "public"."pokemon_types" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "pokemon_id" integer,
    "type_id" integer,
    "slot" integer,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."pokemon_types" enable row level security;


  create table "public"."pokepedia_assets" (
    "id" bigint generated by default as identity not null,
    "asset_kind" text not null,
    "resource_type" text,
    "resource_id" integer,
    "source_url" text not null,
    "bucket" text not null,
    "path" text not null,
    "content_type" text,
    "bytes" integer,
    "sha256" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."pokepedia_assets" enable row level security;


  create table "public"."pokepedia_pokemon" (
    "id" integer not null,
    "name" text not null,
    "species_name" text,
    "height" integer,
    "weight" integer,
    "base_experience" integer,
    "is_default" boolean,
    "sprite_front_default_path" text,
    "sprite_official_artwork_path" text,
    "updated_at" timestamp with time zone not null default now(),
    "created_at" timestamp with time zone default now(),
    "types" jsonb,
    "type_primary" text,
    "type_secondary" text,
    "base_stats" jsonb,
    "total_base_stat" integer,
    "abilities" jsonb,
    "ability_primary" text,
    "ability_hidden" text,
    "order" integer,
    "generation" integer,
    "cry_latest_path" text,
    "cry_legacy_path" text,
    "moves_count" integer,
    "forms_count" integer
      );


alter table "public"."pokepedia_pokemon" enable row level security;


  create table "public"."profiles" (
    "id" uuid not null,
    "username" text,
    "display_name" text,
    "avatar_url" text,
    "bio" text,
    "role" text not null default 'viewer'::text,
    "permissions" jsonb default '[]'::jsonb,
    "team_id" uuid,
    "discord_id" text,
    "discord_username" text,
    "discord_avatar" text,
    "is_active" boolean default true,
    "email_verified" boolean default false,
    "onboarding_completed" boolean default false,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "last_seen_at" timestamp with time zone,
    "showdown_username" text,
    "showdown_account_synced" boolean default false,
    "showdown_account_synced_at" timestamp with time zone
      );


alter table "public"."profiles" enable row level security;


  create table "public"."regions" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "region_id" integer not null,
    "name" text not null,
    "locations" jsonb,
    "main_generation_id" integer,
    "names" jsonb,
    "pokedexes" jsonb,
    "version_groups" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."regions" enable row level security;


  create table "public"."role_permissions" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "role" text not null,
    "permissions" jsonb not null,
    "description" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."role_permissions" enable row level security;


  create table "public"."seasons" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "name" text not null,
    "start_date" date not null,
    "end_date" date,
    "is_current" boolean default false,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."seasons" enable row level security;


  create table "public"."sheet_mappings" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "config_id" uuid not null,
    "sheet_name" text not null,
    "table_name" text not null,
    "range" text default 'A:Z'::text,
    "enabled" boolean default true,
    "sync_order" integer default 0,
    "column_mapping" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."sheet_mappings" enable row level security;


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


  create table "public"."showdown_teams" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "team_name" text not null,
    "generation" integer,
    "format" text,
    "folder_path" text,
    "team_text" text not null,
    "canonical_text" text not null,
    "pokemon_data" jsonb not null default '[]'::jsonb,
    "team_id" uuid,
    "coach_id" uuid,
    "season_id" uuid,
    "pokemon_count" integer not null default 0,
    "is_validated" boolean default false,
    "validation_errors" text[],
    "source" text,
    "tags" text[],
    "notes" text,
    "original_filename" text,
    "file_size" integer,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "last_used_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "is_stock" boolean default false,
    "user_tags" text[] default '{}'::text[]
      );


alter table "public"."showdown_teams" enable row level security;


  create table "public"."stats" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "stat_id" integer not null,
    "name" text not null,
    "is_battle_only" boolean default false,
    "game_index" integer,
    "move_damage_class_id" integer,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."stats" enable row level security;


  create table "public"."super_contest_effects" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "super_contest_effect_id" integer not null,
    "appeal" integer,
    "flavor_text_entries" jsonb,
    "moves" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."super_contest_effects" enable row level security;


  create table "public"."sync_jobs" (
    "job_id" uuid not null default extensions.uuid_generate_v4(),
    "job_type" text not null,
    "status" text not null default 'running'::text,
    "triggered_by" text not null default 'manual'::text,
    "pokemon_synced" integer default 0,
    "pokemon_failed" integer default 0,
    "error_log" jsonb default '{}'::jsonb,
    "config" jsonb default '{}'::jsonb,
    "started_at" timestamp with time zone default now(),
    "completed_at" timestamp with time zone,
    "sync_type" text,
    "priority" text default 'standard'::text,
    "phase" text,
    "current_chunk" integer default 0,
    "total_chunks" integer default 0,
    "chunk_size" integer default 50,
    "start_id" integer,
    "end_id" integer,
    "progress_percent" numeric(5,2) default 0,
    "estimated_completion" timestamp with time zone,
    "last_heartbeat" timestamp with time zone default now()
      );


alter table "public"."sync_jobs" enable row level security;


  create table "public"."sync_log" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "sync_type" text not null,
    "status" text not null,
    "records_processed" integer default 0,
    "error_message" text,
    "synced_at" timestamp with time zone default now()
      );


alter table "public"."sync_log" enable row level security;


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


  create table "public"."team_rosters" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "team_id" uuid not null,
    "pokemon_id" uuid not null,
    "draft_round" integer not null,
    "draft_order" integer not null,
    "draft_points" integer default 0,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."team_rosters" enable row level security;


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


  create table "public"."teams" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "name" text not null,
    "coach_name" text not null,
    "division" text not null,
    "conference" text not null,
    "wins" integer default 0,
    "losses" integer default 0,
    "differential" integer default 0,
    "strength_of_schedule" numeric(4,3) default 0,
    "logo_url" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "season_id" uuid,
    "division_id" uuid,
    "coach_id" uuid,
    "current_streak" integer default 0,
    "streak_type" text
      );


alter table "public"."teams" enable row level security;


  create table "public"."trade_listings" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "team_id" uuid not null,
    "pokemon_id" integer not null,
    "status" text default 'available'::text,
    "notes" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."trade_listings" enable row level security;


  create table "public"."trade_offers" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "listing_id" uuid not null,
    "offering_team_id" uuid not null,
    "offered_pokemon_id" integer not null,
    "status" text default 'pending'::text,
    "notes" text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."trade_offers" enable row level security;


  create table "public"."trade_transactions" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "season_id" uuid not null,
    "team_a_id" uuid not null,
    "team_b_id" uuid not null,
    "team_a_pokemon_id" integer not null,
    "team_b_pokemon_id" integer not null,
    "approved_by" uuid,
    "completed_at" timestamp with time zone default now()
      );


alter table "public"."trade_transactions" enable row level security;


  create table "public"."types" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "type_id" integer not null,
    "name" text not null,
    "damage_relations" jsonb,
    "game_indices" jsonb,
    "generation_id" integer,
    "move_damage_class_id" integer,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."types" enable row level security;


  create table "public"."user_activity_log" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "user_id" uuid,
    "action" text not null,
    "resource_type" text,
    "resource_id" uuid,
    "metadata" jsonb,
    "ip_address" inet,
    "user_agent" text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."user_activity_log" enable row level security;


  create table "public"."version_groups" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "version_group_id" integer not null,
    "name" text not null,
    "order" integer,
    "generation_id" integer,
    "move_learn_methods" jsonb,
    "pokedexes" jsonb,
    "regions" jsonb,
    "versions" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."version_groups" enable row level security;


  create table "public"."versions" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "version_id" integer not null,
    "name" text not null,
    "names" jsonb,
    "version_group_id" integer,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."versions" enable row level security;

alter sequence "public"."battle_events_id_seq" owned by "public"."battle_events"."id";

CREATE UNIQUE INDEX abilities_ability_id_key ON public.abilities USING btree (ability_id);

CREATE UNIQUE INDEX abilities_name_key ON public.abilities USING btree (name);

CREATE UNIQUE INDEX abilities_pkey ON public.abilities USING btree (id);

CREATE UNIQUE INDEX battle_events_pkey ON public.battle_events USING btree (id);

CREATE UNIQUE INDEX battle_sessions_pkey ON public.battle_sessions USING btree (id);

CREATE UNIQUE INDEX berries_berry_id_key ON public.berries USING btree (berry_id);

CREATE UNIQUE INDEX berries_name_key ON public.berries USING btree (name);

CREATE UNIQUE INDEX berries_pkey ON public.berries USING btree (id);

CREATE UNIQUE INDEX berry_firmnesses_firmness_id_key ON public.berry_firmnesses USING btree (firmness_id);

CREATE UNIQUE INDEX berry_firmnesses_name_key ON public.berry_firmnesses USING btree (name);

CREATE UNIQUE INDEX berry_firmnesses_pkey ON public.berry_firmnesses USING btree (id);

CREATE UNIQUE INDEX berry_flavors_flavor_id_key ON public.berry_flavors USING btree (flavor_id);

CREATE UNIQUE INDEX berry_flavors_name_key ON public.berry_flavors USING btree (name);

CREATE UNIQUE INDEX berry_flavors_pkey ON public.berry_flavors USING btree (id);

CREATE UNIQUE INDEX characteristics_characteristic_id_key ON public.characteristics USING btree (characteristic_id);

CREATE UNIQUE INDEX characteristics_pkey ON public.characteristics USING btree (id);

CREATE UNIQUE INDEX coaches_discord_id_key ON public.coaches USING btree (discord_id);

CREATE UNIQUE INDEX coaches_pkey ON public.coaches USING btree (id);

CREATE UNIQUE INDEX conferences_name_key ON public.conferences USING btree (name);

CREATE UNIQUE INDEX conferences_pkey ON public.conferences USING btree (id);

CREATE UNIQUE INDEX contest_effects_contest_effect_id_key ON public.contest_effects USING btree (contest_effect_id);

CREATE UNIQUE INDEX contest_effects_pkey ON public.contest_effects USING btree (id);

CREATE UNIQUE INDEX contest_types_contest_type_id_key ON public.contest_types USING btree (contest_type_id);

CREATE UNIQUE INDEX contest_types_name_key ON public.contest_types USING btree (name);

CREATE UNIQUE INDEX contest_types_pkey ON public.contest_types USING btree (id);

CREATE UNIQUE INDEX discord_webhooks_name_key ON public.discord_webhooks USING btree (name);

CREATE UNIQUE INDEX discord_webhooks_pkey ON public.discord_webhooks USING btree (id);

CREATE UNIQUE INDEX divisions_name_conference_id_key ON public.divisions USING btree (name, conference_id);

CREATE UNIQUE INDEX divisions_pkey ON public.divisions USING btree (id);

CREATE UNIQUE INDEX draft_budgets_pkey ON public.draft_budgets USING btree (id);

CREATE UNIQUE INDEX draft_budgets_team_id_season_id_key ON public.draft_budgets USING btree (team_id, season_id);

CREATE UNIQUE INDEX draft_pool_pkey ON public.draft_pool USING btree (id);

CREATE UNIQUE INDEX draft_pool_sheet_name_pokemon_name_point_value_key ON public.draft_pool USING btree (sheet_name, pokemon_name, point_value);

CREATE UNIQUE INDEX draft_sessions_pkey ON public.draft_sessions USING btree (id);

CREATE UNIQUE INDEX egg_groups_egg_group_id_key ON public.egg_groups USING btree (egg_group_id);

CREATE UNIQUE INDEX egg_groups_name_key ON public.egg_groups USING btree (name);

CREATE UNIQUE INDEX egg_groups_pkey ON public.egg_groups USING btree (id);

CREATE UNIQUE INDEX encounter_condition_values_encounter_condition_value_id_key ON public.encounter_condition_values USING btree (encounter_condition_value_id);

CREATE UNIQUE INDEX encounter_condition_values_name_key ON public.encounter_condition_values USING btree (name);

CREATE UNIQUE INDEX encounter_condition_values_pkey ON public.encounter_condition_values USING btree (id);

CREATE UNIQUE INDEX encounter_conditions_encounter_condition_id_key ON public.encounter_conditions USING btree (encounter_condition_id);

CREATE UNIQUE INDEX encounter_conditions_name_key ON public.encounter_conditions USING btree (name);

CREATE UNIQUE INDEX encounter_conditions_pkey ON public.encounter_conditions USING btree (id);

CREATE UNIQUE INDEX encounter_methods_encounter_method_id_key ON public.encounter_methods USING btree (encounter_method_id);

CREATE UNIQUE INDEX encounter_methods_name_key ON public.encounter_methods USING btree (name);

CREATE UNIQUE INDEX encounter_methods_pkey ON public.encounter_methods USING btree (id);

CREATE UNIQUE INDEX evolution_chains_evolution_chain_id_key ON public.evolution_chains USING btree (evolution_chain_id);

CREATE UNIQUE INDEX evolution_chains_pkey ON public.evolution_chains USING btree (id);

CREATE UNIQUE INDEX evolution_triggers_pkey ON public.evolution_triggers USING btree (trigger_id);

CREATE UNIQUE INDEX genders_gender_id_key ON public.genders USING btree (gender_id);

CREATE UNIQUE INDEX genders_name_key ON public.genders USING btree (name);

CREATE UNIQUE INDEX genders_pkey ON public.genders USING btree (id);

CREATE UNIQUE INDEX generations_generation_id_key ON public.generations USING btree (generation_id);

CREATE UNIQUE INDEX generations_name_key ON public.generations USING btree (name);

CREATE UNIQUE INDEX generations_pkey ON public.generations USING btree (id);

CREATE UNIQUE INDEX google_sheets_config_pkey ON public.google_sheets_config USING btree (id);

CREATE UNIQUE INDEX growth_rates_growth_rate_id_key ON public.growth_rates USING btree (growth_rate_id);

CREATE UNIQUE INDEX growth_rates_name_key ON public.growth_rates USING btree (name);

CREATE UNIQUE INDEX growth_rates_pkey ON public.growth_rates USING btree (id);

CREATE INDEX idx_abilities_name_fts ON public.abilities USING gin (to_tsvector('english'::regconfig, name));

CREATE INDEX idx_battle_events_battle ON public.battle_events USING btree (battle_id);

CREATE INDEX idx_battle_sessions_match ON public.battle_sessions USING btree (match_id);

CREATE INDEX idx_berries_firmness ON public.berries USING btree (firmness_id);

CREATE INDEX idx_berries_name ON public.berries USING btree (name);

CREATE INDEX idx_berries_name_fts ON public.berries USING gin (to_tsvector('english'::regconfig, name));

CREATE INDEX idx_coaches_discord ON public.coaches USING btree (discord_id);

CREATE INDEX idx_draft_pool_available ON public.draft_pool USING btree (is_available) WHERE (is_available = true);

CREATE INDEX idx_draft_pool_generation ON public.draft_pool USING btree (generation);

CREATE INDEX idx_draft_pool_point_value ON public.draft_pool USING btree (point_value);

CREATE INDEX idx_draft_pool_pokemon_name ON public.draft_pool USING btree (pokemon_name);

CREATE INDEX idx_draft_pool_sheet_name ON public.draft_pool USING btree (sheet_name);

CREATE INDEX idx_draft_sessions_current_team ON public.draft_sessions USING btree (current_team_id);

CREATE INDEX idx_draft_sessions_season ON public.draft_sessions USING btree (season_id);

CREATE INDEX idx_draft_sessions_status ON public.draft_sessions USING btree (status);

CREATE UNIQUE INDEX idx_draft_sessions_unique_active_per_season ON public.draft_sessions USING btree (season_id) WHERE (status = 'active'::text);

CREATE INDEX idx_evolution_triggers_name ON public.evolution_triggers USING btree (name);

CREATE INDEX idx_google_sheets_config_enabled ON public.google_sheets_config USING btree (enabled);

CREATE INDEX idx_items_category ON public.items USING btree (category_id);

CREATE INDEX idx_items_name ON public.items USING btree (name);

CREATE INDEX idx_items_name_fts ON public.items USING gin (to_tsvector('english'::regconfig, name));

CREATE INDEX idx_league_config_section_type ON public.league_config USING btree (section_type);

CREATE INDEX idx_league_config_type ON public.league_config USING btree (config_type);

CREATE INDEX idx_location_areas_location ON public.location_areas USING btree (location_id);

CREATE INDEX idx_location_areas_name_fts ON public.location_areas USING gin (to_tsvector('english'::regconfig, name));

CREATE INDEX idx_locations_name_fts ON public.locations USING gin (to_tsvector('english'::regconfig, name));

CREATE INDEX idx_locations_region ON public.locations USING btree (region_id);

CREATE INDEX idx_machines_item ON public.machines USING btree (item_id);

CREATE INDEX idx_machines_move ON public.machines USING btree (move_id);

CREATE INDEX idx_matches_playoff ON public.matches USING btree (is_playoff);

CREATE INDEX idx_matches_showdown_room_id ON public.matches USING btree (showdown_room_id) WHERE (showdown_room_id IS NOT NULL);

CREATE INDEX idx_matches_week ON public.matches USING btree (week);

CREATE INDEX idx_matchweeks_season ON public.matchweeks USING btree (season_id);

CREATE INDEX idx_moves_name_fts ON public.moves USING gin (to_tsvector('english'::regconfig, name));

CREATE INDEX idx_natures_decreased_stat ON public.natures USING btree (decreased_stat_id);

CREATE INDEX idx_natures_increased_stat ON public.natures USING btree (increased_stat_id);

CREATE INDEX idx_natures_name ON public.natures USING btree (name);

CREATE INDEX idx_natures_name_fts ON public.natures USING gin (to_tsvector('english'::regconfig, name));

CREATE INDEX idx_pokeapi_cache_type ON public.pokeapi_resource_cache USING btree (resource_type);

CREATE INDEX idx_pokeapi_cache_type_id ON public.pokeapi_resource_cache USING btree (resource_type, resource_id);

CREATE INDEX idx_pokeapi_cache_updated ON public.pokeapi_resource_cache USING btree (updated_at);

CREATE INDEX idx_pokemon_abilities_ability ON public.pokemon_abilities USING btree (ability_id);

CREATE INDEX idx_pokemon_abilities_pokemon ON public.pokemon_abilities USING btree (pokemon_id);

CREATE INDEX idx_pokemon_cache_cost ON public.pokemon_cache USING btree (draft_cost);

CREATE INDEX idx_pokemon_cache_generation ON public.pokemon_cache USING btree (generation);

CREATE INDEX idx_pokemon_cache_regional_forms ON public.pokemon_cache USING gin (regional_forms);

CREATE INDEX idx_pokemon_cache_tier ON public.pokemon_cache USING btree (tier);

CREATE INDEX idx_pokemon_egg_groups_egg_group ON public.pokemon_egg_groups USING btree (egg_group_id);

CREATE INDEX idx_pokemon_egg_groups_species ON public.pokemon_egg_groups USING btree (pokemon_species_id);

CREATE INDEX idx_pokemon_items_item ON public.pokemon_items USING btree (item_id);

CREATE INDEX idx_pokemon_items_pokemon ON public.pokemon_items USING btree (pokemon_id);

CREATE INDEX idx_pokemon_location_areas_location ON public.pokemon_location_areas USING btree (location_area_id);

CREATE INDEX idx_pokemon_location_areas_pokemon ON public.pokemon_location_areas USING btree (pokemon_id);

CREATE INDEX idx_pokemon_moves_move ON public.pokemon_moves USING btree (move_id);

CREATE INDEX idx_pokemon_moves_pokemon ON public.pokemon_moves USING btree (pokemon_id);

CREATE INDEX idx_pokemon_name_fts ON public.pokemon_comprehensive USING gin (to_tsvector('english'::regconfig, name));

CREATE INDEX idx_pokemon_species_evolution_chain ON public.pokemon_species USING btree (evolution_chain_id);

CREATE INDEX idx_pokemon_species_generation ON public.pokemon_species USING btree (generation_id);

CREATE INDEX idx_pokemon_species_name ON public.pokemon_species USING btree (name);

CREATE INDEX idx_pokemon_species_name_fts ON public.pokemon_species USING gin (to_tsvector('english'::regconfig, name));

CREATE INDEX idx_pokemon_stats_pokemon ON public.pokemon_stats USING btree (pokemon_id);

CREATE INDEX idx_pokemon_stats_stat ON public.pokemon_stats USING btree (stat_id);

CREATE INDEX idx_pokemon_types_pokemon ON public.pokemon_types USING btree (pokemon_id);

CREATE INDEX idx_pokemon_types_type ON public.pokemon_types USING btree (type_id);

CREATE INDEX idx_profiles_discord_id ON public.profiles USING btree (discord_id);

CREATE INDEX idx_profiles_role ON public.profiles USING btree (role);

CREATE INDEX idx_profiles_showdown_username ON public.profiles USING btree (showdown_username);

CREATE UNIQUE INDEX idx_profiles_showdown_username_unique ON public.profiles USING btree (showdown_username) WHERE (showdown_username IS NOT NULL);

CREATE INDEX idx_profiles_team_id ON public.profiles USING btree (team_id);

CREATE INDEX idx_profiles_username ON public.profiles USING btree (username);

CREATE INDEX idx_regions_name_fts ON public.regions USING gin (to_tsvector('english'::regconfig, name));

CREATE INDEX idx_sheet_mappings_config ON public.sheet_mappings USING btree (config_id);

CREATE INDEX idx_sheet_mappings_order ON public.sheet_mappings USING btree (config_id, sync_order);

CREATE INDEX idx_showdown_client_teams_date ON public.showdown_client_teams USING btree (date DESC);

CREATE INDEX idx_showdown_client_teams_format ON public.showdown_client_teams USING btree (format);

CREATE INDEX idx_showdown_client_teams_ownerid ON public.showdown_client_teams USING btree (ownerid);

CREATE INDEX idx_showdown_teams_coach_id ON public.showdown_teams USING btree (coach_id) WHERE (coach_id IS NOT NULL);

CREATE INDEX idx_showdown_teams_created_at ON public.showdown_teams USING btree (created_at DESC);

CREATE INDEX idx_showdown_teams_deleted_at ON public.showdown_teams USING btree (deleted_at) WHERE (deleted_at IS NULL);

CREATE INDEX idx_showdown_teams_folder_path ON public.showdown_teams USING btree (folder_path) WHERE (folder_path IS NOT NULL);

CREATE INDEX idx_showdown_teams_format ON public.showdown_teams USING btree (format) WHERE (format IS NOT NULL);

CREATE INDEX idx_showdown_teams_generation ON public.showdown_teams USING btree (generation) WHERE (generation IS NOT NULL);

CREATE INDEX idx_showdown_teams_is_stock ON public.showdown_teams USING btree (is_stock) WHERE (is_stock = true);

CREATE INDEX idx_showdown_teams_pokemon_data ON public.showdown_teams USING gin (pokemon_data);

CREATE INDEX idx_showdown_teams_search ON public.showdown_teams USING gin (to_tsvector('english'::regconfig, ((COALESCE(team_name, ''::text) || ' '::text) || COALESCE(notes, ''::text))));

CREATE INDEX idx_showdown_teams_season_id ON public.showdown_teams USING btree (season_id) WHERE (season_id IS NOT NULL);

CREATE INDEX idx_showdown_teams_tags ON public.showdown_teams USING gin (tags);

CREATE INDEX idx_showdown_teams_team_id ON public.showdown_teams USING btree (team_id) WHERE (team_id IS NOT NULL);

CREATE INDEX idx_sync_jobs_active ON public.sync_jobs USING btree (status, sync_type) WHERE (status = 'running'::text);

CREATE INDEX idx_sync_jobs_heartbeat ON public.sync_jobs USING btree (last_heartbeat) WHERE (status = 'running'::text);

CREATE INDEX idx_sync_jobs_priority ON public.sync_jobs USING btree (priority, status, started_at) WHERE (status = 'running'::text);

CREATE INDEX idx_sync_jobs_started_at ON public.sync_jobs USING btree (started_at DESC);

CREATE INDEX idx_sync_jobs_type_status ON public.sync_jobs USING btree (job_type, status);

CREATE INDEX idx_team_categories_featured ON public.team_categories USING btree (is_featured);

CREATE INDEX idx_team_categories_sort ON public.team_categories USING btree (sort_order);

CREATE INDEX idx_team_formats_active ON public.team_formats USING btree (is_active);

CREATE INDEX idx_team_formats_category ON public.team_formats USING btree (category);

CREATE INDEX idx_team_formats_generation ON public.team_formats USING btree (generation);

CREATE INDEX idx_team_formats_tier ON public.team_formats USING btree (tier);

CREATE INDEX idx_team_rosters_pokemon ON public.team_rosters USING btree (pokemon_id);

CREATE INDEX idx_team_rosters_team ON public.team_rosters USING btree (team_id);

CREATE INDEX idx_team_tag_assignments_tag ON public.team_tag_assignments USING btree (tag_id);

CREATE INDEX idx_team_tag_assignments_teamid ON public.team_tag_assignments USING btree (teamid);

CREATE INDEX idx_team_tags_name ON public.team_tags USING btree (tag_name);

CREATE INDEX idx_team_tags_type ON public.team_tags USING btree (tag_type);

CREATE INDEX idx_teams_conference ON public.teams USING btree (conference);

CREATE INDEX idx_teams_division ON public.teams USING btree (division);

CREATE INDEX idx_trade_listings_team ON public.trade_listings USING btree (team_id);

CREATE INDEX idx_types_name_fts ON public.types USING gin (to_tsvector('english'::regconfig, name));

CREATE INDEX idx_user_activity_action ON public.user_activity_log USING btree (action);

CREATE INDEX idx_user_activity_created_at ON public.user_activity_log USING btree (created_at DESC);

CREATE INDEX idx_user_activity_user_id ON public.user_activity_log USING btree (user_id);

CREATE UNIQUE INDEX item_attributes_item_attribute_id_key ON public.item_attributes USING btree (item_attribute_id);

CREATE UNIQUE INDEX item_attributes_name_key ON public.item_attributes USING btree (name);

CREATE UNIQUE INDEX item_attributes_pkey ON public.item_attributes USING btree (id);

CREATE UNIQUE INDEX item_categories_item_category_id_key ON public.item_categories USING btree (item_category_id);

CREATE UNIQUE INDEX item_categories_name_key ON public.item_categories USING btree (name);

CREATE UNIQUE INDEX item_categories_pkey ON public.item_categories USING btree (id);

CREATE UNIQUE INDEX item_fling_effects_item_fling_effect_id_key ON public.item_fling_effects USING btree (item_fling_effect_id);

CREATE UNIQUE INDEX item_fling_effects_name_key ON public.item_fling_effects USING btree (name);

CREATE UNIQUE INDEX item_fling_effects_pkey ON public.item_fling_effects USING btree (id);

CREATE UNIQUE INDEX item_pockets_item_pocket_id_key ON public.item_pockets USING btree (item_pocket_id);

CREATE UNIQUE INDEX item_pockets_name_key ON public.item_pockets USING btree (name);

CREATE UNIQUE INDEX item_pockets_pkey ON public.item_pockets USING btree (id);

CREATE UNIQUE INDEX items_item_id_key ON public.items USING btree (item_id);

CREATE UNIQUE INDEX items_name_key ON public.items USING btree (name);

CREATE UNIQUE INDEX items_pkey ON public.items USING btree (id);

CREATE UNIQUE INDEX languages_language_id_key ON public.languages USING btree (language_id);

CREATE UNIQUE INDEX languages_name_key ON public.languages USING btree (name);

CREATE UNIQUE INDEX languages_pkey ON public.languages USING btree (id);

CREATE UNIQUE INDEX league_config_config_type_section_title_key ON public.league_config USING btree (config_type, section_title);

CREATE UNIQUE INDEX league_config_pkey ON public.league_config USING btree (id);

CREATE UNIQUE INDEX location_areas_location_area_id_key ON public.location_areas USING btree (location_area_id);

CREATE UNIQUE INDEX location_areas_name_key ON public.location_areas USING btree (name);

CREATE UNIQUE INDEX location_areas_pkey ON public.location_areas USING btree (id);

CREATE UNIQUE INDEX locations_location_id_key ON public.locations USING btree (location_id);

CREATE UNIQUE INDEX locations_name_key ON public.locations USING btree (name);

CREATE UNIQUE INDEX locations_pkey ON public.locations USING btree (id);

CREATE UNIQUE INDEX machines_machine_id_key ON public.machines USING btree (machine_id);

CREATE UNIQUE INDEX machines_pkey ON public.machines USING btree (id);

CREATE UNIQUE INDEX matches_pkey ON public.matches USING btree (id);

CREATE UNIQUE INDEX matchweeks_pkey ON public.matchweeks USING btree (id);

CREATE UNIQUE INDEX matchweeks_season_id_week_number_key ON public.matchweeks USING btree (season_id, week_number);

CREATE UNIQUE INDEX move_ailments_move_ailment_id_key ON public.move_ailments USING btree (move_ailment_id);

CREATE UNIQUE INDEX move_ailments_name_key ON public.move_ailments USING btree (name);

CREATE UNIQUE INDEX move_ailments_pkey ON public.move_ailments USING btree (id);

CREATE UNIQUE INDEX move_battle_styles_move_battle_style_id_key ON public.move_battle_styles USING btree (move_battle_style_id);

CREATE UNIQUE INDEX move_battle_styles_name_key ON public.move_battle_styles USING btree (name);

CREATE UNIQUE INDEX move_battle_styles_pkey ON public.move_battle_styles USING btree (id);

CREATE UNIQUE INDEX move_categories_move_category_id_key ON public.move_categories USING btree (move_category_id);

CREATE UNIQUE INDEX move_categories_name_key ON public.move_categories USING btree (name);

CREATE UNIQUE INDEX move_categories_pkey ON public.move_categories USING btree (id);

CREATE UNIQUE INDEX move_damage_classes_move_damage_class_id_key ON public.move_damage_classes USING btree (move_damage_class_id);

CREATE UNIQUE INDEX move_damage_classes_name_key ON public.move_damage_classes USING btree (name);

CREATE UNIQUE INDEX move_damage_classes_pkey ON public.move_damage_classes USING btree (id);

CREATE UNIQUE INDEX move_learn_methods_move_learn_method_id_key ON public.move_learn_methods USING btree (move_learn_method_id);

CREATE UNIQUE INDEX move_learn_methods_name_key ON public.move_learn_methods USING btree (name);

CREATE UNIQUE INDEX move_learn_methods_pkey ON public.move_learn_methods USING btree (id);

CREATE UNIQUE INDEX move_targets_move_target_id_key ON public.move_targets USING btree (move_target_id);

CREATE UNIQUE INDEX move_targets_name_key ON public.move_targets USING btree (name);

CREATE UNIQUE INDEX move_targets_pkey ON public.move_targets USING btree (id);

CREATE UNIQUE INDEX moves_move_id_key ON public.moves USING btree (move_id);

CREATE UNIQUE INDEX moves_name_key ON public.moves USING btree (name);

CREATE UNIQUE INDEX moves_pkey ON public.moves USING btree (id);

CREATE UNIQUE INDEX natures_name_key ON public.natures USING btree (name);

CREATE UNIQUE INDEX natures_nature_id_key ON public.natures USING btree (nature_id);

CREATE UNIQUE INDEX natures_pkey ON public.natures USING btree (id);

CREATE UNIQUE INDEX pal_park_areas_name_key ON public.pal_park_areas USING btree (name);

CREATE UNIQUE INDEX pal_park_areas_pal_park_area_id_key ON public.pal_park_areas USING btree (pal_park_area_id);

CREATE UNIQUE INDEX pal_park_areas_pkey ON public.pal_park_areas USING btree (id);

CREATE UNIQUE INDEX pokeapi_resource_cache_pkey ON public.pokeapi_resource_cache USING btree (url);

CREATE INDEX pokeapi_resources_data_gin ON public.pokeapi_resources USING gin (data jsonb_path_ops);

CREATE UNIQUE INDEX pokeapi_resources_pkey ON public.pokeapi_resources USING btree (id);

CREATE INDEX pokeapi_resources_type_name_idx ON public.pokeapi_resources USING btree (resource_type, name);

CREATE UNIQUE INDEX pokeapi_resources_unique ON public.pokeapi_resources USING btree (resource_type, resource_key);

CREATE INDEX pokeapi_resources_url_idx ON public.pokeapi_resources USING btree (url);

CREATE UNIQUE INDEX pokeathlon_stats_name_key ON public.pokeathlon_stats USING btree (name);

CREATE UNIQUE INDEX pokeathlon_stats_pkey ON public.pokeathlon_stats USING btree (id);

CREATE UNIQUE INDEX pokeathlon_stats_pokeathlon_stat_id_key ON public.pokeathlon_stats USING btree (pokeathlon_stat_id);

CREATE UNIQUE INDEX pokedexes_name_key ON public.pokedexes USING btree (name);

CREATE UNIQUE INDEX pokedexes_pkey ON public.pokedexes USING btree (id);

CREATE UNIQUE INDEX pokedexes_pokedex_id_key ON public.pokedexes USING btree (pokedex_id);

CREATE UNIQUE INDEX pokemon_abilities_pkey ON public.pokemon_abilities USING btree (id);

CREATE UNIQUE INDEX pokemon_abilities_pokemon_id_ability_id_slot_key ON public.pokemon_abilities USING btree (pokemon_id, ability_id, slot);

CREATE UNIQUE INDEX pokemon_cache_pkey ON public.pokemon_cache USING btree (pokemon_id);

CREATE UNIQUE INDEX pokemon_colors_color_id_key ON public.pokemon_colors USING btree (color_id);

CREATE UNIQUE INDEX pokemon_colors_name_key ON public.pokemon_colors USING btree (name);

CREATE UNIQUE INDEX pokemon_colors_pkey ON public.pokemon_colors USING btree (id);

CREATE UNIQUE INDEX pokemon_egg_groups_pkey ON public.pokemon_egg_groups USING btree (id);

CREATE UNIQUE INDEX pokemon_egg_groups_pokemon_species_id_egg_group_id_key ON public.pokemon_egg_groups USING btree (pokemon_species_id, egg_group_id);

CREATE UNIQUE INDEX pokemon_forms_form_id_key ON public.pokemon_forms USING btree (form_id);

CREATE UNIQUE INDEX pokemon_forms_pkey ON public.pokemon_forms USING btree (id);

CREATE UNIQUE INDEX pokemon_habitats_habitat_id_key ON public.pokemon_habitats USING btree (habitat_id);

CREATE UNIQUE INDEX pokemon_habitats_name_key ON public.pokemon_habitats USING btree (name);

CREATE UNIQUE INDEX pokemon_habitats_pkey ON public.pokemon_habitats USING btree (id);

CREATE UNIQUE INDEX pokemon_items_pkey ON public.pokemon_items USING btree (id);

CREATE UNIQUE INDEX pokemon_items_pokemon_id_item_id_key ON public.pokemon_items USING btree (pokemon_id, item_id);

CREATE UNIQUE INDEX pokemon_location_areas_pkey ON public.pokemon_location_areas USING btree (id);

CREATE UNIQUE INDEX pokemon_location_areas_pokemon_id_location_area_id_key ON public.pokemon_location_areas USING btree (pokemon_id, location_area_id);

CREATE UNIQUE INDEX pokemon_moves_pkey ON public.pokemon_moves USING btree (id);

CREATE UNIQUE INDEX pokemon_moves_pokemon_id_move_id_version_group_id_move_lear_key ON public.pokemon_moves USING btree (pokemon_id, move_id, version_group_id, move_learn_method_id, level_learned_at);

CREATE UNIQUE INDEX pokemon_pkey ON public.pokemon_comprehensive USING btree (id);

CREATE UNIQUE INDEX pokemon_pkey1 ON public.pokemon USING btree (id);

CREATE UNIQUE INDEX pokemon_pokemon_id_key ON public.pokemon_comprehensive USING btree (pokemon_id);

CREATE UNIQUE INDEX pokemon_shapes_name_key ON public.pokemon_shapes USING btree (name);

CREATE UNIQUE INDEX pokemon_shapes_pkey ON public.pokemon_shapes USING btree (id);

CREATE UNIQUE INDEX pokemon_shapes_shape_id_key ON public.pokemon_shapes USING btree (shape_id);

CREATE UNIQUE INDEX pokemon_species_name_key ON public.pokemon_species USING btree (name);

CREATE UNIQUE INDEX pokemon_species_pkey ON public.pokemon_species USING btree (id);

CREATE UNIQUE INDEX pokemon_species_species_id_key ON public.pokemon_species USING btree (species_id);

CREATE UNIQUE INDEX pokemon_stats_new_pkey ON public.pokemon_stats USING btree (id);

CREATE UNIQUE INDEX pokemon_stats_new_pokemon_id_stat_id_key ON public.pokemon_stats USING btree (pokemon_id, stat_id);

CREATE UNIQUE INDEX pokemon_types_pkey ON public.pokemon_types USING btree (id);

CREATE UNIQUE INDEX pokemon_types_pokemon_id_type_id_slot_key ON public.pokemon_types USING btree (pokemon_id, type_id, slot);

CREATE UNIQUE INDEX pokepedia_assets_bucket_path_unique ON public.pokepedia_assets USING btree (bucket, path);

CREATE UNIQUE INDEX pokepedia_assets_pkey ON public.pokepedia_assets USING btree (id);

CREATE INDEX pokepedia_assets_resource_idx ON public.pokepedia_assets USING btree (resource_type, resource_id);

CREATE UNIQUE INDEX pokepedia_assets_source_unique ON public.pokepedia_assets USING btree (source_url);

CREATE INDEX pokepedia_pokemon_abilities_gin ON public.pokepedia_pokemon USING gin (abilities jsonb_path_ops);

CREATE INDEX pokepedia_pokemon_ability_primary_idx ON public.pokepedia_pokemon USING btree (ability_primary);

CREATE INDEX pokepedia_pokemon_base_stats_gin ON public.pokepedia_pokemon USING gin (base_stats jsonb_path_ops);

CREATE INDEX pokepedia_pokemon_generation_idx ON public.pokepedia_pokemon USING btree (generation);

CREATE INDEX pokepedia_pokemon_name_idx ON public.pokepedia_pokemon USING btree (name);

CREATE INDEX pokepedia_pokemon_order_idx ON public.pokepedia_pokemon USING btree ("order");

CREATE UNIQUE INDEX pokepedia_pokemon_pkey ON public.pokepedia_pokemon USING btree (id);

CREATE INDEX pokepedia_pokemon_species_name_idx ON public.pokepedia_pokemon USING btree (species_name);

CREATE INDEX pokepedia_pokemon_total_base_stat_idx ON public.pokepedia_pokemon USING btree (total_base_stat);

CREATE INDEX pokepedia_pokemon_type_primary_idx ON public.pokepedia_pokemon USING btree (type_primary);

CREATE INDEX pokepedia_pokemon_type_secondary_idx ON public.pokepedia_pokemon USING btree (type_secondary);

CREATE INDEX pokepedia_pokemon_types_gin ON public.pokepedia_pokemon USING gin (types jsonb_path_ops);

CREATE UNIQUE INDEX profiles_discord_id_key ON public.profiles USING btree (discord_id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX profiles_username_key ON public.profiles USING btree (username);

CREATE UNIQUE INDEX regions_name_key ON public.regions USING btree (name);

CREATE UNIQUE INDEX regions_pkey ON public.regions USING btree (id);

CREATE UNIQUE INDEX regions_region_id_key ON public.regions USING btree (region_id);

CREATE UNIQUE INDEX role_permissions_pkey ON public.role_permissions USING btree (id);

CREATE UNIQUE INDEX role_permissions_role_key ON public.role_permissions USING btree (role);

CREATE UNIQUE INDEX seasons_name_key ON public.seasons USING btree (name);

CREATE UNIQUE INDEX seasons_pkey ON public.seasons USING btree (id);

CREATE UNIQUE INDEX sheet_mappings_config_id_sheet_name_key ON public.sheet_mappings USING btree (config_id, sheet_name);

CREATE UNIQUE INDEX sheet_mappings_pkey ON public.sheet_mappings USING btree (id);

CREATE UNIQUE INDEX showdown_client_teams_pkey ON public.showdown_client_teams USING btree (teamid);

CREATE UNIQUE INDEX showdown_teams_pkey ON public.showdown_teams USING btree (id);

CREATE UNIQUE INDEX stats_name_key ON public.stats USING btree (name);

CREATE UNIQUE INDEX stats_pkey ON public.stats USING btree (id);

CREATE UNIQUE INDEX stats_stat_id_key ON public.stats USING btree (stat_id);

CREATE UNIQUE INDEX super_contest_effects_pkey ON public.super_contest_effects USING btree (id);

CREATE UNIQUE INDEX super_contest_effects_super_contest_effect_id_key ON public.super_contest_effects USING btree (super_contest_effect_id);

CREATE UNIQUE INDEX sync_jobs_pkey ON public.sync_jobs USING btree (job_id);

CREATE UNIQUE INDEX sync_log_pkey ON public.sync_log USING btree (id);

CREATE UNIQUE INDEX team_categories_pkey ON public.team_categories USING btree (category_id);

CREATE UNIQUE INDEX team_formats_pkey ON public.team_formats USING btree (format_id);

CREATE UNIQUE INDEX team_rosters_pkey ON public.team_rosters USING btree (id);

CREATE UNIQUE INDEX team_rosters_team_id_pokemon_id_key ON public.team_rosters USING btree (team_id, pokemon_id);

CREATE UNIQUE INDEX team_tag_assignments_pkey ON public.team_tag_assignments USING btree (teamid, tag_id);

CREATE UNIQUE INDEX team_tags_pkey ON public.team_tags USING btree (tag_id);

CREATE UNIQUE INDEX teams_name_key ON public.teams USING btree (name);

CREATE UNIQUE INDEX teams_pkey ON public.teams USING btree (id);

CREATE UNIQUE INDEX trade_listings_pkey ON public.trade_listings USING btree (id);

CREATE UNIQUE INDEX trade_offers_pkey ON public.trade_offers USING btree (id);

CREATE UNIQUE INDEX trade_transactions_pkey ON public.trade_transactions USING btree (id);

CREATE UNIQUE INDEX types_name_key ON public.types USING btree (name);

CREATE UNIQUE INDEX types_pkey ON public.types USING btree (id);

CREATE UNIQUE INDEX types_type_id_key ON public.types USING btree (type_id);

CREATE UNIQUE INDEX user_activity_log_pkey ON public.user_activity_log USING btree (id);

CREATE UNIQUE INDEX version_groups_name_key ON public.version_groups USING btree (name);

CREATE UNIQUE INDEX version_groups_pkey ON public.version_groups USING btree (id);

CREATE UNIQUE INDEX version_groups_version_group_id_key ON public.version_groups USING btree (version_group_id);

CREATE UNIQUE INDEX versions_name_key ON public.versions USING btree (name);

CREATE UNIQUE INDEX versions_pkey ON public.versions USING btree (id);

CREATE UNIQUE INDEX versions_version_id_key ON public.versions USING btree (version_id);

alter table "public"."abilities" add constraint "abilities_pkey" PRIMARY KEY using index "abilities_pkey";

alter table "public"."battle_events" add constraint "battle_events_pkey" PRIMARY KEY using index "battle_events_pkey";

alter table "public"."battle_sessions" add constraint "battle_sessions_pkey" PRIMARY KEY using index "battle_sessions_pkey";

alter table "public"."berries" add constraint "berries_pkey" PRIMARY KEY using index "berries_pkey";

alter table "public"."berry_firmnesses" add constraint "berry_firmnesses_pkey" PRIMARY KEY using index "berry_firmnesses_pkey";

alter table "public"."berry_flavors" add constraint "berry_flavors_pkey" PRIMARY KEY using index "berry_flavors_pkey";

alter table "public"."characteristics" add constraint "characteristics_pkey" PRIMARY KEY using index "characteristics_pkey";

alter table "public"."coaches" add constraint "coaches_pkey" PRIMARY KEY using index "coaches_pkey";

alter table "public"."conferences" add constraint "conferences_pkey" PRIMARY KEY using index "conferences_pkey";

alter table "public"."contest_effects" add constraint "contest_effects_pkey" PRIMARY KEY using index "contest_effects_pkey";

alter table "public"."contest_types" add constraint "contest_types_pkey" PRIMARY KEY using index "contest_types_pkey";

alter table "public"."discord_webhooks" add constraint "discord_webhooks_pkey" PRIMARY KEY using index "discord_webhooks_pkey";

alter table "public"."divisions" add constraint "divisions_pkey" PRIMARY KEY using index "divisions_pkey";

alter table "public"."draft_budgets" add constraint "draft_budgets_pkey" PRIMARY KEY using index "draft_budgets_pkey";

alter table "public"."draft_pool" add constraint "draft_pool_pkey" PRIMARY KEY using index "draft_pool_pkey";

alter table "public"."draft_sessions" add constraint "draft_sessions_pkey" PRIMARY KEY using index "draft_sessions_pkey";

alter table "public"."egg_groups" add constraint "egg_groups_pkey" PRIMARY KEY using index "egg_groups_pkey";

alter table "public"."encounter_condition_values" add constraint "encounter_condition_values_pkey" PRIMARY KEY using index "encounter_condition_values_pkey";

alter table "public"."encounter_conditions" add constraint "encounter_conditions_pkey" PRIMARY KEY using index "encounter_conditions_pkey";

alter table "public"."encounter_methods" add constraint "encounter_methods_pkey" PRIMARY KEY using index "encounter_methods_pkey";

alter table "public"."evolution_chains" add constraint "evolution_chains_pkey" PRIMARY KEY using index "evolution_chains_pkey";

alter table "public"."evolution_triggers" add constraint "evolution_triggers_pkey" PRIMARY KEY using index "evolution_triggers_pkey";

alter table "public"."genders" add constraint "genders_pkey" PRIMARY KEY using index "genders_pkey";

alter table "public"."generations" add constraint "generations_pkey" PRIMARY KEY using index "generations_pkey";

alter table "public"."google_sheets_config" add constraint "google_sheets_config_pkey" PRIMARY KEY using index "google_sheets_config_pkey";

alter table "public"."growth_rates" add constraint "growth_rates_pkey" PRIMARY KEY using index "growth_rates_pkey";

alter table "public"."item_attributes" add constraint "item_attributes_pkey" PRIMARY KEY using index "item_attributes_pkey";

alter table "public"."item_categories" add constraint "item_categories_pkey" PRIMARY KEY using index "item_categories_pkey";

alter table "public"."item_fling_effects" add constraint "item_fling_effects_pkey" PRIMARY KEY using index "item_fling_effects_pkey";

alter table "public"."item_pockets" add constraint "item_pockets_pkey" PRIMARY KEY using index "item_pockets_pkey";

alter table "public"."items" add constraint "items_pkey" PRIMARY KEY using index "items_pkey";

alter table "public"."languages" add constraint "languages_pkey" PRIMARY KEY using index "languages_pkey";

alter table "public"."league_config" add constraint "league_config_pkey" PRIMARY KEY using index "league_config_pkey";

alter table "public"."location_areas" add constraint "location_areas_pkey" PRIMARY KEY using index "location_areas_pkey";

alter table "public"."locations" add constraint "locations_pkey" PRIMARY KEY using index "locations_pkey";

alter table "public"."machines" add constraint "machines_pkey" PRIMARY KEY using index "machines_pkey";

alter table "public"."matches" add constraint "matches_pkey" PRIMARY KEY using index "matches_pkey";

alter table "public"."matchweeks" add constraint "matchweeks_pkey" PRIMARY KEY using index "matchweeks_pkey";

alter table "public"."move_ailments" add constraint "move_ailments_pkey" PRIMARY KEY using index "move_ailments_pkey";

alter table "public"."move_battle_styles" add constraint "move_battle_styles_pkey" PRIMARY KEY using index "move_battle_styles_pkey";

alter table "public"."move_categories" add constraint "move_categories_pkey" PRIMARY KEY using index "move_categories_pkey";

alter table "public"."move_damage_classes" add constraint "move_damage_classes_pkey" PRIMARY KEY using index "move_damage_classes_pkey";

alter table "public"."move_learn_methods" add constraint "move_learn_methods_pkey" PRIMARY KEY using index "move_learn_methods_pkey";

alter table "public"."move_targets" add constraint "move_targets_pkey" PRIMARY KEY using index "move_targets_pkey";

alter table "public"."moves" add constraint "moves_pkey" PRIMARY KEY using index "moves_pkey";

alter table "public"."natures" add constraint "natures_pkey" PRIMARY KEY using index "natures_pkey";

alter table "public"."pal_park_areas" add constraint "pal_park_areas_pkey" PRIMARY KEY using index "pal_park_areas_pkey";

alter table "public"."pokeapi_resource_cache" add constraint "pokeapi_resource_cache_pkey" PRIMARY KEY using index "pokeapi_resource_cache_pkey";

alter table "public"."pokeapi_resources" add constraint "pokeapi_resources_pkey" PRIMARY KEY using index "pokeapi_resources_pkey";

alter table "public"."pokeathlon_stats" add constraint "pokeathlon_stats_pkey" PRIMARY KEY using index "pokeathlon_stats_pkey";

alter table "public"."pokedexes" add constraint "pokedexes_pkey" PRIMARY KEY using index "pokedexes_pkey";

alter table "public"."pokemon" add constraint "pokemon_pkey1" PRIMARY KEY using index "pokemon_pkey1";

alter table "public"."pokemon_abilities" add constraint "pokemon_abilities_pkey" PRIMARY KEY using index "pokemon_abilities_pkey";

alter table "public"."pokemon_cache" add constraint "pokemon_cache_pkey" PRIMARY KEY using index "pokemon_cache_pkey";

alter table "public"."pokemon_colors" add constraint "pokemon_colors_pkey" PRIMARY KEY using index "pokemon_colors_pkey";

alter table "public"."pokemon_comprehensive" add constraint "pokemon_pkey" PRIMARY KEY using index "pokemon_pkey";

alter table "public"."pokemon_egg_groups" add constraint "pokemon_egg_groups_pkey" PRIMARY KEY using index "pokemon_egg_groups_pkey";

alter table "public"."pokemon_forms" add constraint "pokemon_forms_pkey" PRIMARY KEY using index "pokemon_forms_pkey";

alter table "public"."pokemon_habitats" add constraint "pokemon_habitats_pkey" PRIMARY KEY using index "pokemon_habitats_pkey";

alter table "public"."pokemon_items" add constraint "pokemon_items_pkey" PRIMARY KEY using index "pokemon_items_pkey";

alter table "public"."pokemon_location_areas" add constraint "pokemon_location_areas_pkey" PRIMARY KEY using index "pokemon_location_areas_pkey";

alter table "public"."pokemon_moves" add constraint "pokemon_moves_pkey" PRIMARY KEY using index "pokemon_moves_pkey";

alter table "public"."pokemon_shapes" add constraint "pokemon_shapes_pkey" PRIMARY KEY using index "pokemon_shapes_pkey";

alter table "public"."pokemon_species" add constraint "pokemon_species_pkey" PRIMARY KEY using index "pokemon_species_pkey";

alter table "public"."pokemon_stats" add constraint "pokemon_stats_new_pkey" PRIMARY KEY using index "pokemon_stats_new_pkey";

alter table "public"."pokemon_types" add constraint "pokemon_types_pkey" PRIMARY KEY using index "pokemon_types_pkey";

alter table "public"."pokepedia_assets" add constraint "pokepedia_assets_pkey" PRIMARY KEY using index "pokepedia_assets_pkey";

alter table "public"."pokepedia_pokemon" add constraint "pokepedia_pokemon_pkey" PRIMARY KEY using index "pokepedia_pokemon_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."regions" add constraint "regions_pkey" PRIMARY KEY using index "regions_pkey";

alter table "public"."role_permissions" add constraint "role_permissions_pkey" PRIMARY KEY using index "role_permissions_pkey";

alter table "public"."seasons" add constraint "seasons_pkey" PRIMARY KEY using index "seasons_pkey";

alter table "public"."sheet_mappings" add constraint "sheet_mappings_pkey" PRIMARY KEY using index "sheet_mappings_pkey";

alter table "public"."showdown_client_teams" add constraint "showdown_client_teams_pkey" PRIMARY KEY using index "showdown_client_teams_pkey";

alter table "public"."showdown_teams" add constraint "showdown_teams_pkey" PRIMARY KEY using index "showdown_teams_pkey";

alter table "public"."stats" add constraint "stats_pkey" PRIMARY KEY using index "stats_pkey";

alter table "public"."super_contest_effects" add constraint "super_contest_effects_pkey" PRIMARY KEY using index "super_contest_effects_pkey";

alter table "public"."sync_jobs" add constraint "sync_jobs_pkey" PRIMARY KEY using index "sync_jobs_pkey";

alter table "public"."sync_log" add constraint "sync_log_pkey" PRIMARY KEY using index "sync_log_pkey";

alter table "public"."team_categories" add constraint "team_categories_pkey" PRIMARY KEY using index "team_categories_pkey";

alter table "public"."team_formats" add constraint "team_formats_pkey" PRIMARY KEY using index "team_formats_pkey";

alter table "public"."team_rosters" add constraint "team_rosters_pkey" PRIMARY KEY using index "team_rosters_pkey";

alter table "public"."team_tag_assignments" add constraint "team_tag_assignments_pkey" PRIMARY KEY using index "team_tag_assignments_pkey";

alter table "public"."team_tags" add constraint "team_tags_pkey" PRIMARY KEY using index "team_tags_pkey";

alter table "public"."teams" add constraint "teams_pkey" PRIMARY KEY using index "teams_pkey";

alter table "public"."trade_listings" add constraint "trade_listings_pkey" PRIMARY KEY using index "trade_listings_pkey";

alter table "public"."trade_offers" add constraint "trade_offers_pkey" PRIMARY KEY using index "trade_offers_pkey";

alter table "public"."trade_transactions" add constraint "trade_transactions_pkey" PRIMARY KEY using index "trade_transactions_pkey";

alter table "public"."types" add constraint "types_pkey" PRIMARY KEY using index "types_pkey";

alter table "public"."user_activity_log" add constraint "user_activity_log_pkey" PRIMARY KEY using index "user_activity_log_pkey";

alter table "public"."version_groups" add constraint "version_groups_pkey" PRIMARY KEY using index "version_groups_pkey";

alter table "public"."versions" add constraint "versions_pkey" PRIMARY KEY using index "versions_pkey";

alter table "public"."abilities" add constraint "abilities_ability_id_key" UNIQUE using index "abilities_ability_id_key";

alter table "public"."abilities" add constraint "abilities_name_key" UNIQUE using index "abilities_name_key";

alter table "public"."battle_events" add constraint "battle_events_battle_id_fkey" FOREIGN KEY (battle_id) REFERENCES public.battle_sessions(id) ON DELETE CASCADE not valid;

alter table "public"."battle_events" validate constraint "battle_events_battle_id_fkey";

alter table "public"."battle_sessions" add constraint "battle_sessions_match_id_fkey" FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE not valid;

alter table "public"."battle_sessions" validate constraint "battle_sessions_match_id_fkey";

alter table "public"."battle_sessions" add constraint "battle_sessions_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'complete'::text, 'aborted'::text]))) not valid;

alter table "public"."battle_sessions" validate constraint "battle_sessions_status_check";

alter table "public"."battle_sessions" add constraint "battle_sessions_team_a_id_fkey" FOREIGN KEY (team_a_id) REFERENCES public.teams(id) ON DELETE CASCADE not valid;

alter table "public"."battle_sessions" validate constraint "battle_sessions_team_a_id_fkey";

alter table "public"."battle_sessions" add constraint "battle_sessions_team_b_id_fkey" FOREIGN KEY (team_b_id) REFERENCES public.teams(id) ON DELETE CASCADE not valid;

alter table "public"."battle_sessions" validate constraint "battle_sessions_team_b_id_fkey";

alter table "public"."battle_sessions" add constraint "battle_sessions_winner_id_fkey" FOREIGN KEY (winner_id) REFERENCES public.teams(id) not valid;

alter table "public"."battle_sessions" validate constraint "battle_sessions_winner_id_fkey";

alter table "public"."berries" add constraint "berries_berry_id_key" UNIQUE using index "berries_berry_id_key";

alter table "public"."berries" add constraint "berries_item_id_fkey" FOREIGN KEY (item_id) REFERENCES public.items(item_id) not valid;

alter table "public"."berries" validate constraint "berries_item_id_fkey";

alter table "public"."berries" add constraint "berries_name_key" UNIQUE using index "berries_name_key";

alter table "public"."berries" add constraint "berries_natural_gift_type_id_fkey" FOREIGN KEY (natural_gift_type_id) REFERENCES public.types(type_id) not valid;

alter table "public"."berries" validate constraint "berries_natural_gift_type_id_fkey";

alter table "public"."berry_firmnesses" add constraint "berry_firmnesses_firmness_id_key" UNIQUE using index "berry_firmnesses_firmness_id_key";

alter table "public"."berry_firmnesses" add constraint "berry_firmnesses_name_key" UNIQUE using index "berry_firmnesses_name_key";

alter table "public"."berry_flavors" add constraint "berry_flavors_flavor_id_key" UNIQUE using index "berry_flavors_flavor_id_key";

alter table "public"."berry_flavors" add constraint "berry_flavors_name_key" UNIQUE using index "berry_flavors_name_key";

alter table "public"."characteristics" add constraint "characteristics_characteristic_id_key" UNIQUE using index "characteristics_characteristic_id_key";

alter table "public"."characteristics" add constraint "characteristics_highest_stat_id_fkey" FOREIGN KEY (highest_stat_id) REFERENCES public.stats(stat_id) not valid;

alter table "public"."characteristics" validate constraint "characteristics_highest_stat_id_fkey";

alter table "public"."coaches" add constraint "coaches_discord_id_key" UNIQUE using index "coaches_discord_id_key";

alter table "public"."coaches" add constraint "coaches_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."coaches" validate constraint "coaches_user_id_fkey";

alter table "public"."conferences" add constraint "conferences_name_key" UNIQUE using index "conferences_name_key";

alter table "public"."conferences" add constraint "conferences_season_id_fkey" FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE CASCADE not valid;

alter table "public"."conferences" validate constraint "conferences_season_id_fkey";

alter table "public"."contest_effects" add constraint "contest_effects_contest_effect_id_key" UNIQUE using index "contest_effects_contest_effect_id_key";

alter table "public"."contest_types" add constraint "contest_types_berry_flavor_id_fkey" FOREIGN KEY (berry_flavor_id) REFERENCES public.berry_flavors(flavor_id) not valid;

alter table "public"."contest_types" validate constraint "contest_types_berry_flavor_id_fkey";

alter table "public"."contest_types" add constraint "contest_types_contest_type_id_key" UNIQUE using index "contest_types_contest_type_id_key";

alter table "public"."contest_types" add constraint "contest_types_name_key" UNIQUE using index "contest_types_name_key";

alter table "public"."discord_webhooks" add constraint "discord_webhooks_name_key" UNIQUE using index "discord_webhooks_name_key";

alter table "public"."divisions" add constraint "divisions_conference_id_fkey" FOREIGN KEY (conference_id) REFERENCES public.conferences(id) ON DELETE CASCADE not valid;

alter table "public"."divisions" validate constraint "divisions_conference_id_fkey";

alter table "public"."divisions" add constraint "divisions_name_conference_id_key" UNIQUE using index "divisions_name_conference_id_key";

alter table "public"."divisions" add constraint "divisions_season_id_fkey" FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE CASCADE not valid;

alter table "public"."divisions" validate constraint "divisions_season_id_fkey";

alter table "public"."draft_budgets" add constraint "draft_budgets_season_id_fkey" FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE CASCADE not valid;

alter table "public"."draft_budgets" validate constraint "draft_budgets_season_id_fkey";

alter table "public"."draft_budgets" add constraint "draft_budgets_team_id_fkey" FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE not valid;

alter table "public"."draft_budgets" validate constraint "draft_budgets_team_id_fkey";

alter table "public"."draft_budgets" add constraint "draft_budgets_team_id_season_id_key" UNIQUE using index "draft_budgets_team_id_season_id_key";

alter table "public"."draft_pool" add constraint "draft_pool_generation_check" CHECK (((generation >= 1) AND (generation <= 9))) not valid;

alter table "public"."draft_pool" validate constraint "draft_pool_generation_check";

alter table "public"."draft_pool" add constraint "draft_pool_point_value_check" CHECK (((point_value >= 1) AND (point_value <= 20))) not valid;

alter table "public"."draft_pool" validate constraint "draft_pool_point_value_check";

alter table "public"."draft_pool" add constraint "draft_pool_sheet_name_pokemon_name_point_value_key" UNIQUE using index "draft_pool_sheet_name_pokemon_name_point_value_key";

alter table "public"."draft_sessions" add constraint "draft_sessions_draft_type_check" CHECK ((draft_type = ANY (ARRAY['snake'::text, 'linear'::text, 'auction'::text]))) not valid;

alter table "public"."draft_sessions" validate constraint "draft_sessions_draft_type_check";

alter table "public"."draft_sessions" add constraint "draft_sessions_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'active'::text, 'paused'::text, 'completed'::text, 'cancelled'::text]))) not valid;

alter table "public"."draft_sessions" validate constraint "draft_sessions_status_check";

alter table "public"."egg_groups" add constraint "egg_groups_egg_group_id_key" UNIQUE using index "egg_groups_egg_group_id_key";

alter table "public"."egg_groups" add constraint "egg_groups_name_key" UNIQUE using index "egg_groups_name_key";

alter table "public"."encounter_condition_values" add constraint "encounter_condition_values_condition_id_fkey" FOREIGN KEY (condition_id) REFERENCES public.encounter_conditions(encounter_condition_id) not valid;

alter table "public"."encounter_condition_values" validate constraint "encounter_condition_values_condition_id_fkey";

alter table "public"."encounter_condition_values" add constraint "encounter_condition_values_encounter_condition_value_id_key" UNIQUE using index "encounter_condition_values_encounter_condition_value_id_key";

alter table "public"."encounter_condition_values" add constraint "encounter_condition_values_name_key" UNIQUE using index "encounter_condition_values_name_key";

alter table "public"."encounter_conditions" add constraint "encounter_conditions_encounter_condition_id_key" UNIQUE using index "encounter_conditions_encounter_condition_id_key";

alter table "public"."encounter_conditions" add constraint "encounter_conditions_name_key" UNIQUE using index "encounter_conditions_name_key";

alter table "public"."encounter_methods" add constraint "encounter_methods_encounter_method_id_key" UNIQUE using index "encounter_methods_encounter_method_id_key";

alter table "public"."encounter_methods" add constraint "encounter_methods_name_key" UNIQUE using index "encounter_methods_name_key";

alter table "public"."evolution_chains" add constraint "evolution_chains_baby_trigger_item_id_fkey" FOREIGN KEY (baby_trigger_item_id) REFERENCES public.items(item_id) not valid;

alter table "public"."evolution_chains" validate constraint "evolution_chains_baby_trigger_item_id_fkey";

alter table "public"."evolution_chains" add constraint "evolution_chains_evolution_chain_id_key" UNIQUE using index "evolution_chains_evolution_chain_id_key";

alter table "public"."genders" add constraint "genders_gender_id_key" UNIQUE using index "genders_gender_id_key";

alter table "public"."genders" add constraint "genders_name_key" UNIQUE using index "genders_name_key";

alter table "public"."generations" add constraint "generations_generation_id_key" UNIQUE using index "generations_generation_id_key";

alter table "public"."generations" add constraint "generations_name_key" UNIQUE using index "generations_name_key";

alter table "public"."google_sheets_config" add constraint "google_sheets_config_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."google_sheets_config" validate constraint "google_sheets_config_created_by_fkey";

alter table "public"."google_sheets_config" add constraint "google_sheets_config_last_sync_status_check" CHECK ((last_sync_status = ANY (ARRAY['success'::text, 'error'::text, 'partial'::text]))) not valid;

alter table "public"."google_sheets_config" validate constraint "google_sheets_config_last_sync_status_check";

alter table "public"."growth_rates" add constraint "growth_rates_growth_rate_id_key" UNIQUE using index "growth_rates_growth_rate_id_key";

alter table "public"."growth_rates" add constraint "growth_rates_name_key" UNIQUE using index "growth_rates_name_key";

alter table "public"."item_attributes" add constraint "item_attributes_item_attribute_id_key" UNIQUE using index "item_attributes_item_attribute_id_key";

alter table "public"."item_attributes" add constraint "item_attributes_name_key" UNIQUE using index "item_attributes_name_key";

alter table "public"."item_categories" add constraint "item_categories_item_category_id_key" UNIQUE using index "item_categories_item_category_id_key";

alter table "public"."item_categories" add constraint "item_categories_name_key" UNIQUE using index "item_categories_name_key";

alter table "public"."item_fling_effects" add constraint "item_fling_effects_item_fling_effect_id_key" UNIQUE using index "item_fling_effects_item_fling_effect_id_key";

alter table "public"."item_fling_effects" add constraint "item_fling_effects_name_key" UNIQUE using index "item_fling_effects_name_key";

alter table "public"."item_pockets" add constraint "item_pockets_item_pocket_id_key" UNIQUE using index "item_pockets_item_pocket_id_key";

alter table "public"."item_pockets" add constraint "item_pockets_name_key" UNIQUE using index "item_pockets_name_key";

alter table "public"."items" add constraint "items_item_id_key" UNIQUE using index "items_item_id_key";

alter table "public"."items" add constraint "items_name_key" UNIQUE using index "items_name_key";

alter table "public"."languages" add constraint "languages_language_id_key" UNIQUE using index "languages_language_id_key";

alter table "public"."languages" add constraint "languages_name_key" UNIQUE using index "languages_name_key";

alter table "public"."league_config" add constraint "league_config_config_type_check" CHECK ((config_type = ANY (ARRAY['rules'::text, 'scoring'::text, 'draft_settings'::text, 'season_structure'::text, 'general'::text]))) not valid;

alter table "public"."league_config" validate constraint "league_config_config_type_check";

alter table "public"."league_config" add constraint "league_config_config_type_section_title_key" UNIQUE using index "league_config_config_type_section_title_key";

alter table "public"."location_areas" add constraint "location_areas_location_area_id_key" UNIQUE using index "location_areas_location_area_id_key";

alter table "public"."location_areas" add constraint "location_areas_location_id_fkey" FOREIGN KEY (location_id) REFERENCES public.locations(location_id) not valid;

alter table "public"."location_areas" validate constraint "location_areas_location_id_fkey";

alter table "public"."location_areas" add constraint "location_areas_name_key" UNIQUE using index "location_areas_name_key";

alter table "public"."locations" add constraint "locations_location_id_key" UNIQUE using index "locations_location_id_key";

alter table "public"."locations" add constraint "locations_name_key" UNIQUE using index "locations_name_key";

alter table "public"."machines" add constraint "machines_item_id_fkey" FOREIGN KEY (item_id) REFERENCES public.items(item_id) not valid;

alter table "public"."machines" validate constraint "machines_item_id_fkey";

alter table "public"."machines" add constraint "machines_machine_id_key" UNIQUE using index "machines_machine_id_key";

alter table "public"."machines" add constraint "machines_move_id_fkey" FOREIGN KEY (move_id) REFERENCES public.moves(move_id) not valid;

alter table "public"."machines" validate constraint "machines_move_id_fkey";

alter table "public"."matches" add constraint "matches_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES public.coaches(id) not valid;

alter table "public"."matches" validate constraint "matches_approved_by_fkey";

alter table "public"."matches" add constraint "matches_matchweek_id_fkey" FOREIGN KEY (matchweek_id) REFERENCES public.matchweeks(id) ON DELETE CASCADE not valid;

alter table "public"."matches" validate constraint "matches_matchweek_id_fkey";

alter table "public"."matches" add constraint "matches_season_id_fkey" FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE CASCADE not valid;

alter table "public"."matches" validate constraint "matches_season_id_fkey";

alter table "public"."matches" add constraint "matches_status_check" CHECK ((status = ANY (ARRAY['scheduled'::text, 'in_progress'::text, 'completed'::text, 'disputed'::text, 'cancelled'::text]))) not valid;

alter table "public"."matches" validate constraint "matches_status_check";

alter table "public"."matches" add constraint "matches_submitted_by_fkey" FOREIGN KEY (submitted_by) REFERENCES public.coaches(id) not valid;

alter table "public"."matches" validate constraint "matches_submitted_by_fkey";

alter table "public"."matches" add constraint "matches_team1_id_fkey" FOREIGN KEY (team1_id) REFERENCES public.teams(id) ON DELETE CASCADE not valid;

alter table "public"."matches" validate constraint "matches_team1_id_fkey";

alter table "public"."matches" add constraint "matches_team2_id_fkey" FOREIGN KEY (team2_id) REFERENCES public.teams(id) ON DELETE CASCADE not valid;

alter table "public"."matches" validate constraint "matches_team2_id_fkey";

alter table "public"."matches" add constraint "matches_winner_id_fkey" FOREIGN KEY (winner_id) REFERENCES public.teams(id) ON DELETE SET NULL not valid;

alter table "public"."matches" validate constraint "matches_winner_id_fkey";

alter table "public"."matchweeks" add constraint "matchweeks_season_id_fkey" FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE CASCADE not valid;

alter table "public"."matchweeks" validate constraint "matchweeks_season_id_fkey";

alter table "public"."matchweeks" add constraint "matchweeks_season_id_week_number_key" UNIQUE using index "matchweeks_season_id_week_number_key";

alter table "public"."move_ailments" add constraint "move_ailments_move_ailment_id_key" UNIQUE using index "move_ailments_move_ailment_id_key";

alter table "public"."move_ailments" add constraint "move_ailments_name_key" UNIQUE using index "move_ailments_name_key";

alter table "public"."move_battle_styles" add constraint "move_battle_styles_move_battle_style_id_key" UNIQUE using index "move_battle_styles_move_battle_style_id_key";

alter table "public"."move_battle_styles" add constraint "move_battle_styles_name_key" UNIQUE using index "move_battle_styles_name_key";

alter table "public"."move_categories" add constraint "move_categories_move_category_id_key" UNIQUE using index "move_categories_move_category_id_key";

alter table "public"."move_categories" add constraint "move_categories_name_key" UNIQUE using index "move_categories_name_key";

alter table "public"."move_damage_classes" add constraint "move_damage_classes_move_damage_class_id_key" UNIQUE using index "move_damage_classes_move_damage_class_id_key";

alter table "public"."move_damage_classes" add constraint "move_damage_classes_name_key" UNIQUE using index "move_damage_classes_name_key";

alter table "public"."move_learn_methods" add constraint "move_learn_methods_move_learn_method_id_key" UNIQUE using index "move_learn_methods_move_learn_method_id_key";

alter table "public"."move_learn_methods" add constraint "move_learn_methods_name_key" UNIQUE using index "move_learn_methods_name_key";

alter table "public"."move_targets" add constraint "move_targets_move_target_id_key" UNIQUE using index "move_targets_move_target_id_key";

alter table "public"."move_targets" add constraint "move_targets_name_key" UNIQUE using index "move_targets_name_key";

alter table "public"."moves" add constraint "moves_move_id_key" UNIQUE using index "moves_move_id_key";

alter table "public"."moves" add constraint "moves_name_key" UNIQUE using index "moves_name_key";

alter table "public"."moves" add constraint "moves_type_id_fkey" FOREIGN KEY (type_id) REFERENCES public.types(type_id) not valid;

alter table "public"."moves" validate constraint "moves_type_id_fkey";

alter table "public"."natures" add constraint "natures_decreased_stat_id_fkey" FOREIGN KEY (decreased_stat_id) REFERENCES public.stats(stat_id) not valid;

alter table "public"."natures" validate constraint "natures_decreased_stat_id_fkey";

alter table "public"."natures" add constraint "natures_hates_flavor_id_fkey" FOREIGN KEY (hates_flavor_id) REFERENCES public.berry_flavors(flavor_id) not valid;

alter table "public"."natures" validate constraint "natures_hates_flavor_id_fkey";

alter table "public"."natures" add constraint "natures_increased_stat_id_fkey" FOREIGN KEY (increased_stat_id) REFERENCES public.stats(stat_id) not valid;

alter table "public"."natures" validate constraint "natures_increased_stat_id_fkey";

alter table "public"."natures" add constraint "natures_likes_flavor_id_fkey" FOREIGN KEY (likes_flavor_id) REFERENCES public.berry_flavors(flavor_id) not valid;

alter table "public"."natures" validate constraint "natures_likes_flavor_id_fkey";

alter table "public"."natures" add constraint "natures_name_key" UNIQUE using index "natures_name_key";

alter table "public"."natures" add constraint "natures_nature_id_key" UNIQUE using index "natures_nature_id_key";

alter table "public"."pal_park_areas" add constraint "pal_park_areas_name_key" UNIQUE using index "pal_park_areas_name_key";

alter table "public"."pal_park_areas" add constraint "pal_park_areas_pal_park_area_id_key" UNIQUE using index "pal_park_areas_pal_park_area_id_key";

alter table "public"."pokeathlon_stats" add constraint "pokeathlon_stats_name_key" UNIQUE using index "pokeathlon_stats_name_key";

alter table "public"."pokeathlon_stats" add constraint "pokeathlon_stats_pokeathlon_stat_id_key" UNIQUE using index "pokeathlon_stats_pokeathlon_stat_id_key";

alter table "public"."pokedexes" add constraint "pokedexes_name_key" UNIQUE using index "pokedexes_name_key";

alter table "public"."pokedexes" add constraint "pokedexes_pokedex_id_key" UNIQUE using index "pokedexes_pokedex_id_key";

alter table "public"."pokedexes" add constraint "pokedexes_region_id_fkey" FOREIGN KEY (region_id) REFERENCES public.regions(region_id) not valid;

alter table "public"."pokedexes" validate constraint "pokedexes_region_id_fkey";

alter table "public"."pokemon_abilities" add constraint "pokemon_abilities_ability_id_fkey" FOREIGN KEY (ability_id) REFERENCES public.abilities(ability_id) not valid;

alter table "public"."pokemon_abilities" validate constraint "pokemon_abilities_ability_id_fkey";

alter table "public"."pokemon_abilities" add constraint "pokemon_abilities_pokemon_id_ability_id_slot_key" UNIQUE using index "pokemon_abilities_pokemon_id_ability_id_slot_key";

alter table "public"."pokemon_colors" add constraint "pokemon_colors_color_id_key" UNIQUE using index "pokemon_colors_color_id_key";

alter table "public"."pokemon_colors" add constraint "pokemon_colors_name_key" UNIQUE using index "pokemon_colors_name_key";

alter table "public"."pokemon_comprehensive" add constraint "pokemon_pokemon_id_key" UNIQUE using index "pokemon_pokemon_id_key";

alter table "public"."pokemon_comprehensive" add constraint "pokemon_species_id_fkey" FOREIGN KEY (species_id) REFERENCES public.pokemon_species(species_id) not valid;

alter table "public"."pokemon_comprehensive" validate constraint "pokemon_species_id_fkey";

alter table "public"."pokemon_egg_groups" add constraint "fk_pokemon_egg_groups_species" FOREIGN KEY (pokemon_species_id) REFERENCES public.pokemon_species(species_id) not valid;

alter table "public"."pokemon_egg_groups" validate constraint "fk_pokemon_egg_groups_species";

alter table "public"."pokemon_egg_groups" add constraint "pokemon_egg_groups_egg_group_id_fkey" FOREIGN KEY (egg_group_id) REFERENCES public.egg_groups(egg_group_id) not valid;

alter table "public"."pokemon_egg_groups" validate constraint "pokemon_egg_groups_egg_group_id_fkey";

alter table "public"."pokemon_egg_groups" add constraint "pokemon_egg_groups_pokemon_species_id_egg_group_id_key" UNIQUE using index "pokemon_egg_groups_pokemon_species_id_egg_group_id_key";

alter table "public"."pokemon_forms" add constraint "pokemon_forms_form_id_key" UNIQUE using index "pokemon_forms_form_id_key";

alter table "public"."pokemon_habitats" add constraint "pokemon_habitats_habitat_id_key" UNIQUE using index "pokemon_habitats_habitat_id_key";

alter table "public"."pokemon_habitats" add constraint "pokemon_habitats_name_key" UNIQUE using index "pokemon_habitats_name_key";

alter table "public"."pokemon_items" add constraint "pokemon_items_item_id_fkey" FOREIGN KEY (item_id) REFERENCES public.items(item_id) not valid;

alter table "public"."pokemon_items" validate constraint "pokemon_items_item_id_fkey";

alter table "public"."pokemon_items" add constraint "pokemon_items_pokemon_id_item_id_key" UNIQUE using index "pokemon_items_pokemon_id_item_id_key";

alter table "public"."pokemon_location_areas" add constraint "fk_pokemon_location_areas_pokemon" FOREIGN KEY (pokemon_id) REFERENCES public.pokemon_comprehensive(pokemon_id) not valid;

alter table "public"."pokemon_location_areas" validate constraint "fk_pokemon_location_areas_pokemon";

alter table "public"."pokemon_location_areas" add constraint "pokemon_location_areas_location_area_id_fkey" FOREIGN KEY (location_area_id) REFERENCES public.location_areas(location_area_id) not valid;

alter table "public"."pokemon_location_areas" validate constraint "pokemon_location_areas_location_area_id_fkey";

alter table "public"."pokemon_location_areas" add constraint "pokemon_location_areas_pokemon_id_location_area_id_key" UNIQUE using index "pokemon_location_areas_pokemon_id_location_area_id_key";

alter table "public"."pokemon_moves" add constraint "pokemon_moves_move_id_fkey" FOREIGN KEY (move_id) REFERENCES public.moves(move_id) not valid;

alter table "public"."pokemon_moves" validate constraint "pokemon_moves_move_id_fkey";

alter table "public"."pokemon_moves" add constraint "pokemon_moves_pokemon_id_move_id_version_group_id_move_lear_key" UNIQUE using index "pokemon_moves_pokemon_id_move_id_version_group_id_move_lear_key";

alter table "public"."pokemon_shapes" add constraint "pokemon_shapes_name_key" UNIQUE using index "pokemon_shapes_name_key";

alter table "public"."pokemon_shapes" add constraint "pokemon_shapes_shape_id_key" UNIQUE using index "pokemon_shapes_shape_id_key";

alter table "public"."pokemon_species" add constraint "pokemon_species_evolves_from_species_id_fkey" FOREIGN KEY (evolves_from_species_id) REFERENCES public.pokemon_species(species_id) DEFERRABLE INITIALLY DEFERRED not valid;

alter table "public"."pokemon_species" validate constraint "pokemon_species_evolves_from_species_id_fkey";

alter table "public"."pokemon_species" add constraint "pokemon_species_generation_id_fkey" FOREIGN KEY (generation_id) REFERENCES public.generations(generation_id) not valid;

alter table "public"."pokemon_species" validate constraint "pokemon_species_generation_id_fkey";

alter table "public"."pokemon_species" add constraint "pokemon_species_name_key" UNIQUE using index "pokemon_species_name_key";

alter table "public"."pokemon_species" add constraint "pokemon_species_species_id_key" UNIQUE using index "pokemon_species_species_id_key";

alter table "public"."pokemon_stats" add constraint "pokemon_stats_new_pokemon_id_stat_id_key" UNIQUE using index "pokemon_stats_new_pokemon_id_stat_id_key";

alter table "public"."pokemon_stats" add constraint "pokemon_stats_new_stat_id_fkey" FOREIGN KEY (stat_id) REFERENCES public.stats(stat_id) not valid;

alter table "public"."pokemon_stats" validate constraint "pokemon_stats_new_stat_id_fkey";

alter table "public"."pokemon_types" add constraint "pokemon_types_pokemon_id_type_id_slot_key" UNIQUE using index "pokemon_types_pokemon_id_type_id_slot_key";

alter table "public"."pokemon_types" add constraint "pokemon_types_type_id_fkey" FOREIGN KEY (type_id) REFERENCES public.types(type_id) not valid;

alter table "public"."pokemon_types" validate constraint "pokemon_types_type_id_fkey";

alter table "public"."profiles" add constraint "profiles_discord_id_key" UNIQUE using index "profiles_discord_id_key";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."profiles" add constraint "profiles_role_check" CHECK ((role = ANY (ARRAY['admin'::text, 'commissioner'::text, 'coach'::text, 'viewer'::text]))) not valid;

alter table "public"."profiles" validate constraint "profiles_role_check";

alter table "public"."profiles" add constraint "profiles_team_id_fkey" FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL not valid;

alter table "public"."profiles" validate constraint "profiles_team_id_fkey";

alter table "public"."profiles" add constraint "profiles_username_key" UNIQUE using index "profiles_username_key";

alter table "public"."regions" add constraint "regions_name_key" UNIQUE using index "regions_name_key";

alter table "public"."regions" add constraint "regions_region_id_key" UNIQUE using index "regions_region_id_key";

alter table "public"."role_permissions" add constraint "role_permissions_role_check" CHECK ((role = ANY (ARRAY['admin'::text, 'commissioner'::text, 'coach'::text, 'viewer'::text]))) not valid;

alter table "public"."role_permissions" validate constraint "role_permissions_role_check";

alter table "public"."role_permissions" add constraint "role_permissions_role_key" UNIQUE using index "role_permissions_role_key";

alter table "public"."seasons" add constraint "seasons_name_key" UNIQUE using index "seasons_name_key";

alter table "public"."sheet_mappings" add constraint "sheet_mappings_config_id_fkey" FOREIGN KEY (config_id) REFERENCES public.google_sheets_config(id) ON DELETE CASCADE not valid;

alter table "public"."sheet_mappings" validate constraint "sheet_mappings_config_id_fkey";

alter table "public"."sheet_mappings" add constraint "sheet_mappings_config_id_sheet_name_key" UNIQUE using index "sheet_mappings_config_id_sheet_name_key";

alter table "public"."showdown_teams" add constraint "showdown_teams_coach_id_fkey" FOREIGN KEY (coach_id) REFERENCES public.coaches(id) ON DELETE SET NULL not valid;

alter table "public"."showdown_teams" validate constraint "showdown_teams_coach_id_fkey";

alter table "public"."showdown_teams" add constraint "showdown_teams_season_id_fkey" FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE SET NULL not valid;

alter table "public"."showdown_teams" validate constraint "showdown_teams_season_id_fkey";

alter table "public"."showdown_teams" add constraint "showdown_teams_team_id_fkey" FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL not valid;

alter table "public"."showdown_teams" validate constraint "showdown_teams_team_id_fkey";

alter table "public"."stats" add constraint "stats_name_key" UNIQUE using index "stats_name_key";

alter table "public"."stats" add constraint "stats_stat_id_key" UNIQUE using index "stats_stat_id_key";

alter table "public"."super_contest_effects" add constraint "super_contest_effects_super_contest_effect_id_key" UNIQUE using index "super_contest_effects_super_contest_effect_id_key";

alter table "public"."sync_jobs" add constraint "sync_jobs_job_type_check" CHECK ((job_type = ANY (ARRAY['full'::text, 'incremental'::text]))) not valid;

alter table "public"."sync_jobs" validate constraint "sync_jobs_job_type_check";

alter table "public"."sync_jobs" add constraint "sync_jobs_priority_check" CHECK ((priority = ANY (ARRAY['critical'::text, 'standard'::text, 'low'::text]))) not valid;

alter table "public"."sync_jobs" validate constraint "sync_jobs_priority_check";

alter table "public"."sync_jobs" add constraint "sync_jobs_status_check" CHECK ((status = ANY (ARRAY['running'::text, 'completed'::text, 'failed'::text, 'cancelled'::text, 'partial'::text]))) not valid;

alter table "public"."sync_jobs" validate constraint "sync_jobs_status_check";

alter table "public"."sync_jobs" add constraint "sync_jobs_sync_type_check" CHECK ((sync_type = ANY (ARRAY['pokepedia'::text, 'pokemon_cache'::text, 'google_sheets'::text]))) not valid;

alter table "public"."sync_jobs" validate constraint "sync_jobs_sync_type_check";

alter table "public"."sync_jobs" add constraint "sync_jobs_triggered_by_check" CHECK ((triggered_by = ANY (ARRAY['manual'::text, 'cron'::text]))) not valid;

alter table "public"."sync_jobs" validate constraint "sync_jobs_triggered_by_check";

alter table "public"."team_rosters" add constraint "team_rosters_pokemon_id_fkey" FOREIGN KEY (pokemon_id) REFERENCES public.pokemon(id) ON DELETE CASCADE not valid;

alter table "public"."team_rosters" validate constraint "team_rosters_pokemon_id_fkey";

alter table "public"."team_rosters" add constraint "team_rosters_team_id_fkey" FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE not valid;

alter table "public"."team_rosters" validate constraint "team_rosters_team_id_fkey";

alter table "public"."team_rosters" add constraint "team_rosters_team_id_pokemon_id_key" UNIQUE using index "team_rosters_team_id_pokemon_id_key";

alter table "public"."team_tag_assignments" add constraint "team_tag_assignments_tag_id_fkey" FOREIGN KEY (tag_id) REFERENCES public.team_tags(tag_id) ON DELETE CASCADE not valid;

alter table "public"."team_tag_assignments" validate constraint "team_tag_assignments_tag_id_fkey";

alter table "public"."team_tag_assignments" add constraint "team_tag_assignments_teamid_fkey" FOREIGN KEY (teamid) REFERENCES public.showdown_client_teams(teamid) ON DELETE CASCADE not valid;

alter table "public"."team_tag_assignments" validate constraint "team_tag_assignments_teamid_fkey";

alter table "public"."teams" add constraint "teams_coach_id_fkey" FOREIGN KEY (coach_id) REFERENCES public.coaches(id) ON DELETE SET NULL not valid;

alter table "public"."teams" validate constraint "teams_coach_id_fkey";

alter table "public"."teams" add constraint "teams_division_id_fkey" FOREIGN KEY (division_id) REFERENCES public.divisions(id) ON DELETE SET NULL not valid;

alter table "public"."teams" validate constraint "teams_division_id_fkey";

alter table "public"."teams" add constraint "teams_name_key" UNIQUE using index "teams_name_key";

alter table "public"."teams" add constraint "teams_season_id_fkey" FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE CASCADE not valid;

alter table "public"."teams" validate constraint "teams_season_id_fkey";

alter table "public"."teams" add constraint "teams_streak_type_check" CHECK ((streak_type = ANY (ARRAY['W'::text, 'L'::text]))) not valid;

alter table "public"."teams" validate constraint "teams_streak_type_check";

alter table "public"."trade_listings" add constraint "trade_listings_status_check" CHECK ((status = ANY (ARRAY['available'::text, 'pending'::text, 'completed'::text, 'cancelled'::text]))) not valid;

alter table "public"."trade_listings" validate constraint "trade_listings_status_check";

alter table "public"."trade_listings" add constraint "trade_listings_team_id_fkey" FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE not valid;

alter table "public"."trade_listings" validate constraint "trade_listings_team_id_fkey";

alter table "public"."trade_offers" add constraint "trade_offers_listing_id_fkey" FOREIGN KEY (listing_id) REFERENCES public.trade_listings(id) ON DELETE CASCADE not valid;

alter table "public"."trade_offers" validate constraint "trade_offers_listing_id_fkey";

alter table "public"."trade_offers" add constraint "trade_offers_offering_team_id_fkey" FOREIGN KEY (offering_team_id) REFERENCES public.teams(id) ON DELETE CASCADE not valid;

alter table "public"."trade_offers" validate constraint "trade_offers_offering_team_id_fkey";

alter table "public"."trade_offers" add constraint "trade_offers_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text, 'cancelled'::text]))) not valid;

alter table "public"."trade_offers" validate constraint "trade_offers_status_check";

alter table "public"."trade_transactions" add constraint "trade_transactions_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES public.coaches(id) not valid;

alter table "public"."trade_transactions" validate constraint "trade_transactions_approved_by_fkey";

alter table "public"."trade_transactions" add constraint "trade_transactions_season_id_fkey" FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE CASCADE not valid;

alter table "public"."trade_transactions" validate constraint "trade_transactions_season_id_fkey";

alter table "public"."trade_transactions" add constraint "trade_transactions_team_a_id_fkey" FOREIGN KEY (team_a_id) REFERENCES public.teams(id) ON DELETE CASCADE not valid;

alter table "public"."trade_transactions" validate constraint "trade_transactions_team_a_id_fkey";

alter table "public"."trade_transactions" add constraint "trade_transactions_team_b_id_fkey" FOREIGN KEY (team_b_id) REFERENCES public.teams(id) ON DELETE CASCADE not valid;

alter table "public"."trade_transactions" validate constraint "trade_transactions_team_b_id_fkey";

alter table "public"."types" add constraint "types_name_key" UNIQUE using index "types_name_key";

alter table "public"."types" add constraint "types_type_id_key" UNIQUE using index "types_type_id_key";

alter table "public"."user_activity_log" add constraint "user_activity_log_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."user_activity_log" validate constraint "user_activity_log_user_id_fkey";

alter table "public"."version_groups" add constraint "version_groups_generation_id_fkey" FOREIGN KEY (generation_id) REFERENCES public.generations(generation_id) not valid;

alter table "public"."version_groups" validate constraint "version_groups_generation_id_fkey";

alter table "public"."version_groups" add constraint "version_groups_name_key" UNIQUE using index "version_groups_name_key";

alter table "public"."version_groups" add constraint "version_groups_version_group_id_key" UNIQUE using index "version_groups_version_group_id_key";

alter table "public"."versions" add constraint "versions_name_key" UNIQUE using index "versions_name_key";

alter table "public"."versions" add constraint "versions_version_id_key" UNIQUE using index "versions_version_id_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.calculate_showdown_team_pokemon_count()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.pokemon_count = jsonb_array_length(NEW.pokemon_data);
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_pokedex_sprites_bucket()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- This function can be called from application code to verify bucket exists
  -- Actual bucket existence check must be done via Storage API
  RETURN 'Bucket check must be done via Storage API. Use supabase.storage.listBuckets() to verify.';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_pokepedia_cron_status()
 RETURNS TABLE(job_name text, schedule text, active boolean, last_run timestamp with time zone, next_run timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    j.jobname::TEXT AS job_name,
    j.schedule::TEXT,
    j.active,
    j.last_run,
    j.next_run
  FROM cron.job j
  WHERE j.jobname IN ('pokepedia-worker', 'pokepedia-sprite-worker')
  ORDER BY j.jobname;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_pokepedia_queue_stats()
 RETURNS TABLE(queue_name text, queue_length bigint, oldest_message_age interval)
 LANGUAGE plpgsql
AS $function$
DECLARE
  ingest_metrics RECORD;
  sprite_metrics RECORD;
BEGIN
  -- Get metrics for pokepedia_ingest queue
  SELECT 
    (pgmq.metrics('pokepedia_ingest')).queue_length,
    (pgmq.metrics('pokepedia_ingest')).oldest_msg_age
  INTO ingest_metrics;
  
  -- Get metrics for pokepedia_sprites queue
  SELECT 
    (pgmq.metrics('pokepedia_sprites')).queue_length,
    (pgmq.metrics('pokepedia_sprites')).oldest_msg_age
  INTO sprite_metrics;
  
  -- Return results
  RETURN QUERY
  SELECT 
    'pokepedia_ingest'::TEXT AS queue_name,
    COALESCE(ingest_metrics.queue_length, 0)::BIGINT AS queue_length,
    ingest_metrics.oldest_msg_age
  UNION ALL
  SELECT 
    'pokepedia_sprites'::TEXT AS queue_name,
    COALESCE(sprite_metrics.queue_length, 0)::BIGINT AS queue_length,
    sprite_metrics.oldest_msg_age;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_pokepedia_sync_progress()
 RETURNS TABLE(resource_type text, synced_count bigint, total_estimated bigint, progress_percent numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    pr.resource_type,
    COUNT(*)::BIGINT AS synced_count,
    CASE 
      WHEN pr.resource_type = 'pokemon' THEN 1025
      WHEN pr.resource_type = 'pokemon-species' THEN 1025
      WHEN pr.resource_type = 'move' THEN 1000
      WHEN pr.resource_type = 'ability' THEN 400
      WHEN pr.resource_type = 'type' THEN 20
      WHEN pr.resource_type = 'item' THEN 2000
      ELSE 100
    END AS total_estimated,
    ROUND(
      (COUNT(*)::NUMERIC / 
       CASE 
         WHEN pr.resource_type = 'pokemon' THEN 1025
         WHEN pr.resource_type = 'pokemon-species' THEN 1025
         WHEN pr.resource_type = 'move' THEN 1000
         WHEN pr.resource_type = 'ability' THEN 400
         WHEN pr.resource_type = 'type' THEN 20
         WHEN pr.resource_type = 'item' THEN 2000
         ELSE 100
       END) * 100, 
      2
    ) AS progress_percent
  FROM public.pokeapi_resources pr
  GROUP BY pr.resource_type
  ORDER BY pr.resource_type;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_permissions(user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  user_role TEXT;
  user_perms JSONB;
  role_perms JSONB;
  combined_perms JSONB;
BEGIN
  -- Get user's role and custom permissions
  SELECT role, permissions INTO user_role, user_perms
  FROM public.profiles
  WHERE id = user_id;
  
  -- Get role's default permissions
  SELECT permissions INTO role_perms
  FROM public.role_permissions
  WHERE role = user_role;
  
  -- Combine permissions (custom permissions override role permissions)
  combined_perms = COALESCE(role_perms, '[]'::jsonb) || COALESCE(user_perms, '[]'::jsonb);
  
  RETURN combined_perms;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  profile_count INTEGER;
  discord_id_value TEXT;
  existing_profile_id UUID;
BEGIN
  -- Check if any profiles exist at all (for first user admin logic)
  SELECT COUNT(*) INTO profile_count
  FROM public.profiles;
  
  -- Get discord_id from metadata
  discord_id_value := NEW.raw_user_meta_data->>'provider_id';
  
  -- Check if profile with this discord_id already exists
  SELECT id INTO existing_profile_id
  FROM public.profiles
  WHERE discord_id = discord_id_value
    AND discord_id IS NOT NULL
  LIMIT 1;
  
  -- If profile exists with same discord_id but different id, update it
  IF existing_profile_id IS NOT NULL AND existing_profile_id != NEW.id THEN
    UPDATE public.profiles
    SET 
      id = NEW.id, -- Link to new auth.users record
      display_name = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, display_name),
      avatar_url = COALESCE(NEW.raw_user_meta_data->>'avatar_url', avatar_url),
      email_verified = COALESCE(NEW.email_confirmed_at IS NOT NULL, email_verified),
      discord_username = COALESCE(NEW.raw_user_meta_data->>'username', discord_username), -- FIXED: 'username' not 'user_name'
      discord_avatar = COALESCE(NEW.raw_user_meta_data->>'avatar_url', discord_avatar),
      updated_at = NOW()
    WHERE id = existing_profile_id;
  -- If profile with this id already exists, update it
  ELSIF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    UPDATE public.profiles
    SET 
      display_name = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, display_name),
      avatar_url = COALESCE(NEW.raw_user_meta_data->>'avatar_url', avatar_url),
      email_verified = COALESCE(NEW.email_confirmed_at IS NOT NULL, email_verified),
      discord_id = COALESCE(discord_id_value, discord_id),
      discord_username = COALESCE(NEW.raw_user_meta_data->>'username', discord_username), -- FIXED: 'username' not 'user_name'
      discord_avatar = COALESCE(NEW.raw_user_meta_data->>'avatar_url', discord_avatar),
      updated_at = NOW()
    WHERE id = NEW.id;
  -- Otherwise, insert new profile
  ELSE
    INSERT INTO public.profiles (id, display_name, avatar_url, email_verified, discord_id, discord_username, discord_avatar, role)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.email_confirmed_at IS NOT NULL,
      discord_id_value,
      NEW.raw_user_meta_data->>'username', -- FIXED: 'username' not 'user_name'
      NEW.raw_user_meta_data->>'avatar_url',
      CASE WHEN profile_count = 0 THEN 'admin' ELSE 'viewer' END
    );
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.unschedule_pokepedia_cron()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM cron.unschedule('pokepedia-worker');
  PERFORM cron.unschedule('pokepedia-sprite-worker');
END;
$function$
;

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

CREATE OR REPLACE FUNCTION public.update_showdown_teams_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
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

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.user_has_permission(user_id uuid, required_permission text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  user_role TEXT;
  user_permissions JSONB;
  role_permissions JSONB;
BEGIN
  -- Get user's role and custom permissions
  SELECT role, permissions INTO user_role, user_permissions
  FROM public.profiles
  WHERE id = user_id;
  
  -- Admin has all permissions
  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Get role's default permissions
  SELECT permissions INTO role_permissions
  FROM public.role_permissions
  WHERE role = user_role;
  
  -- Check if permission exists in role permissions or user's custom permissions
  RETURN (
    role_permissions ? required_permission OR
    user_permissions ? required_permission OR
    role_permissions ? '*' OR
    user_permissions ? '*'
  );
END;
$function$
;

create or replace view "public"."user_management_view" as  SELECT p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.role,
    p.team_id,
    t.name AS team_name,
    p.discord_id,
    p.discord_username,
    p.is_active,
    p.email_verified,
    p.onboarding_completed,
    p.created_at,
    p.updated_at,
    p.last_seen_at,
    au.email,
    au.last_sign_in_at,
    ( SELECT count(*) AS count
           FROM public.user_activity_log
          WHERE (user_activity_log.user_id = p.id)) AS activity_count
   FROM ((public.profiles p
     LEFT JOIN public.teams t ON ((p.team_id = t.id)))
     LEFT JOIN auth.users au ON ((p.id = au.id)));


grant delete on table "public"."abilities" to "anon";

grant insert on table "public"."abilities" to "anon";

grant references on table "public"."abilities" to "anon";

grant select on table "public"."abilities" to "anon";

grant trigger on table "public"."abilities" to "anon";

grant truncate on table "public"."abilities" to "anon";

grant update on table "public"."abilities" to "anon";

grant delete on table "public"."abilities" to "authenticated";

grant insert on table "public"."abilities" to "authenticated";

grant references on table "public"."abilities" to "authenticated";

grant select on table "public"."abilities" to "authenticated";

grant trigger on table "public"."abilities" to "authenticated";

grant truncate on table "public"."abilities" to "authenticated";

grant update on table "public"."abilities" to "authenticated";

grant delete on table "public"."abilities" to "service_role";

grant insert on table "public"."abilities" to "service_role";

grant references on table "public"."abilities" to "service_role";

grant select on table "public"."abilities" to "service_role";

grant trigger on table "public"."abilities" to "service_role";

grant truncate on table "public"."abilities" to "service_role";

grant update on table "public"."abilities" to "service_role";

grant delete on table "public"."battle_events" to "anon";

grant insert on table "public"."battle_events" to "anon";

grant references on table "public"."battle_events" to "anon";

grant select on table "public"."battle_events" to "anon";

grant trigger on table "public"."battle_events" to "anon";

grant truncate on table "public"."battle_events" to "anon";

grant update on table "public"."battle_events" to "anon";

grant delete on table "public"."battle_events" to "authenticated";

grant insert on table "public"."battle_events" to "authenticated";

grant references on table "public"."battle_events" to "authenticated";

grant select on table "public"."battle_events" to "authenticated";

grant trigger on table "public"."battle_events" to "authenticated";

grant truncate on table "public"."battle_events" to "authenticated";

grant update on table "public"."battle_events" to "authenticated";

grant delete on table "public"."battle_events" to "service_role";

grant insert on table "public"."battle_events" to "service_role";

grant references on table "public"."battle_events" to "service_role";

grant select on table "public"."battle_events" to "service_role";

grant trigger on table "public"."battle_events" to "service_role";

grant truncate on table "public"."battle_events" to "service_role";

grant update on table "public"."battle_events" to "service_role";

grant delete on table "public"."battle_sessions" to "anon";

grant insert on table "public"."battle_sessions" to "anon";

grant references on table "public"."battle_sessions" to "anon";

grant select on table "public"."battle_sessions" to "anon";

grant trigger on table "public"."battle_sessions" to "anon";

grant truncate on table "public"."battle_sessions" to "anon";

grant update on table "public"."battle_sessions" to "anon";

grant delete on table "public"."battle_sessions" to "authenticated";

grant insert on table "public"."battle_sessions" to "authenticated";

grant references on table "public"."battle_sessions" to "authenticated";

grant select on table "public"."battle_sessions" to "authenticated";

grant trigger on table "public"."battle_sessions" to "authenticated";

grant truncate on table "public"."battle_sessions" to "authenticated";

grant update on table "public"."battle_sessions" to "authenticated";

grant delete on table "public"."battle_sessions" to "service_role";

grant insert on table "public"."battle_sessions" to "service_role";

grant references on table "public"."battle_sessions" to "service_role";

grant select on table "public"."battle_sessions" to "service_role";

grant trigger on table "public"."battle_sessions" to "service_role";

grant truncate on table "public"."battle_sessions" to "service_role";

grant update on table "public"."battle_sessions" to "service_role";

grant delete on table "public"."berries" to "anon";

grant insert on table "public"."berries" to "anon";

grant references on table "public"."berries" to "anon";

grant select on table "public"."berries" to "anon";

grant trigger on table "public"."berries" to "anon";

grant truncate on table "public"."berries" to "anon";

grant update on table "public"."berries" to "anon";

grant delete on table "public"."berries" to "authenticated";

grant insert on table "public"."berries" to "authenticated";

grant references on table "public"."berries" to "authenticated";

grant select on table "public"."berries" to "authenticated";

grant trigger on table "public"."berries" to "authenticated";

grant truncate on table "public"."berries" to "authenticated";

grant update on table "public"."berries" to "authenticated";

grant delete on table "public"."berries" to "service_role";

grant insert on table "public"."berries" to "service_role";

grant references on table "public"."berries" to "service_role";

grant select on table "public"."berries" to "service_role";

grant trigger on table "public"."berries" to "service_role";

grant truncate on table "public"."berries" to "service_role";

grant update on table "public"."berries" to "service_role";

grant delete on table "public"."berry_firmnesses" to "anon";

grant insert on table "public"."berry_firmnesses" to "anon";

grant references on table "public"."berry_firmnesses" to "anon";

grant select on table "public"."berry_firmnesses" to "anon";

grant trigger on table "public"."berry_firmnesses" to "anon";

grant truncate on table "public"."berry_firmnesses" to "anon";

grant update on table "public"."berry_firmnesses" to "anon";

grant delete on table "public"."berry_firmnesses" to "authenticated";

grant insert on table "public"."berry_firmnesses" to "authenticated";

grant references on table "public"."berry_firmnesses" to "authenticated";

grant select on table "public"."berry_firmnesses" to "authenticated";

grant trigger on table "public"."berry_firmnesses" to "authenticated";

grant truncate on table "public"."berry_firmnesses" to "authenticated";

grant update on table "public"."berry_firmnesses" to "authenticated";

grant delete on table "public"."berry_firmnesses" to "service_role";

grant insert on table "public"."berry_firmnesses" to "service_role";

grant references on table "public"."berry_firmnesses" to "service_role";

grant select on table "public"."berry_firmnesses" to "service_role";

grant trigger on table "public"."berry_firmnesses" to "service_role";

grant truncate on table "public"."berry_firmnesses" to "service_role";

grant update on table "public"."berry_firmnesses" to "service_role";

grant delete on table "public"."berry_flavors" to "anon";

grant insert on table "public"."berry_flavors" to "anon";

grant references on table "public"."berry_flavors" to "anon";

grant select on table "public"."berry_flavors" to "anon";

grant trigger on table "public"."berry_flavors" to "anon";

grant truncate on table "public"."berry_flavors" to "anon";

grant update on table "public"."berry_flavors" to "anon";

grant delete on table "public"."berry_flavors" to "authenticated";

grant insert on table "public"."berry_flavors" to "authenticated";

grant references on table "public"."berry_flavors" to "authenticated";

grant select on table "public"."berry_flavors" to "authenticated";

grant trigger on table "public"."berry_flavors" to "authenticated";

grant truncate on table "public"."berry_flavors" to "authenticated";

grant update on table "public"."berry_flavors" to "authenticated";

grant delete on table "public"."berry_flavors" to "service_role";

grant insert on table "public"."berry_flavors" to "service_role";

grant references on table "public"."berry_flavors" to "service_role";

grant select on table "public"."berry_flavors" to "service_role";

grant trigger on table "public"."berry_flavors" to "service_role";

grant truncate on table "public"."berry_flavors" to "service_role";

grant update on table "public"."berry_flavors" to "service_role";

grant delete on table "public"."characteristics" to "anon";

grant insert on table "public"."characteristics" to "anon";

grant references on table "public"."characteristics" to "anon";

grant select on table "public"."characteristics" to "anon";

grant trigger on table "public"."characteristics" to "anon";

grant truncate on table "public"."characteristics" to "anon";

grant update on table "public"."characteristics" to "anon";

grant delete on table "public"."characteristics" to "authenticated";

grant insert on table "public"."characteristics" to "authenticated";

grant references on table "public"."characteristics" to "authenticated";

grant select on table "public"."characteristics" to "authenticated";

grant trigger on table "public"."characteristics" to "authenticated";

grant truncate on table "public"."characteristics" to "authenticated";

grant update on table "public"."characteristics" to "authenticated";

grant delete on table "public"."characteristics" to "service_role";

grant insert on table "public"."characteristics" to "service_role";

grant references on table "public"."characteristics" to "service_role";

grant select on table "public"."characteristics" to "service_role";

grant trigger on table "public"."characteristics" to "service_role";

grant truncate on table "public"."characteristics" to "service_role";

grant update on table "public"."characteristics" to "service_role";

grant delete on table "public"."coaches" to "anon";

grant insert on table "public"."coaches" to "anon";

grant references on table "public"."coaches" to "anon";

grant select on table "public"."coaches" to "anon";

grant trigger on table "public"."coaches" to "anon";

grant truncate on table "public"."coaches" to "anon";

grant update on table "public"."coaches" to "anon";

grant delete on table "public"."coaches" to "authenticated";

grant insert on table "public"."coaches" to "authenticated";

grant references on table "public"."coaches" to "authenticated";

grant select on table "public"."coaches" to "authenticated";

grant trigger on table "public"."coaches" to "authenticated";

grant truncate on table "public"."coaches" to "authenticated";

grant update on table "public"."coaches" to "authenticated";

grant delete on table "public"."coaches" to "service_role";

grant insert on table "public"."coaches" to "service_role";

grant references on table "public"."coaches" to "service_role";

grant select on table "public"."coaches" to "service_role";

grant trigger on table "public"."coaches" to "service_role";

grant truncate on table "public"."coaches" to "service_role";

grant update on table "public"."coaches" to "service_role";

grant delete on table "public"."conferences" to "anon";

grant insert on table "public"."conferences" to "anon";

grant references on table "public"."conferences" to "anon";

grant select on table "public"."conferences" to "anon";

grant trigger on table "public"."conferences" to "anon";

grant truncate on table "public"."conferences" to "anon";

grant update on table "public"."conferences" to "anon";

grant delete on table "public"."conferences" to "authenticated";

grant insert on table "public"."conferences" to "authenticated";

grant references on table "public"."conferences" to "authenticated";

grant select on table "public"."conferences" to "authenticated";

grant trigger on table "public"."conferences" to "authenticated";

grant truncate on table "public"."conferences" to "authenticated";

grant update on table "public"."conferences" to "authenticated";

grant delete on table "public"."conferences" to "service_role";

grant insert on table "public"."conferences" to "service_role";

grant references on table "public"."conferences" to "service_role";

grant select on table "public"."conferences" to "service_role";

grant trigger on table "public"."conferences" to "service_role";

grant truncate on table "public"."conferences" to "service_role";

grant update on table "public"."conferences" to "service_role";

grant delete on table "public"."contest_effects" to "anon";

grant insert on table "public"."contest_effects" to "anon";

grant references on table "public"."contest_effects" to "anon";

grant select on table "public"."contest_effects" to "anon";

grant trigger on table "public"."contest_effects" to "anon";

grant truncate on table "public"."contest_effects" to "anon";

grant update on table "public"."contest_effects" to "anon";

grant delete on table "public"."contest_effects" to "authenticated";

grant insert on table "public"."contest_effects" to "authenticated";

grant references on table "public"."contest_effects" to "authenticated";

grant select on table "public"."contest_effects" to "authenticated";

grant trigger on table "public"."contest_effects" to "authenticated";

grant truncate on table "public"."contest_effects" to "authenticated";

grant update on table "public"."contest_effects" to "authenticated";

grant delete on table "public"."contest_effects" to "service_role";

grant insert on table "public"."contest_effects" to "service_role";

grant references on table "public"."contest_effects" to "service_role";

grant select on table "public"."contest_effects" to "service_role";

grant trigger on table "public"."contest_effects" to "service_role";

grant truncate on table "public"."contest_effects" to "service_role";

grant update on table "public"."contest_effects" to "service_role";

grant delete on table "public"."contest_types" to "anon";

grant insert on table "public"."contest_types" to "anon";

grant references on table "public"."contest_types" to "anon";

grant select on table "public"."contest_types" to "anon";

grant trigger on table "public"."contest_types" to "anon";

grant truncate on table "public"."contest_types" to "anon";

grant update on table "public"."contest_types" to "anon";

grant delete on table "public"."contest_types" to "authenticated";

grant insert on table "public"."contest_types" to "authenticated";

grant references on table "public"."contest_types" to "authenticated";

grant select on table "public"."contest_types" to "authenticated";

grant trigger on table "public"."contest_types" to "authenticated";

grant truncate on table "public"."contest_types" to "authenticated";

grant update on table "public"."contest_types" to "authenticated";

grant delete on table "public"."contest_types" to "service_role";

grant insert on table "public"."contest_types" to "service_role";

grant references on table "public"."contest_types" to "service_role";

grant select on table "public"."contest_types" to "service_role";

grant trigger on table "public"."contest_types" to "service_role";

grant truncate on table "public"."contest_types" to "service_role";

grant update on table "public"."contest_types" to "service_role";

grant delete on table "public"."discord_webhooks" to "anon";

grant insert on table "public"."discord_webhooks" to "anon";

grant references on table "public"."discord_webhooks" to "anon";

grant select on table "public"."discord_webhooks" to "anon";

grant trigger on table "public"."discord_webhooks" to "anon";

grant truncate on table "public"."discord_webhooks" to "anon";

grant update on table "public"."discord_webhooks" to "anon";

grant delete on table "public"."discord_webhooks" to "authenticated";

grant insert on table "public"."discord_webhooks" to "authenticated";

grant references on table "public"."discord_webhooks" to "authenticated";

grant select on table "public"."discord_webhooks" to "authenticated";

grant trigger on table "public"."discord_webhooks" to "authenticated";

grant truncate on table "public"."discord_webhooks" to "authenticated";

grant update on table "public"."discord_webhooks" to "authenticated";

grant delete on table "public"."discord_webhooks" to "service_role";

grant insert on table "public"."discord_webhooks" to "service_role";

grant references on table "public"."discord_webhooks" to "service_role";

grant select on table "public"."discord_webhooks" to "service_role";

grant trigger on table "public"."discord_webhooks" to "service_role";

grant truncate on table "public"."discord_webhooks" to "service_role";

grant update on table "public"."discord_webhooks" to "service_role";

grant delete on table "public"."divisions" to "anon";

grant insert on table "public"."divisions" to "anon";

grant references on table "public"."divisions" to "anon";

grant select on table "public"."divisions" to "anon";

grant trigger on table "public"."divisions" to "anon";

grant truncate on table "public"."divisions" to "anon";

grant update on table "public"."divisions" to "anon";

grant delete on table "public"."divisions" to "authenticated";

grant insert on table "public"."divisions" to "authenticated";

grant references on table "public"."divisions" to "authenticated";

grant select on table "public"."divisions" to "authenticated";

grant trigger on table "public"."divisions" to "authenticated";

grant truncate on table "public"."divisions" to "authenticated";

grant update on table "public"."divisions" to "authenticated";

grant delete on table "public"."divisions" to "service_role";

grant insert on table "public"."divisions" to "service_role";

grant references on table "public"."divisions" to "service_role";

grant select on table "public"."divisions" to "service_role";

grant trigger on table "public"."divisions" to "service_role";

grant truncate on table "public"."divisions" to "service_role";

grant update on table "public"."divisions" to "service_role";

grant delete on table "public"."draft_budgets" to "anon";

grant insert on table "public"."draft_budgets" to "anon";

grant references on table "public"."draft_budgets" to "anon";

grant select on table "public"."draft_budgets" to "anon";

grant trigger on table "public"."draft_budgets" to "anon";

grant truncate on table "public"."draft_budgets" to "anon";

grant update on table "public"."draft_budgets" to "anon";

grant delete on table "public"."draft_budgets" to "authenticated";

grant insert on table "public"."draft_budgets" to "authenticated";

grant references on table "public"."draft_budgets" to "authenticated";

grant select on table "public"."draft_budgets" to "authenticated";

grant trigger on table "public"."draft_budgets" to "authenticated";

grant truncate on table "public"."draft_budgets" to "authenticated";

grant update on table "public"."draft_budgets" to "authenticated";

grant delete on table "public"."draft_budgets" to "service_role";

grant insert on table "public"."draft_budgets" to "service_role";

grant references on table "public"."draft_budgets" to "service_role";

grant select on table "public"."draft_budgets" to "service_role";

grant trigger on table "public"."draft_budgets" to "service_role";

grant truncate on table "public"."draft_budgets" to "service_role";

grant update on table "public"."draft_budgets" to "service_role";

grant delete on table "public"."draft_pool" to "anon";

grant insert on table "public"."draft_pool" to "anon";

grant references on table "public"."draft_pool" to "anon";

grant select on table "public"."draft_pool" to "anon";

grant trigger on table "public"."draft_pool" to "anon";

grant truncate on table "public"."draft_pool" to "anon";

grant update on table "public"."draft_pool" to "anon";

grant delete on table "public"."draft_pool" to "authenticated";

grant insert on table "public"."draft_pool" to "authenticated";

grant references on table "public"."draft_pool" to "authenticated";

grant select on table "public"."draft_pool" to "authenticated";

grant trigger on table "public"."draft_pool" to "authenticated";

grant truncate on table "public"."draft_pool" to "authenticated";

grant update on table "public"."draft_pool" to "authenticated";

grant delete on table "public"."draft_pool" to "service_role";

grant insert on table "public"."draft_pool" to "service_role";

grant references on table "public"."draft_pool" to "service_role";

grant select on table "public"."draft_pool" to "service_role";

grant trigger on table "public"."draft_pool" to "service_role";

grant truncate on table "public"."draft_pool" to "service_role";

grant update on table "public"."draft_pool" to "service_role";

grant delete on table "public"."draft_sessions" to "anon";

grant insert on table "public"."draft_sessions" to "anon";

grant references on table "public"."draft_sessions" to "anon";

grant select on table "public"."draft_sessions" to "anon";

grant trigger on table "public"."draft_sessions" to "anon";

grant truncate on table "public"."draft_sessions" to "anon";

grant update on table "public"."draft_sessions" to "anon";

grant delete on table "public"."draft_sessions" to "authenticated";

grant insert on table "public"."draft_sessions" to "authenticated";

grant references on table "public"."draft_sessions" to "authenticated";

grant select on table "public"."draft_sessions" to "authenticated";

grant trigger on table "public"."draft_sessions" to "authenticated";

grant truncate on table "public"."draft_sessions" to "authenticated";

grant update on table "public"."draft_sessions" to "authenticated";

grant delete on table "public"."draft_sessions" to "service_role";

grant insert on table "public"."draft_sessions" to "service_role";

grant references on table "public"."draft_sessions" to "service_role";

grant select on table "public"."draft_sessions" to "service_role";

grant trigger on table "public"."draft_sessions" to "service_role";

grant truncate on table "public"."draft_sessions" to "service_role";

grant update on table "public"."draft_sessions" to "service_role";

grant delete on table "public"."egg_groups" to "anon";

grant insert on table "public"."egg_groups" to "anon";

grant references on table "public"."egg_groups" to "anon";

grant select on table "public"."egg_groups" to "anon";

grant trigger on table "public"."egg_groups" to "anon";

grant truncate on table "public"."egg_groups" to "anon";

grant update on table "public"."egg_groups" to "anon";

grant delete on table "public"."egg_groups" to "authenticated";

grant insert on table "public"."egg_groups" to "authenticated";

grant references on table "public"."egg_groups" to "authenticated";

grant select on table "public"."egg_groups" to "authenticated";

grant trigger on table "public"."egg_groups" to "authenticated";

grant truncate on table "public"."egg_groups" to "authenticated";

grant update on table "public"."egg_groups" to "authenticated";

grant delete on table "public"."egg_groups" to "service_role";

grant insert on table "public"."egg_groups" to "service_role";

grant references on table "public"."egg_groups" to "service_role";

grant select on table "public"."egg_groups" to "service_role";

grant trigger on table "public"."egg_groups" to "service_role";

grant truncate on table "public"."egg_groups" to "service_role";

grant update on table "public"."egg_groups" to "service_role";

grant delete on table "public"."encounter_condition_values" to "anon";

grant insert on table "public"."encounter_condition_values" to "anon";

grant references on table "public"."encounter_condition_values" to "anon";

grant select on table "public"."encounter_condition_values" to "anon";

grant trigger on table "public"."encounter_condition_values" to "anon";

grant truncate on table "public"."encounter_condition_values" to "anon";

grant update on table "public"."encounter_condition_values" to "anon";

grant delete on table "public"."encounter_condition_values" to "authenticated";

grant insert on table "public"."encounter_condition_values" to "authenticated";

grant references on table "public"."encounter_condition_values" to "authenticated";

grant select on table "public"."encounter_condition_values" to "authenticated";

grant trigger on table "public"."encounter_condition_values" to "authenticated";

grant truncate on table "public"."encounter_condition_values" to "authenticated";

grant update on table "public"."encounter_condition_values" to "authenticated";

grant delete on table "public"."encounter_condition_values" to "service_role";

grant insert on table "public"."encounter_condition_values" to "service_role";

grant references on table "public"."encounter_condition_values" to "service_role";

grant select on table "public"."encounter_condition_values" to "service_role";

grant trigger on table "public"."encounter_condition_values" to "service_role";

grant truncate on table "public"."encounter_condition_values" to "service_role";

grant update on table "public"."encounter_condition_values" to "service_role";

grant delete on table "public"."encounter_conditions" to "anon";

grant insert on table "public"."encounter_conditions" to "anon";

grant references on table "public"."encounter_conditions" to "anon";

grant select on table "public"."encounter_conditions" to "anon";

grant trigger on table "public"."encounter_conditions" to "anon";

grant truncate on table "public"."encounter_conditions" to "anon";

grant update on table "public"."encounter_conditions" to "anon";

grant delete on table "public"."encounter_conditions" to "authenticated";

grant insert on table "public"."encounter_conditions" to "authenticated";

grant references on table "public"."encounter_conditions" to "authenticated";

grant select on table "public"."encounter_conditions" to "authenticated";

grant trigger on table "public"."encounter_conditions" to "authenticated";

grant truncate on table "public"."encounter_conditions" to "authenticated";

grant update on table "public"."encounter_conditions" to "authenticated";

grant delete on table "public"."encounter_conditions" to "service_role";

grant insert on table "public"."encounter_conditions" to "service_role";

grant references on table "public"."encounter_conditions" to "service_role";

grant select on table "public"."encounter_conditions" to "service_role";

grant trigger on table "public"."encounter_conditions" to "service_role";

grant truncate on table "public"."encounter_conditions" to "service_role";

grant update on table "public"."encounter_conditions" to "service_role";

grant delete on table "public"."encounter_methods" to "anon";

grant insert on table "public"."encounter_methods" to "anon";

grant references on table "public"."encounter_methods" to "anon";

grant select on table "public"."encounter_methods" to "anon";

grant trigger on table "public"."encounter_methods" to "anon";

grant truncate on table "public"."encounter_methods" to "anon";

grant update on table "public"."encounter_methods" to "anon";

grant delete on table "public"."encounter_methods" to "authenticated";

grant insert on table "public"."encounter_methods" to "authenticated";

grant references on table "public"."encounter_methods" to "authenticated";

grant select on table "public"."encounter_methods" to "authenticated";

grant trigger on table "public"."encounter_methods" to "authenticated";

grant truncate on table "public"."encounter_methods" to "authenticated";

grant update on table "public"."encounter_methods" to "authenticated";

grant delete on table "public"."encounter_methods" to "service_role";

grant insert on table "public"."encounter_methods" to "service_role";

grant references on table "public"."encounter_methods" to "service_role";

grant select on table "public"."encounter_methods" to "service_role";

grant trigger on table "public"."encounter_methods" to "service_role";

grant truncate on table "public"."encounter_methods" to "service_role";

grant update on table "public"."encounter_methods" to "service_role";

grant delete on table "public"."evolution_chains" to "anon";

grant insert on table "public"."evolution_chains" to "anon";

grant references on table "public"."evolution_chains" to "anon";

grant select on table "public"."evolution_chains" to "anon";

grant trigger on table "public"."evolution_chains" to "anon";

grant truncate on table "public"."evolution_chains" to "anon";

grant update on table "public"."evolution_chains" to "anon";

grant delete on table "public"."evolution_chains" to "authenticated";

grant insert on table "public"."evolution_chains" to "authenticated";

grant references on table "public"."evolution_chains" to "authenticated";

grant select on table "public"."evolution_chains" to "authenticated";

grant trigger on table "public"."evolution_chains" to "authenticated";

grant truncate on table "public"."evolution_chains" to "authenticated";

grant update on table "public"."evolution_chains" to "authenticated";

grant delete on table "public"."evolution_chains" to "service_role";

grant insert on table "public"."evolution_chains" to "service_role";

grant references on table "public"."evolution_chains" to "service_role";

grant select on table "public"."evolution_chains" to "service_role";

grant trigger on table "public"."evolution_chains" to "service_role";

grant truncate on table "public"."evolution_chains" to "service_role";

grant update on table "public"."evolution_chains" to "service_role";

grant delete on table "public"."evolution_triggers" to "anon";

grant insert on table "public"."evolution_triggers" to "anon";

grant references on table "public"."evolution_triggers" to "anon";

grant select on table "public"."evolution_triggers" to "anon";

grant trigger on table "public"."evolution_triggers" to "anon";

grant truncate on table "public"."evolution_triggers" to "anon";

grant update on table "public"."evolution_triggers" to "anon";

grant delete on table "public"."evolution_triggers" to "authenticated";

grant insert on table "public"."evolution_triggers" to "authenticated";

grant references on table "public"."evolution_triggers" to "authenticated";

grant select on table "public"."evolution_triggers" to "authenticated";

grant trigger on table "public"."evolution_triggers" to "authenticated";

grant truncate on table "public"."evolution_triggers" to "authenticated";

grant update on table "public"."evolution_triggers" to "authenticated";

grant delete on table "public"."evolution_triggers" to "service_role";

grant insert on table "public"."evolution_triggers" to "service_role";

grant references on table "public"."evolution_triggers" to "service_role";

grant select on table "public"."evolution_triggers" to "service_role";

grant trigger on table "public"."evolution_triggers" to "service_role";

grant truncate on table "public"."evolution_triggers" to "service_role";

grant update on table "public"."evolution_triggers" to "service_role";

grant delete on table "public"."genders" to "anon";

grant insert on table "public"."genders" to "anon";

grant references on table "public"."genders" to "anon";

grant select on table "public"."genders" to "anon";

grant trigger on table "public"."genders" to "anon";

grant truncate on table "public"."genders" to "anon";

grant update on table "public"."genders" to "anon";

grant delete on table "public"."genders" to "authenticated";

grant insert on table "public"."genders" to "authenticated";

grant references on table "public"."genders" to "authenticated";

grant select on table "public"."genders" to "authenticated";

grant trigger on table "public"."genders" to "authenticated";

grant truncate on table "public"."genders" to "authenticated";

grant update on table "public"."genders" to "authenticated";

grant delete on table "public"."genders" to "service_role";

grant insert on table "public"."genders" to "service_role";

grant references on table "public"."genders" to "service_role";

grant select on table "public"."genders" to "service_role";

grant trigger on table "public"."genders" to "service_role";

grant truncate on table "public"."genders" to "service_role";

grant update on table "public"."genders" to "service_role";

grant delete on table "public"."generations" to "anon";

grant insert on table "public"."generations" to "anon";

grant references on table "public"."generations" to "anon";

grant select on table "public"."generations" to "anon";

grant trigger on table "public"."generations" to "anon";

grant truncate on table "public"."generations" to "anon";

grant update on table "public"."generations" to "anon";

grant delete on table "public"."generations" to "authenticated";

grant insert on table "public"."generations" to "authenticated";

grant references on table "public"."generations" to "authenticated";

grant select on table "public"."generations" to "authenticated";

grant trigger on table "public"."generations" to "authenticated";

grant truncate on table "public"."generations" to "authenticated";

grant update on table "public"."generations" to "authenticated";

grant delete on table "public"."generations" to "service_role";

grant insert on table "public"."generations" to "service_role";

grant references on table "public"."generations" to "service_role";

grant select on table "public"."generations" to "service_role";

grant trigger on table "public"."generations" to "service_role";

grant truncate on table "public"."generations" to "service_role";

grant update on table "public"."generations" to "service_role";

grant delete on table "public"."google_sheets_config" to "anon";

grant insert on table "public"."google_sheets_config" to "anon";

grant references on table "public"."google_sheets_config" to "anon";

grant select on table "public"."google_sheets_config" to "anon";

grant trigger on table "public"."google_sheets_config" to "anon";

grant truncate on table "public"."google_sheets_config" to "anon";

grant update on table "public"."google_sheets_config" to "anon";

grant delete on table "public"."google_sheets_config" to "authenticated";

grant insert on table "public"."google_sheets_config" to "authenticated";

grant references on table "public"."google_sheets_config" to "authenticated";

grant select on table "public"."google_sheets_config" to "authenticated";

grant trigger on table "public"."google_sheets_config" to "authenticated";

grant truncate on table "public"."google_sheets_config" to "authenticated";

grant update on table "public"."google_sheets_config" to "authenticated";

grant delete on table "public"."google_sheets_config" to "service_role";

grant insert on table "public"."google_sheets_config" to "service_role";

grant references on table "public"."google_sheets_config" to "service_role";

grant select on table "public"."google_sheets_config" to "service_role";

grant trigger on table "public"."google_sheets_config" to "service_role";

grant truncate on table "public"."google_sheets_config" to "service_role";

grant update on table "public"."google_sheets_config" to "service_role";

grant delete on table "public"."growth_rates" to "anon";

grant insert on table "public"."growth_rates" to "anon";

grant references on table "public"."growth_rates" to "anon";

grant select on table "public"."growth_rates" to "anon";

grant trigger on table "public"."growth_rates" to "anon";

grant truncate on table "public"."growth_rates" to "anon";

grant update on table "public"."growth_rates" to "anon";

grant delete on table "public"."growth_rates" to "authenticated";

grant insert on table "public"."growth_rates" to "authenticated";

grant references on table "public"."growth_rates" to "authenticated";

grant select on table "public"."growth_rates" to "authenticated";

grant trigger on table "public"."growth_rates" to "authenticated";

grant truncate on table "public"."growth_rates" to "authenticated";

grant update on table "public"."growth_rates" to "authenticated";

grant delete on table "public"."growth_rates" to "service_role";

grant insert on table "public"."growth_rates" to "service_role";

grant references on table "public"."growth_rates" to "service_role";

grant select on table "public"."growth_rates" to "service_role";

grant trigger on table "public"."growth_rates" to "service_role";

grant truncate on table "public"."growth_rates" to "service_role";

grant update on table "public"."growth_rates" to "service_role";

grant delete on table "public"."item_attributes" to "anon";

grant insert on table "public"."item_attributes" to "anon";

grant references on table "public"."item_attributes" to "anon";

grant select on table "public"."item_attributes" to "anon";

grant trigger on table "public"."item_attributes" to "anon";

grant truncate on table "public"."item_attributes" to "anon";

grant update on table "public"."item_attributes" to "anon";

grant delete on table "public"."item_attributes" to "authenticated";

grant insert on table "public"."item_attributes" to "authenticated";

grant references on table "public"."item_attributes" to "authenticated";

grant select on table "public"."item_attributes" to "authenticated";

grant trigger on table "public"."item_attributes" to "authenticated";

grant truncate on table "public"."item_attributes" to "authenticated";

grant update on table "public"."item_attributes" to "authenticated";

grant delete on table "public"."item_attributes" to "service_role";

grant insert on table "public"."item_attributes" to "service_role";

grant references on table "public"."item_attributes" to "service_role";

grant select on table "public"."item_attributes" to "service_role";

grant trigger on table "public"."item_attributes" to "service_role";

grant truncate on table "public"."item_attributes" to "service_role";

grant update on table "public"."item_attributes" to "service_role";

grant delete on table "public"."item_categories" to "anon";

grant insert on table "public"."item_categories" to "anon";

grant references on table "public"."item_categories" to "anon";

grant select on table "public"."item_categories" to "anon";

grant trigger on table "public"."item_categories" to "anon";

grant truncate on table "public"."item_categories" to "anon";

grant update on table "public"."item_categories" to "anon";

grant delete on table "public"."item_categories" to "authenticated";

grant insert on table "public"."item_categories" to "authenticated";

grant references on table "public"."item_categories" to "authenticated";

grant select on table "public"."item_categories" to "authenticated";

grant trigger on table "public"."item_categories" to "authenticated";

grant truncate on table "public"."item_categories" to "authenticated";

grant update on table "public"."item_categories" to "authenticated";

grant delete on table "public"."item_categories" to "service_role";

grant insert on table "public"."item_categories" to "service_role";

grant references on table "public"."item_categories" to "service_role";

grant select on table "public"."item_categories" to "service_role";

grant trigger on table "public"."item_categories" to "service_role";

grant truncate on table "public"."item_categories" to "service_role";

grant update on table "public"."item_categories" to "service_role";

grant delete on table "public"."item_fling_effects" to "anon";

grant insert on table "public"."item_fling_effects" to "anon";

grant references on table "public"."item_fling_effects" to "anon";

grant select on table "public"."item_fling_effects" to "anon";

grant trigger on table "public"."item_fling_effects" to "anon";

grant truncate on table "public"."item_fling_effects" to "anon";

grant update on table "public"."item_fling_effects" to "anon";

grant delete on table "public"."item_fling_effects" to "authenticated";

grant insert on table "public"."item_fling_effects" to "authenticated";

grant references on table "public"."item_fling_effects" to "authenticated";

grant select on table "public"."item_fling_effects" to "authenticated";

grant trigger on table "public"."item_fling_effects" to "authenticated";

grant truncate on table "public"."item_fling_effects" to "authenticated";

grant update on table "public"."item_fling_effects" to "authenticated";

grant delete on table "public"."item_fling_effects" to "service_role";

grant insert on table "public"."item_fling_effects" to "service_role";

grant references on table "public"."item_fling_effects" to "service_role";

grant select on table "public"."item_fling_effects" to "service_role";

grant trigger on table "public"."item_fling_effects" to "service_role";

grant truncate on table "public"."item_fling_effects" to "service_role";

grant update on table "public"."item_fling_effects" to "service_role";

grant delete on table "public"."item_pockets" to "anon";

grant insert on table "public"."item_pockets" to "anon";

grant references on table "public"."item_pockets" to "anon";

grant select on table "public"."item_pockets" to "anon";

grant trigger on table "public"."item_pockets" to "anon";

grant truncate on table "public"."item_pockets" to "anon";

grant update on table "public"."item_pockets" to "anon";

grant delete on table "public"."item_pockets" to "authenticated";

grant insert on table "public"."item_pockets" to "authenticated";

grant references on table "public"."item_pockets" to "authenticated";

grant select on table "public"."item_pockets" to "authenticated";

grant trigger on table "public"."item_pockets" to "authenticated";

grant truncate on table "public"."item_pockets" to "authenticated";

grant update on table "public"."item_pockets" to "authenticated";

grant delete on table "public"."item_pockets" to "service_role";

grant insert on table "public"."item_pockets" to "service_role";

grant references on table "public"."item_pockets" to "service_role";

grant select on table "public"."item_pockets" to "service_role";

grant trigger on table "public"."item_pockets" to "service_role";

grant truncate on table "public"."item_pockets" to "service_role";

grant update on table "public"."item_pockets" to "service_role";

grant delete on table "public"."items" to "anon";

grant insert on table "public"."items" to "anon";

grant references on table "public"."items" to "anon";

grant select on table "public"."items" to "anon";

grant trigger on table "public"."items" to "anon";

grant truncate on table "public"."items" to "anon";

grant update on table "public"."items" to "anon";

grant delete on table "public"."items" to "authenticated";

grant insert on table "public"."items" to "authenticated";

grant references on table "public"."items" to "authenticated";

grant select on table "public"."items" to "authenticated";

grant trigger on table "public"."items" to "authenticated";

grant truncate on table "public"."items" to "authenticated";

grant update on table "public"."items" to "authenticated";

grant delete on table "public"."items" to "service_role";

grant insert on table "public"."items" to "service_role";

grant references on table "public"."items" to "service_role";

grant select on table "public"."items" to "service_role";

grant trigger on table "public"."items" to "service_role";

grant truncate on table "public"."items" to "service_role";

grant update on table "public"."items" to "service_role";

grant delete on table "public"."languages" to "anon";

grant insert on table "public"."languages" to "anon";

grant references on table "public"."languages" to "anon";

grant select on table "public"."languages" to "anon";

grant trigger on table "public"."languages" to "anon";

grant truncate on table "public"."languages" to "anon";

grant update on table "public"."languages" to "anon";

grant delete on table "public"."languages" to "authenticated";

grant insert on table "public"."languages" to "authenticated";

grant references on table "public"."languages" to "authenticated";

grant select on table "public"."languages" to "authenticated";

grant trigger on table "public"."languages" to "authenticated";

grant truncate on table "public"."languages" to "authenticated";

grant update on table "public"."languages" to "authenticated";

grant delete on table "public"."languages" to "service_role";

grant insert on table "public"."languages" to "service_role";

grant references on table "public"."languages" to "service_role";

grant select on table "public"."languages" to "service_role";

grant trigger on table "public"."languages" to "service_role";

grant truncate on table "public"."languages" to "service_role";

grant update on table "public"."languages" to "service_role";

grant delete on table "public"."league_config" to "anon";

grant insert on table "public"."league_config" to "anon";

grant references on table "public"."league_config" to "anon";

grant select on table "public"."league_config" to "anon";

grant trigger on table "public"."league_config" to "anon";

grant truncate on table "public"."league_config" to "anon";

grant update on table "public"."league_config" to "anon";

grant delete on table "public"."league_config" to "authenticated";

grant insert on table "public"."league_config" to "authenticated";

grant references on table "public"."league_config" to "authenticated";

grant select on table "public"."league_config" to "authenticated";

grant trigger on table "public"."league_config" to "authenticated";

grant truncate on table "public"."league_config" to "authenticated";

grant update on table "public"."league_config" to "authenticated";

grant delete on table "public"."league_config" to "service_role";

grant insert on table "public"."league_config" to "service_role";

grant references on table "public"."league_config" to "service_role";

grant select on table "public"."league_config" to "service_role";

grant trigger on table "public"."league_config" to "service_role";

grant truncate on table "public"."league_config" to "service_role";

grant update on table "public"."league_config" to "service_role";

grant delete on table "public"."location_areas" to "anon";

grant insert on table "public"."location_areas" to "anon";

grant references on table "public"."location_areas" to "anon";

grant select on table "public"."location_areas" to "anon";

grant trigger on table "public"."location_areas" to "anon";

grant truncate on table "public"."location_areas" to "anon";

grant update on table "public"."location_areas" to "anon";

grant delete on table "public"."location_areas" to "authenticated";

grant insert on table "public"."location_areas" to "authenticated";

grant references on table "public"."location_areas" to "authenticated";

grant select on table "public"."location_areas" to "authenticated";

grant trigger on table "public"."location_areas" to "authenticated";

grant truncate on table "public"."location_areas" to "authenticated";

grant update on table "public"."location_areas" to "authenticated";

grant delete on table "public"."location_areas" to "service_role";

grant insert on table "public"."location_areas" to "service_role";

grant references on table "public"."location_areas" to "service_role";

grant select on table "public"."location_areas" to "service_role";

grant trigger on table "public"."location_areas" to "service_role";

grant truncate on table "public"."location_areas" to "service_role";

grant update on table "public"."location_areas" to "service_role";

grant delete on table "public"."locations" to "anon";

grant insert on table "public"."locations" to "anon";

grant references on table "public"."locations" to "anon";

grant select on table "public"."locations" to "anon";

grant trigger on table "public"."locations" to "anon";

grant truncate on table "public"."locations" to "anon";

grant update on table "public"."locations" to "anon";

grant delete on table "public"."locations" to "authenticated";

grant insert on table "public"."locations" to "authenticated";

grant references on table "public"."locations" to "authenticated";

grant select on table "public"."locations" to "authenticated";

grant trigger on table "public"."locations" to "authenticated";

grant truncate on table "public"."locations" to "authenticated";

grant update on table "public"."locations" to "authenticated";

grant delete on table "public"."locations" to "service_role";

grant insert on table "public"."locations" to "service_role";

grant references on table "public"."locations" to "service_role";

grant select on table "public"."locations" to "service_role";

grant trigger on table "public"."locations" to "service_role";

grant truncate on table "public"."locations" to "service_role";

grant update on table "public"."locations" to "service_role";

grant delete on table "public"."machines" to "anon";

grant insert on table "public"."machines" to "anon";

grant references on table "public"."machines" to "anon";

grant select on table "public"."machines" to "anon";

grant trigger on table "public"."machines" to "anon";

grant truncate on table "public"."machines" to "anon";

grant update on table "public"."machines" to "anon";

grant delete on table "public"."machines" to "authenticated";

grant insert on table "public"."machines" to "authenticated";

grant references on table "public"."machines" to "authenticated";

grant select on table "public"."machines" to "authenticated";

grant trigger on table "public"."machines" to "authenticated";

grant truncate on table "public"."machines" to "authenticated";

grant update on table "public"."machines" to "authenticated";

grant delete on table "public"."machines" to "service_role";

grant insert on table "public"."machines" to "service_role";

grant references on table "public"."machines" to "service_role";

grant select on table "public"."machines" to "service_role";

grant trigger on table "public"."machines" to "service_role";

grant truncate on table "public"."machines" to "service_role";

grant update on table "public"."machines" to "service_role";

grant delete on table "public"."matches" to "anon";

grant insert on table "public"."matches" to "anon";

grant references on table "public"."matches" to "anon";

grant select on table "public"."matches" to "anon";

grant trigger on table "public"."matches" to "anon";

grant truncate on table "public"."matches" to "anon";

grant update on table "public"."matches" to "anon";

grant delete on table "public"."matches" to "authenticated";

grant insert on table "public"."matches" to "authenticated";

grant references on table "public"."matches" to "authenticated";

grant select on table "public"."matches" to "authenticated";

grant trigger on table "public"."matches" to "authenticated";

grant truncate on table "public"."matches" to "authenticated";

grant update on table "public"."matches" to "authenticated";

grant delete on table "public"."matches" to "service_role";

grant insert on table "public"."matches" to "service_role";

grant references on table "public"."matches" to "service_role";

grant select on table "public"."matches" to "service_role";

grant trigger on table "public"."matches" to "service_role";

grant truncate on table "public"."matches" to "service_role";

grant update on table "public"."matches" to "service_role";

grant delete on table "public"."matchweeks" to "anon";

grant insert on table "public"."matchweeks" to "anon";

grant references on table "public"."matchweeks" to "anon";

grant select on table "public"."matchweeks" to "anon";

grant trigger on table "public"."matchweeks" to "anon";

grant truncate on table "public"."matchweeks" to "anon";

grant update on table "public"."matchweeks" to "anon";

grant delete on table "public"."matchweeks" to "authenticated";

grant insert on table "public"."matchweeks" to "authenticated";

grant references on table "public"."matchweeks" to "authenticated";

grant select on table "public"."matchweeks" to "authenticated";

grant trigger on table "public"."matchweeks" to "authenticated";

grant truncate on table "public"."matchweeks" to "authenticated";

grant update on table "public"."matchweeks" to "authenticated";

grant delete on table "public"."matchweeks" to "service_role";

grant insert on table "public"."matchweeks" to "service_role";

grant references on table "public"."matchweeks" to "service_role";

grant select on table "public"."matchweeks" to "service_role";

grant trigger on table "public"."matchweeks" to "service_role";

grant truncate on table "public"."matchweeks" to "service_role";

grant update on table "public"."matchweeks" to "service_role";

grant delete on table "public"."move_ailments" to "anon";

grant insert on table "public"."move_ailments" to "anon";

grant references on table "public"."move_ailments" to "anon";

grant select on table "public"."move_ailments" to "anon";

grant trigger on table "public"."move_ailments" to "anon";

grant truncate on table "public"."move_ailments" to "anon";

grant update on table "public"."move_ailments" to "anon";

grant delete on table "public"."move_ailments" to "authenticated";

grant insert on table "public"."move_ailments" to "authenticated";

grant references on table "public"."move_ailments" to "authenticated";

grant select on table "public"."move_ailments" to "authenticated";

grant trigger on table "public"."move_ailments" to "authenticated";

grant truncate on table "public"."move_ailments" to "authenticated";

grant update on table "public"."move_ailments" to "authenticated";

grant delete on table "public"."move_ailments" to "service_role";

grant insert on table "public"."move_ailments" to "service_role";

grant references on table "public"."move_ailments" to "service_role";

grant select on table "public"."move_ailments" to "service_role";

grant trigger on table "public"."move_ailments" to "service_role";

grant truncate on table "public"."move_ailments" to "service_role";

grant update on table "public"."move_ailments" to "service_role";

grant delete on table "public"."move_battle_styles" to "anon";

grant insert on table "public"."move_battle_styles" to "anon";

grant references on table "public"."move_battle_styles" to "anon";

grant select on table "public"."move_battle_styles" to "anon";

grant trigger on table "public"."move_battle_styles" to "anon";

grant truncate on table "public"."move_battle_styles" to "anon";

grant update on table "public"."move_battle_styles" to "anon";

grant delete on table "public"."move_battle_styles" to "authenticated";

grant insert on table "public"."move_battle_styles" to "authenticated";

grant references on table "public"."move_battle_styles" to "authenticated";

grant select on table "public"."move_battle_styles" to "authenticated";

grant trigger on table "public"."move_battle_styles" to "authenticated";

grant truncate on table "public"."move_battle_styles" to "authenticated";

grant update on table "public"."move_battle_styles" to "authenticated";

grant delete on table "public"."move_battle_styles" to "service_role";

grant insert on table "public"."move_battle_styles" to "service_role";

grant references on table "public"."move_battle_styles" to "service_role";

grant select on table "public"."move_battle_styles" to "service_role";

grant trigger on table "public"."move_battle_styles" to "service_role";

grant truncate on table "public"."move_battle_styles" to "service_role";

grant update on table "public"."move_battle_styles" to "service_role";

grant delete on table "public"."move_categories" to "anon";

grant insert on table "public"."move_categories" to "anon";

grant references on table "public"."move_categories" to "anon";

grant select on table "public"."move_categories" to "anon";

grant trigger on table "public"."move_categories" to "anon";

grant truncate on table "public"."move_categories" to "anon";

grant update on table "public"."move_categories" to "anon";

grant delete on table "public"."move_categories" to "authenticated";

grant insert on table "public"."move_categories" to "authenticated";

grant references on table "public"."move_categories" to "authenticated";

grant select on table "public"."move_categories" to "authenticated";

grant trigger on table "public"."move_categories" to "authenticated";

grant truncate on table "public"."move_categories" to "authenticated";

grant update on table "public"."move_categories" to "authenticated";

grant delete on table "public"."move_categories" to "service_role";

grant insert on table "public"."move_categories" to "service_role";

grant references on table "public"."move_categories" to "service_role";

grant select on table "public"."move_categories" to "service_role";

grant trigger on table "public"."move_categories" to "service_role";

grant truncate on table "public"."move_categories" to "service_role";

grant update on table "public"."move_categories" to "service_role";

grant delete on table "public"."move_damage_classes" to "anon";

grant insert on table "public"."move_damage_classes" to "anon";

grant references on table "public"."move_damage_classes" to "anon";

grant select on table "public"."move_damage_classes" to "anon";

grant trigger on table "public"."move_damage_classes" to "anon";

grant truncate on table "public"."move_damage_classes" to "anon";

grant update on table "public"."move_damage_classes" to "anon";

grant delete on table "public"."move_damage_classes" to "authenticated";

grant insert on table "public"."move_damage_classes" to "authenticated";

grant references on table "public"."move_damage_classes" to "authenticated";

grant select on table "public"."move_damage_classes" to "authenticated";

grant trigger on table "public"."move_damage_classes" to "authenticated";

grant truncate on table "public"."move_damage_classes" to "authenticated";

grant update on table "public"."move_damage_classes" to "authenticated";

grant delete on table "public"."move_damage_classes" to "service_role";

grant insert on table "public"."move_damage_classes" to "service_role";

grant references on table "public"."move_damage_classes" to "service_role";

grant select on table "public"."move_damage_classes" to "service_role";

grant trigger on table "public"."move_damage_classes" to "service_role";

grant truncate on table "public"."move_damage_classes" to "service_role";

grant update on table "public"."move_damage_classes" to "service_role";

grant delete on table "public"."move_learn_methods" to "anon";

grant insert on table "public"."move_learn_methods" to "anon";

grant references on table "public"."move_learn_methods" to "anon";

grant select on table "public"."move_learn_methods" to "anon";

grant trigger on table "public"."move_learn_methods" to "anon";

grant truncate on table "public"."move_learn_methods" to "anon";

grant update on table "public"."move_learn_methods" to "anon";

grant delete on table "public"."move_learn_methods" to "authenticated";

grant insert on table "public"."move_learn_methods" to "authenticated";

grant references on table "public"."move_learn_methods" to "authenticated";

grant select on table "public"."move_learn_methods" to "authenticated";

grant trigger on table "public"."move_learn_methods" to "authenticated";

grant truncate on table "public"."move_learn_methods" to "authenticated";

grant update on table "public"."move_learn_methods" to "authenticated";

grant delete on table "public"."move_learn_methods" to "service_role";

grant insert on table "public"."move_learn_methods" to "service_role";

grant references on table "public"."move_learn_methods" to "service_role";

grant select on table "public"."move_learn_methods" to "service_role";

grant trigger on table "public"."move_learn_methods" to "service_role";

grant truncate on table "public"."move_learn_methods" to "service_role";

grant update on table "public"."move_learn_methods" to "service_role";

grant delete on table "public"."move_targets" to "anon";

grant insert on table "public"."move_targets" to "anon";

grant references on table "public"."move_targets" to "anon";

grant select on table "public"."move_targets" to "anon";

grant trigger on table "public"."move_targets" to "anon";

grant truncate on table "public"."move_targets" to "anon";

grant update on table "public"."move_targets" to "anon";

grant delete on table "public"."move_targets" to "authenticated";

grant insert on table "public"."move_targets" to "authenticated";

grant references on table "public"."move_targets" to "authenticated";

grant select on table "public"."move_targets" to "authenticated";

grant trigger on table "public"."move_targets" to "authenticated";

grant truncate on table "public"."move_targets" to "authenticated";

grant update on table "public"."move_targets" to "authenticated";

grant delete on table "public"."move_targets" to "service_role";

grant insert on table "public"."move_targets" to "service_role";

grant references on table "public"."move_targets" to "service_role";

grant select on table "public"."move_targets" to "service_role";

grant trigger on table "public"."move_targets" to "service_role";

grant truncate on table "public"."move_targets" to "service_role";

grant update on table "public"."move_targets" to "service_role";

grant delete on table "public"."moves" to "anon";

grant insert on table "public"."moves" to "anon";

grant references on table "public"."moves" to "anon";

grant select on table "public"."moves" to "anon";

grant trigger on table "public"."moves" to "anon";

grant truncate on table "public"."moves" to "anon";

grant update on table "public"."moves" to "anon";

grant delete on table "public"."moves" to "authenticated";

grant insert on table "public"."moves" to "authenticated";

grant references on table "public"."moves" to "authenticated";

grant select on table "public"."moves" to "authenticated";

grant trigger on table "public"."moves" to "authenticated";

grant truncate on table "public"."moves" to "authenticated";

grant update on table "public"."moves" to "authenticated";

grant delete on table "public"."moves" to "service_role";

grant insert on table "public"."moves" to "service_role";

grant references on table "public"."moves" to "service_role";

grant select on table "public"."moves" to "service_role";

grant trigger on table "public"."moves" to "service_role";

grant truncate on table "public"."moves" to "service_role";

grant update on table "public"."moves" to "service_role";

grant delete on table "public"."natures" to "anon";

grant insert on table "public"."natures" to "anon";

grant references on table "public"."natures" to "anon";

grant select on table "public"."natures" to "anon";

grant trigger on table "public"."natures" to "anon";

grant truncate on table "public"."natures" to "anon";

grant update on table "public"."natures" to "anon";

grant delete on table "public"."natures" to "authenticated";

grant insert on table "public"."natures" to "authenticated";

grant references on table "public"."natures" to "authenticated";

grant select on table "public"."natures" to "authenticated";

grant trigger on table "public"."natures" to "authenticated";

grant truncate on table "public"."natures" to "authenticated";

grant update on table "public"."natures" to "authenticated";

grant delete on table "public"."natures" to "service_role";

grant insert on table "public"."natures" to "service_role";

grant references on table "public"."natures" to "service_role";

grant select on table "public"."natures" to "service_role";

grant trigger on table "public"."natures" to "service_role";

grant truncate on table "public"."natures" to "service_role";

grant update on table "public"."natures" to "service_role";

grant delete on table "public"."pal_park_areas" to "anon";

grant insert on table "public"."pal_park_areas" to "anon";

grant references on table "public"."pal_park_areas" to "anon";

grant select on table "public"."pal_park_areas" to "anon";

grant trigger on table "public"."pal_park_areas" to "anon";

grant truncate on table "public"."pal_park_areas" to "anon";

grant update on table "public"."pal_park_areas" to "anon";

grant delete on table "public"."pal_park_areas" to "authenticated";

grant insert on table "public"."pal_park_areas" to "authenticated";

grant references on table "public"."pal_park_areas" to "authenticated";

grant select on table "public"."pal_park_areas" to "authenticated";

grant trigger on table "public"."pal_park_areas" to "authenticated";

grant truncate on table "public"."pal_park_areas" to "authenticated";

grant update on table "public"."pal_park_areas" to "authenticated";

grant delete on table "public"."pal_park_areas" to "service_role";

grant insert on table "public"."pal_park_areas" to "service_role";

grant references on table "public"."pal_park_areas" to "service_role";

grant select on table "public"."pal_park_areas" to "service_role";

grant trigger on table "public"."pal_park_areas" to "service_role";

grant truncate on table "public"."pal_park_areas" to "service_role";

grant update on table "public"."pal_park_areas" to "service_role";

grant delete on table "public"."pokeapi_resource_cache" to "anon";

grant insert on table "public"."pokeapi_resource_cache" to "anon";

grant references on table "public"."pokeapi_resource_cache" to "anon";

grant select on table "public"."pokeapi_resource_cache" to "anon";

grant trigger on table "public"."pokeapi_resource_cache" to "anon";

grant truncate on table "public"."pokeapi_resource_cache" to "anon";

grant update on table "public"."pokeapi_resource_cache" to "anon";

grant delete on table "public"."pokeapi_resource_cache" to "authenticated";

grant insert on table "public"."pokeapi_resource_cache" to "authenticated";

grant references on table "public"."pokeapi_resource_cache" to "authenticated";

grant select on table "public"."pokeapi_resource_cache" to "authenticated";

grant trigger on table "public"."pokeapi_resource_cache" to "authenticated";

grant truncate on table "public"."pokeapi_resource_cache" to "authenticated";

grant update on table "public"."pokeapi_resource_cache" to "authenticated";

grant delete on table "public"."pokeapi_resource_cache" to "service_role";

grant insert on table "public"."pokeapi_resource_cache" to "service_role";

grant references on table "public"."pokeapi_resource_cache" to "service_role";

grant select on table "public"."pokeapi_resource_cache" to "service_role";

grant trigger on table "public"."pokeapi_resource_cache" to "service_role";

grant truncate on table "public"."pokeapi_resource_cache" to "service_role";

grant update on table "public"."pokeapi_resource_cache" to "service_role";

grant delete on table "public"."pokeapi_resources" to "anon";

grant insert on table "public"."pokeapi_resources" to "anon";

grant references on table "public"."pokeapi_resources" to "anon";

grant select on table "public"."pokeapi_resources" to "anon";

grant trigger on table "public"."pokeapi_resources" to "anon";

grant truncate on table "public"."pokeapi_resources" to "anon";

grant update on table "public"."pokeapi_resources" to "anon";

grant delete on table "public"."pokeapi_resources" to "authenticated";

grant insert on table "public"."pokeapi_resources" to "authenticated";

grant references on table "public"."pokeapi_resources" to "authenticated";

grant select on table "public"."pokeapi_resources" to "authenticated";

grant trigger on table "public"."pokeapi_resources" to "authenticated";

grant truncate on table "public"."pokeapi_resources" to "authenticated";

grant update on table "public"."pokeapi_resources" to "authenticated";

grant delete on table "public"."pokeapi_resources" to "service_role";

grant insert on table "public"."pokeapi_resources" to "service_role";

grant references on table "public"."pokeapi_resources" to "service_role";

grant select on table "public"."pokeapi_resources" to "service_role";

grant trigger on table "public"."pokeapi_resources" to "service_role";

grant truncate on table "public"."pokeapi_resources" to "service_role";

grant update on table "public"."pokeapi_resources" to "service_role";

grant delete on table "public"."pokeathlon_stats" to "anon";

grant insert on table "public"."pokeathlon_stats" to "anon";

grant references on table "public"."pokeathlon_stats" to "anon";

grant select on table "public"."pokeathlon_stats" to "anon";

grant trigger on table "public"."pokeathlon_stats" to "anon";

grant truncate on table "public"."pokeathlon_stats" to "anon";

grant update on table "public"."pokeathlon_stats" to "anon";

grant delete on table "public"."pokeathlon_stats" to "authenticated";

grant insert on table "public"."pokeathlon_stats" to "authenticated";

grant references on table "public"."pokeathlon_stats" to "authenticated";

grant select on table "public"."pokeathlon_stats" to "authenticated";

grant trigger on table "public"."pokeathlon_stats" to "authenticated";

grant truncate on table "public"."pokeathlon_stats" to "authenticated";

grant update on table "public"."pokeathlon_stats" to "authenticated";

grant delete on table "public"."pokeathlon_stats" to "service_role";

grant insert on table "public"."pokeathlon_stats" to "service_role";

grant references on table "public"."pokeathlon_stats" to "service_role";

grant select on table "public"."pokeathlon_stats" to "service_role";

grant trigger on table "public"."pokeathlon_stats" to "service_role";

grant truncate on table "public"."pokeathlon_stats" to "service_role";

grant update on table "public"."pokeathlon_stats" to "service_role";

grant delete on table "public"."pokedexes" to "anon";

grant insert on table "public"."pokedexes" to "anon";

grant references on table "public"."pokedexes" to "anon";

grant select on table "public"."pokedexes" to "anon";

grant trigger on table "public"."pokedexes" to "anon";

grant truncate on table "public"."pokedexes" to "anon";

grant update on table "public"."pokedexes" to "anon";

grant delete on table "public"."pokedexes" to "authenticated";

grant insert on table "public"."pokedexes" to "authenticated";

grant references on table "public"."pokedexes" to "authenticated";

grant select on table "public"."pokedexes" to "authenticated";

grant trigger on table "public"."pokedexes" to "authenticated";

grant truncate on table "public"."pokedexes" to "authenticated";

grant update on table "public"."pokedexes" to "authenticated";

grant delete on table "public"."pokedexes" to "service_role";

grant insert on table "public"."pokedexes" to "service_role";

grant references on table "public"."pokedexes" to "service_role";

grant select on table "public"."pokedexes" to "service_role";

grant trigger on table "public"."pokedexes" to "service_role";

grant truncate on table "public"."pokedexes" to "service_role";

grant update on table "public"."pokedexes" to "service_role";

grant delete on table "public"."pokemon" to "anon";

grant insert on table "public"."pokemon" to "anon";

grant references on table "public"."pokemon" to "anon";

grant select on table "public"."pokemon" to "anon";

grant trigger on table "public"."pokemon" to "anon";

grant truncate on table "public"."pokemon" to "anon";

grant update on table "public"."pokemon" to "anon";

grant delete on table "public"."pokemon" to "authenticated";

grant insert on table "public"."pokemon" to "authenticated";

grant references on table "public"."pokemon" to "authenticated";

grant select on table "public"."pokemon" to "authenticated";

grant trigger on table "public"."pokemon" to "authenticated";

grant truncate on table "public"."pokemon" to "authenticated";

grant update on table "public"."pokemon" to "authenticated";

grant delete on table "public"."pokemon" to "service_role";

grant insert on table "public"."pokemon" to "service_role";

grant references on table "public"."pokemon" to "service_role";

grant select on table "public"."pokemon" to "service_role";

grant trigger on table "public"."pokemon" to "service_role";

grant truncate on table "public"."pokemon" to "service_role";

grant update on table "public"."pokemon" to "service_role";

grant delete on table "public"."pokemon_abilities" to "anon";

grant insert on table "public"."pokemon_abilities" to "anon";

grant references on table "public"."pokemon_abilities" to "anon";

grant select on table "public"."pokemon_abilities" to "anon";

grant trigger on table "public"."pokemon_abilities" to "anon";

grant truncate on table "public"."pokemon_abilities" to "anon";

grant update on table "public"."pokemon_abilities" to "anon";

grant delete on table "public"."pokemon_abilities" to "authenticated";

grant insert on table "public"."pokemon_abilities" to "authenticated";

grant references on table "public"."pokemon_abilities" to "authenticated";

grant select on table "public"."pokemon_abilities" to "authenticated";

grant trigger on table "public"."pokemon_abilities" to "authenticated";

grant truncate on table "public"."pokemon_abilities" to "authenticated";

grant update on table "public"."pokemon_abilities" to "authenticated";

grant delete on table "public"."pokemon_abilities" to "service_role";

grant insert on table "public"."pokemon_abilities" to "service_role";

grant references on table "public"."pokemon_abilities" to "service_role";

grant select on table "public"."pokemon_abilities" to "service_role";

grant trigger on table "public"."pokemon_abilities" to "service_role";

grant truncate on table "public"."pokemon_abilities" to "service_role";

grant update on table "public"."pokemon_abilities" to "service_role";

grant delete on table "public"."pokemon_cache" to "anon";

grant insert on table "public"."pokemon_cache" to "anon";

grant references on table "public"."pokemon_cache" to "anon";

grant select on table "public"."pokemon_cache" to "anon";

grant trigger on table "public"."pokemon_cache" to "anon";

grant truncate on table "public"."pokemon_cache" to "anon";

grant update on table "public"."pokemon_cache" to "anon";

grant delete on table "public"."pokemon_cache" to "authenticated";

grant insert on table "public"."pokemon_cache" to "authenticated";

grant references on table "public"."pokemon_cache" to "authenticated";

grant select on table "public"."pokemon_cache" to "authenticated";

grant trigger on table "public"."pokemon_cache" to "authenticated";

grant truncate on table "public"."pokemon_cache" to "authenticated";

grant update on table "public"."pokemon_cache" to "authenticated";

grant delete on table "public"."pokemon_cache" to "service_role";

grant insert on table "public"."pokemon_cache" to "service_role";

grant references on table "public"."pokemon_cache" to "service_role";

grant select on table "public"."pokemon_cache" to "service_role";

grant trigger on table "public"."pokemon_cache" to "service_role";

grant truncate on table "public"."pokemon_cache" to "service_role";

grant update on table "public"."pokemon_cache" to "service_role";

grant delete on table "public"."pokemon_colors" to "anon";

grant insert on table "public"."pokemon_colors" to "anon";

grant references on table "public"."pokemon_colors" to "anon";

grant select on table "public"."pokemon_colors" to "anon";

grant trigger on table "public"."pokemon_colors" to "anon";

grant truncate on table "public"."pokemon_colors" to "anon";

grant update on table "public"."pokemon_colors" to "anon";

grant delete on table "public"."pokemon_colors" to "authenticated";

grant insert on table "public"."pokemon_colors" to "authenticated";

grant references on table "public"."pokemon_colors" to "authenticated";

grant select on table "public"."pokemon_colors" to "authenticated";

grant trigger on table "public"."pokemon_colors" to "authenticated";

grant truncate on table "public"."pokemon_colors" to "authenticated";

grant update on table "public"."pokemon_colors" to "authenticated";

grant delete on table "public"."pokemon_colors" to "service_role";

grant insert on table "public"."pokemon_colors" to "service_role";

grant references on table "public"."pokemon_colors" to "service_role";

grant select on table "public"."pokemon_colors" to "service_role";

grant trigger on table "public"."pokemon_colors" to "service_role";

grant truncate on table "public"."pokemon_colors" to "service_role";

grant update on table "public"."pokemon_colors" to "service_role";

grant delete on table "public"."pokemon_comprehensive" to "anon";

grant insert on table "public"."pokemon_comprehensive" to "anon";

grant references on table "public"."pokemon_comprehensive" to "anon";

grant select on table "public"."pokemon_comprehensive" to "anon";

grant trigger on table "public"."pokemon_comprehensive" to "anon";

grant truncate on table "public"."pokemon_comprehensive" to "anon";

grant update on table "public"."pokemon_comprehensive" to "anon";

grant delete on table "public"."pokemon_comprehensive" to "authenticated";

grant insert on table "public"."pokemon_comprehensive" to "authenticated";

grant references on table "public"."pokemon_comprehensive" to "authenticated";

grant select on table "public"."pokemon_comprehensive" to "authenticated";

grant trigger on table "public"."pokemon_comprehensive" to "authenticated";

grant truncate on table "public"."pokemon_comprehensive" to "authenticated";

grant update on table "public"."pokemon_comprehensive" to "authenticated";

grant delete on table "public"."pokemon_comprehensive" to "service_role";

grant insert on table "public"."pokemon_comprehensive" to "service_role";

grant references on table "public"."pokemon_comprehensive" to "service_role";

grant select on table "public"."pokemon_comprehensive" to "service_role";

grant trigger on table "public"."pokemon_comprehensive" to "service_role";

grant truncate on table "public"."pokemon_comprehensive" to "service_role";

grant update on table "public"."pokemon_comprehensive" to "service_role";

grant delete on table "public"."pokemon_egg_groups" to "anon";

grant insert on table "public"."pokemon_egg_groups" to "anon";

grant references on table "public"."pokemon_egg_groups" to "anon";

grant select on table "public"."pokemon_egg_groups" to "anon";

grant trigger on table "public"."pokemon_egg_groups" to "anon";

grant truncate on table "public"."pokemon_egg_groups" to "anon";

grant update on table "public"."pokemon_egg_groups" to "anon";

grant delete on table "public"."pokemon_egg_groups" to "authenticated";

grant insert on table "public"."pokemon_egg_groups" to "authenticated";

grant references on table "public"."pokemon_egg_groups" to "authenticated";

grant select on table "public"."pokemon_egg_groups" to "authenticated";

grant trigger on table "public"."pokemon_egg_groups" to "authenticated";

grant truncate on table "public"."pokemon_egg_groups" to "authenticated";

grant update on table "public"."pokemon_egg_groups" to "authenticated";

grant delete on table "public"."pokemon_egg_groups" to "service_role";

grant insert on table "public"."pokemon_egg_groups" to "service_role";

grant references on table "public"."pokemon_egg_groups" to "service_role";

grant select on table "public"."pokemon_egg_groups" to "service_role";

grant trigger on table "public"."pokemon_egg_groups" to "service_role";

grant truncate on table "public"."pokemon_egg_groups" to "service_role";

grant update on table "public"."pokemon_egg_groups" to "service_role";

grant delete on table "public"."pokemon_forms" to "anon";

grant insert on table "public"."pokemon_forms" to "anon";

grant references on table "public"."pokemon_forms" to "anon";

grant select on table "public"."pokemon_forms" to "anon";

grant trigger on table "public"."pokemon_forms" to "anon";

grant truncate on table "public"."pokemon_forms" to "anon";

grant update on table "public"."pokemon_forms" to "anon";

grant delete on table "public"."pokemon_forms" to "authenticated";

grant insert on table "public"."pokemon_forms" to "authenticated";

grant references on table "public"."pokemon_forms" to "authenticated";

grant select on table "public"."pokemon_forms" to "authenticated";

grant trigger on table "public"."pokemon_forms" to "authenticated";

grant truncate on table "public"."pokemon_forms" to "authenticated";

grant update on table "public"."pokemon_forms" to "authenticated";

grant delete on table "public"."pokemon_forms" to "service_role";

grant insert on table "public"."pokemon_forms" to "service_role";

grant references on table "public"."pokemon_forms" to "service_role";

grant select on table "public"."pokemon_forms" to "service_role";

grant trigger on table "public"."pokemon_forms" to "service_role";

grant truncate on table "public"."pokemon_forms" to "service_role";

grant update on table "public"."pokemon_forms" to "service_role";

grant delete on table "public"."pokemon_habitats" to "anon";

grant insert on table "public"."pokemon_habitats" to "anon";

grant references on table "public"."pokemon_habitats" to "anon";

grant select on table "public"."pokemon_habitats" to "anon";

grant trigger on table "public"."pokemon_habitats" to "anon";

grant truncate on table "public"."pokemon_habitats" to "anon";

grant update on table "public"."pokemon_habitats" to "anon";

grant delete on table "public"."pokemon_habitats" to "authenticated";

grant insert on table "public"."pokemon_habitats" to "authenticated";

grant references on table "public"."pokemon_habitats" to "authenticated";

grant select on table "public"."pokemon_habitats" to "authenticated";

grant trigger on table "public"."pokemon_habitats" to "authenticated";

grant truncate on table "public"."pokemon_habitats" to "authenticated";

grant update on table "public"."pokemon_habitats" to "authenticated";

grant delete on table "public"."pokemon_habitats" to "service_role";

grant insert on table "public"."pokemon_habitats" to "service_role";

grant references on table "public"."pokemon_habitats" to "service_role";

grant select on table "public"."pokemon_habitats" to "service_role";

grant trigger on table "public"."pokemon_habitats" to "service_role";

grant truncate on table "public"."pokemon_habitats" to "service_role";

grant update on table "public"."pokemon_habitats" to "service_role";

grant delete on table "public"."pokemon_items" to "anon";

grant insert on table "public"."pokemon_items" to "anon";

grant references on table "public"."pokemon_items" to "anon";

grant select on table "public"."pokemon_items" to "anon";

grant trigger on table "public"."pokemon_items" to "anon";

grant truncate on table "public"."pokemon_items" to "anon";

grant update on table "public"."pokemon_items" to "anon";

grant delete on table "public"."pokemon_items" to "authenticated";

grant insert on table "public"."pokemon_items" to "authenticated";

grant references on table "public"."pokemon_items" to "authenticated";

grant select on table "public"."pokemon_items" to "authenticated";

grant trigger on table "public"."pokemon_items" to "authenticated";

grant truncate on table "public"."pokemon_items" to "authenticated";

grant update on table "public"."pokemon_items" to "authenticated";

grant delete on table "public"."pokemon_items" to "service_role";

grant insert on table "public"."pokemon_items" to "service_role";

grant references on table "public"."pokemon_items" to "service_role";

grant select on table "public"."pokemon_items" to "service_role";

grant trigger on table "public"."pokemon_items" to "service_role";

grant truncate on table "public"."pokemon_items" to "service_role";

grant update on table "public"."pokemon_items" to "service_role";

grant delete on table "public"."pokemon_location_areas" to "anon";

grant insert on table "public"."pokemon_location_areas" to "anon";

grant references on table "public"."pokemon_location_areas" to "anon";

grant select on table "public"."pokemon_location_areas" to "anon";

grant trigger on table "public"."pokemon_location_areas" to "anon";

grant truncate on table "public"."pokemon_location_areas" to "anon";

grant update on table "public"."pokemon_location_areas" to "anon";

grant delete on table "public"."pokemon_location_areas" to "authenticated";

grant insert on table "public"."pokemon_location_areas" to "authenticated";

grant references on table "public"."pokemon_location_areas" to "authenticated";

grant select on table "public"."pokemon_location_areas" to "authenticated";

grant trigger on table "public"."pokemon_location_areas" to "authenticated";

grant truncate on table "public"."pokemon_location_areas" to "authenticated";

grant update on table "public"."pokemon_location_areas" to "authenticated";

grant delete on table "public"."pokemon_location_areas" to "service_role";

grant insert on table "public"."pokemon_location_areas" to "service_role";

grant references on table "public"."pokemon_location_areas" to "service_role";

grant select on table "public"."pokemon_location_areas" to "service_role";

grant trigger on table "public"."pokemon_location_areas" to "service_role";

grant truncate on table "public"."pokemon_location_areas" to "service_role";

grant update on table "public"."pokemon_location_areas" to "service_role";

grant delete on table "public"."pokemon_moves" to "anon";

grant insert on table "public"."pokemon_moves" to "anon";

grant references on table "public"."pokemon_moves" to "anon";

grant select on table "public"."pokemon_moves" to "anon";

grant trigger on table "public"."pokemon_moves" to "anon";

grant truncate on table "public"."pokemon_moves" to "anon";

grant update on table "public"."pokemon_moves" to "anon";

grant delete on table "public"."pokemon_moves" to "authenticated";

grant insert on table "public"."pokemon_moves" to "authenticated";

grant references on table "public"."pokemon_moves" to "authenticated";

grant select on table "public"."pokemon_moves" to "authenticated";

grant trigger on table "public"."pokemon_moves" to "authenticated";

grant truncate on table "public"."pokemon_moves" to "authenticated";

grant update on table "public"."pokemon_moves" to "authenticated";

grant delete on table "public"."pokemon_moves" to "service_role";

grant insert on table "public"."pokemon_moves" to "service_role";

grant references on table "public"."pokemon_moves" to "service_role";

grant select on table "public"."pokemon_moves" to "service_role";

grant trigger on table "public"."pokemon_moves" to "service_role";

grant truncate on table "public"."pokemon_moves" to "service_role";

grant update on table "public"."pokemon_moves" to "service_role";

grant delete on table "public"."pokemon_shapes" to "anon";

grant insert on table "public"."pokemon_shapes" to "anon";

grant references on table "public"."pokemon_shapes" to "anon";

grant select on table "public"."pokemon_shapes" to "anon";

grant trigger on table "public"."pokemon_shapes" to "anon";

grant truncate on table "public"."pokemon_shapes" to "anon";

grant update on table "public"."pokemon_shapes" to "anon";

grant delete on table "public"."pokemon_shapes" to "authenticated";

grant insert on table "public"."pokemon_shapes" to "authenticated";

grant references on table "public"."pokemon_shapes" to "authenticated";

grant select on table "public"."pokemon_shapes" to "authenticated";

grant trigger on table "public"."pokemon_shapes" to "authenticated";

grant truncate on table "public"."pokemon_shapes" to "authenticated";

grant update on table "public"."pokemon_shapes" to "authenticated";

grant delete on table "public"."pokemon_shapes" to "service_role";

grant insert on table "public"."pokemon_shapes" to "service_role";

grant references on table "public"."pokemon_shapes" to "service_role";

grant select on table "public"."pokemon_shapes" to "service_role";

grant trigger on table "public"."pokemon_shapes" to "service_role";

grant truncate on table "public"."pokemon_shapes" to "service_role";

grant update on table "public"."pokemon_shapes" to "service_role";

grant delete on table "public"."pokemon_species" to "anon";

grant insert on table "public"."pokemon_species" to "anon";

grant references on table "public"."pokemon_species" to "anon";

grant select on table "public"."pokemon_species" to "anon";

grant trigger on table "public"."pokemon_species" to "anon";

grant truncate on table "public"."pokemon_species" to "anon";

grant update on table "public"."pokemon_species" to "anon";

grant delete on table "public"."pokemon_species" to "authenticated";

grant insert on table "public"."pokemon_species" to "authenticated";

grant references on table "public"."pokemon_species" to "authenticated";

grant select on table "public"."pokemon_species" to "authenticated";

grant trigger on table "public"."pokemon_species" to "authenticated";

grant truncate on table "public"."pokemon_species" to "authenticated";

grant update on table "public"."pokemon_species" to "authenticated";

grant delete on table "public"."pokemon_species" to "service_role";

grant insert on table "public"."pokemon_species" to "service_role";

grant references on table "public"."pokemon_species" to "service_role";

grant select on table "public"."pokemon_species" to "service_role";

grant trigger on table "public"."pokemon_species" to "service_role";

grant truncate on table "public"."pokemon_species" to "service_role";

grant update on table "public"."pokemon_species" to "service_role";

grant delete on table "public"."pokemon_stats" to "anon";

grant insert on table "public"."pokemon_stats" to "anon";

grant references on table "public"."pokemon_stats" to "anon";

grant select on table "public"."pokemon_stats" to "anon";

grant trigger on table "public"."pokemon_stats" to "anon";

grant truncate on table "public"."pokemon_stats" to "anon";

grant update on table "public"."pokemon_stats" to "anon";

grant delete on table "public"."pokemon_stats" to "authenticated";

grant insert on table "public"."pokemon_stats" to "authenticated";

grant references on table "public"."pokemon_stats" to "authenticated";

grant select on table "public"."pokemon_stats" to "authenticated";

grant trigger on table "public"."pokemon_stats" to "authenticated";

grant truncate on table "public"."pokemon_stats" to "authenticated";

grant update on table "public"."pokemon_stats" to "authenticated";

grant delete on table "public"."pokemon_stats" to "service_role";

grant insert on table "public"."pokemon_stats" to "service_role";

grant references on table "public"."pokemon_stats" to "service_role";

grant select on table "public"."pokemon_stats" to "service_role";

grant trigger on table "public"."pokemon_stats" to "service_role";

grant truncate on table "public"."pokemon_stats" to "service_role";

grant update on table "public"."pokemon_stats" to "service_role";

grant delete on table "public"."pokemon_types" to "anon";

grant insert on table "public"."pokemon_types" to "anon";

grant references on table "public"."pokemon_types" to "anon";

grant select on table "public"."pokemon_types" to "anon";

grant trigger on table "public"."pokemon_types" to "anon";

grant truncate on table "public"."pokemon_types" to "anon";

grant update on table "public"."pokemon_types" to "anon";

grant delete on table "public"."pokemon_types" to "authenticated";

grant insert on table "public"."pokemon_types" to "authenticated";

grant references on table "public"."pokemon_types" to "authenticated";

grant select on table "public"."pokemon_types" to "authenticated";

grant trigger on table "public"."pokemon_types" to "authenticated";

grant truncate on table "public"."pokemon_types" to "authenticated";

grant update on table "public"."pokemon_types" to "authenticated";

grant delete on table "public"."pokemon_types" to "service_role";

grant insert on table "public"."pokemon_types" to "service_role";

grant references on table "public"."pokemon_types" to "service_role";

grant select on table "public"."pokemon_types" to "service_role";

grant trigger on table "public"."pokemon_types" to "service_role";

grant truncate on table "public"."pokemon_types" to "service_role";

grant update on table "public"."pokemon_types" to "service_role";

grant delete on table "public"."pokepedia_assets" to "anon";

grant insert on table "public"."pokepedia_assets" to "anon";

grant references on table "public"."pokepedia_assets" to "anon";

grant select on table "public"."pokepedia_assets" to "anon";

grant trigger on table "public"."pokepedia_assets" to "anon";

grant truncate on table "public"."pokepedia_assets" to "anon";

grant update on table "public"."pokepedia_assets" to "anon";

grant delete on table "public"."pokepedia_assets" to "authenticated";

grant insert on table "public"."pokepedia_assets" to "authenticated";

grant references on table "public"."pokepedia_assets" to "authenticated";

grant select on table "public"."pokepedia_assets" to "authenticated";

grant trigger on table "public"."pokepedia_assets" to "authenticated";

grant truncate on table "public"."pokepedia_assets" to "authenticated";

grant update on table "public"."pokepedia_assets" to "authenticated";

grant delete on table "public"."pokepedia_assets" to "service_role";

grant insert on table "public"."pokepedia_assets" to "service_role";

grant references on table "public"."pokepedia_assets" to "service_role";

grant select on table "public"."pokepedia_assets" to "service_role";

grant trigger on table "public"."pokepedia_assets" to "service_role";

grant truncate on table "public"."pokepedia_assets" to "service_role";

grant update on table "public"."pokepedia_assets" to "service_role";

grant delete on table "public"."pokepedia_pokemon" to "anon";

grant insert on table "public"."pokepedia_pokemon" to "anon";

grant references on table "public"."pokepedia_pokemon" to "anon";

grant select on table "public"."pokepedia_pokemon" to "anon";

grant trigger on table "public"."pokepedia_pokemon" to "anon";

grant truncate on table "public"."pokepedia_pokemon" to "anon";

grant update on table "public"."pokepedia_pokemon" to "anon";

grant delete on table "public"."pokepedia_pokemon" to "authenticated";

grant insert on table "public"."pokepedia_pokemon" to "authenticated";

grant references on table "public"."pokepedia_pokemon" to "authenticated";

grant select on table "public"."pokepedia_pokemon" to "authenticated";

grant trigger on table "public"."pokepedia_pokemon" to "authenticated";

grant truncate on table "public"."pokepedia_pokemon" to "authenticated";

grant update on table "public"."pokepedia_pokemon" to "authenticated";

grant delete on table "public"."pokepedia_pokemon" to "service_role";

grant insert on table "public"."pokepedia_pokemon" to "service_role";

grant references on table "public"."pokepedia_pokemon" to "service_role";

grant select on table "public"."pokepedia_pokemon" to "service_role";

grant trigger on table "public"."pokepedia_pokemon" to "service_role";

grant truncate on table "public"."pokepedia_pokemon" to "service_role";

grant update on table "public"."pokepedia_pokemon" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."regions" to "anon";

grant insert on table "public"."regions" to "anon";

grant references on table "public"."regions" to "anon";

grant select on table "public"."regions" to "anon";

grant trigger on table "public"."regions" to "anon";

grant truncate on table "public"."regions" to "anon";

grant update on table "public"."regions" to "anon";

grant delete on table "public"."regions" to "authenticated";

grant insert on table "public"."regions" to "authenticated";

grant references on table "public"."regions" to "authenticated";

grant select on table "public"."regions" to "authenticated";

grant trigger on table "public"."regions" to "authenticated";

grant truncate on table "public"."regions" to "authenticated";

grant update on table "public"."regions" to "authenticated";

grant delete on table "public"."regions" to "service_role";

grant insert on table "public"."regions" to "service_role";

grant references on table "public"."regions" to "service_role";

grant select on table "public"."regions" to "service_role";

grant trigger on table "public"."regions" to "service_role";

grant truncate on table "public"."regions" to "service_role";

grant update on table "public"."regions" to "service_role";

grant delete on table "public"."role_permissions" to "anon";

grant insert on table "public"."role_permissions" to "anon";

grant references on table "public"."role_permissions" to "anon";

grant select on table "public"."role_permissions" to "anon";

grant trigger on table "public"."role_permissions" to "anon";

grant truncate on table "public"."role_permissions" to "anon";

grant update on table "public"."role_permissions" to "anon";

grant delete on table "public"."role_permissions" to "authenticated";

grant insert on table "public"."role_permissions" to "authenticated";

grant references on table "public"."role_permissions" to "authenticated";

grant select on table "public"."role_permissions" to "authenticated";

grant trigger on table "public"."role_permissions" to "authenticated";

grant truncate on table "public"."role_permissions" to "authenticated";

grant update on table "public"."role_permissions" to "authenticated";

grant delete on table "public"."role_permissions" to "service_role";

grant insert on table "public"."role_permissions" to "service_role";

grant references on table "public"."role_permissions" to "service_role";

grant select on table "public"."role_permissions" to "service_role";

grant trigger on table "public"."role_permissions" to "service_role";

grant truncate on table "public"."role_permissions" to "service_role";

grant update on table "public"."role_permissions" to "service_role";

grant delete on table "public"."seasons" to "anon";

grant insert on table "public"."seasons" to "anon";

grant references on table "public"."seasons" to "anon";

grant select on table "public"."seasons" to "anon";

grant trigger on table "public"."seasons" to "anon";

grant truncate on table "public"."seasons" to "anon";

grant update on table "public"."seasons" to "anon";

grant delete on table "public"."seasons" to "authenticated";

grant insert on table "public"."seasons" to "authenticated";

grant references on table "public"."seasons" to "authenticated";

grant select on table "public"."seasons" to "authenticated";

grant trigger on table "public"."seasons" to "authenticated";

grant truncate on table "public"."seasons" to "authenticated";

grant update on table "public"."seasons" to "authenticated";

grant delete on table "public"."seasons" to "service_role";

grant insert on table "public"."seasons" to "service_role";

grant references on table "public"."seasons" to "service_role";

grant select on table "public"."seasons" to "service_role";

grant trigger on table "public"."seasons" to "service_role";

grant truncate on table "public"."seasons" to "service_role";

grant update on table "public"."seasons" to "service_role";

grant delete on table "public"."sheet_mappings" to "anon";

grant insert on table "public"."sheet_mappings" to "anon";

grant references on table "public"."sheet_mappings" to "anon";

grant select on table "public"."sheet_mappings" to "anon";

grant trigger on table "public"."sheet_mappings" to "anon";

grant truncate on table "public"."sheet_mappings" to "anon";

grant update on table "public"."sheet_mappings" to "anon";

grant delete on table "public"."sheet_mappings" to "authenticated";

grant insert on table "public"."sheet_mappings" to "authenticated";

grant references on table "public"."sheet_mappings" to "authenticated";

grant select on table "public"."sheet_mappings" to "authenticated";

grant trigger on table "public"."sheet_mappings" to "authenticated";

grant truncate on table "public"."sheet_mappings" to "authenticated";

grant update on table "public"."sheet_mappings" to "authenticated";

grant delete on table "public"."sheet_mappings" to "service_role";

grant insert on table "public"."sheet_mappings" to "service_role";

grant references on table "public"."sheet_mappings" to "service_role";

grant select on table "public"."sheet_mappings" to "service_role";

grant trigger on table "public"."sheet_mappings" to "service_role";

grant truncate on table "public"."sheet_mappings" to "service_role";

grant update on table "public"."sheet_mappings" to "service_role";

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

grant delete on table "public"."showdown_teams" to "anon";

grant insert on table "public"."showdown_teams" to "anon";

grant references on table "public"."showdown_teams" to "anon";

grant select on table "public"."showdown_teams" to "anon";

grant trigger on table "public"."showdown_teams" to "anon";

grant truncate on table "public"."showdown_teams" to "anon";

grant update on table "public"."showdown_teams" to "anon";

grant delete on table "public"."showdown_teams" to "authenticated";

grant insert on table "public"."showdown_teams" to "authenticated";

grant references on table "public"."showdown_teams" to "authenticated";

grant select on table "public"."showdown_teams" to "authenticated";

grant trigger on table "public"."showdown_teams" to "authenticated";

grant truncate on table "public"."showdown_teams" to "authenticated";

grant update on table "public"."showdown_teams" to "authenticated";

grant delete on table "public"."showdown_teams" to "service_role";

grant insert on table "public"."showdown_teams" to "service_role";

grant references on table "public"."showdown_teams" to "service_role";

grant select on table "public"."showdown_teams" to "service_role";

grant trigger on table "public"."showdown_teams" to "service_role";

grant truncate on table "public"."showdown_teams" to "service_role";

grant update on table "public"."showdown_teams" to "service_role";

grant delete on table "public"."stats" to "anon";

grant insert on table "public"."stats" to "anon";

grant references on table "public"."stats" to "anon";

grant select on table "public"."stats" to "anon";

grant trigger on table "public"."stats" to "anon";

grant truncate on table "public"."stats" to "anon";

grant update on table "public"."stats" to "anon";

grant delete on table "public"."stats" to "authenticated";

grant insert on table "public"."stats" to "authenticated";

grant references on table "public"."stats" to "authenticated";

grant select on table "public"."stats" to "authenticated";

grant trigger on table "public"."stats" to "authenticated";

grant truncate on table "public"."stats" to "authenticated";

grant update on table "public"."stats" to "authenticated";

grant delete on table "public"."stats" to "service_role";

grant insert on table "public"."stats" to "service_role";

grant references on table "public"."stats" to "service_role";

grant select on table "public"."stats" to "service_role";

grant trigger on table "public"."stats" to "service_role";

grant truncate on table "public"."stats" to "service_role";

grant update on table "public"."stats" to "service_role";

grant delete on table "public"."super_contest_effects" to "anon";

grant insert on table "public"."super_contest_effects" to "anon";

grant references on table "public"."super_contest_effects" to "anon";

grant select on table "public"."super_contest_effects" to "anon";

grant trigger on table "public"."super_contest_effects" to "anon";

grant truncate on table "public"."super_contest_effects" to "anon";

grant update on table "public"."super_contest_effects" to "anon";

grant delete on table "public"."super_contest_effects" to "authenticated";

grant insert on table "public"."super_contest_effects" to "authenticated";

grant references on table "public"."super_contest_effects" to "authenticated";

grant select on table "public"."super_contest_effects" to "authenticated";

grant trigger on table "public"."super_contest_effects" to "authenticated";

grant truncate on table "public"."super_contest_effects" to "authenticated";

grant update on table "public"."super_contest_effects" to "authenticated";

grant delete on table "public"."super_contest_effects" to "service_role";

grant insert on table "public"."super_contest_effects" to "service_role";

grant references on table "public"."super_contest_effects" to "service_role";

grant select on table "public"."super_contest_effects" to "service_role";

grant trigger on table "public"."super_contest_effects" to "service_role";

grant truncate on table "public"."super_contest_effects" to "service_role";

grant update on table "public"."super_contest_effects" to "service_role";

grant delete on table "public"."sync_jobs" to "anon";

grant insert on table "public"."sync_jobs" to "anon";

grant references on table "public"."sync_jobs" to "anon";

grant select on table "public"."sync_jobs" to "anon";

grant trigger on table "public"."sync_jobs" to "anon";

grant truncate on table "public"."sync_jobs" to "anon";

grant update on table "public"."sync_jobs" to "anon";

grant delete on table "public"."sync_jobs" to "authenticated";

grant insert on table "public"."sync_jobs" to "authenticated";

grant references on table "public"."sync_jobs" to "authenticated";

grant select on table "public"."sync_jobs" to "authenticated";

grant trigger on table "public"."sync_jobs" to "authenticated";

grant truncate on table "public"."sync_jobs" to "authenticated";

grant update on table "public"."sync_jobs" to "authenticated";

grant delete on table "public"."sync_jobs" to "service_role";

grant insert on table "public"."sync_jobs" to "service_role";

grant references on table "public"."sync_jobs" to "service_role";

grant select on table "public"."sync_jobs" to "service_role";

grant trigger on table "public"."sync_jobs" to "service_role";

grant truncate on table "public"."sync_jobs" to "service_role";

grant update on table "public"."sync_jobs" to "service_role";

grant delete on table "public"."sync_log" to "anon";

grant insert on table "public"."sync_log" to "anon";

grant references on table "public"."sync_log" to "anon";

grant select on table "public"."sync_log" to "anon";

grant trigger on table "public"."sync_log" to "anon";

grant truncate on table "public"."sync_log" to "anon";

grant update on table "public"."sync_log" to "anon";

grant delete on table "public"."sync_log" to "authenticated";

grant insert on table "public"."sync_log" to "authenticated";

grant references on table "public"."sync_log" to "authenticated";

grant select on table "public"."sync_log" to "authenticated";

grant trigger on table "public"."sync_log" to "authenticated";

grant truncate on table "public"."sync_log" to "authenticated";

grant update on table "public"."sync_log" to "authenticated";

grant delete on table "public"."sync_log" to "service_role";

grant insert on table "public"."sync_log" to "service_role";

grant references on table "public"."sync_log" to "service_role";

grant select on table "public"."sync_log" to "service_role";

grant trigger on table "public"."sync_log" to "service_role";

grant truncate on table "public"."sync_log" to "service_role";

grant update on table "public"."sync_log" to "service_role";

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

grant delete on table "public"."team_rosters" to "anon";

grant insert on table "public"."team_rosters" to "anon";

grant references on table "public"."team_rosters" to "anon";

grant select on table "public"."team_rosters" to "anon";

grant trigger on table "public"."team_rosters" to "anon";

grant truncate on table "public"."team_rosters" to "anon";

grant update on table "public"."team_rosters" to "anon";

grant delete on table "public"."team_rosters" to "authenticated";

grant insert on table "public"."team_rosters" to "authenticated";

grant references on table "public"."team_rosters" to "authenticated";

grant select on table "public"."team_rosters" to "authenticated";

grant trigger on table "public"."team_rosters" to "authenticated";

grant truncate on table "public"."team_rosters" to "authenticated";

grant update on table "public"."team_rosters" to "authenticated";

grant delete on table "public"."team_rosters" to "service_role";

grant insert on table "public"."team_rosters" to "service_role";

grant references on table "public"."team_rosters" to "service_role";

grant select on table "public"."team_rosters" to "service_role";

grant trigger on table "public"."team_rosters" to "service_role";

grant truncate on table "public"."team_rosters" to "service_role";

grant update on table "public"."team_rosters" to "service_role";

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

grant delete on table "public"."teams" to "anon";

grant insert on table "public"."teams" to "anon";

grant references on table "public"."teams" to "anon";

grant select on table "public"."teams" to "anon";

grant trigger on table "public"."teams" to "anon";

grant truncate on table "public"."teams" to "anon";

grant update on table "public"."teams" to "anon";

grant delete on table "public"."teams" to "authenticated";

grant insert on table "public"."teams" to "authenticated";

grant references on table "public"."teams" to "authenticated";

grant select on table "public"."teams" to "authenticated";

grant trigger on table "public"."teams" to "authenticated";

grant truncate on table "public"."teams" to "authenticated";

grant update on table "public"."teams" to "authenticated";

grant delete on table "public"."teams" to "service_role";

grant insert on table "public"."teams" to "service_role";

grant references on table "public"."teams" to "service_role";

grant select on table "public"."teams" to "service_role";

grant trigger on table "public"."teams" to "service_role";

grant truncate on table "public"."teams" to "service_role";

grant update on table "public"."teams" to "service_role";

grant delete on table "public"."trade_listings" to "anon";

grant insert on table "public"."trade_listings" to "anon";

grant references on table "public"."trade_listings" to "anon";

grant select on table "public"."trade_listings" to "anon";

grant trigger on table "public"."trade_listings" to "anon";

grant truncate on table "public"."trade_listings" to "anon";

grant update on table "public"."trade_listings" to "anon";

grant delete on table "public"."trade_listings" to "authenticated";

grant insert on table "public"."trade_listings" to "authenticated";

grant references on table "public"."trade_listings" to "authenticated";

grant select on table "public"."trade_listings" to "authenticated";

grant trigger on table "public"."trade_listings" to "authenticated";

grant truncate on table "public"."trade_listings" to "authenticated";

grant update on table "public"."trade_listings" to "authenticated";

grant delete on table "public"."trade_listings" to "service_role";

grant insert on table "public"."trade_listings" to "service_role";

grant references on table "public"."trade_listings" to "service_role";

grant select on table "public"."trade_listings" to "service_role";

grant trigger on table "public"."trade_listings" to "service_role";

grant truncate on table "public"."trade_listings" to "service_role";

grant update on table "public"."trade_listings" to "service_role";

grant delete on table "public"."trade_offers" to "anon";

grant insert on table "public"."trade_offers" to "anon";

grant references on table "public"."trade_offers" to "anon";

grant select on table "public"."trade_offers" to "anon";

grant trigger on table "public"."trade_offers" to "anon";

grant truncate on table "public"."trade_offers" to "anon";

grant update on table "public"."trade_offers" to "anon";

grant delete on table "public"."trade_offers" to "authenticated";

grant insert on table "public"."trade_offers" to "authenticated";

grant references on table "public"."trade_offers" to "authenticated";

grant select on table "public"."trade_offers" to "authenticated";

grant trigger on table "public"."trade_offers" to "authenticated";

grant truncate on table "public"."trade_offers" to "authenticated";

grant update on table "public"."trade_offers" to "authenticated";

grant delete on table "public"."trade_offers" to "service_role";

grant insert on table "public"."trade_offers" to "service_role";

grant references on table "public"."trade_offers" to "service_role";

grant select on table "public"."trade_offers" to "service_role";

grant trigger on table "public"."trade_offers" to "service_role";

grant truncate on table "public"."trade_offers" to "service_role";

grant update on table "public"."trade_offers" to "service_role";

grant delete on table "public"."trade_transactions" to "anon";

grant insert on table "public"."trade_transactions" to "anon";

grant references on table "public"."trade_transactions" to "anon";

grant select on table "public"."trade_transactions" to "anon";

grant trigger on table "public"."trade_transactions" to "anon";

grant truncate on table "public"."trade_transactions" to "anon";

grant update on table "public"."trade_transactions" to "anon";

grant delete on table "public"."trade_transactions" to "authenticated";

grant insert on table "public"."trade_transactions" to "authenticated";

grant references on table "public"."trade_transactions" to "authenticated";

grant select on table "public"."trade_transactions" to "authenticated";

grant trigger on table "public"."trade_transactions" to "authenticated";

grant truncate on table "public"."trade_transactions" to "authenticated";

grant update on table "public"."trade_transactions" to "authenticated";

grant delete on table "public"."trade_transactions" to "service_role";

grant insert on table "public"."trade_transactions" to "service_role";

grant references on table "public"."trade_transactions" to "service_role";

grant select on table "public"."trade_transactions" to "service_role";

grant trigger on table "public"."trade_transactions" to "service_role";

grant truncate on table "public"."trade_transactions" to "service_role";

grant update on table "public"."trade_transactions" to "service_role";

grant delete on table "public"."types" to "anon";

grant insert on table "public"."types" to "anon";

grant references on table "public"."types" to "anon";

grant select on table "public"."types" to "anon";

grant trigger on table "public"."types" to "anon";

grant truncate on table "public"."types" to "anon";

grant update on table "public"."types" to "anon";

grant delete on table "public"."types" to "authenticated";

grant insert on table "public"."types" to "authenticated";

grant references on table "public"."types" to "authenticated";

grant select on table "public"."types" to "authenticated";

grant trigger on table "public"."types" to "authenticated";

grant truncate on table "public"."types" to "authenticated";

grant update on table "public"."types" to "authenticated";

grant delete on table "public"."types" to "service_role";

grant insert on table "public"."types" to "service_role";

grant references on table "public"."types" to "service_role";

grant select on table "public"."types" to "service_role";

grant trigger on table "public"."types" to "service_role";

grant truncate on table "public"."types" to "service_role";

grant update on table "public"."types" to "service_role";

grant delete on table "public"."user_activity_log" to "anon";

grant insert on table "public"."user_activity_log" to "anon";

grant references on table "public"."user_activity_log" to "anon";

grant select on table "public"."user_activity_log" to "anon";

grant trigger on table "public"."user_activity_log" to "anon";

grant truncate on table "public"."user_activity_log" to "anon";

grant update on table "public"."user_activity_log" to "anon";

grant delete on table "public"."user_activity_log" to "authenticated";

grant insert on table "public"."user_activity_log" to "authenticated";

grant references on table "public"."user_activity_log" to "authenticated";

grant select on table "public"."user_activity_log" to "authenticated";

grant trigger on table "public"."user_activity_log" to "authenticated";

grant truncate on table "public"."user_activity_log" to "authenticated";

grant update on table "public"."user_activity_log" to "authenticated";

grant delete on table "public"."user_activity_log" to "service_role";

grant insert on table "public"."user_activity_log" to "service_role";

grant references on table "public"."user_activity_log" to "service_role";

grant select on table "public"."user_activity_log" to "service_role";

grant trigger on table "public"."user_activity_log" to "service_role";

grant truncate on table "public"."user_activity_log" to "service_role";

grant update on table "public"."user_activity_log" to "service_role";

grant delete on table "public"."version_groups" to "anon";

grant insert on table "public"."version_groups" to "anon";

grant references on table "public"."version_groups" to "anon";

grant select on table "public"."version_groups" to "anon";

grant trigger on table "public"."version_groups" to "anon";

grant truncate on table "public"."version_groups" to "anon";

grant update on table "public"."version_groups" to "anon";

grant delete on table "public"."version_groups" to "authenticated";

grant insert on table "public"."version_groups" to "authenticated";

grant references on table "public"."version_groups" to "authenticated";

grant select on table "public"."version_groups" to "authenticated";

grant trigger on table "public"."version_groups" to "authenticated";

grant truncate on table "public"."version_groups" to "authenticated";

grant update on table "public"."version_groups" to "authenticated";

grant delete on table "public"."version_groups" to "service_role";

grant insert on table "public"."version_groups" to "service_role";

grant references on table "public"."version_groups" to "service_role";

grant select on table "public"."version_groups" to "service_role";

grant trigger on table "public"."version_groups" to "service_role";

grant truncate on table "public"."version_groups" to "service_role";

grant update on table "public"."version_groups" to "service_role";

grant delete on table "public"."versions" to "anon";

grant insert on table "public"."versions" to "anon";

grant references on table "public"."versions" to "anon";

grant select on table "public"."versions" to "anon";

grant trigger on table "public"."versions" to "anon";

grant truncate on table "public"."versions" to "anon";

grant update on table "public"."versions" to "anon";

grant delete on table "public"."versions" to "authenticated";

grant insert on table "public"."versions" to "authenticated";

grant references on table "public"."versions" to "authenticated";

grant select on table "public"."versions" to "authenticated";

grant trigger on table "public"."versions" to "authenticated";

grant truncate on table "public"."versions" to "authenticated";

grant update on table "public"."versions" to "authenticated";

grant delete on table "public"."versions" to "service_role";

grant insert on table "public"."versions" to "service_role";

grant references on table "public"."versions" to "service_role";

grant select on table "public"."versions" to "service_role";

grant trigger on table "public"."versions" to "service_role";

grant truncate on table "public"."versions" to "service_role";

grant update on table "public"."versions" to "service_role";


  create policy "Abilities are viewable by everyone"
  on "public"."abilities"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can manage abilities"
  on "public"."abilities"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Authenticated insert battle_events"
  on "public"."battle_events"
  as permissive
  for insert
  to public
with check ((auth.role() = 'authenticated'::text));



  create policy "Public read battle_events"
  on "public"."battle_events"
  as permissive
  for select
  to public
using (true);



  create policy "Authenticated insert battle_sessions"
  on "public"."battle_sessions"
  as permissive
  for insert
  to public
with check ((auth.role() = 'authenticated'::text));



  create policy "Authenticated update battle_sessions"
  on "public"."battle_sessions"
  as permissive
  for update
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Public read battle_sessions"
  on "public"."battle_sessions"
  as permissive
  for select
  to public
using (true);



  create policy "Public read berries"
  on "public"."berries"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can manage berries"
  on "public"."berries"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text));



  create policy "berries is viewable by everyone"
  on "public"."berries"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can manage berry_firmnesses"
  on "public"."berry_firmnesses"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "berry_firmnesses is viewable by everyone"
  on "public"."berry_firmnesses"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can manage berry_flavors"
  on "public"."berry_flavors"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "berry_flavors is viewable by everyone"
  on "public"."berry_flavors"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can manage characteristics"
  on "public"."characteristics"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "characteristics is viewable by everyone"
  on "public"."characteristics"
  as permissive
  for select
  to public
using (true);



  create policy "Authenticated insert coaches"
  on "public"."coaches"
  as permissive
  for insert
  to public
with check ((auth.role() = 'authenticated'::text));



  create policy "Public read coaches"
  on "public"."coaches"
  as permissive
  for select
  to public
using (true);



  create policy "Public read conferences"
  on "public"."conferences"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can manage contest_effects"
  on "public"."contest_effects"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "contest_effects is viewable by everyone"
  on "public"."contest_effects"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can manage contest_types"
  on "public"."contest_types"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "contest_types is viewable by everyone"
  on "public"."contest_types"
  as permissive
  for select
  to public
using (true);



  create policy "Public read divisions"
  on "public"."divisions"
  as permissive
  for select
  to public
using (true);



  create policy "Public read draft_budgets"
  on "public"."draft_budgets"
  as permissive
  for select
  to public
using (true);



  create policy "Draft pool is deletable by service role"
  on "public"."draft_pool"
  as permissive
  for delete
  to service_role
using (true);



  create policy "Draft pool is insertable by service role"
  on "public"."draft_pool"
  as permissive
  for insert
  to service_role
with check (true);



  create policy "Draft pool is updatable by service role"
  on "public"."draft_pool"
  as permissive
  for update
  to service_role
using (true)
with check (true);



  create policy "Draft pool is viewable by authenticated users"
  on "public"."draft_pool"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Draft sessions are insertable by service role"
  on "public"."draft_sessions"
  as permissive
  for insert
  to service_role
with check (true);



  create policy "Draft sessions are updatable by service role"
  on "public"."draft_sessions"
  as permissive
  for update
  to service_role
using (true)
with check (true);



  create policy "Draft sessions are viewable by authenticated users"
  on "public"."draft_sessions"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Service role can manage egg_groups"
  on "public"."egg_groups"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "egg_groups is viewable by everyone"
  on "public"."egg_groups"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can manage encounter_condition_values"
  on "public"."encounter_condition_values"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "encounter_condition_values is viewable by everyone"
  on "public"."encounter_condition_values"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can manage encounter_conditions"
  on "public"."encounter_conditions"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "encounter_conditions is viewable by everyone"
  on "public"."encounter_conditions"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can manage encounter_methods"
  on "public"."encounter_methods"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "encounter_methods is viewable by everyone"
  on "public"."encounter_methods"
  as permissive
  for select
  to public
using (true);



  create policy "Evolution chains are viewable by everyone"
  on "public"."evolution_chains"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can manage evolution chains"
  on "public"."evolution_chains"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Public read evolution_triggers"
  on "public"."evolution_triggers"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can manage evolution_triggers"
  on "public"."evolution_triggers"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text));



  create policy "Service role can manage genders"
  on "public"."genders"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "genders is viewable by everyone"
  on "public"."genders"
  as permissive
  for select
  to public
using (true);



  create policy "Generations are viewable by everyone"
  on "public"."generations"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can manage generations"
  on "public"."generations"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Authenticated delete google_sheets_config"
  on "public"."google_sheets_config"
  as permissive
  for delete
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Authenticated insert google_sheets_config"
  on "public"."google_sheets_config"
  as permissive
  for insert
  to public
with check ((auth.role() = 'authenticated'::text));



  create policy "Authenticated update google_sheets_config"
  on "public"."google_sheets_config"
  as permissive
  for update
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Public read google_sheets_config"
  on "public"."google_sheets_config"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can manage growth_rates"
  on "public"."growth_rates"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "growth_rates is viewable by everyone"
  on "public"."growth_rates"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can manage item_attributes"
  on "public"."item_attributes"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "item_attributes is viewable by everyone"
  on "public"."item_attributes"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can manage item_categories"
  on "public"."item_categories"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "item_categories is viewable by everyone"
  on "public"."item_categories"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can manage item_fling_effects"
  on "public"."item_fling_effects"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "item_fling_effects is viewable by everyone"
  on "public"."item_fling_effects"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can manage item_pockets"
  on "public"."item_pockets"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "item_pockets is viewable by everyone"
  on "public"."item_pockets"
  as permissive
  for select
  to public
using (true);



  create policy "Items are viewable by everyone"
  on "public"."items"
  as permissive
  for select
  to public
using (true);



  create policy "Public read items"
  on "public"."items"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can manage items"
  on "public"."items"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text));



  create policy "Service role can manage languages"
  on "public"."languages"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "languages is viewable by everyone"
  on "public"."languages"
  as permissive
  for select
  to public
using (true);



  create policy "League config is insertable by service role"
  on "public"."league_config"
  as permissive
  for insert
  to service_role
with check (true);



  create policy "League config is updatable by service role"
  on "public"."league_config"
  as permissive
  for update
  to service_role
using (true)
with check (true);



  create policy "League config is viewable by authenticated users"
  on "public"."league_config"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Service role can manage location_areas"
  on "public"."location_areas"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "location_areas is viewable by everyone"
  on "public"."location_areas"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can manage locations"
  on "public"."locations"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "locations is viewable by everyone"
  on "public"."locations"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can manage machines"
  on "public"."machines"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "machines is viewable by everyone"
  on "public"."machines"
  as permissive
  for select
  to public
using (true);



  create policy "Allow authenticated insert on matches"
  on "public"."matches"
  as permissive
  for insert
  to public
with check ((auth.role() = 'authenticated'::text));



  create policy "Allow authenticated update on matches"
  on "public"."matches"
  as permissive
  for update
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Allow public read access on matches"
  on "public"."matches"
  as permissive
  for select
  to public
using (true);



  create policy "Public read matchweeks"
  on "public"."matchweeks"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can manage move_ailments"
  on "public"."move_ailments"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "move_ailments is viewable by everyone"
  on "public"."move_ailments"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can manage move_battle_styles"
  on "public"."move_battle_styles"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "move_battle_styles is viewable by everyone"
  on "public"."move_battle_styles"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can manage move_categories"
  on "public"."move_categories"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "move_categories is viewable by everyone"
  on "public"."move_categories"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can manage move_damage_classes"
  on "public"."move_damage_classes"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "move_damage_classes is viewable by everyone"
  on "public"."move_damage_classes"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can manage move_learn_methods"
  on "public"."move_learn_methods"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "move_learn_methods is viewable by everyone"
  on "public"."move_learn_methods"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can manage move_targets"
  on "public"."move_targets"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "move_targets is viewable by everyone"
  on "public"."move_targets"
  as permissive
  for select
  to public
using (true);



  create policy "Moves are viewable by everyone"
  on "public"."moves"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can manage moves"
  on "public"."moves"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Public read natures"
  on "public"."natures"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can manage natures"
  on "public"."natures"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text));



  create policy "natures is viewable by everyone"
  on "public"."natures"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can manage pal_park_areas"
  on "public"."pal_park_areas"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "pal_park_areas is viewable by everyone"
  on "public"."pal_park_areas"
  as permissive
  for select
  to public
using (true);



  create policy "Authenticated users can read cache"
  on "public"."pokeapi_resource_cache"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Service role can manage cache"
  on "public"."pokeapi_resource_cache"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text));



  create policy "Allow public read access to pokeapi_resources"
  on "public"."pokeapi_resources"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can write pokeapi_resources"
  on "public"."pokeapi_resources"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text));



  create policy "Service role can manage pokeathlon_stats"
  on "public"."pokeathlon_stats"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "pokeathlon_stats is viewable by everyone"
  on "public"."pokeathlon_stats"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can manage pokedexes"
  on "public"."pokedexes"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "pokedexes is viewable by everyone"
  on "public"."pokedexes"
  as permissive
  for select
  to public
using (true);



  create policy "Allow public read access on pokemon"
  on "public"."pokemon"
  as permissive
  for select
  to public
using (true);



  create policy "Pokemon abilities are viewable by everyone"
  on "public"."pokemon_abilities"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can manage Pokemon abilities"
  on "public"."pokemon_abilities"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Public read pokemon_cache"
  on "public"."pokemon_cache"
  as permissive
  for select
  to public
using (true);



  create policy "Service role or authenticated insert pokemon_cache"
  on "public"."pokemon_cache"
  as permissive
  for insert
  to public
with check (((auth.role() = 'service_role'::text) OR (auth.role() = 'authenticated'::text)));



  create policy "Service role or authenticated update pokemon_cache"
  on "public"."pokemon_cache"
  as permissive
  for update
  to public
using (((auth.role() = 'service_role'::text) OR (auth.role() = 'authenticated'::text)));



  create policy "Service role can manage pokemon_colors"
  on "public"."pokemon_colors"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "pokemon_colors is viewable by everyone"
  on "public"."pokemon_colors"
  as permissive
  for select
  to public
using (true);



  create policy "Pokemon data is viewable by everyone"
  on "public"."pokemon_comprehensive"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can manage pokemon_egg_groups"
  on "public"."pokemon_egg_groups"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "pokemon_egg_groups is viewable by everyone"
  on "public"."pokemon_egg_groups"
  as permissive
  for select
  to public
using (true);



  create policy "Pokemon forms are viewable by everyone"
  on "public"."pokemon_forms"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can manage Pokemon forms"
  on "public"."pokemon_forms"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Service role can manage pokemon_habitats"
  on "public"."pokemon_habitats"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "pokemon_habitats is viewable by everyone"
  on "public"."pokemon_habitats"
  as permissive
  for select
  to public
using (true);



  create policy "Pokemon items are viewable by everyone"
  on "public"."pokemon_items"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can manage Pokemon items"
  on "public"."pokemon_items"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Service role can manage pokemon_location_areas"
  on "public"."pokemon_location_areas"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "pokemon_location_areas is viewable by everyone"
  on "public"."pokemon_location_areas"
  as permissive
  for select
  to public
using (true);



  create policy "Pokemon moves are viewable by everyone"
  on "public"."pokemon_moves"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can manage Pokemon moves"
  on "public"."pokemon_moves"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Service role can manage pokemon_shapes"
  on "public"."pokemon_shapes"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "pokemon_shapes is viewable by everyone"
  on "public"."pokemon_shapes"
  as permissive
  for select
  to public
using (true);



  create policy "Pokemon species is viewable by everyone"
  on "public"."pokemon_species"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can manage Pokemon species"
  on "public"."pokemon_species"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Allow authenticated insert on pokemon_stats"
  on "public"."pokemon_stats"
  as permissive
  for insert
  to public
with check ((auth.role() = 'authenticated'::text));



  create policy "Allow public read access on pokemon_stats"
  on "public"."pokemon_stats"
  as permissive
  for select
  to public
using (true);



  create policy "Pokemon stats are viewable by everyone"
  on "public"."pokemon_stats"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can manage Pokemon stats"
  on "public"."pokemon_stats"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Pokemon types are viewable by everyone"
  on "public"."pokemon_types"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can manage Pokemon types"
  on "public"."pokemon_types"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Allow public read access to pokepedia_assets"
  on "public"."pokepedia_assets"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can write pokepedia_assets"
  on "public"."pokepedia_assets"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text));



  create policy "Allow public read access to pokepedia_pokemon"
  on "public"."pokepedia_pokemon"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can write pokepedia_pokemon"
  on "public"."pokepedia_pokemon"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text));



  create policy "Admins can delete profiles"
  on "public"."profiles"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles profiles_1
  WHERE ((profiles_1.id = auth.uid()) AND (profiles_1.role = 'admin'::text)))));



  create policy "Admins can update any profile"
  on "public"."profiles"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles profiles_1
  WHERE ((profiles_1.id = auth.uid()) AND (profiles_1.role = 'admin'::text)))));



  create policy "Public profiles are viewable by everyone"
  on "public"."profiles"
  as permissive
  for select
  to public
using (true);



  create policy "Users can insert their own profile"
  on "public"."profiles"
  as permissive
  for insert
  to public
with check ((auth.uid() = id));



  create policy "Users can update own profile"
  on "public"."profiles"
  as permissive
  for update
  to public
using ((auth.uid() = id))
with check ((auth.uid() = id));



  create policy "Service role can manage regions"
  on "public"."regions"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "regions is viewable by everyone"
  on "public"."regions"
  as permissive
  for select
  to public
using (true);



  create policy "Admins can modify role permissions"
  on "public"."role_permissions"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));



  create policy "Public role permissions are viewable"
  on "public"."role_permissions"
  as permissive
  for select
  to public
using (true);



  create policy "Authenticated insert seasons"
  on "public"."seasons"
  as permissive
  for insert
  to public
with check ((auth.role() = 'authenticated'::text));



  create policy "Public read seasons"
  on "public"."seasons"
  as permissive
  for select
  to public
using (true);



  create policy "Authenticated delete sheet_mappings"
  on "public"."sheet_mappings"
  as permissive
  for delete
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Authenticated insert sheet_mappings"
  on "public"."sheet_mappings"
  as permissive
  for insert
  to public
with check ((auth.role() = 'authenticated'::text));



  create policy "Authenticated update sheet_mappings"
  on "public"."sheet_mappings"
  as permissive
  for update
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Public read sheet_mappings"
  on "public"."sheet_mappings"
  as permissive
  for select
  to public
using (true);



  create policy "Allow all client team operations"
  on "public"."showdown_client_teams"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Users can delete own teams"
  on "public"."showdown_teams"
  as permissive
  for update
  to public
using ((coach_id IN ( SELECT coaches.id
   FROM public.coaches
  WHERE (coaches.user_id = auth.uid()))))
with check ((deleted_at IS NOT NULL));



  create policy "Users can insert own teams"
  on "public"."showdown_teams"
  as permissive
  for insert
  to public
with check ((coach_id IN ( SELECT coaches.id
   FROM public.coaches
  WHERE (coaches.user_id = auth.uid()))));



  create policy "Users can update own teams"
  on "public"."showdown_teams"
  as permissive
  for update
  to public
using (((deleted_at IS NULL) AND (coach_id IN ( SELECT coaches.id
   FROM public.coaches
  WHERE (coaches.user_id = auth.uid())))));



  create policy "Users can view own teams and stock teams"
  on "public"."showdown_teams"
  as permissive
  for select
  to public
using (((deleted_at IS NULL) AND ((coach_id IN ( SELECT coaches.id
   FROM public.coaches
  WHERE (coaches.user_id = auth.uid()))) OR (team_id IN ( SELECT teams.id
   FROM public.teams
  WHERE (teams.coach_id IN ( SELECT coaches.id
           FROM public.coaches
          WHERE (coaches.user_id = auth.uid()))))) OR ((is_stock = true) AND (auth.uid() IS NOT NULL)))));



  create policy "Service role can manage stats"
  on "public"."stats"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Stats are viewable by everyone"
  on "public"."stats"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can manage super_contest_effects"
  on "public"."super_contest_effects"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "super_contest_effects is viewable by everyone"
  on "public"."super_contest_effects"
  as permissive
  for select
  to public
using (true);



  create policy "Authenticated insert sync_jobs"
  on "public"."sync_jobs"
  as permissive
  for insert
  to public
with check ((auth.role() = 'authenticated'::text));



  create policy "Authenticated update sync_jobs"
  on "public"."sync_jobs"
  as permissive
  for update
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Public read sync_jobs"
  on "public"."sync_jobs"
  as permissive
  for select
  to public
using (true);



  create policy "Allow authenticated insert on sync_log"
  on "public"."sync_log"
  as permissive
  for insert
  to public
with check ((auth.role() = 'authenticated'::text));



  create policy "Allow public read on sync_log"
  on "public"."sync_log"
  as permissive
  for select
  to public
using (true);



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



  create policy "Allow public read access on team_rosters"
  on "public"."team_rosters"
  as permissive
  for select
  to public
using (true);



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



  create policy "Allow authenticated insert on teams"
  on "public"."teams"
  as permissive
  for insert
  to public
with check ((auth.role() = 'authenticated'::text));



  create policy "Allow authenticated update on teams"
  on "public"."teams"
  as permissive
  for update
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Allow public read access on teams"
  on "public"."teams"
  as permissive
  for select
  to public
using (true);



  create policy "Coaches manage own trade_listings"
  on "public"."trade_listings"
  as permissive
  for all
  to public
using ((auth.uid() IN ( SELECT coaches.user_id
   FROM public.coaches
  WHERE (coaches.id IN ( SELECT teams.coach_id
           FROM public.teams
          WHERE (teams.id = trade_listings.team_id))))));



  create policy "Public read trade_listings"
  on "public"."trade_listings"
  as permissive
  for select
  to public
using (true);



  create policy "Coaches create trade_offers"
  on "public"."trade_offers"
  as permissive
  for insert
  to public
with check ((auth.uid() IN ( SELECT coaches.user_id
   FROM public.coaches
  WHERE (coaches.id IN ( SELECT teams.coach_id
           FROM public.teams
          WHERE (teams.id = trade_offers.offering_team_id))))));



  create policy "Public read trade_offers"
  on "public"."trade_offers"
  as permissive
  for select
  to public
using (true);



  create policy "Public read trade_transactions"
  on "public"."trade_transactions"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can manage types"
  on "public"."types"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Types are viewable by everyone"
  on "public"."types"
  as permissive
  for select
  to public
using (true);



  create policy "Admins can view all activity"
  on "public"."user_activity_log"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));



  create policy "Authenticated users can log activity"
  on "public"."user_activity_log"
  as permissive
  for insert
  to public
with check ((auth.role() = 'authenticated'::text));



  create policy "Users can view own activity"
  on "public"."user_activity_log"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Service role can manage version_groups"
  on "public"."version_groups"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "version_groups is viewable by everyone"
  on "public"."version_groups"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can manage versions"
  on "public"."versions"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "versions is viewable by everyone"
  on "public"."versions"
  as permissive
  for select
  to public
using (true);


CREATE TRIGGER update_google_sheets_config_updated_at BEFORE UPDATE ON public.google_sheets_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_profile_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_sheet_mappings_updated_at BEFORE UPDATE ON public.sheet_mappings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_update_showdown_client_teams_updated_at BEFORE UPDATE ON public.showdown_client_teams FOR EACH ROW EXECUTE FUNCTION public.update_showdown_client_teams_updated_at();

CREATE TRIGGER trigger_calculate_showdown_team_pokemon_count BEFORE INSERT OR UPDATE OF pokemon_data ON public.showdown_teams FOR EACH ROW EXECUTE FUNCTION public.calculate_showdown_team_pokemon_count();

CREATE TRIGGER trigger_update_showdown_teams_updated_at BEFORE UPDATE ON public.showdown_teams FOR EACH ROW EXECUTE FUNCTION public.update_showdown_teams_updated_at();

CREATE TRIGGER trigger_update_team_categories_updated_at BEFORE UPDATE ON public.team_categories FOR EACH ROW EXECUTE FUNCTION public.update_team_categories_updated_at();

CREATE TRIGGER trigger_update_team_formats_updated_at BEFORE UPDATE ON public.team_formats FOR EACH ROW EXECUTE FUNCTION public.update_team_formats_updated_at();

CREATE TRIGGER trigger_update_team_tags_updated_at BEFORE UPDATE ON public.team_tags FOR EACH ROW EXECUTE FUNCTION public.update_team_tags_updated_at();



