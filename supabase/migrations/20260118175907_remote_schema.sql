create extension if not exists "vector" with schema "public";

create sequence "public"."auth_provider_sync_history_id_seq";

create sequence "public"."document_id_seq";

create sequence "public"."execution_annotations_id_seq";

create sequence "public"."execution_entity_id_seq";

create sequence "public"."execution_metadata_temp_id_seq";

create sequence "public"."migratehistory_id_seq";

create sequence "public"."migrations_id_seq";

create sequence "public"."prompt_id_seq";


  create table "public"."annotation_tag_entity" (
    "id" character varying(16) not null,
    "name" character varying(24) not null,
    "createdAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3),
    "updatedAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3)
      );



  create table "public"."auth" (
    "id" character varying(255) not null,
    "email" character varying(255) not null,
    "password" text not null,
    "active" boolean not null
      );



  create table "public"."auth_identity" (
    "userId" uuid,
    "providerId" character varying(64) not null,
    "providerType" character varying(32) not null,
    "createdAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3),
    "updatedAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3)
      );



  create table "public"."auth_provider_sync_history" (
    "id" integer not null default nextval('public.auth_provider_sync_history_id_seq'::regclass),
    "providerType" character varying(32) not null,
    "runMode" text not null,
    "status" text not null,
    "startedAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP,
    "endedAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP,
    "scanned" integer not null,
    "created" integer not null,
    "updated" integer not null,
    "disabled" integer not null,
    "error" text
      );



  create table "public"."binary_data" (
    "fileId" uuid not null,
    "sourceType" character varying(50) not null,
    "sourceId" character varying(255) not null,
    "data" bytea not null,
    "mimeType" character varying(255),
    "fileName" character varying(255),
    "fileSize" integer not null,
    "createdAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3),
    "updatedAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3)
      );



  create table "public"."bulbapedia_mechanics" (
    "id" uuid not null default gen_random_uuid(),
    "resource_type" text not null,
    "resource_name" text not null,
    "title" text not null,
    "content" text not null,
    "source_url" text not null,
    "generation" integer,
    "tags" text[],
    "attribution" text not null default 'Source: Bulbapedia (CC-BY-SA)'::text,
    "curated_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );



  create table "public"."canonical_league_config" (
    "id" uuid not null default gen_random_uuid(),
    "season_id" uuid,
    "intra_divisional_weight" numeric(3,2) not null default 1.5,
    "intra_conference_weight" numeric(3,2) not null default 1.25,
    "cross_conference_weight" numeric(3,2) not null default 1.0,
    "team_count" integer not null,
    "division_count" integer not null default 4,
    "conference_count" integer not null default 2,
    "playoff_teams" integer not null default 12,
    "ranking_criteria" jsonb not null default '[{"priority": 1, "criterion": "win_percentage", "direction": "descending"}, {"priority": 2, "criterion": "losses", "direction": "ascending"}, {"priority": 3, "criterion": "point_differential", "direction": "descending"}, {"priority": 4, "criterion": "head_to_head", "direction": "better_record_wins"}, {"priority": 5, "criterion": "win_streak", "direction": "descending"}, {"priority": 6, "criterion": "strength_of_schedule", "direction": "descending"}, {"priority": 7, "criterion": "team_name_alphabetical", "direction": "ascending"}]'::jsonb,
    "win_streak_type" text not null default 'active'::text,
    "win_streak_breaks_on_loss" boolean not null default true,
    "h2h_applies_to_two_team_ties" boolean not null default true,
    "h2h_applies_to_multi_team_ties" boolean not null default true,
    "h2h_multi_team_method" text not null default 'mini_table'::text,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."canonical_league_config" enable row level security;


  create table "public"."chat" (
    "id" character varying(255) not null,
    "user_id" character varying(255) not null,
    "title" text not null,
    "chat" text not null,
    "share_id" character varying(255),
    "archived" boolean not null,
    "created_at" bigint not null,
    "updated_at" bigint not null
      );



  create table "public"."chat_hub_agents" (
    "id" uuid not null,
    "name" character varying(256) not null,
    "description" character varying(512),
    "systemPrompt" text not null,
    "ownerId" uuid not null,
    "credentialId" character varying(36),
    "provider" character varying(16) not null,
    "model" character varying(64) not null,
    "createdAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3),
    "updatedAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3),
    "tools" json not null default '[]'::json,
    "icon" json
      );



  create table "public"."chat_hub_messages" (
    "id" uuid not null,
    "sessionId" uuid not null,
    "previousMessageId" uuid,
    "revisionOfMessageId" uuid,
    "retryOfMessageId" uuid,
    "type" character varying(16) not null,
    "name" character varying(128) not null,
    "content" text not null,
    "provider" character varying(16),
    "model" character varying(64),
    "workflowId" character varying(36),
    "executionId" integer,
    "createdAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3),
    "updatedAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3),
    "agentId" uuid,
    "status" character varying(16) not null default 'success'::character varying,
    "attachments" json
      );



  create table "public"."chat_hub_sessions" (
    "id" uuid not null,
    "title" character varying(256) not null,
    "ownerId" uuid not null,
    "lastMessageAt" timestamp(3) with time zone not null,
    "credentialId" character varying(36),
    "provider" character varying(16),
    "model" character varying(64),
    "workflowId" character varying(36),
    "createdAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3),
    "updatedAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3),
    "agentId" uuid,
    "agentName" character varying(128),
    "tools" json not null default '[]'::json
      );



  create table "public"."chatidtag" (
    "id" character varying(255) not null,
    "tag_name" character varying(255) not null,
    "chat_id" character varying(255) not null,
    "user_id" character varying(255) not null,
    "timestamp" bigint not null
      );



  create table "public"."credentials_entity" (
    "name" character varying(128) not null,
    "data" text not null,
    "type" character varying(128) not null,
    "createdAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3),
    "updatedAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3),
    "id" character varying(36) not null,
    "isManaged" boolean not null default false,
    "isGlobal" boolean not null default false,
    "isResolvable" boolean not null default false,
    "resolvableAllowFallback" boolean not null default false,
    "resolverId" character varying(16)
      );



  create table "public"."data_table" (
    "id" character varying(36) not null,
    "name" character varying(128) not null,
    "projectId" character varying(36) not null,
    "createdAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3),
    "updatedAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3)
      );



  create table "public"."data_table_column" (
    "id" character varying(36) not null,
    "name" character varying(128) not null,
    "type" character varying(32) not null,
    "index" integer not null,
    "dataTableId" character varying(36) not null,
    "createdAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3),
    "updatedAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3)
      );



  create table "public"."document" (
    "id" integer not null default nextval('public.document_id_seq'::regclass),
    "collection_name" character varying(255) not null,
    "name" character varying(255) not null,
    "title" text not null,
    "filename" text not null,
    "content" text,
    "user_id" character varying(255) not null,
    "timestamp" bigint not null
      );



  create table "public"."dynamic_credential_entry" (
    "credential_id" character varying(16) not null,
    "subject_id" character varying(16) not null,
    "resolver_id" character varying(16) not null,
    "data" text not null,
    "createdAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3),
    "updatedAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3)
      );



  create table "public"."dynamic_credential_resolver" (
    "id" character varying(16) not null,
    "name" character varying(128) not null,
    "type" character varying(128) not null,
    "config" text not null,
    "createdAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3),
    "updatedAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3)
      );



  create table "public"."event_destinations" (
    "id" uuid not null,
    "destination" jsonb not null,
    "createdAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3),
    "updatedAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3)
      );



  create table "public"."execution_annotation_tags" (
    "annotationId" integer not null,
    "tagId" character varying(24) not null
      );



  create table "public"."execution_annotations" (
    "id" integer not null default nextval('public.execution_annotations_id_seq'::regclass),
    "executionId" integer not null,
    "vote" character varying(6),
    "note" text,
    "createdAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3),
    "updatedAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3)
      );



  create table "public"."execution_data" (
    "executionId" integer not null,
    "workflowData" json not null,
    "data" text not null,
    "workflowVersionId" character varying(36)
      );



  create table "public"."execution_entity" (
    "id" integer not null default nextval('public.execution_entity_id_seq'::regclass),
    "finished" boolean not null,
    "mode" character varying not null,
    "retryOf" character varying,
    "retrySuccessId" character varying,
    "startedAt" timestamp(3) with time zone,
    "stoppedAt" timestamp(3) with time zone,
    "waitTill" timestamp(3) with time zone,
    "status" character varying not null,
    "workflowId" character varying(36) not null,
    "deletedAt" timestamp(3) with time zone,
    "createdAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3)
      );



  create table "public"."execution_metadata" (
    "id" integer not null default nextval('public.execution_metadata_temp_id_seq'::regclass),
    "executionId" integer not null,
    "key" character varying(255) not null,
    "value" text not null
      );



  create table "public"."file" (
    "id" text not null,
    "user_id" text not null,
    "filename" text not null,
    "meta" text not null,
    "created_at" bigint not null
      );



  create table "public"."folder" (
    "id" character varying(36) not null,
    "name" character varying(128) not null,
    "parentFolderId" character varying(36),
    "projectId" character varying(36) not null,
    "createdAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3),
    "updatedAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3)
      );



  create table "public"."folder_tag" (
    "folderId" character varying(36) not null,
    "tagId" character varying(36) not null
      );



  create table "public"."function" (
    "id" text not null,
    "user_id" text not null,
    "name" text not null,
    "type" text not null,
    "content" text not null,
    "meta" text not null,
    "created_at" bigint not null,
    "updated_at" bigint not null,
    "valves" text,
    "is_active" boolean not null,
    "is_global" boolean not null
      );



  create table "public"."insights_by_period" (
    "id" integer generated by default as identity not null,
    "metaId" integer not null,
    "type" integer not null,
    "value" bigint not null,
    "periodUnit" integer not null,
    "periodStart" timestamp(0) with time zone default CURRENT_TIMESTAMP
      );



  create table "public"."insights_metadata" (
    "metaId" integer generated by default as identity not null,
    "workflowId" character varying(36),
    "projectId" character varying(36),
    "workflowName" character varying(128) not null,
    "projectName" character varying(255) not null
      );



  create table "public"."insights_raw" (
    "id" integer generated by default as identity not null,
    "metaId" integer not null,
    "type" integer not null,
    "value" bigint not null,
    "timestamp" timestamp(0) with time zone not null default CURRENT_TIMESTAMP
      );



  create table "public"."installed_nodes" (
    "name" character varying(200) not null,
    "type" character varying(200) not null,
    "latestVersion" integer not null default 1,
    "package" character varying(241) not null
      );



  create table "public"."installed_packages" (
    "packageName" character varying(214) not null,
    "installedVersion" character varying(50) not null,
    "authorName" character varying(70),
    "authorEmail" character varying(70),
    "createdAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3),
    "updatedAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3)
      );



  create table "public"."invalid_auth_token" (
    "token" character varying(512) not null,
    "expiresAt" timestamp(3) with time zone not null
      );



  create table "public"."memory" (
    "id" character varying(255) not null,
    "user_id" character varying(255) not null,
    "content" text not null,
    "updated_at" bigint not null,
    "created_at" bigint not null
      );



  create table "public"."migratehistory" (
    "id" integer not null default nextval('public.migratehistory_id_seq'::regclass),
    "name" character varying(255) not null,
    "migrated_at" timestamp without time zone not null
      );



  create table "public"."migrations" (
    "id" integer not null default nextval('public.migrations_id_seq'::regclass),
    "timestamp" bigint not null,
    "name" character varying not null
      );



  create table "public"."model" (
    "id" text not null,
    "user_id" text not null,
    "base_model_id" text,
    "name" text not null,
    "meta" text not null,
    "params" text not null,
    "created_at" bigint not null,
    "updated_at" bigint not null
      );



  create table "public"."oauth_access_tokens" (
    "token" character varying not null,
    "clientId" character varying not null,
    "userId" uuid not null
      );



  create table "public"."oauth_authorization_codes" (
    "code" character varying(255) not null,
    "clientId" character varying not null,
    "userId" uuid not null,
    "redirectUri" character varying not null,
    "codeChallenge" character varying not null,
    "codeChallengeMethod" character varying(255) not null,
    "expiresAt" bigint not null,
    "state" character varying,
    "used" boolean not null default false,
    "createdAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3),
    "updatedAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3)
      );



  create table "public"."oauth_clients" (
    "id" character varying not null,
    "name" character varying(255) not null,
    "redirectUris" json not null,
    "grantTypes" json not null,
    "clientSecret" character varying(255),
    "clientSecretExpiresAt" bigint,
    "tokenEndpointAuthMethod" character varying(255) not null default 'none'::character varying,
    "createdAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3),
    "updatedAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3)
      );



  create table "public"."oauth_refresh_tokens" (
    "token" character varying(255) not null,
    "clientId" character varying not null,
    "userId" uuid not null,
    "expiresAt" bigint not null,
    "createdAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3),
    "updatedAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3)
      );



  create table "public"."oauth_user_consents" (
    "id" integer generated by default as identity not null,
    "userId" uuid not null,
    "clientId" character varying not null,
    "grantedAt" bigint not null
      );



  create table "public"."processed_data" (
    "workflowId" character varying(36) not null,
    "context" character varying(255) not null,
    "createdAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3),
    "updatedAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3),
    "value" text not null
      );



  create table "public"."project" (
    "id" character varying(36) not null,
    "name" character varying(255) not null,
    "type" character varying(36) not null,
    "createdAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3),
    "updatedAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3),
    "icon" json,
    "description" character varying(512),
    "creatorId" uuid
      );



  create table "public"."project_relation" (
    "projectId" character varying(36) not null,
    "userId" uuid not null,
    "role" character varying not null,
    "createdAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3),
    "updatedAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3)
      );



  create table "public"."prompt" (
    "id" integer not null default nextval('public.prompt_id_seq'::regclass),
    "command" character varying(255) not null,
    "user_id" character varying(255) not null,
    "title" text not null,
    "content" text not null,
    "timestamp" bigint not null
      );



  create table "public"."role" (
    "slug" character varying(128) not null,
    "displayName" text,
    "description" text,
    "roleType" text,
    "systemRole" boolean not null default false,
    "createdAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3),
    "updatedAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3)
      );



  create table "public"."role_scope" (
    "roleSlug" character varying(128) not null,
    "scopeSlug" character varying(128) not null
      );



  create table "public"."scope" (
    "slug" character varying(128) not null,
    "displayName" text,
    "description" text
      );



  create table "public"."settings" (
    "key" character varying(255) not null,
    "value" text not null,
    "loadOnStartup" boolean not null default false
      );



  create table "public"."shared_credentials" (
    "credentialsId" character varying(36) not null,
    "projectId" character varying(36) not null,
    "role" text not null,
    "createdAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3),
    "updatedAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3)
      );



  create table "public"."shared_workflow" (
    "workflowId" character varying(36) not null,
    "projectId" character varying(36) not null,
    "role" text not null,
    "createdAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3),
    "updatedAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3)
      );



  create table "public"."smogon_meta_snapshot" (
    "id" uuid not null default gen_random_uuid(),
    "pokemon_name" text not null,
    "format" text not null,
    "generation" integer not null,
    "tier" text,
    "usage_rate" numeric(5,4),
    "roles" text[],
    "common_moves" jsonb,
    "common_items" jsonb,
    "common_abilities" jsonb,
    "common_evs" jsonb,
    "checks" text[],
    "counters" text[],
    "source_date" timestamp with time zone not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );



  create table "public"."tag" (
    "id" character varying(255) not null,
    "name" character varying(255) not null,
    "user_id" character varying(255) not null,
    "data" text
      );



  create table "public"."tag_entity" (
    "name" character varying(24) not null,
    "createdAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3),
    "updatedAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3),
    "id" character varying(36) not null
      );



  create table "public"."test_case_execution" (
    "id" character varying(36) not null,
    "testRunId" character varying(36) not null,
    "executionId" integer,
    "status" character varying not null,
    "runAt" timestamp(3) with time zone,
    "completedAt" timestamp(3) with time zone,
    "errorCode" character varying,
    "errorDetails" json,
    "metrics" json,
    "createdAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3),
    "updatedAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3),
    "inputs" json,
    "outputs" json
      );



  create table "public"."test_run" (
    "id" character varying(36) not null,
    "workflowId" character varying(36) not null,
    "status" character varying not null,
    "errorCode" character varying,
    "errorDetails" json,
    "runAt" timestamp(3) with time zone,
    "completedAt" timestamp(3) with time zone,
    "metrics" json,
    "createdAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3),
    "updatedAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3)
      );



  create table "public"."tool" (
    "id" text not null,
    "user_id" text not null,
    "name" text not null,
    "content" text not null,
    "specs" text not null,
    "meta" text not null,
    "created_at" bigint not null,
    "updated_at" bigint not null,
    "valves" text
      );



  create table "public"."user" (
    "id" uuid not null default gen_random_uuid(),
    "email" character varying(255),
    "firstName" character varying(32),
    "lastName" character varying(32),
    "password" character varying(255),
    "personalizationAnswers" json,
    "createdAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3),
    "updatedAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3),
    "settings" json,
    "disabled" boolean not null default false,
    "mfaEnabled" boolean not null default false,
    "mfaSecret" text,
    "mfaRecoveryCodes" text,
    "lastActiveAt" date,
    "roleSlug" character varying(128) not null default 'global:member'::character varying,
    "api_key" character varying(255),
    "created_at" bigint not null,
    "updated_at" bigint not null,
    "last_active_at" bigint not null,
    "info" text,
    "oauth_sub" text
      );



  create table "public"."user_api_keys" (
    "id" character varying(36) not null,
    "userId" uuid not null,
    "label" character varying(100) not null,
    "apiKey" character varying not null,
    "createdAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3),
    "updatedAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3),
    "scopes" json,
    "audience" character varying not null default 'public-api'::character varying
      );



  create table "public"."variables" (
    "key" character varying(50) not null,
    "type" character varying(50) not null default 'string'::character varying,
    "value" character varying(255),
    "id" character varying(36) not null,
    "projectId" character varying(36)
      );



  create table "public"."webhook_entity" (
    "webhookPath" character varying not null,
    "method" character varying not null,
    "node" character varying not null,
    "webhookId" character varying,
    "pathLength" integer,
    "workflowId" character varying(36) not null
      );



  create table "public"."workflow_dependency" (
    "id" integer generated by default as identity not null,
    "workflowId" character varying(36) not null,
    "workflowVersionId" integer not null,
    "dependencyType" character varying(32) not null,
    "dependencyKey" character varying(255) not null,
    "dependencyInfo" json,
    "indexVersionId" smallint not null default 1,
    "createdAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3)
      );



  create table "public"."workflow_entity" (
    "name" character varying(128) not null,
    "active" boolean not null,
    "nodes" json not null,
    "connections" json not null,
    "createdAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3),
    "updatedAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3),
    "settings" json,
    "staticData" json,
    "pinData" json,
    "versionId" character(36) not null,
    "triggerCount" integer not null default 0,
    "id" character varying(36) not null,
    "meta" json,
    "parentFolderId" character varying(36) default NULL::character varying,
    "isArchived" boolean not null default false,
    "versionCounter" integer not null default 1,
    "description" text,
    "activeVersionId" character varying(36)
      );



  create table "public"."workflow_history" (
    "versionId" character varying(36) not null,
    "workflowId" character varying(36) not null,
    "authors" character varying(255) not null,
    "createdAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3),
    "updatedAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3),
    "nodes" json not null,
    "connections" json not null,
    "name" character varying(128),
    "autosaved" boolean not null default false,
    "description" text
      );



  create table "public"."workflow_publish_history" (
    "id" integer generated by default as identity not null,
    "workflowId" character varying(36) not null,
    "versionId" character varying(36) not null,
    "event" character varying(36) not null,
    "userId" uuid,
    "createdAt" timestamp(3) with time zone not null default CURRENT_TIMESTAMP(3)
      );



  create table "public"."workflow_statistics" (
    "count" integer default 0,
    "latestEvent" timestamp(3) with time zone,
    "name" character varying(128) not null,
    "workflowId" character varying(36) not null,
    "rootCount" integer default 0
      );



  create table "public"."workflows_tags" (
    "workflowId" character varying(36) not null,
    "tagId" character varying(36) not null
      );


alter table "public"."abilities" add column "effect_changes" jsonb;

alter table "public"."generations" add column "names" jsonb;

alter table "public"."generations" add column "version_groups" jsonb;

alter table "public"."items" add column "baby_trigger_for" jsonb;

alter table "public"."items" add column "machines" jsonb;

alter table "public"."items" add column "names" jsonb;

alter table "public"."moves" add column "contest_combos" jsonb;

alter table "public"."moves" add column "contest_effect_id" integer;

alter table "public"."moves" add column "contest_type_id" integer;

alter table "public"."moves" add column "effect_changes" jsonb;

alter table "public"."moves" add column "machines" jsonb;

alter table "public"."moves" add column "names" jsonb;

alter table "public"."moves" add column "past_values" jsonb;

alter table "public"."moves" add column "super_contest_effect_id" integer;

alter table "public"."stats" add column "affecting_moves" jsonb;

alter table "public"."stats" add column "affecting_natures" jsonb;

alter table "public"."stats" add column "characteristics" jsonb;

alter table "public"."stats" add column "names" jsonb;

alter table "public"."types" add column "moves" jsonb;

alter table "public"."types" add column "names" jsonb;

alter table "public"."types" add column "past_damage_relations" jsonb;

alter table "public"."types" add column "pokemon" jsonb;

alter table "public"."types" add column "sprites" jsonb;

alter sequence "public"."auth_provider_sync_history_id_seq" owned by "public"."auth_provider_sync_history"."id";

alter sequence "public"."document_id_seq" owned by "public"."document"."id";

alter sequence "public"."execution_annotations_id_seq" owned by "public"."execution_annotations"."id";

alter sequence "public"."execution_entity_id_seq" owned by "public"."execution_entity"."id";

alter sequence "public"."execution_metadata_temp_id_seq" owned by "public"."execution_metadata"."id";

alter sequence "public"."migratehistory_id_seq" owned by "public"."migratehistory"."id";

alter sequence "public"."migrations_id_seq" owned by "public"."migrations"."id";

alter sequence "public"."prompt_id_seq" owned by "public"."prompt"."id";

CREATE INDEX "IDX_070b5de842ece9ccdda0d9738b" ON public.workflow_publish_history USING btree ("workflowId", "versionId");

CREATE UNIQUE INDEX "IDX_14f68deffaf858465715995508" ON public.folder USING btree ("projectId", id);

CREATE UNIQUE INDEX "IDX_1d8ab99d5861c9388d2dc1cf73" ON public.insights_metadata USING btree ("workflowId");

CREATE INDEX "IDX_1e31657f5fe46816c34be7c1b4" ON public.workflow_history USING btree ("workflowId");

CREATE UNIQUE INDEX "IDX_1ef35bac35d20bdae979d917a3" ON public.user_api_keys USING btree ("apiKey");

CREATE INDEX "IDX_56900edc3cfd16612e2ef2c6a8" ON public.binary_data USING btree ("sourceType", "sourceId");

CREATE INDEX "IDX_5f0643f6717905a05164090dde" ON public.project_relation USING btree ("userId");

CREATE UNIQUE INDEX "IDX_60b6a84299eeb3f671dfec7693" ON public.insights_by_period USING btree ("periodStart", type, "periodUnit", "metaId");

CREATE INDEX "IDX_61448d56d61802b5dfde5cdb00" ON public.project_relation USING btree ("projectId");

CREATE UNIQUE INDEX "IDX_63d7bbae72c767cf162d459fcc" ON public.user_api_keys USING btree ("userId", label);

CREATE INDEX "IDX_8e4b4774db42f1e6dda3452b2a" ON public.test_case_execution USING btree ("testRunId");

CREATE UNIQUE INDEX "IDX_97f863fa83c4786f1956508496" ON public.execution_annotations USING btree ("executionId");

CREATE INDEX "IDX_99b3e329d13b7bb2fa9b6a43f5" ON public.dynamic_credential_entry USING btree (subject_id);

CREATE INDEX "IDX_9c9ee9df586e60bb723234e499" ON public.dynamic_credential_resolver USING btree (type);

CREATE UNIQUE INDEX "IDX_UniqueRoleDisplayName" ON public.role USING btree ("displayName");

CREATE INDEX "IDX_a3697779b366e131b2bbdae297" ON public.execution_annotation_tags USING btree ("tagId");

CREATE INDEX "IDX_a4ff2d9b9628ea988fa9e7d0bf" ON public.workflow_dependency USING btree ("workflowId");

CREATE UNIQUE INDEX "IDX_ae51b54c4bb430cf92f48b623f" ON public.annotation_tag_entity USING btree (name);

CREATE INDEX "IDX_c1519757391996eb06064f0e7c" ON public.execution_annotation_tags USING btree ("annotationId");

CREATE UNIQUE INDEX "IDX_cec8eea3bf49551482ccb4933e" ON public.execution_metadata USING btree ("executionId", key);

CREATE INDEX "IDX_chat_hub_messages_sessionId" ON public.chat_hub_messages USING btree ("sessionId");

CREATE INDEX "IDX_chat_hub_sessions_owner_lastmsg_id" ON public.chat_hub_sessions USING btree ("ownerId", "lastMessageAt" DESC, id);

CREATE INDEX "IDX_d57808fe08b77464f6a88a2549" ON public.dynamic_credential_entry USING btree (resolver_id);

CREATE INDEX "IDX_d6870d3b6e4c185d33926f423c" ON public.test_run USING btree ("workflowId");

CREATE INDEX "IDX_e48a201071ab85d9d09119d640" ON public.workflow_dependency USING btree ("dependencyKey");

CREATE INDEX "IDX_e7fe1cfda990c14a445937d0b9" ON public.workflow_dependency USING btree ("dependencyType");

CREATE INDEX "IDX_execution_entity_deletedAt" ON public.execution_entity USING btree ("deletedAt");

CREATE INDEX "IDX_role_scope_scopeSlug" ON public.role_scope USING btree ("scopeSlug");

CREATE INDEX "IDX_workflow_entity_name" ON public.workflow_entity USING btree (name);

CREATE UNIQUE INDEX "PK_011c050f566e9db509a0fadb9b9" ON public.test_run USING btree (id);

CREATE UNIQUE INDEX "PK_08cc9197c39b028c1e9beca225940576fd1a5804" ON public.installed_packages USING btree ("packageName");

CREATE UNIQUE INDEX "PK_17a0b6284f8d626aae88e1c16e4" ON public.execution_metadata USING btree (id);

CREATE UNIQUE INDEX "PK_1caaa312a5d7184a003be0f0cb6" ON public.project_relation USING btree ("projectId", "userId");

CREATE UNIQUE INDEX "PK_1eafef1273c70e4464fec703412" ON public.chat_hub_sessions USING btree (id);

CREATE UNIQUE INDEX "PK_27e4e00852f6b06a925a4d83a3e" ON public.folder_tag USING btree ("folderId", "tagId");

CREATE UNIQUE INDEX "PK_35c9b140caaf6da09cfabb0d675" ON public.role USING btree (slug);

CREATE UNIQUE INDEX "PK_4d68b1358bb5b766d3e78f32f57" ON public.project USING btree (id);

CREATE UNIQUE INDEX "PK_52325e34cd7a2f0f67b0f3cad65" ON public.workflow_dependency USING btree (id);

CREATE UNIQUE INDEX "PK_5779069b7235b256d91f7af1a15" ON public.invalid_auth_token USING btree (token);

CREATE UNIQUE INDEX "PK_5ba87620386b847201c9531c58f" ON public.shared_workflow USING btree ("workflowId", "projectId");

CREATE UNIQUE INDEX "PK_6278a41a706740c94c02e288df8" ON public.folder USING btree (id);

CREATE UNIQUE INDEX "PK_673cb121ee4a8a5e27850c72c51" ON public.data_table_column USING btree (id);

CREATE UNIQUE INDEX "PK_69dfa041592c30bbc0d4b84aa00" ON public.annotation_tag_entity USING btree (id);

CREATE UNIQUE INDEX "PK_74abaed0b30711b6532598b0392" ON public.oauth_refresh_tokens USING btree (token);

CREATE UNIQUE INDEX "PK_7704a5add6baed43eef835f0bfb" ON public.chat_hub_messages USING btree (id);

CREATE UNIQUE INDEX "PK_7afcf93ffa20c4252869a7c6a23" ON public.execution_annotations USING btree (id);

CREATE UNIQUE INDEX "PK_7bc73da3b8be7591696e14809d5" ON public.dynamic_credential_entry USING btree (credential_id, subject_id, resolver_id);

CREATE UNIQUE INDEX "PK_85b9ada746802c8993103470f05" ON public.oauth_user_consents USING btree (id);

CREATE UNIQUE INDEX "PK_8c82d7f526340ab734260ea46be" ON public.migrations USING btree (id);

CREATE UNIQUE INDEX "PK_8ebd28194e4f792f96b5933423fc439df97d9689" ON public.installed_nodes USING btree (name);

CREATE UNIQUE INDEX "PK_8ef3a59796a228913f251779cff" ON public.shared_credentials USING btree ("credentialsId", "projectId");

CREATE UNIQUE INDEX "PK_90c121f77a78a6580e94b794bce" ON public.test_case_execution USING btree (id);

CREATE UNIQUE INDEX "PK_978fa5caa3468f463dac9d92e69" ON public.user_api_keys USING btree (id);

CREATE UNIQUE INDEX "PK_979ec03d31294cca484be65d11f" ON public.execution_annotation_tags USING btree ("annotationId", "tagId");

CREATE UNIQUE INDEX "PK_b21ace2e13596ccd87dc9bf4ea6" ON public.webhook_entity USING btree ("webhookPath", method);

CREATE UNIQUE INDEX "PK_b606942249b90cc39b0265f0575" ON public.insights_by_period USING btree (id);

CREATE UNIQUE INDEX "PK_b6572dd6173e4cd06fe79937b58" ON public.workflow_history USING btree ("versionId");

CREATE UNIQUE INDEX "PK_b76cfb088dcdaf5275e9980bb64" ON public.dynamic_credential_resolver USING btree (id);

CREATE UNIQUE INDEX "PK_bfc45df0481abd7f355d6187da1" ON public.scope USING btree (slug);

CREATE UNIQUE INDEX "PK_c4759172d3431bae6f04e678e0d" ON public.oauth_clients USING btree (id);

CREATE UNIQUE INDEX "PK_c788f7caf88e91e365c97d6d04a" ON public.workflow_publish_history USING btree (id);

CREATE UNIQUE INDEX "PK_ca04b9d8dc72de268fe07a65773" ON public.processed_data USING btree ("workflowId", context);

CREATE UNIQUE INDEX "PK_dc0fe14e6d9943f268e7b119f69ab8bd" ON public.settings USING btree (key);

CREATE UNIQUE INDEX "PK_dcd71f96a5d5f4bf79e67d322bf" ON public.oauth_access_tokens USING btree (token);

CREATE UNIQUE INDEX "PK_e226d0001b9e6097cbfe70617cb" ON public.data_table USING btree (id);

CREATE UNIQUE INDEX "PK_ea8f538c94b6e352418254ed6474a81f" ON public."user" USING btree (id);

CREATE UNIQUE INDEX "PK_ec15125755151e3a7e00e00014f" ON public.insights_raw USING btree (id);

CREATE UNIQUE INDEX "PK_f39a3b36bbdf0e2979ddb21cf78" ON public.chat_hub_agents USING btree (id);

CREATE UNIQUE INDEX "PK_f448a94c35218b6208ce20cf5a1" ON public.insights_metadata USING btree ("metaId");

CREATE UNIQUE INDEX "PK_fb91ab932cfbd694061501cc20f" ON public.oauth_authorization_codes USING btree (code);

CREATE UNIQUE INDEX "PK_fc3691585b39408bb0551122af6" ON public.binary_data USING btree ("fileId");

CREATE UNIQUE INDEX "PK_role_scope" ON public.role_scope USING btree ("roleSlug", "scopeSlug");

CREATE UNIQUE INDEX "UQ_083721d99ce8db4033e2958ebb4" ON public.oauth_user_consents USING btree ("userId", "clientId");

CREATE UNIQUE INDEX "UQ_8082ec4890f892f0bc77473a123" ON public.data_table_column USING btree ("dataTableId", name);

CREATE UNIQUE INDEX "UQ_b23096ef747281ac944d28e8b0d" ON public.data_table USING btree ("projectId", name);

CREATE UNIQUE INDEX "UQ_e12875dfb3b1d92d7d7c5377e2" ON public."user" USING btree (email);

CREATE UNIQUE INDEX auth_id ON public.auth USING btree (id);

CREATE UNIQUE INDEX auth_identity_pkey ON public.auth_identity USING btree ("providerId", "providerType");

CREATE UNIQUE INDEX auth_provider_sync_history_pkey ON public.auth_provider_sync_history USING btree (id);

CREATE UNIQUE INDEX bulbapedia_mechanics_pkey ON public.bulbapedia_mechanics USING btree (id);

CREATE UNIQUE INDEX bulbapedia_mechanics_resource_type_resource_name_key ON public.bulbapedia_mechanics USING btree (resource_type, resource_name);

CREATE UNIQUE INDEX canonical_league_config_pkey ON public.canonical_league_config USING btree (id);

CREATE UNIQUE INDEX chat_id ON public.chat USING btree (id);

CREATE UNIQUE INDEX chat_share_id ON public.chat USING btree (share_id);

CREATE UNIQUE INDEX chatidtag_id ON public.chatidtag USING btree (id);

CREATE UNIQUE INDEX credentials_entity_pkey ON public.credentials_entity USING btree (id);

CREATE UNIQUE INDEX document_collection_name ON public.document USING btree (collection_name);

CREATE UNIQUE INDEX document_name ON public.document USING btree (name);

CREATE UNIQUE INDEX document_pkey ON public.document USING btree (id);

CREATE UNIQUE INDEX event_destinations_pkey ON public.event_destinations USING btree (id);

CREATE UNIQUE INDEX execution_data_pkey ON public.execution_data USING btree ("executionId");

CREATE UNIQUE INDEX file_id ON public.file USING btree (id);

CREATE UNIQUE INDEX function_id ON public.function USING btree (id);

CREATE INDEX idx_07fde106c0b471d8cc80a64fc8 ON public.credentials_entity USING btree (type);

CREATE INDEX idx_16f4436789e804e3e1c9eeb240 ON public.webhook_entity USING btree ("webhookId", method, "pathLength");

CREATE UNIQUE INDEX idx_812eb05f7451ca757fb98444ce ON public.tag_entity USING btree (name);

CREATE INDEX idx_bulbapedia_content_search ON public.bulbapedia_mechanics USING gin (to_tsvector('english'::regconfig, content));

CREATE INDEX idx_bulbapedia_generation ON public.bulbapedia_mechanics USING btree (generation);

CREATE INDEX idx_bulbapedia_resource_type ON public.bulbapedia_mechanics USING btree (resource_type);

CREATE INDEX idx_bulbapedia_tags ON public.bulbapedia_mechanics USING gin (tags);

CREATE INDEX idx_bulbapedia_type_name ON public.bulbapedia_mechanics USING btree (resource_type, resource_name);

CREATE INDEX idx_canonical_league_config_active ON public.canonical_league_config USING btree (is_active) WHERE (is_active = true);

CREATE UNIQUE INDEX idx_canonical_league_config_one_active_per_season ON public.canonical_league_config USING btree (season_id) WHERE (is_active = true);

CREATE INDEX idx_canonical_league_config_season ON public.canonical_league_config USING btree (season_id);

CREATE INDEX idx_execution_entity_stopped_at_status_deleted_at ON public.execution_entity USING btree ("stoppedAt", status, "deletedAt") WHERE (("stoppedAt" IS NOT NULL) AND ("deletedAt" IS NULL));

CREATE INDEX idx_execution_entity_wait_till_status_deleted_at ON public.execution_entity USING btree ("waitTill", status, "deletedAt") WHERE (("waitTill" IS NOT NULL) AND ("deletedAt" IS NULL));

CREATE INDEX idx_execution_entity_workflow_id_started_at ON public.execution_entity USING btree ("workflowId", "startedAt") WHERE (("startedAt" IS NOT NULL) AND ("deletedAt" IS NULL));

CREATE INDEX idx_moves_contest_effect ON public.moves USING btree (contest_effect_id) WHERE (contest_effect_id IS NOT NULL);

CREATE INDEX idx_moves_contest_type ON public.moves USING btree (contest_type_id) WHERE (contest_type_id IS NOT NULL);

CREATE INDEX idx_moves_super_contest_effect ON public.moves USING btree (super_contest_effect_id) WHERE (super_contest_effect_id IS NOT NULL);

CREATE INDEX idx_smogon_meta_abilities ON public.smogon_meta_snapshot USING gin (common_abilities);

CREATE INDEX idx_smogon_meta_checks ON public.smogon_meta_snapshot USING gin (checks);

CREATE INDEX idx_smogon_meta_counters ON public.smogon_meta_snapshot USING gin (counters);

CREATE INDEX idx_smogon_meta_format ON public.smogon_meta_snapshot USING btree (format, generation);

CREATE INDEX idx_smogon_meta_items ON public.smogon_meta_snapshot USING gin (common_items);

CREATE INDEX idx_smogon_meta_moves ON public.smogon_meta_snapshot USING gin (common_moves);

CREATE INDEX idx_smogon_meta_pokemon ON public.smogon_meta_snapshot USING btree (pokemon_name);

CREATE INDEX idx_smogon_meta_roles ON public.smogon_meta_snapshot USING gin (roles);

CREATE INDEX idx_smogon_meta_source_date ON public.smogon_meta_snapshot USING btree (source_date DESC);

CREATE INDEX idx_smogon_meta_tier ON public.smogon_meta_snapshot USING btree (tier);

CREATE INDEX idx_workflows_tags_workflow_id ON public.workflows_tags USING btree ("workflowId");

CREATE UNIQUE INDEX memory_id ON public.memory USING btree (id);

CREATE UNIQUE INDEX migratehistory_pkey ON public.migratehistory USING btree (id);

CREATE UNIQUE INDEX model_id ON public.model USING btree (id);

CREATE UNIQUE INDEX pk_credentials_entity_id ON public.credentials_entity USING btree (id);

CREATE UNIQUE INDEX pk_e3e63bbf986767844bbe1166d4e ON public.execution_entity USING btree (id);

CREATE UNIQUE INDEX pk_tag_entity_id ON public.tag_entity USING btree (id);

CREATE UNIQUE INDEX pk_workflow_entity_id ON public.workflow_entity USING btree (id);

CREATE UNIQUE INDEX pk_workflow_statistics ON public.workflow_statistics USING btree ("workflowId", name);

CREATE UNIQUE INDEX pk_workflows_tags ON public.workflows_tags USING btree ("workflowId", "tagId");

CREATE INDEX project_relation_role_idx ON public.project_relation USING btree (role);

CREATE INDEX project_relation_role_project_idx ON public.project_relation USING btree ("projectId", role);

CREATE UNIQUE INDEX prompt_command ON public.prompt USING btree (command);

CREATE UNIQUE INDEX prompt_pkey ON public.prompt USING btree (id);

CREATE UNIQUE INDEX smogon_meta_snapshot_pkey ON public.smogon_meta_snapshot USING btree (id);

CREATE UNIQUE INDEX smogon_meta_snapshot_pokemon_name_format_source_date_key ON public.smogon_meta_snapshot USING btree (pokemon_name, format, source_date);

CREATE UNIQUE INDEX tag_entity_pkey ON public.tag_entity USING btree (id);

CREATE UNIQUE INDEX tag_id ON public.tag USING btree (id);

CREATE UNIQUE INDEX tool_id ON public.tool USING btree (id);

CREATE UNIQUE INDEX user_api_key ON public."user" USING btree (api_key);

CREATE UNIQUE INDEX user_id ON public."user" USING btree (id);

CREATE UNIQUE INDEX user_oauth_sub ON public."user" USING btree (oauth_sub);

CREATE INDEX user_role_idx ON public."user" USING btree ("roleSlug");

CREATE UNIQUE INDEX variables_global_key_unique ON public.variables USING btree (key) WHERE ("projectId" IS NULL);

CREATE UNIQUE INDEX variables_pkey ON public.variables USING btree (id);

CREATE UNIQUE INDEX variables_project_key_unique ON public.variables USING btree ("projectId", key) WHERE ("projectId" IS NOT NULL);

CREATE UNIQUE INDEX workflow_entity_pkey ON public.workflow_entity USING btree (id);

alter table "public"."annotation_tag_entity" add constraint "PK_69dfa041592c30bbc0d4b84aa00" PRIMARY KEY using index "PK_69dfa041592c30bbc0d4b84aa00";

alter table "public"."auth_identity" add constraint "auth_identity_pkey" PRIMARY KEY using index "auth_identity_pkey";

alter table "public"."auth_provider_sync_history" add constraint "auth_provider_sync_history_pkey" PRIMARY KEY using index "auth_provider_sync_history_pkey";

alter table "public"."binary_data" add constraint "PK_fc3691585b39408bb0551122af6" PRIMARY KEY using index "PK_fc3691585b39408bb0551122af6";

alter table "public"."bulbapedia_mechanics" add constraint "bulbapedia_mechanics_pkey" PRIMARY KEY using index "bulbapedia_mechanics_pkey";

alter table "public"."canonical_league_config" add constraint "canonical_league_config_pkey" PRIMARY KEY using index "canonical_league_config_pkey";

alter table "public"."chat_hub_agents" add constraint "PK_f39a3b36bbdf0e2979ddb21cf78" PRIMARY KEY using index "PK_f39a3b36bbdf0e2979ddb21cf78";

alter table "public"."chat_hub_messages" add constraint "PK_7704a5add6baed43eef835f0bfb" PRIMARY KEY using index "PK_7704a5add6baed43eef835f0bfb";

alter table "public"."chat_hub_sessions" add constraint "PK_1eafef1273c70e4464fec703412" PRIMARY KEY using index "PK_1eafef1273c70e4464fec703412";

alter table "public"."credentials_entity" add constraint "credentials_entity_pkey" PRIMARY KEY using index "credentials_entity_pkey";

alter table "public"."data_table" add constraint "PK_e226d0001b9e6097cbfe70617cb" PRIMARY KEY using index "PK_e226d0001b9e6097cbfe70617cb";

alter table "public"."data_table_column" add constraint "PK_673cb121ee4a8a5e27850c72c51" PRIMARY KEY using index "PK_673cb121ee4a8a5e27850c72c51";

alter table "public"."document" add constraint "document_pkey" PRIMARY KEY using index "document_pkey";

alter table "public"."dynamic_credential_entry" add constraint "PK_7bc73da3b8be7591696e14809d5" PRIMARY KEY using index "PK_7bc73da3b8be7591696e14809d5";

alter table "public"."dynamic_credential_resolver" add constraint "PK_b76cfb088dcdaf5275e9980bb64" PRIMARY KEY using index "PK_b76cfb088dcdaf5275e9980bb64";

alter table "public"."event_destinations" add constraint "event_destinations_pkey" PRIMARY KEY using index "event_destinations_pkey";

alter table "public"."execution_annotation_tags" add constraint "PK_979ec03d31294cca484be65d11f" PRIMARY KEY using index "PK_979ec03d31294cca484be65d11f";

alter table "public"."execution_annotations" add constraint "PK_7afcf93ffa20c4252869a7c6a23" PRIMARY KEY using index "PK_7afcf93ffa20c4252869a7c6a23";

alter table "public"."execution_data" add constraint "execution_data_pkey" PRIMARY KEY using index "execution_data_pkey";

alter table "public"."execution_entity" add constraint "pk_e3e63bbf986767844bbe1166d4e" PRIMARY KEY using index "pk_e3e63bbf986767844bbe1166d4e";

alter table "public"."execution_metadata" add constraint "PK_17a0b6284f8d626aae88e1c16e4" PRIMARY KEY using index "PK_17a0b6284f8d626aae88e1c16e4";

alter table "public"."folder" add constraint "PK_6278a41a706740c94c02e288df8" PRIMARY KEY using index "PK_6278a41a706740c94c02e288df8";

alter table "public"."folder_tag" add constraint "PK_27e4e00852f6b06a925a4d83a3e" PRIMARY KEY using index "PK_27e4e00852f6b06a925a4d83a3e";

alter table "public"."insights_by_period" add constraint "PK_b606942249b90cc39b0265f0575" PRIMARY KEY using index "PK_b606942249b90cc39b0265f0575";

alter table "public"."insights_metadata" add constraint "PK_f448a94c35218b6208ce20cf5a1" PRIMARY KEY using index "PK_f448a94c35218b6208ce20cf5a1";

alter table "public"."insights_raw" add constraint "PK_ec15125755151e3a7e00e00014f" PRIMARY KEY using index "PK_ec15125755151e3a7e00e00014f";

alter table "public"."installed_nodes" add constraint "PK_8ebd28194e4f792f96b5933423fc439df97d9689" PRIMARY KEY using index "PK_8ebd28194e4f792f96b5933423fc439df97d9689";

alter table "public"."installed_packages" add constraint "PK_08cc9197c39b028c1e9beca225940576fd1a5804" PRIMARY KEY using index "PK_08cc9197c39b028c1e9beca225940576fd1a5804";

alter table "public"."invalid_auth_token" add constraint "PK_5779069b7235b256d91f7af1a15" PRIMARY KEY using index "PK_5779069b7235b256d91f7af1a15";

alter table "public"."migratehistory" add constraint "migratehistory_pkey" PRIMARY KEY using index "migratehistory_pkey";

alter table "public"."migrations" add constraint "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY using index "PK_8c82d7f526340ab734260ea46be";

alter table "public"."oauth_access_tokens" add constraint "PK_dcd71f96a5d5f4bf79e67d322bf" PRIMARY KEY using index "PK_dcd71f96a5d5f4bf79e67d322bf";

alter table "public"."oauth_authorization_codes" add constraint "PK_fb91ab932cfbd694061501cc20f" PRIMARY KEY using index "PK_fb91ab932cfbd694061501cc20f";

alter table "public"."oauth_clients" add constraint "PK_c4759172d3431bae6f04e678e0d" PRIMARY KEY using index "PK_c4759172d3431bae6f04e678e0d";

alter table "public"."oauth_refresh_tokens" add constraint "PK_74abaed0b30711b6532598b0392" PRIMARY KEY using index "PK_74abaed0b30711b6532598b0392";

alter table "public"."oauth_user_consents" add constraint "PK_85b9ada746802c8993103470f05" PRIMARY KEY using index "PK_85b9ada746802c8993103470f05";

alter table "public"."processed_data" add constraint "PK_ca04b9d8dc72de268fe07a65773" PRIMARY KEY using index "PK_ca04b9d8dc72de268fe07a65773";

alter table "public"."project" add constraint "PK_4d68b1358bb5b766d3e78f32f57" PRIMARY KEY using index "PK_4d68b1358bb5b766d3e78f32f57";

alter table "public"."project_relation" add constraint "PK_1caaa312a5d7184a003be0f0cb6" PRIMARY KEY using index "PK_1caaa312a5d7184a003be0f0cb6";

alter table "public"."prompt" add constraint "prompt_pkey" PRIMARY KEY using index "prompt_pkey";

alter table "public"."role" add constraint "PK_35c9b140caaf6da09cfabb0d675" PRIMARY KEY using index "PK_35c9b140caaf6da09cfabb0d675";

alter table "public"."role_scope" add constraint "PK_role_scope" PRIMARY KEY using index "PK_role_scope";

alter table "public"."scope" add constraint "PK_bfc45df0481abd7f355d6187da1" PRIMARY KEY using index "PK_bfc45df0481abd7f355d6187da1";

alter table "public"."settings" add constraint "PK_dc0fe14e6d9943f268e7b119f69ab8bd" PRIMARY KEY using index "PK_dc0fe14e6d9943f268e7b119f69ab8bd";

alter table "public"."shared_credentials" add constraint "PK_8ef3a59796a228913f251779cff" PRIMARY KEY using index "PK_8ef3a59796a228913f251779cff";

alter table "public"."shared_workflow" add constraint "PK_5ba87620386b847201c9531c58f" PRIMARY KEY using index "PK_5ba87620386b847201c9531c58f";

alter table "public"."smogon_meta_snapshot" add constraint "smogon_meta_snapshot_pkey" PRIMARY KEY using index "smogon_meta_snapshot_pkey";

alter table "public"."tag_entity" add constraint "tag_entity_pkey" PRIMARY KEY using index "tag_entity_pkey";

alter table "public"."test_case_execution" add constraint "PK_90c121f77a78a6580e94b794bce" PRIMARY KEY using index "PK_90c121f77a78a6580e94b794bce";

alter table "public"."test_run" add constraint "PK_011c050f566e9db509a0fadb9b9" PRIMARY KEY using index "PK_011c050f566e9db509a0fadb9b9";

alter table "public"."user" add constraint "PK_ea8f538c94b6e352418254ed6474a81f" PRIMARY KEY using index "PK_ea8f538c94b6e352418254ed6474a81f";

alter table "public"."user_api_keys" add constraint "PK_978fa5caa3468f463dac9d92e69" PRIMARY KEY using index "PK_978fa5caa3468f463dac9d92e69";

alter table "public"."variables" add constraint "variables_pkey" PRIMARY KEY using index "variables_pkey";

alter table "public"."webhook_entity" add constraint "PK_b21ace2e13596ccd87dc9bf4ea6" PRIMARY KEY using index "PK_b21ace2e13596ccd87dc9bf4ea6";

alter table "public"."workflow_dependency" add constraint "PK_52325e34cd7a2f0f67b0f3cad65" PRIMARY KEY using index "PK_52325e34cd7a2f0f67b0f3cad65";

alter table "public"."workflow_entity" add constraint "workflow_entity_pkey" PRIMARY KEY using index "workflow_entity_pkey";

alter table "public"."workflow_history" add constraint "PK_b6572dd6173e4cd06fe79937b58" PRIMARY KEY using index "PK_b6572dd6173e4cd06fe79937b58";

alter table "public"."workflow_publish_history" add constraint "PK_c788f7caf88e91e365c97d6d04a" PRIMARY KEY using index "PK_c788f7caf88e91e365c97d6d04a";

alter table "public"."workflow_statistics" add constraint "pk_workflow_statistics" PRIMARY KEY using index "pk_workflow_statistics";

alter table "public"."workflows_tags" add constraint "pk_workflows_tags" PRIMARY KEY using index "pk_workflows_tags";

alter table "public"."auth_identity" add constraint "auth_identity_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) not valid;

alter table "public"."auth_identity" validate constraint "auth_identity_userId_fkey";

alter table "public"."binary_data" add constraint "CHK_binary_data_sourceType" CHECK ((("sourceType")::text = ANY ((ARRAY['execution'::character varying, 'chat_message_attachment'::character varying])::text[]))) not valid;

alter table "public"."binary_data" validate constraint "CHK_binary_data_sourceType";

alter table "public"."bulbapedia_mechanics" add constraint "bulbapedia_mechanics_resource_type_resource_name_key" UNIQUE using index "bulbapedia_mechanics_resource_type_resource_name_key";

alter table "public"."canonical_league_config" add constraint "canonical_league_config_season_id_fkey" FOREIGN KEY (season_id) REFERENCES public.seasons(id) not valid;

alter table "public"."canonical_league_config" validate constraint "canonical_league_config_season_id_fkey";

alter table "public"."chat_hub_agents" add constraint "FK_441ba2caba11e077ce3fbfa2cd8" FOREIGN KEY ("ownerId") REFERENCES public."user"(id) ON DELETE CASCADE not valid;

alter table "public"."chat_hub_agents" validate constraint "FK_441ba2caba11e077ce3fbfa2cd8";

alter table "public"."chat_hub_agents" add constraint "FK_9c61ad497dcbae499c96a6a78ba" FOREIGN KEY ("credentialId") REFERENCES public.credentials_entity(id) ON DELETE SET NULL not valid;

alter table "public"."chat_hub_agents" validate constraint "FK_9c61ad497dcbae499c96a6a78ba";

alter table "public"."chat_hub_messages" add constraint "FK_1f4998c8a7dec9e00a9ab15550e" FOREIGN KEY ("revisionOfMessageId") REFERENCES public.chat_hub_messages(id) ON DELETE CASCADE not valid;

alter table "public"."chat_hub_messages" validate constraint "FK_1f4998c8a7dec9e00a9ab15550e";

alter table "public"."chat_hub_messages" add constraint "FK_25c9736e7f769f3a005eef4b372" FOREIGN KEY ("retryOfMessageId") REFERENCES public.chat_hub_messages(id) ON DELETE CASCADE not valid;

alter table "public"."chat_hub_messages" validate constraint "FK_25c9736e7f769f3a005eef4b372";

alter table "public"."chat_hub_messages" add constraint "FK_6afb260449dd7a9b85355d4e0c9" FOREIGN KEY ("executionId") REFERENCES public.execution_entity(id) ON DELETE SET NULL not valid;

alter table "public"."chat_hub_messages" validate constraint "FK_6afb260449dd7a9b85355d4e0c9";

alter table "public"."chat_hub_messages" add constraint "FK_acf8926098f063cdbbad8497fd1" FOREIGN KEY ("workflowId") REFERENCES public.workflow_entity(id) ON DELETE SET NULL not valid;

alter table "public"."chat_hub_messages" validate constraint "FK_acf8926098f063cdbbad8497fd1";

alter table "public"."chat_hub_messages" add constraint "FK_chat_hub_messages_agentId" FOREIGN KEY ("agentId") REFERENCES public.chat_hub_agents(id) ON DELETE SET NULL not valid;

alter table "public"."chat_hub_messages" validate constraint "FK_chat_hub_messages_agentId";

alter table "public"."chat_hub_messages" add constraint "FK_e22538eb50a71a17954cd7e076c" FOREIGN KEY ("sessionId") REFERENCES public.chat_hub_sessions(id) ON DELETE CASCADE not valid;

alter table "public"."chat_hub_messages" validate constraint "FK_e22538eb50a71a17954cd7e076c";

alter table "public"."chat_hub_messages" add constraint "FK_e5d1fa722c5a8d38ac204746662" FOREIGN KEY ("previousMessageId") REFERENCES public.chat_hub_messages(id) ON DELETE CASCADE not valid;

alter table "public"."chat_hub_messages" validate constraint "FK_e5d1fa722c5a8d38ac204746662";

alter table "public"."chat_hub_sessions" add constraint "FK_7bc13b4c7e6afbfaf9be326c189" FOREIGN KEY ("credentialId") REFERENCES public.credentials_entity(id) ON DELETE SET NULL not valid;

alter table "public"."chat_hub_sessions" validate constraint "FK_7bc13b4c7e6afbfaf9be326c189";

alter table "public"."chat_hub_sessions" add constraint "FK_9f9293d9f552496c40e0d1a8f80" FOREIGN KEY ("workflowId") REFERENCES public.workflow_entity(id) ON DELETE SET NULL not valid;

alter table "public"."chat_hub_sessions" validate constraint "FK_9f9293d9f552496c40e0d1a8f80";

alter table "public"."chat_hub_sessions" add constraint "FK_chat_hub_sessions_agentId" FOREIGN KEY ("agentId") REFERENCES public.chat_hub_agents(id) ON DELETE SET NULL not valid;

alter table "public"."chat_hub_sessions" validate constraint "FK_chat_hub_sessions_agentId";

alter table "public"."chat_hub_sessions" add constraint "FK_e9ecf8ede7d989fcd18790fe36a" FOREIGN KEY ("ownerId") REFERENCES public."user"(id) ON DELETE CASCADE not valid;

alter table "public"."chat_hub_sessions" validate constraint "FK_e9ecf8ede7d989fcd18790fe36a";

alter table "public"."credentials_entity" add constraint "credentials_entity_resolverId_foreign" FOREIGN KEY ("resolverId") REFERENCES public.dynamic_credential_resolver(id) ON DELETE SET NULL not valid;

alter table "public"."credentials_entity" validate constraint "credentials_entity_resolverId_foreign";

alter table "public"."data_table" add constraint "FK_c2a794257dee48af7c9abf681de" FOREIGN KEY ("projectId") REFERENCES public.project(id) ON DELETE CASCADE not valid;

alter table "public"."data_table" validate constraint "FK_c2a794257dee48af7c9abf681de";

alter table "public"."data_table" add constraint "UQ_b23096ef747281ac944d28e8b0d" UNIQUE using index "UQ_b23096ef747281ac944d28e8b0d";

alter table "public"."data_table_column" add constraint "FK_930b6e8faaf88294cef23484160" FOREIGN KEY ("dataTableId") REFERENCES public.data_table(id) ON DELETE CASCADE not valid;

alter table "public"."data_table_column" validate constraint "FK_930b6e8faaf88294cef23484160";

alter table "public"."data_table_column" add constraint "UQ_8082ec4890f892f0bc77473a123" UNIQUE using index "UQ_8082ec4890f892f0bc77473a123";

alter table "public"."dynamic_credential_entry" add constraint "FK_d57808fe08b77464f6a88a25494" FOREIGN KEY (resolver_id) REFERENCES public.dynamic_credential_resolver(id) ON DELETE CASCADE not valid;

alter table "public"."dynamic_credential_entry" validate constraint "FK_d57808fe08b77464f6a88a25494";

alter table "public"."dynamic_credential_entry" add constraint "FK_e97db563e505ae5f57ca33ef221" FOREIGN KEY (credential_id) REFERENCES public.credentials_entity(id) ON DELETE CASCADE not valid;

alter table "public"."dynamic_credential_entry" validate constraint "FK_e97db563e505ae5f57ca33ef221";

alter table "public"."execution_annotation_tags" add constraint "FK_a3697779b366e131b2bbdae2976" FOREIGN KEY ("tagId") REFERENCES public.annotation_tag_entity(id) ON DELETE CASCADE not valid;

alter table "public"."execution_annotation_tags" validate constraint "FK_a3697779b366e131b2bbdae2976";

alter table "public"."execution_annotation_tags" add constraint "FK_c1519757391996eb06064f0e7c8" FOREIGN KEY ("annotationId") REFERENCES public.execution_annotations(id) ON DELETE CASCADE not valid;

alter table "public"."execution_annotation_tags" validate constraint "FK_c1519757391996eb06064f0e7c8";

alter table "public"."execution_annotations" add constraint "FK_97f863fa83c4786f19565084960" FOREIGN KEY ("executionId") REFERENCES public.execution_entity(id) ON DELETE CASCADE not valid;

alter table "public"."execution_annotations" validate constraint "FK_97f863fa83c4786f19565084960";

alter table "public"."execution_data" add constraint "execution_data_fk" FOREIGN KEY ("executionId") REFERENCES public.execution_entity(id) ON DELETE CASCADE not valid;

alter table "public"."execution_data" validate constraint "execution_data_fk";

alter table "public"."execution_entity" add constraint "fk_execution_entity_workflow_id" FOREIGN KEY ("workflowId") REFERENCES public.workflow_entity(id) ON DELETE CASCADE not valid;

alter table "public"."execution_entity" validate constraint "fk_execution_entity_workflow_id";

alter table "public"."execution_metadata" add constraint "FK_31d0b4c93fb85ced26f6005cda3" FOREIGN KEY ("executionId") REFERENCES public.execution_entity(id) ON DELETE CASCADE not valid;

alter table "public"."execution_metadata" validate constraint "FK_31d0b4c93fb85ced26f6005cda3";

alter table "public"."folder" add constraint "FK_804ea52f6729e3940498bd54d78" FOREIGN KEY ("parentFolderId") REFERENCES public.folder(id) ON DELETE CASCADE not valid;

alter table "public"."folder" validate constraint "FK_804ea52f6729e3940498bd54d78";

alter table "public"."folder" add constraint "FK_a8260b0b36939c6247f385b8221" FOREIGN KEY ("projectId") REFERENCES public.project(id) ON DELETE CASCADE not valid;

alter table "public"."folder" validate constraint "FK_a8260b0b36939c6247f385b8221";

alter table "public"."folder_tag" add constraint "FK_94a60854e06f2897b2e0d39edba" FOREIGN KEY ("folderId") REFERENCES public.folder(id) ON DELETE CASCADE not valid;

alter table "public"."folder_tag" validate constraint "FK_94a60854e06f2897b2e0d39edba";

alter table "public"."folder_tag" add constraint "FK_dc88164176283de80af47621746" FOREIGN KEY ("tagId") REFERENCES public.tag_entity(id) ON DELETE CASCADE not valid;

alter table "public"."folder_tag" validate constraint "FK_dc88164176283de80af47621746";

alter table "public"."insights_by_period" add constraint "FK_6414cfed98daabbfdd61a1cfbc0" FOREIGN KEY ("metaId") REFERENCES public.insights_metadata("metaId") ON DELETE CASCADE not valid;

alter table "public"."insights_by_period" validate constraint "FK_6414cfed98daabbfdd61a1cfbc0";

alter table "public"."insights_metadata" add constraint "FK_1d8ab99d5861c9388d2dc1cf733" FOREIGN KEY ("workflowId") REFERENCES public.workflow_entity(id) ON DELETE SET NULL not valid;

alter table "public"."insights_metadata" validate constraint "FK_1d8ab99d5861c9388d2dc1cf733";

alter table "public"."insights_metadata" add constraint "FK_2375a1eda085adb16b24615b69c" FOREIGN KEY ("projectId") REFERENCES public.project(id) ON DELETE SET NULL not valid;

alter table "public"."insights_metadata" validate constraint "FK_2375a1eda085adb16b24615b69c";

alter table "public"."insights_raw" add constraint "FK_6e2e33741adef2a7c5d66befa4e" FOREIGN KEY ("metaId") REFERENCES public.insights_metadata("metaId") ON DELETE CASCADE not valid;

alter table "public"."insights_raw" validate constraint "FK_6e2e33741adef2a7c5d66befa4e";

alter table "public"."installed_nodes" add constraint "FK_73f857fc5dce682cef8a99c11dbddbc969618951" FOREIGN KEY (package) REFERENCES public.installed_packages("packageName") ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."installed_nodes" validate constraint "FK_73f857fc5dce682cef8a99c11dbddbc969618951";

alter table "public"."oauth_access_tokens" add constraint "FK_7234a36d8e49a1fa85095328845" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE not valid;

alter table "public"."oauth_access_tokens" validate constraint "FK_7234a36d8e49a1fa85095328845";

alter table "public"."oauth_access_tokens" add constraint "FK_78b26968132b7e5e45b75876481" FOREIGN KEY ("clientId") REFERENCES public.oauth_clients(id) ON DELETE CASCADE not valid;

alter table "public"."oauth_access_tokens" validate constraint "FK_78b26968132b7e5e45b75876481";

alter table "public"."oauth_authorization_codes" add constraint "FK_64d965bd072ea24fb6da55468cd" FOREIGN KEY ("clientId") REFERENCES public.oauth_clients(id) ON DELETE CASCADE not valid;

alter table "public"."oauth_authorization_codes" validate constraint "FK_64d965bd072ea24fb6da55468cd";

alter table "public"."oauth_authorization_codes" add constraint "FK_aa8d3560484944c19bdf79ffa16" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE not valid;

alter table "public"."oauth_authorization_codes" validate constraint "FK_aa8d3560484944c19bdf79ffa16";

alter table "public"."oauth_refresh_tokens" add constraint "FK_a699f3ed9fd0c1b19bc2608ac53" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE not valid;

alter table "public"."oauth_refresh_tokens" validate constraint "FK_a699f3ed9fd0c1b19bc2608ac53";

alter table "public"."oauth_refresh_tokens" add constraint "FK_b388696ce4d8be7ffbe8d3e4b69" FOREIGN KEY ("clientId") REFERENCES public.oauth_clients(id) ON DELETE CASCADE not valid;

alter table "public"."oauth_refresh_tokens" validate constraint "FK_b388696ce4d8be7ffbe8d3e4b69";

alter table "public"."oauth_user_consents" add constraint "FK_21e6c3c2d78a097478fae6aaefa" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE not valid;

alter table "public"."oauth_user_consents" validate constraint "FK_21e6c3c2d78a097478fae6aaefa";

alter table "public"."oauth_user_consents" add constraint "FK_a651acea2f6c97f8c4514935486" FOREIGN KEY ("clientId") REFERENCES public.oauth_clients(id) ON DELETE CASCADE not valid;

alter table "public"."oauth_user_consents" validate constraint "FK_a651acea2f6c97f8c4514935486";

alter table "public"."oauth_user_consents" add constraint "UQ_083721d99ce8db4033e2958ebb4" UNIQUE using index "UQ_083721d99ce8db4033e2958ebb4";

alter table "public"."processed_data" add constraint "FK_06a69a7032c97a763c2c7599464" FOREIGN KEY ("workflowId") REFERENCES public.workflow_entity(id) ON DELETE CASCADE not valid;

alter table "public"."processed_data" validate constraint "FK_06a69a7032c97a763c2c7599464";

alter table "public"."project" add constraint "projects_creatorId_foreign" FOREIGN KEY ("creatorId") REFERENCES public."user"(id) ON DELETE SET NULL not valid;

alter table "public"."project" validate constraint "projects_creatorId_foreign";

alter table "public"."project_relation" add constraint "FK_5f0643f6717905a05164090dde7" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE not valid;

alter table "public"."project_relation" validate constraint "FK_5f0643f6717905a05164090dde7";

alter table "public"."project_relation" add constraint "FK_61448d56d61802b5dfde5cdb002" FOREIGN KEY ("projectId") REFERENCES public.project(id) ON DELETE CASCADE not valid;

alter table "public"."project_relation" validate constraint "FK_61448d56d61802b5dfde5cdb002";

alter table "public"."project_relation" add constraint "FK_c6b99592dc96b0d836d7a21db91" FOREIGN KEY (role) REFERENCES public.role(slug) not valid;

alter table "public"."project_relation" validate constraint "FK_c6b99592dc96b0d836d7a21db91";

alter table "public"."role_scope" add constraint "FK_role" FOREIGN KEY ("roleSlug") REFERENCES public.role(slug) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."role_scope" validate constraint "FK_role";

alter table "public"."role_scope" add constraint "FK_scope" FOREIGN KEY ("scopeSlug") REFERENCES public.scope(slug) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."role_scope" validate constraint "FK_scope";

alter table "public"."shared_credentials" add constraint "FK_416f66fc846c7c442970c094ccf" FOREIGN KEY ("credentialsId") REFERENCES public.credentials_entity(id) ON DELETE CASCADE not valid;

alter table "public"."shared_credentials" validate constraint "FK_416f66fc846c7c442970c094ccf";

alter table "public"."shared_credentials" add constraint "FK_812c2852270da1247756e77f5a4" FOREIGN KEY ("projectId") REFERENCES public.project(id) ON DELETE CASCADE not valid;

alter table "public"."shared_credentials" validate constraint "FK_812c2852270da1247756e77f5a4";

alter table "public"."shared_workflow" add constraint "FK_a45ea5f27bcfdc21af9b4188560" FOREIGN KEY ("projectId") REFERENCES public.project(id) ON DELETE CASCADE not valid;

alter table "public"."shared_workflow" validate constraint "FK_a45ea5f27bcfdc21af9b4188560";

alter table "public"."shared_workflow" add constraint "FK_daa206a04983d47d0a9c34649ce" FOREIGN KEY ("workflowId") REFERENCES public.workflow_entity(id) ON DELETE CASCADE not valid;

alter table "public"."shared_workflow" validate constraint "FK_daa206a04983d47d0a9c34649ce";

alter table "public"."smogon_meta_snapshot" add constraint "smogon_meta_snapshot_pokemon_name_format_source_date_key" UNIQUE using index "smogon_meta_snapshot_pokemon_name_format_source_date_key";

alter table "public"."test_case_execution" add constraint "FK_8e4b4774db42f1e6dda3452b2af" FOREIGN KEY ("testRunId") REFERENCES public.test_run(id) ON DELETE CASCADE not valid;

alter table "public"."test_case_execution" validate constraint "FK_8e4b4774db42f1e6dda3452b2af";

alter table "public"."test_case_execution" add constraint "FK_e48965fac35d0f5b9e7f51d8c44" FOREIGN KEY ("executionId") REFERENCES public.execution_entity(id) ON DELETE SET NULL not valid;

alter table "public"."test_case_execution" validate constraint "FK_e48965fac35d0f5b9e7f51d8c44";

alter table "public"."test_run" add constraint "FK_d6870d3b6e4c185d33926f423c8" FOREIGN KEY ("workflowId") REFERENCES public.workflow_entity(id) ON DELETE CASCADE not valid;

alter table "public"."test_run" validate constraint "FK_d6870d3b6e4c185d33926f423c8";

alter table "public"."user" add constraint "FK_eaea92ee7bfb9c1b6cd01505d56" FOREIGN KEY ("roleSlug") REFERENCES public.role(slug) not valid;

alter table "public"."user" validate constraint "FK_eaea92ee7bfb9c1b6cd01505d56";

alter table "public"."user" add constraint "UQ_e12875dfb3b1d92d7d7c5377e2" UNIQUE using index "UQ_e12875dfb3b1d92d7d7c5377e2";

alter table "public"."user_api_keys" add constraint "FK_e131705cbbc8fb589889b02d457" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE not valid;

alter table "public"."user_api_keys" validate constraint "FK_e131705cbbc8fb589889b02d457";

alter table "public"."variables" add constraint "FK_42f6c766f9f9d2edcc15bdd6e9b" FOREIGN KEY ("projectId") REFERENCES public.project(id) ON DELETE CASCADE not valid;

alter table "public"."variables" validate constraint "FK_42f6c766f9f9d2edcc15bdd6e9b";

alter table "public"."webhook_entity" add constraint "fk_webhook_entity_workflow_id" FOREIGN KEY ("workflowId") REFERENCES public.workflow_entity(id) ON DELETE CASCADE not valid;

alter table "public"."webhook_entity" validate constraint "fk_webhook_entity_workflow_id";

alter table "public"."workflow_dependency" add constraint "FK_a4ff2d9b9628ea988fa9e7d0bf8" FOREIGN KEY ("workflowId") REFERENCES public.workflow_entity(id) ON DELETE CASCADE not valid;

alter table "public"."workflow_dependency" validate constraint "FK_a4ff2d9b9628ea988fa9e7d0bf8";

alter table "public"."workflow_entity" add constraint "FK_08d6c67b7f722b0039d9d5ed620" FOREIGN KEY ("activeVersionId") REFERENCES public.workflow_history("versionId") ON DELETE RESTRICT not valid;

alter table "public"."workflow_entity" validate constraint "FK_08d6c67b7f722b0039d9d5ed620";

alter table "public"."workflow_entity" add constraint "fk_workflow_parent_folder" FOREIGN KEY ("parentFolderId") REFERENCES public.folder(id) ON DELETE CASCADE not valid;

alter table "public"."workflow_entity" validate constraint "fk_workflow_parent_folder";

alter table "public"."workflow_history" add constraint "FK_1e31657f5fe46816c34be7c1b4b" FOREIGN KEY ("workflowId") REFERENCES public.workflow_entity(id) ON DELETE CASCADE not valid;

alter table "public"."workflow_history" validate constraint "FK_1e31657f5fe46816c34be7c1b4b";

alter table "public"."workflow_publish_history" add constraint "CHK_workflow_publish_history_event" CHECK (((event)::text = ANY ((ARRAY['activated'::character varying, 'deactivated'::character varying])::text[]))) not valid;

alter table "public"."workflow_publish_history" validate constraint "CHK_workflow_publish_history_event";

alter table "public"."workflow_publish_history" add constraint "FK_6eab5bd9eedabe9c54bd879fc40" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE SET NULL not valid;

alter table "public"."workflow_publish_history" validate constraint "FK_6eab5bd9eedabe9c54bd879fc40";

alter table "public"."workflow_publish_history" add constraint "FK_b4cfbc7556d07f36ca177f5e473" FOREIGN KEY ("versionId") REFERENCES public.workflow_history("versionId") ON DELETE CASCADE not valid;

alter table "public"."workflow_publish_history" validate constraint "FK_b4cfbc7556d07f36ca177f5e473";

alter table "public"."workflow_publish_history" add constraint "FK_c01316f8c2d7101ec4fa9809267" FOREIGN KEY ("workflowId") REFERENCES public.workflow_entity(id) ON DELETE CASCADE not valid;

alter table "public"."workflow_publish_history" validate constraint "FK_c01316f8c2d7101ec4fa9809267";

alter table "public"."workflow_statistics" add constraint "fk_workflow_statistics_workflow_id" FOREIGN KEY ("workflowId") REFERENCES public.workflow_entity(id) ON DELETE CASCADE not valid;

alter table "public"."workflow_statistics" validate constraint "fk_workflow_statistics_workflow_id";

alter table "public"."workflows_tags" add constraint "fk_workflows_tags_tag_id" FOREIGN KEY ("tagId") REFERENCES public.tag_entity(id) ON DELETE CASCADE not valid;

alter table "public"."workflows_tags" validate constraint "fk_workflows_tags_tag_id";

alter table "public"."workflows_tags" add constraint "fk_workflows_tags_workflow_id" FOREIGN KEY ("workflowId") REFERENCES public.workflow_entity(id) ON DELETE CASCADE not valid;

alter table "public"."workflows_tags" validate constraint "fk_workflows_tags_workflow_id";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.increment_workflow_version()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
			BEGIN
				IF NEW."versionCounter" IS NOT DISTINCT FROM OLD."versionCounter" THEN
					NEW."versionCounter" = OLD."versionCounter" + 1;
				END IF;
				RETURN NEW;
			END;
			$function$
;

CREATE OR REPLACE FUNCTION public.mcp_access_token_hook(event jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  client_id text;
  claims jsonb;
BEGIN
  -- Extract client_id from event (if present)
  client_id := event->>'client_id';
  
  -- Get existing claims (or create empty object)
  claims := COALESCE(event->'claims', '{}'::jsonb);
  
  -- Add client_id to claims (if not already present)
  IF client_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{client_id}', to_jsonb(client_id));
  END IF;
  
  -- Add MCP-specific claim to indicate this token is for MCP access
  claims := jsonb_set(claims, '{mcp_access}', to_jsonb(true));
  
  -- Return modified event with updated claims
  RETURN jsonb_set(event, '{claims}', claims);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_bulbapedia_mechanics_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_canonical_league_config_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_smogon_meta_snapshot_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

create or replace view "public"."v_match_team_rows_regular" as  SELECT m.season_id,
    m.id AS match_id,
    m.week,
    COALESCE(m.played_at, m.created_at, now()) AS played_at,
    false AS is_playoffs,
    m.team1_id AS team_id,
    m.team2_id AS opponent_team_id,
    m.team1_score AS kills,
    m.team2_score AS deaths,
    COALESCE(m.differential, (m.team1_score - m.team2_score)) AS differential,
        CASE
            WHEN (m.winner_id = m.team1_id) THEN 1
            ELSE 0
        END AS is_win,
        CASE
            WHEN (m.winner_id = m.team1_id) THEN 0
            ELSE 1
        END AS is_loss
   FROM public.matches m
  WHERE ((m.is_playoff = false) AND (m.status = 'completed'::text))
UNION ALL
 SELECT m.season_id,
    m.id AS match_id,
    m.week,
    COALESCE(m.played_at, m.created_at, now()) AS played_at,
    false AS is_playoffs,
    m.team2_id AS team_id,
    m.team1_id AS opponent_team_id,
    m.team2_score AS kills,
    m.team1_score AS deaths,
    COALESCE((- m.differential), (m.team2_score - m.team1_score)) AS differential,
        CASE
            WHEN (m.winner_id = m.team2_id) THEN 1
            ELSE 0
        END AS is_win,
        CASE
            WHEN (m.winner_id = m.team2_id) THEN 0
            ELSE 1
        END AS is_loss
   FROM public.matches m
  WHERE ((m.is_playoff = false) AND (m.status = 'completed'::text));


create or replace view "public"."v_team_record_regular" as  SELECT t.season_id,
    t.id AS team_id,
    t.name AS team_name,
    t.conference,
    t.division,
    (COALESCE(sum(r.is_win), (0)::bigint))::integer AS wins,
    (COALESCE(sum(r.is_loss), (0)::bigint))::integer AS losses,
    (COALESCE(sum(r.kills), (0)::bigint))::integer AS kills,
    (COALESCE(sum(r.deaths), (0)::bigint))::integer AS deaths,
    (COALESCE(sum(r.differential), (0)::bigint))::integer AS differential
   FROM (public.teams t
     LEFT JOIN public.v_match_team_rows_regular r ON (((r.season_id = t.season_id) AND (r.team_id = t.id))))
  GROUP BY t.season_id, t.id, t.name, t.conference, t.division;


create or replace view "public"."v_active_win_streak_regular" as  WITH ordered AS (
         SELECT r.season_id,
            r.team_id,
            r.match_id,
            r.week,
            r.played_at,
            r.is_win,
            row_number() OVER (PARTITION BY r.season_id, r.team_id ORDER BY r.week DESC, r.played_at DESC, r.match_id DESC) AS rn_desc
           FROM public.v_match_team_rows_regular r
        ), first_loss_pos AS (
         SELECT ordered.season_id,
            ordered.team_id,
            min(ordered.rn_desc) FILTER (WHERE (ordered.is_win = 0)) AS first_nonwin_rn
           FROM ordered
          GROUP BY ordered.season_id, ordered.team_id
        )
 SELECT o.season_id,
    o.team_id,
        CASE
            WHEN (max(o.rn_desc) IS NULL) THEN 0
            WHEN (f.first_nonwin_rn IS NULL) THEN (count(*))::integer
            ELSE (GREATEST((f.first_nonwin_rn - 1), (0)::bigint))::integer
        END AS active_win_streak
   FROM (ordered o
     LEFT JOIN first_loss_pos f ON (((f.season_id = o.season_id) AND (f.team_id = o.team_id))))
  GROUP BY o.season_id, o.team_id, f.first_nonwin_rn;


create or replace view "public"."v_head_to_head_regular" as  SELECT season_id,
    team_id,
    opponent_team_id,
    (sum(is_win))::integer AS h2h_wins,
    (sum(is_loss))::integer AS h2h_losses,
    ((sum(is_win) + sum(is_loss)))::integer AS h2h_games
   FROM public.v_match_team_rows_regular r
  GROUP BY season_id, team_id, opponent_team_id;


create or replace view "public"."v_opponent_winpct_regular" as  SELECT season_id,
    team_id,
    wins,
    losses,
        CASE
            WHEN ((wins + losses) = 0) THEN (0.0)::double precision
            ELSE ((wins)::double precision / ((wins + losses))::double precision)
        END AS win_pct
   FROM public.v_team_record_regular tr;


create or replace view "public"."v_strength_of_schedule_regular" as  WITH games AS (
         SELECT r.season_id,
            r.team_id,
            r.opponent_team_id,
                CASE
                    WHEN (t.division = o_1.division) THEN 1.5
                    WHEN (t.conference = o_1.conference) THEN 1.25
                    ELSE 1.0
                END AS weight
           FROM ((public.v_match_team_rows_regular r
             JOIN public.teams t ON (((t.id = r.team_id) AND (t.season_id = r.season_id))))
             JOIN public.teams o_1 ON (((o_1.id = r.opponent_team_id) AND (o_1.season_id = r.season_id))))
        ), opp AS (
         SELECT v_opponent_winpct_regular.season_id,
            v_opponent_winpct_regular.team_id,
            v_opponent_winpct_regular.win_pct
           FROM public.v_opponent_winpct_regular
        )
 SELECT g.season_id,
    g.team_id,
        CASE
            WHEN (sum(g.weight) = (0)::numeric) THEN (0.0)::double precision
            ELSE (sum(((g.weight)::double precision * o.win_pct)) / (sum(g.weight))::double precision)
        END AS sos
   FROM (games g
     JOIN opp o ON (((o.season_id = g.season_id) AND (o.team_id = g.opponent_team_id))))
  GROUP BY g.season_id, g.team_id;


create or replace view "public"."v_regular_team_rankings" as  WITH base AS (
         SELECT r.season_id,
            r.team_id,
            r.team_name,
            r.conference,
            r.division,
            r.wins,
            r.losses,
            r.differential,
            COALESCE(s.active_win_streak, 0) AS active_win_streak,
            COALESCE(ss.sos, (0.0)::double precision) AS sos
           FROM ((public.v_team_record_regular r
             LEFT JOIN public.v_active_win_streak_regular s ON (((s.season_id = r.season_id) AND (s.team_id = r.team_id))))
             LEFT JOIN public.v_strength_of_schedule_regular ss ON (((ss.season_id = r.season_id) AND (ss.team_id = r.team_id))))
        ), tie_groups AS (
         SELECT base.season_id,
            base.team_id,
            base.team_name,
            base.conference,
            base.division,
            base.wins,
            base.losses,
            base.differential,
            base.active_win_streak,
            base.sos,
            dense_rank() OVER (PARTITION BY base.season_id ORDER BY base.wins DESC, base.losses, base.differential DESC) AS tie_group_id
           FROM base
        ), h2h_within_tie AS (
         SELECT tg_1.season_id,
            tg_1.tie_group_id,
            tg_1.team_id,
            (COALESCE(sum(h.h2h_wins), (0)::bigint))::integer AS tied_h2h_wins,
            (COALESCE(sum(h.h2h_losses), (0)::bigint))::integer AS tied_h2h_losses,
                CASE
                    WHEN ((COALESCE(sum(h.h2h_wins), (0)::bigint) + COALESCE(sum(h.h2h_losses), (0)::bigint)) = 0) THEN (0.0)::double precision
                    ELSE ((COALESCE(sum(h.h2h_wins), (0)::bigint))::double precision / ((COALESCE(sum(h.h2h_wins), (0)::bigint) + COALESCE(sum(h.h2h_losses), (0)::bigint)))::double precision)
                END AS tied_h2h_win_pct
           FROM ((tie_groups tg_1
             LEFT JOIN public.v_head_to_head_regular h ON (((h.season_id = tg_1.season_id) AND (h.team_id = tg_1.team_id))))
             LEFT JOIN tie_groups opp ON (((opp.season_id = tg_1.season_id) AND (opp.tie_group_id = tg_1.tie_group_id) AND (opp.team_id = h.opponent_team_id))))
          GROUP BY tg_1.season_id, tg_1.tie_group_id, tg_1.team_id
        )
 SELECT tg.season_id,
    tg.team_id,
    tg.team_name,
    tg.conference,
    tg.division,
    tg.wins,
    tg.losses,
    tg.differential,
    tg.active_win_streak,
    tg.sos,
    tg.tie_group_id,
    hw.tied_h2h_wins,
    hw.tied_h2h_losses,
    hw.tied_h2h_win_pct,
    row_number() OVER (PARTITION BY tg.season_id ORDER BY tg.wins DESC, tg.losses, tg.differential DESC, hw.tied_h2h_win_pct DESC, tg.active_win_streak DESC, tg.sos DESC, tg.team_name) AS league_rank
   FROM (tie_groups tg
     LEFT JOIN h2h_within_tie hw ON (((hw.season_id = tg.season_id) AND (hw.tie_group_id = tg.tie_group_id) AND (hw.team_id = tg.team_id))));


create or replace view "public"."v_division_winners_regular" as  WITH ranked AS (
         SELECT v_regular_team_rankings.season_id,
            v_regular_team_rankings.team_id,
            v_regular_team_rankings.team_name,
            v_regular_team_rankings.conference,
            v_regular_team_rankings.division,
            v_regular_team_rankings.wins,
            v_regular_team_rankings.losses,
            v_regular_team_rankings.differential,
            v_regular_team_rankings.active_win_streak,
            v_regular_team_rankings.sos,
            v_regular_team_rankings.tie_group_id,
            v_regular_team_rankings.tied_h2h_wins,
            v_regular_team_rankings.tied_h2h_losses,
            v_regular_team_rankings.tied_h2h_win_pct,
            v_regular_team_rankings.league_rank
           FROM public.v_regular_team_rankings
        )
 SELECT DISTINCT ON (season_id, division) season_id,
    division,
    team_id,
    team_name,
    league_rank
   FROM ranked
  ORDER BY season_id, division, league_rank;


create or replace view "public"."v_playoff_seeds_5_12" as  WITH ranked AS (
         SELECT v_regular_team_rankings.season_id,
            v_regular_team_rankings.team_id,
            v_regular_team_rankings.team_name,
            v_regular_team_rankings.conference,
            v_regular_team_rankings.division,
            v_regular_team_rankings.wins,
            v_regular_team_rankings.losses,
            v_regular_team_rankings.differential,
            v_regular_team_rankings.active_win_streak,
            v_regular_team_rankings.sos,
            v_regular_team_rankings.tie_group_id,
            v_regular_team_rankings.tied_h2h_wins,
            v_regular_team_rankings.tied_h2h_losses,
            v_regular_team_rankings.tied_h2h_win_pct,
            v_regular_team_rankings.league_rank
           FROM public.v_regular_team_rankings
        ), winners AS (
         SELECT v_division_winners_regular.season_id,
            v_division_winners_regular.team_id
           FROM public.v_division_winners_regular
        ), remaining AS (
         SELECT r.season_id,
            r.team_id,
            r.team_name,
            r.conference,
            r.division,
            r.wins,
            r.losses,
            r.differential,
            r.active_win_streak,
            r.sos,
            r.tie_group_id,
            r.tied_h2h_wins,
            r.tied_h2h_losses,
            r.tied_h2h_win_pct,
            r.league_rank
           FROM (ranked r
             LEFT JOIN winners w ON (((w.season_id = r.season_id) AND (w.team_id = r.team_id))))
          WHERE (w.team_id IS NULL)
        ), seeded AS (
         SELECT remaining.season_id,
            remaining.team_id,
            remaining.team_name,
            remaining.conference,
            remaining.division,
            remaining.wins,
            remaining.losses,
            remaining.differential,
            remaining.active_win_streak,
            remaining.sos,
            remaining.tie_group_id,
            remaining.tied_h2h_wins,
            remaining.tied_h2h_losses,
            remaining.tied_h2h_win_pct,
            remaining.league_rank,
            row_number() OVER (PARTITION BY remaining.season_id ORDER BY remaining.league_rank) AS seed_in_remaining
           FROM remaining
        )
 SELECT season_id,
    team_id,
    team_name,
    (seed_in_remaining + 4) AS seed
   FROM seeded
  WHERE ((seed_in_remaining >= 1) AND (seed_in_remaining <= 8));


create or replace view "public"."v_playoff_seeds_top4" as  WITH winners AS (
         SELECT r.season_id,
            r.team_id,
            r.team_name,
            r.conference,
            r.division,
            r.wins,
            r.losses,
            r.differential,
            r.active_win_streak,
            r.sos,
            r.tie_group_id,
            r.tied_h2h_wins,
            r.tied_h2h_losses,
            r.tied_h2h_win_pct,
            r.league_rank
           FROM (public.v_regular_team_rankings r
             JOIN public.v_division_winners_regular w ON (((w.season_id = r.season_id) AND (w.team_id = r.team_id))))
        ), seeded AS (
         SELECT winners.season_id,
            winners.team_id,
            winners.team_name,
            winners.conference,
            winners.division,
            winners.wins,
            winners.losses,
            winners.differential,
            winners.active_win_streak,
            winners.sos,
            winners.tie_group_id,
            winners.tied_h2h_wins,
            winners.tied_h2h_losses,
            winners.tied_h2h_win_pct,
            winners.league_rank,
            row_number() OVER (PARTITION BY winners.season_id ORDER BY winners.wins DESC, winners.losses, winners.differential DESC, winners.tied_h2h_win_pct DESC, winners.active_win_streak DESC, winners.sos DESC, winners.team_name) AS seed
           FROM winners
        )
 SELECT season_id,
    team_id,
    team_name,
    conference,
    division,
    wins,
    losses,
    differential,
    active_win_streak,
    sos,
    tie_group_id,
    tied_h2h_wins,
    tied_h2h_losses,
    tied_h2h_win_pct,
    league_rank,
    seed
   FROM seeded
  WHERE ((seed >= 1) AND (seed <= 4));


grant delete on table "public"."annotation_tag_entity" to "anon";

grant insert on table "public"."annotation_tag_entity" to "anon";

grant references on table "public"."annotation_tag_entity" to "anon";

grant select on table "public"."annotation_tag_entity" to "anon";

grant trigger on table "public"."annotation_tag_entity" to "anon";

grant truncate on table "public"."annotation_tag_entity" to "anon";

grant update on table "public"."annotation_tag_entity" to "anon";

grant delete on table "public"."annotation_tag_entity" to "authenticated";

grant insert on table "public"."annotation_tag_entity" to "authenticated";

grant references on table "public"."annotation_tag_entity" to "authenticated";

grant select on table "public"."annotation_tag_entity" to "authenticated";

grant trigger on table "public"."annotation_tag_entity" to "authenticated";

grant truncate on table "public"."annotation_tag_entity" to "authenticated";

grant update on table "public"."annotation_tag_entity" to "authenticated";

grant delete on table "public"."annotation_tag_entity" to "service_role";

grant insert on table "public"."annotation_tag_entity" to "service_role";

grant references on table "public"."annotation_tag_entity" to "service_role";

grant select on table "public"."annotation_tag_entity" to "service_role";

grant trigger on table "public"."annotation_tag_entity" to "service_role";

grant truncate on table "public"."annotation_tag_entity" to "service_role";

grant update on table "public"."annotation_tag_entity" to "service_role";

grant delete on table "public"."auth" to "anon";

grant insert on table "public"."auth" to "anon";

grant references on table "public"."auth" to "anon";

grant select on table "public"."auth" to "anon";

grant trigger on table "public"."auth" to "anon";

grant truncate on table "public"."auth" to "anon";

grant update on table "public"."auth" to "anon";

grant delete on table "public"."auth" to "authenticated";

grant insert on table "public"."auth" to "authenticated";

grant references on table "public"."auth" to "authenticated";

grant select on table "public"."auth" to "authenticated";

grant trigger on table "public"."auth" to "authenticated";

grant truncate on table "public"."auth" to "authenticated";

grant update on table "public"."auth" to "authenticated";

grant delete on table "public"."auth" to "service_role";

grant insert on table "public"."auth" to "service_role";

grant references on table "public"."auth" to "service_role";

grant select on table "public"."auth" to "service_role";

grant trigger on table "public"."auth" to "service_role";

grant truncate on table "public"."auth" to "service_role";

grant update on table "public"."auth" to "service_role";

grant delete on table "public"."auth_identity" to "anon";

grant insert on table "public"."auth_identity" to "anon";

grant references on table "public"."auth_identity" to "anon";

grant select on table "public"."auth_identity" to "anon";

grant trigger on table "public"."auth_identity" to "anon";

grant truncate on table "public"."auth_identity" to "anon";

grant update on table "public"."auth_identity" to "anon";

grant delete on table "public"."auth_identity" to "authenticated";

grant insert on table "public"."auth_identity" to "authenticated";

grant references on table "public"."auth_identity" to "authenticated";

grant select on table "public"."auth_identity" to "authenticated";

grant trigger on table "public"."auth_identity" to "authenticated";

grant truncate on table "public"."auth_identity" to "authenticated";

grant update on table "public"."auth_identity" to "authenticated";

grant delete on table "public"."auth_identity" to "service_role";

grant insert on table "public"."auth_identity" to "service_role";

grant references on table "public"."auth_identity" to "service_role";

grant select on table "public"."auth_identity" to "service_role";

grant trigger on table "public"."auth_identity" to "service_role";

grant truncate on table "public"."auth_identity" to "service_role";

grant update on table "public"."auth_identity" to "service_role";

grant delete on table "public"."auth_provider_sync_history" to "anon";

grant insert on table "public"."auth_provider_sync_history" to "anon";

grant references on table "public"."auth_provider_sync_history" to "anon";

grant select on table "public"."auth_provider_sync_history" to "anon";

grant trigger on table "public"."auth_provider_sync_history" to "anon";

grant truncate on table "public"."auth_provider_sync_history" to "anon";

grant update on table "public"."auth_provider_sync_history" to "anon";

grant delete on table "public"."auth_provider_sync_history" to "authenticated";

grant insert on table "public"."auth_provider_sync_history" to "authenticated";

grant references on table "public"."auth_provider_sync_history" to "authenticated";

grant select on table "public"."auth_provider_sync_history" to "authenticated";

grant trigger on table "public"."auth_provider_sync_history" to "authenticated";

grant truncate on table "public"."auth_provider_sync_history" to "authenticated";

grant update on table "public"."auth_provider_sync_history" to "authenticated";

grant delete on table "public"."auth_provider_sync_history" to "service_role";

grant insert on table "public"."auth_provider_sync_history" to "service_role";

grant references on table "public"."auth_provider_sync_history" to "service_role";

grant select on table "public"."auth_provider_sync_history" to "service_role";

grant trigger on table "public"."auth_provider_sync_history" to "service_role";

grant truncate on table "public"."auth_provider_sync_history" to "service_role";

grant update on table "public"."auth_provider_sync_history" to "service_role";

grant delete on table "public"."binary_data" to "anon";

grant insert on table "public"."binary_data" to "anon";

grant references on table "public"."binary_data" to "anon";

grant select on table "public"."binary_data" to "anon";

grant trigger on table "public"."binary_data" to "anon";

grant truncate on table "public"."binary_data" to "anon";

grant update on table "public"."binary_data" to "anon";

grant delete on table "public"."binary_data" to "authenticated";

grant insert on table "public"."binary_data" to "authenticated";

grant references on table "public"."binary_data" to "authenticated";

grant select on table "public"."binary_data" to "authenticated";

grant trigger on table "public"."binary_data" to "authenticated";

grant truncate on table "public"."binary_data" to "authenticated";

grant update on table "public"."binary_data" to "authenticated";

grant delete on table "public"."binary_data" to "service_role";

grant insert on table "public"."binary_data" to "service_role";

grant references on table "public"."binary_data" to "service_role";

grant select on table "public"."binary_data" to "service_role";

grant trigger on table "public"."binary_data" to "service_role";

grant truncate on table "public"."binary_data" to "service_role";

grant update on table "public"."binary_data" to "service_role";

grant delete on table "public"."bulbapedia_mechanics" to "anon";

grant insert on table "public"."bulbapedia_mechanics" to "anon";

grant references on table "public"."bulbapedia_mechanics" to "anon";

grant select on table "public"."bulbapedia_mechanics" to "anon";

grant trigger on table "public"."bulbapedia_mechanics" to "anon";

grant truncate on table "public"."bulbapedia_mechanics" to "anon";

grant update on table "public"."bulbapedia_mechanics" to "anon";

grant delete on table "public"."bulbapedia_mechanics" to "authenticated";

grant insert on table "public"."bulbapedia_mechanics" to "authenticated";

grant references on table "public"."bulbapedia_mechanics" to "authenticated";

grant select on table "public"."bulbapedia_mechanics" to "authenticated";

grant trigger on table "public"."bulbapedia_mechanics" to "authenticated";

grant truncate on table "public"."bulbapedia_mechanics" to "authenticated";

grant update on table "public"."bulbapedia_mechanics" to "authenticated";

grant delete on table "public"."bulbapedia_mechanics" to "service_role";

grant insert on table "public"."bulbapedia_mechanics" to "service_role";

grant references on table "public"."bulbapedia_mechanics" to "service_role";

grant select on table "public"."bulbapedia_mechanics" to "service_role";

grant trigger on table "public"."bulbapedia_mechanics" to "service_role";

grant truncate on table "public"."bulbapedia_mechanics" to "service_role";

grant update on table "public"."bulbapedia_mechanics" to "service_role";

grant delete on table "public"."canonical_league_config" to "anon";

grant insert on table "public"."canonical_league_config" to "anon";

grant references on table "public"."canonical_league_config" to "anon";

grant select on table "public"."canonical_league_config" to "anon";

grant trigger on table "public"."canonical_league_config" to "anon";

grant truncate on table "public"."canonical_league_config" to "anon";

grant update on table "public"."canonical_league_config" to "anon";

grant delete on table "public"."canonical_league_config" to "authenticated";

grant insert on table "public"."canonical_league_config" to "authenticated";

grant references on table "public"."canonical_league_config" to "authenticated";

grant select on table "public"."canonical_league_config" to "authenticated";

grant trigger on table "public"."canonical_league_config" to "authenticated";

grant truncate on table "public"."canonical_league_config" to "authenticated";

grant update on table "public"."canonical_league_config" to "authenticated";

grant delete on table "public"."canonical_league_config" to "service_role";

grant insert on table "public"."canonical_league_config" to "service_role";

grant references on table "public"."canonical_league_config" to "service_role";

grant select on table "public"."canonical_league_config" to "service_role";

grant trigger on table "public"."canonical_league_config" to "service_role";

grant truncate on table "public"."canonical_league_config" to "service_role";

grant update on table "public"."canonical_league_config" to "service_role";

grant delete on table "public"."chat" to "anon";

grant insert on table "public"."chat" to "anon";

grant references on table "public"."chat" to "anon";

grant select on table "public"."chat" to "anon";

grant trigger on table "public"."chat" to "anon";

grant truncate on table "public"."chat" to "anon";

grant update on table "public"."chat" to "anon";

grant delete on table "public"."chat" to "authenticated";

grant insert on table "public"."chat" to "authenticated";

grant references on table "public"."chat" to "authenticated";

grant select on table "public"."chat" to "authenticated";

grant trigger on table "public"."chat" to "authenticated";

grant truncate on table "public"."chat" to "authenticated";

grant update on table "public"."chat" to "authenticated";

grant delete on table "public"."chat" to "service_role";

grant insert on table "public"."chat" to "service_role";

grant references on table "public"."chat" to "service_role";

grant select on table "public"."chat" to "service_role";

grant trigger on table "public"."chat" to "service_role";

grant truncate on table "public"."chat" to "service_role";

grant update on table "public"."chat" to "service_role";

grant delete on table "public"."chat_hub_agents" to "anon";

grant insert on table "public"."chat_hub_agents" to "anon";

grant references on table "public"."chat_hub_agents" to "anon";

grant select on table "public"."chat_hub_agents" to "anon";

grant trigger on table "public"."chat_hub_agents" to "anon";

grant truncate on table "public"."chat_hub_agents" to "anon";

grant update on table "public"."chat_hub_agents" to "anon";

grant delete on table "public"."chat_hub_agents" to "authenticated";

grant insert on table "public"."chat_hub_agents" to "authenticated";

grant references on table "public"."chat_hub_agents" to "authenticated";

grant select on table "public"."chat_hub_agents" to "authenticated";

grant trigger on table "public"."chat_hub_agents" to "authenticated";

grant truncate on table "public"."chat_hub_agents" to "authenticated";

grant update on table "public"."chat_hub_agents" to "authenticated";

grant delete on table "public"."chat_hub_agents" to "service_role";

grant insert on table "public"."chat_hub_agents" to "service_role";

grant references on table "public"."chat_hub_agents" to "service_role";

grant select on table "public"."chat_hub_agents" to "service_role";

grant trigger on table "public"."chat_hub_agents" to "service_role";

grant truncate on table "public"."chat_hub_agents" to "service_role";

grant update on table "public"."chat_hub_agents" to "service_role";

grant delete on table "public"."chat_hub_messages" to "anon";

grant insert on table "public"."chat_hub_messages" to "anon";

grant references on table "public"."chat_hub_messages" to "anon";

grant select on table "public"."chat_hub_messages" to "anon";

grant trigger on table "public"."chat_hub_messages" to "anon";

grant truncate on table "public"."chat_hub_messages" to "anon";

grant update on table "public"."chat_hub_messages" to "anon";

grant delete on table "public"."chat_hub_messages" to "authenticated";

grant insert on table "public"."chat_hub_messages" to "authenticated";

grant references on table "public"."chat_hub_messages" to "authenticated";

grant select on table "public"."chat_hub_messages" to "authenticated";

grant trigger on table "public"."chat_hub_messages" to "authenticated";

grant truncate on table "public"."chat_hub_messages" to "authenticated";

grant update on table "public"."chat_hub_messages" to "authenticated";

grant delete on table "public"."chat_hub_messages" to "service_role";

grant insert on table "public"."chat_hub_messages" to "service_role";

grant references on table "public"."chat_hub_messages" to "service_role";

grant select on table "public"."chat_hub_messages" to "service_role";

grant trigger on table "public"."chat_hub_messages" to "service_role";

grant truncate on table "public"."chat_hub_messages" to "service_role";

grant update on table "public"."chat_hub_messages" to "service_role";

grant delete on table "public"."chat_hub_sessions" to "anon";

grant insert on table "public"."chat_hub_sessions" to "anon";

grant references on table "public"."chat_hub_sessions" to "anon";

grant select on table "public"."chat_hub_sessions" to "anon";

grant trigger on table "public"."chat_hub_sessions" to "anon";

grant truncate on table "public"."chat_hub_sessions" to "anon";

grant update on table "public"."chat_hub_sessions" to "anon";

grant delete on table "public"."chat_hub_sessions" to "authenticated";

grant insert on table "public"."chat_hub_sessions" to "authenticated";

grant references on table "public"."chat_hub_sessions" to "authenticated";

grant select on table "public"."chat_hub_sessions" to "authenticated";

grant trigger on table "public"."chat_hub_sessions" to "authenticated";

grant truncate on table "public"."chat_hub_sessions" to "authenticated";

grant update on table "public"."chat_hub_sessions" to "authenticated";

grant delete on table "public"."chat_hub_sessions" to "service_role";

grant insert on table "public"."chat_hub_sessions" to "service_role";

grant references on table "public"."chat_hub_sessions" to "service_role";

grant select on table "public"."chat_hub_sessions" to "service_role";

grant trigger on table "public"."chat_hub_sessions" to "service_role";

grant truncate on table "public"."chat_hub_sessions" to "service_role";

grant update on table "public"."chat_hub_sessions" to "service_role";

grant delete on table "public"."chatidtag" to "anon";

grant insert on table "public"."chatidtag" to "anon";

grant references on table "public"."chatidtag" to "anon";

grant select on table "public"."chatidtag" to "anon";

grant trigger on table "public"."chatidtag" to "anon";

grant truncate on table "public"."chatidtag" to "anon";

grant update on table "public"."chatidtag" to "anon";

grant delete on table "public"."chatidtag" to "authenticated";

grant insert on table "public"."chatidtag" to "authenticated";

grant references on table "public"."chatidtag" to "authenticated";

grant select on table "public"."chatidtag" to "authenticated";

grant trigger on table "public"."chatidtag" to "authenticated";

grant truncate on table "public"."chatidtag" to "authenticated";

grant update on table "public"."chatidtag" to "authenticated";

grant delete on table "public"."chatidtag" to "service_role";

grant insert on table "public"."chatidtag" to "service_role";

grant references on table "public"."chatidtag" to "service_role";

grant select on table "public"."chatidtag" to "service_role";

grant trigger on table "public"."chatidtag" to "service_role";

grant truncate on table "public"."chatidtag" to "service_role";

grant update on table "public"."chatidtag" to "service_role";

grant delete on table "public"."credentials_entity" to "anon";

grant insert on table "public"."credentials_entity" to "anon";

grant references on table "public"."credentials_entity" to "anon";

grant select on table "public"."credentials_entity" to "anon";

grant trigger on table "public"."credentials_entity" to "anon";

grant truncate on table "public"."credentials_entity" to "anon";

grant update on table "public"."credentials_entity" to "anon";

grant delete on table "public"."credentials_entity" to "authenticated";

grant insert on table "public"."credentials_entity" to "authenticated";

grant references on table "public"."credentials_entity" to "authenticated";

grant select on table "public"."credentials_entity" to "authenticated";

grant trigger on table "public"."credentials_entity" to "authenticated";

grant truncate on table "public"."credentials_entity" to "authenticated";

grant update on table "public"."credentials_entity" to "authenticated";

grant delete on table "public"."credentials_entity" to "service_role";

grant insert on table "public"."credentials_entity" to "service_role";

grant references on table "public"."credentials_entity" to "service_role";

grant select on table "public"."credentials_entity" to "service_role";

grant trigger on table "public"."credentials_entity" to "service_role";

grant truncate on table "public"."credentials_entity" to "service_role";

grant update on table "public"."credentials_entity" to "service_role";

grant delete on table "public"."data_table" to "anon";

grant insert on table "public"."data_table" to "anon";

grant references on table "public"."data_table" to "anon";

grant select on table "public"."data_table" to "anon";

grant trigger on table "public"."data_table" to "anon";

grant truncate on table "public"."data_table" to "anon";

grant update on table "public"."data_table" to "anon";

grant delete on table "public"."data_table" to "authenticated";

grant insert on table "public"."data_table" to "authenticated";

grant references on table "public"."data_table" to "authenticated";

grant select on table "public"."data_table" to "authenticated";

grant trigger on table "public"."data_table" to "authenticated";

grant truncate on table "public"."data_table" to "authenticated";

grant update on table "public"."data_table" to "authenticated";

grant delete on table "public"."data_table" to "service_role";

grant insert on table "public"."data_table" to "service_role";

grant references on table "public"."data_table" to "service_role";

grant select on table "public"."data_table" to "service_role";

grant trigger on table "public"."data_table" to "service_role";

grant truncate on table "public"."data_table" to "service_role";

grant update on table "public"."data_table" to "service_role";

grant delete on table "public"."data_table_column" to "anon";

grant insert on table "public"."data_table_column" to "anon";

grant references on table "public"."data_table_column" to "anon";

grant select on table "public"."data_table_column" to "anon";

grant trigger on table "public"."data_table_column" to "anon";

grant truncate on table "public"."data_table_column" to "anon";

grant update on table "public"."data_table_column" to "anon";

grant delete on table "public"."data_table_column" to "authenticated";

grant insert on table "public"."data_table_column" to "authenticated";

grant references on table "public"."data_table_column" to "authenticated";

grant select on table "public"."data_table_column" to "authenticated";

grant trigger on table "public"."data_table_column" to "authenticated";

grant truncate on table "public"."data_table_column" to "authenticated";

grant update on table "public"."data_table_column" to "authenticated";

grant delete on table "public"."data_table_column" to "service_role";

grant insert on table "public"."data_table_column" to "service_role";

grant references on table "public"."data_table_column" to "service_role";

grant select on table "public"."data_table_column" to "service_role";

grant trigger on table "public"."data_table_column" to "service_role";

grant truncate on table "public"."data_table_column" to "service_role";

grant update on table "public"."data_table_column" to "service_role";

grant delete on table "public"."document" to "anon";

grant insert on table "public"."document" to "anon";

grant references on table "public"."document" to "anon";

grant select on table "public"."document" to "anon";

grant trigger on table "public"."document" to "anon";

grant truncate on table "public"."document" to "anon";

grant update on table "public"."document" to "anon";

grant delete on table "public"."document" to "authenticated";

grant insert on table "public"."document" to "authenticated";

grant references on table "public"."document" to "authenticated";

grant select on table "public"."document" to "authenticated";

grant trigger on table "public"."document" to "authenticated";

grant truncate on table "public"."document" to "authenticated";

grant update on table "public"."document" to "authenticated";

grant delete on table "public"."document" to "service_role";

grant insert on table "public"."document" to "service_role";

grant references on table "public"."document" to "service_role";

grant select on table "public"."document" to "service_role";

grant trigger on table "public"."document" to "service_role";

grant truncate on table "public"."document" to "service_role";

grant update on table "public"."document" to "service_role";

grant delete on table "public"."dynamic_credential_entry" to "anon";

grant insert on table "public"."dynamic_credential_entry" to "anon";

grant references on table "public"."dynamic_credential_entry" to "anon";

grant select on table "public"."dynamic_credential_entry" to "anon";

grant trigger on table "public"."dynamic_credential_entry" to "anon";

grant truncate on table "public"."dynamic_credential_entry" to "anon";

grant update on table "public"."dynamic_credential_entry" to "anon";

grant delete on table "public"."dynamic_credential_entry" to "authenticated";

grant insert on table "public"."dynamic_credential_entry" to "authenticated";

grant references on table "public"."dynamic_credential_entry" to "authenticated";

grant select on table "public"."dynamic_credential_entry" to "authenticated";

grant trigger on table "public"."dynamic_credential_entry" to "authenticated";

grant truncate on table "public"."dynamic_credential_entry" to "authenticated";

grant update on table "public"."dynamic_credential_entry" to "authenticated";

grant delete on table "public"."dynamic_credential_entry" to "service_role";

grant insert on table "public"."dynamic_credential_entry" to "service_role";

grant references on table "public"."dynamic_credential_entry" to "service_role";

grant select on table "public"."dynamic_credential_entry" to "service_role";

grant trigger on table "public"."dynamic_credential_entry" to "service_role";

grant truncate on table "public"."dynamic_credential_entry" to "service_role";

grant update on table "public"."dynamic_credential_entry" to "service_role";

grant delete on table "public"."dynamic_credential_resolver" to "anon";

grant insert on table "public"."dynamic_credential_resolver" to "anon";

grant references on table "public"."dynamic_credential_resolver" to "anon";

grant select on table "public"."dynamic_credential_resolver" to "anon";

grant trigger on table "public"."dynamic_credential_resolver" to "anon";

grant truncate on table "public"."dynamic_credential_resolver" to "anon";

grant update on table "public"."dynamic_credential_resolver" to "anon";

grant delete on table "public"."dynamic_credential_resolver" to "authenticated";

grant insert on table "public"."dynamic_credential_resolver" to "authenticated";

grant references on table "public"."dynamic_credential_resolver" to "authenticated";

grant select on table "public"."dynamic_credential_resolver" to "authenticated";

grant trigger on table "public"."dynamic_credential_resolver" to "authenticated";

grant truncate on table "public"."dynamic_credential_resolver" to "authenticated";

grant update on table "public"."dynamic_credential_resolver" to "authenticated";

grant delete on table "public"."dynamic_credential_resolver" to "service_role";

grant insert on table "public"."dynamic_credential_resolver" to "service_role";

grant references on table "public"."dynamic_credential_resolver" to "service_role";

grant select on table "public"."dynamic_credential_resolver" to "service_role";

grant trigger on table "public"."dynamic_credential_resolver" to "service_role";

grant truncate on table "public"."dynamic_credential_resolver" to "service_role";

grant update on table "public"."dynamic_credential_resolver" to "service_role";

grant delete on table "public"."event_destinations" to "anon";

grant insert on table "public"."event_destinations" to "anon";

grant references on table "public"."event_destinations" to "anon";

grant select on table "public"."event_destinations" to "anon";

grant trigger on table "public"."event_destinations" to "anon";

grant truncate on table "public"."event_destinations" to "anon";

grant update on table "public"."event_destinations" to "anon";

grant delete on table "public"."event_destinations" to "authenticated";

grant insert on table "public"."event_destinations" to "authenticated";

grant references on table "public"."event_destinations" to "authenticated";

grant select on table "public"."event_destinations" to "authenticated";

grant trigger on table "public"."event_destinations" to "authenticated";

grant truncate on table "public"."event_destinations" to "authenticated";

grant update on table "public"."event_destinations" to "authenticated";

grant delete on table "public"."event_destinations" to "service_role";

grant insert on table "public"."event_destinations" to "service_role";

grant references on table "public"."event_destinations" to "service_role";

grant select on table "public"."event_destinations" to "service_role";

grant trigger on table "public"."event_destinations" to "service_role";

grant truncate on table "public"."event_destinations" to "service_role";

grant update on table "public"."event_destinations" to "service_role";

grant delete on table "public"."execution_annotation_tags" to "anon";

grant insert on table "public"."execution_annotation_tags" to "anon";

grant references on table "public"."execution_annotation_tags" to "anon";

grant select on table "public"."execution_annotation_tags" to "anon";

grant trigger on table "public"."execution_annotation_tags" to "anon";

grant truncate on table "public"."execution_annotation_tags" to "anon";

grant update on table "public"."execution_annotation_tags" to "anon";

grant delete on table "public"."execution_annotation_tags" to "authenticated";

grant insert on table "public"."execution_annotation_tags" to "authenticated";

grant references on table "public"."execution_annotation_tags" to "authenticated";

grant select on table "public"."execution_annotation_tags" to "authenticated";

grant trigger on table "public"."execution_annotation_tags" to "authenticated";

grant truncate on table "public"."execution_annotation_tags" to "authenticated";

grant update on table "public"."execution_annotation_tags" to "authenticated";

grant delete on table "public"."execution_annotation_tags" to "service_role";

grant insert on table "public"."execution_annotation_tags" to "service_role";

grant references on table "public"."execution_annotation_tags" to "service_role";

grant select on table "public"."execution_annotation_tags" to "service_role";

grant trigger on table "public"."execution_annotation_tags" to "service_role";

grant truncate on table "public"."execution_annotation_tags" to "service_role";

grant update on table "public"."execution_annotation_tags" to "service_role";

grant delete on table "public"."execution_annotations" to "anon";

grant insert on table "public"."execution_annotations" to "anon";

grant references on table "public"."execution_annotations" to "anon";

grant select on table "public"."execution_annotations" to "anon";

grant trigger on table "public"."execution_annotations" to "anon";

grant truncate on table "public"."execution_annotations" to "anon";

grant update on table "public"."execution_annotations" to "anon";

grant delete on table "public"."execution_annotations" to "authenticated";

grant insert on table "public"."execution_annotations" to "authenticated";

grant references on table "public"."execution_annotations" to "authenticated";

grant select on table "public"."execution_annotations" to "authenticated";

grant trigger on table "public"."execution_annotations" to "authenticated";

grant truncate on table "public"."execution_annotations" to "authenticated";

grant update on table "public"."execution_annotations" to "authenticated";

grant delete on table "public"."execution_annotations" to "service_role";

grant insert on table "public"."execution_annotations" to "service_role";

grant references on table "public"."execution_annotations" to "service_role";

grant select on table "public"."execution_annotations" to "service_role";

grant trigger on table "public"."execution_annotations" to "service_role";

grant truncate on table "public"."execution_annotations" to "service_role";

grant update on table "public"."execution_annotations" to "service_role";

grant delete on table "public"."execution_data" to "anon";

grant insert on table "public"."execution_data" to "anon";

grant references on table "public"."execution_data" to "anon";

grant select on table "public"."execution_data" to "anon";

grant trigger on table "public"."execution_data" to "anon";

grant truncate on table "public"."execution_data" to "anon";

grant update on table "public"."execution_data" to "anon";

grant delete on table "public"."execution_data" to "authenticated";

grant insert on table "public"."execution_data" to "authenticated";

grant references on table "public"."execution_data" to "authenticated";

grant select on table "public"."execution_data" to "authenticated";

grant trigger on table "public"."execution_data" to "authenticated";

grant truncate on table "public"."execution_data" to "authenticated";

grant update on table "public"."execution_data" to "authenticated";

grant delete on table "public"."execution_data" to "service_role";

grant insert on table "public"."execution_data" to "service_role";

grant references on table "public"."execution_data" to "service_role";

grant select on table "public"."execution_data" to "service_role";

grant trigger on table "public"."execution_data" to "service_role";

grant truncate on table "public"."execution_data" to "service_role";

grant update on table "public"."execution_data" to "service_role";

grant delete on table "public"."execution_entity" to "anon";

grant insert on table "public"."execution_entity" to "anon";

grant references on table "public"."execution_entity" to "anon";

grant select on table "public"."execution_entity" to "anon";

grant trigger on table "public"."execution_entity" to "anon";

grant truncate on table "public"."execution_entity" to "anon";

grant update on table "public"."execution_entity" to "anon";

grant delete on table "public"."execution_entity" to "authenticated";

grant insert on table "public"."execution_entity" to "authenticated";

grant references on table "public"."execution_entity" to "authenticated";

grant select on table "public"."execution_entity" to "authenticated";

grant trigger on table "public"."execution_entity" to "authenticated";

grant truncate on table "public"."execution_entity" to "authenticated";

grant update on table "public"."execution_entity" to "authenticated";

grant delete on table "public"."execution_entity" to "service_role";

grant insert on table "public"."execution_entity" to "service_role";

grant references on table "public"."execution_entity" to "service_role";

grant select on table "public"."execution_entity" to "service_role";

grant trigger on table "public"."execution_entity" to "service_role";

grant truncate on table "public"."execution_entity" to "service_role";

grant update on table "public"."execution_entity" to "service_role";

grant delete on table "public"."execution_metadata" to "anon";

grant insert on table "public"."execution_metadata" to "anon";

grant references on table "public"."execution_metadata" to "anon";

grant select on table "public"."execution_metadata" to "anon";

grant trigger on table "public"."execution_metadata" to "anon";

grant truncate on table "public"."execution_metadata" to "anon";

grant update on table "public"."execution_metadata" to "anon";

grant delete on table "public"."execution_metadata" to "authenticated";

grant insert on table "public"."execution_metadata" to "authenticated";

grant references on table "public"."execution_metadata" to "authenticated";

grant select on table "public"."execution_metadata" to "authenticated";

grant trigger on table "public"."execution_metadata" to "authenticated";

grant truncate on table "public"."execution_metadata" to "authenticated";

grant update on table "public"."execution_metadata" to "authenticated";

grant delete on table "public"."execution_metadata" to "service_role";

grant insert on table "public"."execution_metadata" to "service_role";

grant references on table "public"."execution_metadata" to "service_role";

grant select on table "public"."execution_metadata" to "service_role";

grant trigger on table "public"."execution_metadata" to "service_role";

grant truncate on table "public"."execution_metadata" to "service_role";

grant update on table "public"."execution_metadata" to "service_role";

grant delete on table "public"."file" to "anon";

grant insert on table "public"."file" to "anon";

grant references on table "public"."file" to "anon";

grant select on table "public"."file" to "anon";

grant trigger on table "public"."file" to "anon";

grant truncate on table "public"."file" to "anon";

grant update on table "public"."file" to "anon";

grant delete on table "public"."file" to "authenticated";

grant insert on table "public"."file" to "authenticated";

grant references on table "public"."file" to "authenticated";

grant select on table "public"."file" to "authenticated";

grant trigger on table "public"."file" to "authenticated";

grant truncate on table "public"."file" to "authenticated";

grant update on table "public"."file" to "authenticated";

grant delete on table "public"."file" to "service_role";

grant insert on table "public"."file" to "service_role";

grant references on table "public"."file" to "service_role";

grant select on table "public"."file" to "service_role";

grant trigger on table "public"."file" to "service_role";

grant truncate on table "public"."file" to "service_role";

grant update on table "public"."file" to "service_role";

grant delete on table "public"."folder" to "anon";

grant insert on table "public"."folder" to "anon";

grant references on table "public"."folder" to "anon";

grant select on table "public"."folder" to "anon";

grant trigger on table "public"."folder" to "anon";

grant truncate on table "public"."folder" to "anon";

grant update on table "public"."folder" to "anon";

grant delete on table "public"."folder" to "authenticated";

grant insert on table "public"."folder" to "authenticated";

grant references on table "public"."folder" to "authenticated";

grant select on table "public"."folder" to "authenticated";

grant trigger on table "public"."folder" to "authenticated";

grant truncate on table "public"."folder" to "authenticated";

grant update on table "public"."folder" to "authenticated";

grant delete on table "public"."folder" to "service_role";

grant insert on table "public"."folder" to "service_role";

grant references on table "public"."folder" to "service_role";

grant select on table "public"."folder" to "service_role";

grant trigger on table "public"."folder" to "service_role";

grant truncate on table "public"."folder" to "service_role";

grant update on table "public"."folder" to "service_role";

grant delete on table "public"."folder_tag" to "anon";

grant insert on table "public"."folder_tag" to "anon";

grant references on table "public"."folder_tag" to "anon";

grant select on table "public"."folder_tag" to "anon";

grant trigger on table "public"."folder_tag" to "anon";

grant truncate on table "public"."folder_tag" to "anon";

grant update on table "public"."folder_tag" to "anon";

grant delete on table "public"."folder_tag" to "authenticated";

grant insert on table "public"."folder_tag" to "authenticated";

grant references on table "public"."folder_tag" to "authenticated";

grant select on table "public"."folder_tag" to "authenticated";

grant trigger on table "public"."folder_tag" to "authenticated";

grant truncate on table "public"."folder_tag" to "authenticated";

grant update on table "public"."folder_tag" to "authenticated";

grant delete on table "public"."folder_tag" to "service_role";

grant insert on table "public"."folder_tag" to "service_role";

grant references on table "public"."folder_tag" to "service_role";

grant select on table "public"."folder_tag" to "service_role";

grant trigger on table "public"."folder_tag" to "service_role";

grant truncate on table "public"."folder_tag" to "service_role";

grant update on table "public"."folder_tag" to "service_role";

grant delete on table "public"."function" to "anon";

grant insert on table "public"."function" to "anon";

grant references on table "public"."function" to "anon";

grant select on table "public"."function" to "anon";

grant trigger on table "public"."function" to "anon";

grant truncate on table "public"."function" to "anon";

grant update on table "public"."function" to "anon";

grant delete on table "public"."function" to "authenticated";

grant insert on table "public"."function" to "authenticated";

grant references on table "public"."function" to "authenticated";

grant select on table "public"."function" to "authenticated";

grant trigger on table "public"."function" to "authenticated";

grant truncate on table "public"."function" to "authenticated";

grant update on table "public"."function" to "authenticated";

grant delete on table "public"."function" to "service_role";

grant insert on table "public"."function" to "service_role";

grant references on table "public"."function" to "service_role";

grant select on table "public"."function" to "service_role";

grant trigger on table "public"."function" to "service_role";

grant truncate on table "public"."function" to "service_role";

grant update on table "public"."function" to "service_role";

grant delete on table "public"."insights_by_period" to "anon";

grant insert on table "public"."insights_by_period" to "anon";

grant references on table "public"."insights_by_period" to "anon";

grant select on table "public"."insights_by_period" to "anon";

grant trigger on table "public"."insights_by_period" to "anon";

grant truncate on table "public"."insights_by_period" to "anon";

grant update on table "public"."insights_by_period" to "anon";

grant delete on table "public"."insights_by_period" to "authenticated";

grant insert on table "public"."insights_by_period" to "authenticated";

grant references on table "public"."insights_by_period" to "authenticated";

grant select on table "public"."insights_by_period" to "authenticated";

grant trigger on table "public"."insights_by_period" to "authenticated";

grant truncate on table "public"."insights_by_period" to "authenticated";

grant update on table "public"."insights_by_period" to "authenticated";

grant delete on table "public"."insights_by_period" to "service_role";

grant insert on table "public"."insights_by_period" to "service_role";

grant references on table "public"."insights_by_period" to "service_role";

grant select on table "public"."insights_by_period" to "service_role";

grant trigger on table "public"."insights_by_period" to "service_role";

grant truncate on table "public"."insights_by_period" to "service_role";

grant update on table "public"."insights_by_period" to "service_role";

grant delete on table "public"."insights_metadata" to "anon";

grant insert on table "public"."insights_metadata" to "anon";

grant references on table "public"."insights_metadata" to "anon";

grant select on table "public"."insights_metadata" to "anon";

grant trigger on table "public"."insights_metadata" to "anon";

grant truncate on table "public"."insights_metadata" to "anon";

grant update on table "public"."insights_metadata" to "anon";

grant delete on table "public"."insights_metadata" to "authenticated";

grant insert on table "public"."insights_metadata" to "authenticated";

grant references on table "public"."insights_metadata" to "authenticated";

grant select on table "public"."insights_metadata" to "authenticated";

grant trigger on table "public"."insights_metadata" to "authenticated";

grant truncate on table "public"."insights_metadata" to "authenticated";

grant update on table "public"."insights_metadata" to "authenticated";

grant delete on table "public"."insights_metadata" to "service_role";

grant insert on table "public"."insights_metadata" to "service_role";

grant references on table "public"."insights_metadata" to "service_role";

grant select on table "public"."insights_metadata" to "service_role";

grant trigger on table "public"."insights_metadata" to "service_role";

grant truncate on table "public"."insights_metadata" to "service_role";

grant update on table "public"."insights_metadata" to "service_role";

grant delete on table "public"."insights_raw" to "anon";

grant insert on table "public"."insights_raw" to "anon";

grant references on table "public"."insights_raw" to "anon";

grant select on table "public"."insights_raw" to "anon";

grant trigger on table "public"."insights_raw" to "anon";

grant truncate on table "public"."insights_raw" to "anon";

grant update on table "public"."insights_raw" to "anon";

grant delete on table "public"."insights_raw" to "authenticated";

grant insert on table "public"."insights_raw" to "authenticated";

grant references on table "public"."insights_raw" to "authenticated";

grant select on table "public"."insights_raw" to "authenticated";

grant trigger on table "public"."insights_raw" to "authenticated";

grant truncate on table "public"."insights_raw" to "authenticated";

grant update on table "public"."insights_raw" to "authenticated";

grant delete on table "public"."insights_raw" to "service_role";

grant insert on table "public"."insights_raw" to "service_role";

grant references on table "public"."insights_raw" to "service_role";

grant select on table "public"."insights_raw" to "service_role";

grant trigger on table "public"."insights_raw" to "service_role";

grant truncate on table "public"."insights_raw" to "service_role";

grant update on table "public"."insights_raw" to "service_role";

grant delete on table "public"."installed_nodes" to "anon";

grant insert on table "public"."installed_nodes" to "anon";

grant references on table "public"."installed_nodes" to "anon";

grant select on table "public"."installed_nodes" to "anon";

grant trigger on table "public"."installed_nodes" to "anon";

grant truncate on table "public"."installed_nodes" to "anon";

grant update on table "public"."installed_nodes" to "anon";

grant delete on table "public"."installed_nodes" to "authenticated";

grant insert on table "public"."installed_nodes" to "authenticated";

grant references on table "public"."installed_nodes" to "authenticated";

grant select on table "public"."installed_nodes" to "authenticated";

grant trigger on table "public"."installed_nodes" to "authenticated";

grant truncate on table "public"."installed_nodes" to "authenticated";

grant update on table "public"."installed_nodes" to "authenticated";

grant delete on table "public"."installed_nodes" to "service_role";

grant insert on table "public"."installed_nodes" to "service_role";

grant references on table "public"."installed_nodes" to "service_role";

grant select on table "public"."installed_nodes" to "service_role";

grant trigger on table "public"."installed_nodes" to "service_role";

grant truncate on table "public"."installed_nodes" to "service_role";

grant update on table "public"."installed_nodes" to "service_role";

grant delete on table "public"."installed_packages" to "anon";

grant insert on table "public"."installed_packages" to "anon";

grant references on table "public"."installed_packages" to "anon";

grant select on table "public"."installed_packages" to "anon";

grant trigger on table "public"."installed_packages" to "anon";

grant truncate on table "public"."installed_packages" to "anon";

grant update on table "public"."installed_packages" to "anon";

grant delete on table "public"."installed_packages" to "authenticated";

grant insert on table "public"."installed_packages" to "authenticated";

grant references on table "public"."installed_packages" to "authenticated";

grant select on table "public"."installed_packages" to "authenticated";

grant trigger on table "public"."installed_packages" to "authenticated";

grant truncate on table "public"."installed_packages" to "authenticated";

grant update on table "public"."installed_packages" to "authenticated";

grant delete on table "public"."installed_packages" to "service_role";

grant insert on table "public"."installed_packages" to "service_role";

grant references on table "public"."installed_packages" to "service_role";

grant select on table "public"."installed_packages" to "service_role";

grant trigger on table "public"."installed_packages" to "service_role";

grant truncate on table "public"."installed_packages" to "service_role";

grant update on table "public"."installed_packages" to "service_role";

grant delete on table "public"."invalid_auth_token" to "anon";

grant insert on table "public"."invalid_auth_token" to "anon";

grant references on table "public"."invalid_auth_token" to "anon";

grant select on table "public"."invalid_auth_token" to "anon";

grant trigger on table "public"."invalid_auth_token" to "anon";

grant truncate on table "public"."invalid_auth_token" to "anon";

grant update on table "public"."invalid_auth_token" to "anon";

grant delete on table "public"."invalid_auth_token" to "authenticated";

grant insert on table "public"."invalid_auth_token" to "authenticated";

grant references on table "public"."invalid_auth_token" to "authenticated";

grant select on table "public"."invalid_auth_token" to "authenticated";

grant trigger on table "public"."invalid_auth_token" to "authenticated";

grant truncate on table "public"."invalid_auth_token" to "authenticated";

grant update on table "public"."invalid_auth_token" to "authenticated";

grant delete on table "public"."invalid_auth_token" to "service_role";

grant insert on table "public"."invalid_auth_token" to "service_role";

grant references on table "public"."invalid_auth_token" to "service_role";

grant select on table "public"."invalid_auth_token" to "service_role";

grant trigger on table "public"."invalid_auth_token" to "service_role";

grant truncate on table "public"."invalid_auth_token" to "service_role";

grant update on table "public"."invalid_auth_token" to "service_role";

grant delete on table "public"."memory" to "anon";

grant insert on table "public"."memory" to "anon";

grant references on table "public"."memory" to "anon";

grant select on table "public"."memory" to "anon";

grant trigger on table "public"."memory" to "anon";

grant truncate on table "public"."memory" to "anon";

grant update on table "public"."memory" to "anon";

grant delete on table "public"."memory" to "authenticated";

grant insert on table "public"."memory" to "authenticated";

grant references on table "public"."memory" to "authenticated";

grant select on table "public"."memory" to "authenticated";

grant trigger on table "public"."memory" to "authenticated";

grant truncate on table "public"."memory" to "authenticated";

grant update on table "public"."memory" to "authenticated";

grant delete on table "public"."memory" to "service_role";

grant insert on table "public"."memory" to "service_role";

grant references on table "public"."memory" to "service_role";

grant select on table "public"."memory" to "service_role";

grant trigger on table "public"."memory" to "service_role";

grant truncate on table "public"."memory" to "service_role";

grant update on table "public"."memory" to "service_role";

grant delete on table "public"."migratehistory" to "anon";

grant insert on table "public"."migratehistory" to "anon";

grant references on table "public"."migratehistory" to "anon";

grant select on table "public"."migratehistory" to "anon";

grant trigger on table "public"."migratehistory" to "anon";

grant truncate on table "public"."migratehistory" to "anon";

grant update on table "public"."migratehistory" to "anon";

grant delete on table "public"."migratehistory" to "authenticated";

grant insert on table "public"."migratehistory" to "authenticated";

grant references on table "public"."migratehistory" to "authenticated";

grant select on table "public"."migratehistory" to "authenticated";

grant trigger on table "public"."migratehistory" to "authenticated";

grant truncate on table "public"."migratehistory" to "authenticated";

grant update on table "public"."migratehistory" to "authenticated";

grant delete on table "public"."migratehistory" to "service_role";

grant insert on table "public"."migratehistory" to "service_role";

grant references on table "public"."migratehistory" to "service_role";

grant select on table "public"."migratehistory" to "service_role";

grant trigger on table "public"."migratehistory" to "service_role";

grant truncate on table "public"."migratehistory" to "service_role";

grant update on table "public"."migratehistory" to "service_role";

grant delete on table "public"."migrations" to "anon";

grant insert on table "public"."migrations" to "anon";

grant references on table "public"."migrations" to "anon";

grant select on table "public"."migrations" to "anon";

grant trigger on table "public"."migrations" to "anon";

grant truncate on table "public"."migrations" to "anon";

grant update on table "public"."migrations" to "anon";

grant delete on table "public"."migrations" to "authenticated";

grant insert on table "public"."migrations" to "authenticated";

grant references on table "public"."migrations" to "authenticated";

grant select on table "public"."migrations" to "authenticated";

grant trigger on table "public"."migrations" to "authenticated";

grant truncate on table "public"."migrations" to "authenticated";

grant update on table "public"."migrations" to "authenticated";

grant delete on table "public"."migrations" to "service_role";

grant insert on table "public"."migrations" to "service_role";

grant references on table "public"."migrations" to "service_role";

grant select on table "public"."migrations" to "service_role";

grant trigger on table "public"."migrations" to "service_role";

grant truncate on table "public"."migrations" to "service_role";

grant update on table "public"."migrations" to "service_role";

grant delete on table "public"."model" to "anon";

grant insert on table "public"."model" to "anon";

grant references on table "public"."model" to "anon";

grant select on table "public"."model" to "anon";

grant trigger on table "public"."model" to "anon";

grant truncate on table "public"."model" to "anon";

grant update on table "public"."model" to "anon";

grant delete on table "public"."model" to "authenticated";

grant insert on table "public"."model" to "authenticated";

grant references on table "public"."model" to "authenticated";

grant select on table "public"."model" to "authenticated";

grant trigger on table "public"."model" to "authenticated";

grant truncate on table "public"."model" to "authenticated";

grant update on table "public"."model" to "authenticated";

grant delete on table "public"."model" to "service_role";

grant insert on table "public"."model" to "service_role";

grant references on table "public"."model" to "service_role";

grant select on table "public"."model" to "service_role";

grant trigger on table "public"."model" to "service_role";

grant truncate on table "public"."model" to "service_role";

grant update on table "public"."model" to "service_role";

grant delete on table "public"."oauth_access_tokens" to "anon";

grant insert on table "public"."oauth_access_tokens" to "anon";

grant references on table "public"."oauth_access_tokens" to "anon";

grant select on table "public"."oauth_access_tokens" to "anon";

grant trigger on table "public"."oauth_access_tokens" to "anon";

grant truncate on table "public"."oauth_access_tokens" to "anon";

grant update on table "public"."oauth_access_tokens" to "anon";

grant delete on table "public"."oauth_access_tokens" to "authenticated";

grant insert on table "public"."oauth_access_tokens" to "authenticated";

grant references on table "public"."oauth_access_tokens" to "authenticated";

grant select on table "public"."oauth_access_tokens" to "authenticated";

grant trigger on table "public"."oauth_access_tokens" to "authenticated";

grant truncate on table "public"."oauth_access_tokens" to "authenticated";

grant update on table "public"."oauth_access_tokens" to "authenticated";

grant delete on table "public"."oauth_access_tokens" to "service_role";

grant insert on table "public"."oauth_access_tokens" to "service_role";

grant references on table "public"."oauth_access_tokens" to "service_role";

grant select on table "public"."oauth_access_tokens" to "service_role";

grant trigger on table "public"."oauth_access_tokens" to "service_role";

grant truncate on table "public"."oauth_access_tokens" to "service_role";

grant update on table "public"."oauth_access_tokens" to "service_role";

grant delete on table "public"."oauth_authorization_codes" to "anon";

grant insert on table "public"."oauth_authorization_codes" to "anon";

grant references on table "public"."oauth_authorization_codes" to "anon";

grant select on table "public"."oauth_authorization_codes" to "anon";

grant trigger on table "public"."oauth_authorization_codes" to "anon";

grant truncate on table "public"."oauth_authorization_codes" to "anon";

grant update on table "public"."oauth_authorization_codes" to "anon";

grant delete on table "public"."oauth_authorization_codes" to "authenticated";

grant insert on table "public"."oauth_authorization_codes" to "authenticated";

grant references on table "public"."oauth_authorization_codes" to "authenticated";

grant select on table "public"."oauth_authorization_codes" to "authenticated";

grant trigger on table "public"."oauth_authorization_codes" to "authenticated";

grant truncate on table "public"."oauth_authorization_codes" to "authenticated";

grant update on table "public"."oauth_authorization_codes" to "authenticated";

grant delete on table "public"."oauth_authorization_codes" to "service_role";

grant insert on table "public"."oauth_authorization_codes" to "service_role";

grant references on table "public"."oauth_authorization_codes" to "service_role";

grant select on table "public"."oauth_authorization_codes" to "service_role";

grant trigger on table "public"."oauth_authorization_codes" to "service_role";

grant truncate on table "public"."oauth_authorization_codes" to "service_role";

grant update on table "public"."oauth_authorization_codes" to "service_role";

grant delete on table "public"."oauth_clients" to "anon";

grant insert on table "public"."oauth_clients" to "anon";

grant references on table "public"."oauth_clients" to "anon";

grant select on table "public"."oauth_clients" to "anon";

grant trigger on table "public"."oauth_clients" to "anon";

grant truncate on table "public"."oauth_clients" to "anon";

grant update on table "public"."oauth_clients" to "anon";

grant delete on table "public"."oauth_clients" to "authenticated";

grant insert on table "public"."oauth_clients" to "authenticated";

grant references on table "public"."oauth_clients" to "authenticated";

grant select on table "public"."oauth_clients" to "authenticated";

grant trigger on table "public"."oauth_clients" to "authenticated";

grant truncate on table "public"."oauth_clients" to "authenticated";

grant update on table "public"."oauth_clients" to "authenticated";

grant delete on table "public"."oauth_clients" to "service_role";

grant insert on table "public"."oauth_clients" to "service_role";

grant references on table "public"."oauth_clients" to "service_role";

grant select on table "public"."oauth_clients" to "service_role";

grant trigger on table "public"."oauth_clients" to "service_role";

grant truncate on table "public"."oauth_clients" to "service_role";

grant update on table "public"."oauth_clients" to "service_role";

grant delete on table "public"."oauth_refresh_tokens" to "anon";

grant insert on table "public"."oauth_refresh_tokens" to "anon";

grant references on table "public"."oauth_refresh_tokens" to "anon";

grant select on table "public"."oauth_refresh_tokens" to "anon";

grant trigger on table "public"."oauth_refresh_tokens" to "anon";

grant truncate on table "public"."oauth_refresh_tokens" to "anon";

grant update on table "public"."oauth_refresh_tokens" to "anon";

grant delete on table "public"."oauth_refresh_tokens" to "authenticated";

grant insert on table "public"."oauth_refresh_tokens" to "authenticated";

grant references on table "public"."oauth_refresh_tokens" to "authenticated";

grant select on table "public"."oauth_refresh_tokens" to "authenticated";

grant trigger on table "public"."oauth_refresh_tokens" to "authenticated";

grant truncate on table "public"."oauth_refresh_tokens" to "authenticated";

grant update on table "public"."oauth_refresh_tokens" to "authenticated";

grant delete on table "public"."oauth_refresh_tokens" to "service_role";

grant insert on table "public"."oauth_refresh_tokens" to "service_role";

grant references on table "public"."oauth_refresh_tokens" to "service_role";

grant select on table "public"."oauth_refresh_tokens" to "service_role";

grant trigger on table "public"."oauth_refresh_tokens" to "service_role";

grant truncate on table "public"."oauth_refresh_tokens" to "service_role";

grant update on table "public"."oauth_refresh_tokens" to "service_role";

grant delete on table "public"."oauth_user_consents" to "anon";

grant insert on table "public"."oauth_user_consents" to "anon";

grant references on table "public"."oauth_user_consents" to "anon";

grant select on table "public"."oauth_user_consents" to "anon";

grant trigger on table "public"."oauth_user_consents" to "anon";

grant truncate on table "public"."oauth_user_consents" to "anon";

grant update on table "public"."oauth_user_consents" to "anon";

grant delete on table "public"."oauth_user_consents" to "authenticated";

grant insert on table "public"."oauth_user_consents" to "authenticated";

grant references on table "public"."oauth_user_consents" to "authenticated";

grant select on table "public"."oauth_user_consents" to "authenticated";

grant trigger on table "public"."oauth_user_consents" to "authenticated";

grant truncate on table "public"."oauth_user_consents" to "authenticated";

grant update on table "public"."oauth_user_consents" to "authenticated";

grant delete on table "public"."oauth_user_consents" to "service_role";

grant insert on table "public"."oauth_user_consents" to "service_role";

grant references on table "public"."oauth_user_consents" to "service_role";

grant select on table "public"."oauth_user_consents" to "service_role";

grant trigger on table "public"."oauth_user_consents" to "service_role";

grant truncate on table "public"."oauth_user_consents" to "service_role";

grant update on table "public"."oauth_user_consents" to "service_role";

grant delete on table "public"."processed_data" to "anon";

grant insert on table "public"."processed_data" to "anon";

grant references on table "public"."processed_data" to "anon";

grant select on table "public"."processed_data" to "anon";

grant trigger on table "public"."processed_data" to "anon";

grant truncate on table "public"."processed_data" to "anon";

grant update on table "public"."processed_data" to "anon";

grant delete on table "public"."processed_data" to "authenticated";

grant insert on table "public"."processed_data" to "authenticated";

grant references on table "public"."processed_data" to "authenticated";

grant select on table "public"."processed_data" to "authenticated";

grant trigger on table "public"."processed_data" to "authenticated";

grant truncate on table "public"."processed_data" to "authenticated";

grant update on table "public"."processed_data" to "authenticated";

grant delete on table "public"."processed_data" to "service_role";

grant insert on table "public"."processed_data" to "service_role";

grant references on table "public"."processed_data" to "service_role";

grant select on table "public"."processed_data" to "service_role";

grant trigger on table "public"."processed_data" to "service_role";

grant truncate on table "public"."processed_data" to "service_role";

grant update on table "public"."processed_data" to "service_role";

grant delete on table "public"."project" to "anon";

grant insert on table "public"."project" to "anon";

grant references on table "public"."project" to "anon";

grant select on table "public"."project" to "anon";

grant trigger on table "public"."project" to "anon";

grant truncate on table "public"."project" to "anon";

grant update on table "public"."project" to "anon";

grant delete on table "public"."project" to "authenticated";

grant insert on table "public"."project" to "authenticated";

grant references on table "public"."project" to "authenticated";

grant select on table "public"."project" to "authenticated";

grant trigger on table "public"."project" to "authenticated";

grant truncate on table "public"."project" to "authenticated";

grant update on table "public"."project" to "authenticated";

grant delete on table "public"."project" to "service_role";

grant insert on table "public"."project" to "service_role";

grant references on table "public"."project" to "service_role";

grant select on table "public"."project" to "service_role";

grant trigger on table "public"."project" to "service_role";

grant truncate on table "public"."project" to "service_role";

grant update on table "public"."project" to "service_role";

grant delete on table "public"."project_relation" to "anon";

grant insert on table "public"."project_relation" to "anon";

grant references on table "public"."project_relation" to "anon";

grant select on table "public"."project_relation" to "anon";

grant trigger on table "public"."project_relation" to "anon";

grant truncate on table "public"."project_relation" to "anon";

grant update on table "public"."project_relation" to "anon";

grant delete on table "public"."project_relation" to "authenticated";

grant insert on table "public"."project_relation" to "authenticated";

grant references on table "public"."project_relation" to "authenticated";

grant select on table "public"."project_relation" to "authenticated";

grant trigger on table "public"."project_relation" to "authenticated";

grant truncate on table "public"."project_relation" to "authenticated";

grant update on table "public"."project_relation" to "authenticated";

grant delete on table "public"."project_relation" to "service_role";

grant insert on table "public"."project_relation" to "service_role";

grant references on table "public"."project_relation" to "service_role";

grant select on table "public"."project_relation" to "service_role";

grant trigger on table "public"."project_relation" to "service_role";

grant truncate on table "public"."project_relation" to "service_role";

grant update on table "public"."project_relation" to "service_role";

grant delete on table "public"."prompt" to "anon";

grant insert on table "public"."prompt" to "anon";

grant references on table "public"."prompt" to "anon";

grant select on table "public"."prompt" to "anon";

grant trigger on table "public"."prompt" to "anon";

grant truncate on table "public"."prompt" to "anon";

grant update on table "public"."prompt" to "anon";

grant delete on table "public"."prompt" to "authenticated";

grant insert on table "public"."prompt" to "authenticated";

grant references on table "public"."prompt" to "authenticated";

grant select on table "public"."prompt" to "authenticated";

grant trigger on table "public"."prompt" to "authenticated";

grant truncate on table "public"."prompt" to "authenticated";

grant update on table "public"."prompt" to "authenticated";

grant delete on table "public"."prompt" to "service_role";

grant insert on table "public"."prompt" to "service_role";

grant references on table "public"."prompt" to "service_role";

grant select on table "public"."prompt" to "service_role";

grant trigger on table "public"."prompt" to "service_role";

grant truncate on table "public"."prompt" to "service_role";

grant update on table "public"."prompt" to "service_role";

grant delete on table "public"."role" to "anon";

grant insert on table "public"."role" to "anon";

grant references on table "public"."role" to "anon";

grant select on table "public"."role" to "anon";

grant trigger on table "public"."role" to "anon";

grant truncate on table "public"."role" to "anon";

grant update on table "public"."role" to "anon";

grant delete on table "public"."role" to "authenticated";

grant insert on table "public"."role" to "authenticated";

grant references on table "public"."role" to "authenticated";

grant select on table "public"."role" to "authenticated";

grant trigger on table "public"."role" to "authenticated";

grant truncate on table "public"."role" to "authenticated";

grant update on table "public"."role" to "authenticated";

grant delete on table "public"."role" to "service_role";

grant insert on table "public"."role" to "service_role";

grant references on table "public"."role" to "service_role";

grant select on table "public"."role" to "service_role";

grant trigger on table "public"."role" to "service_role";

grant truncate on table "public"."role" to "service_role";

grant update on table "public"."role" to "service_role";

grant delete on table "public"."role_scope" to "anon";

grant insert on table "public"."role_scope" to "anon";

grant references on table "public"."role_scope" to "anon";

grant select on table "public"."role_scope" to "anon";

grant trigger on table "public"."role_scope" to "anon";

grant truncate on table "public"."role_scope" to "anon";

grant update on table "public"."role_scope" to "anon";

grant delete on table "public"."role_scope" to "authenticated";

grant insert on table "public"."role_scope" to "authenticated";

grant references on table "public"."role_scope" to "authenticated";

grant select on table "public"."role_scope" to "authenticated";

grant trigger on table "public"."role_scope" to "authenticated";

grant truncate on table "public"."role_scope" to "authenticated";

grant update on table "public"."role_scope" to "authenticated";

grant delete on table "public"."role_scope" to "service_role";

grant insert on table "public"."role_scope" to "service_role";

grant references on table "public"."role_scope" to "service_role";

grant select on table "public"."role_scope" to "service_role";

grant trigger on table "public"."role_scope" to "service_role";

grant truncate on table "public"."role_scope" to "service_role";

grant update on table "public"."role_scope" to "service_role";

grant delete on table "public"."scope" to "anon";

grant insert on table "public"."scope" to "anon";

grant references on table "public"."scope" to "anon";

grant select on table "public"."scope" to "anon";

grant trigger on table "public"."scope" to "anon";

grant truncate on table "public"."scope" to "anon";

grant update on table "public"."scope" to "anon";

grant delete on table "public"."scope" to "authenticated";

grant insert on table "public"."scope" to "authenticated";

grant references on table "public"."scope" to "authenticated";

grant select on table "public"."scope" to "authenticated";

grant trigger on table "public"."scope" to "authenticated";

grant truncate on table "public"."scope" to "authenticated";

grant update on table "public"."scope" to "authenticated";

grant delete on table "public"."scope" to "service_role";

grant insert on table "public"."scope" to "service_role";

grant references on table "public"."scope" to "service_role";

grant select on table "public"."scope" to "service_role";

grant trigger on table "public"."scope" to "service_role";

grant truncate on table "public"."scope" to "service_role";

grant update on table "public"."scope" to "service_role";

grant delete on table "public"."settings" to "anon";

grant insert on table "public"."settings" to "anon";

grant references on table "public"."settings" to "anon";

grant select on table "public"."settings" to "anon";

grant trigger on table "public"."settings" to "anon";

grant truncate on table "public"."settings" to "anon";

grant update on table "public"."settings" to "anon";

grant delete on table "public"."settings" to "authenticated";

grant insert on table "public"."settings" to "authenticated";

grant references on table "public"."settings" to "authenticated";

grant select on table "public"."settings" to "authenticated";

grant trigger on table "public"."settings" to "authenticated";

grant truncate on table "public"."settings" to "authenticated";

grant update on table "public"."settings" to "authenticated";

grant delete on table "public"."settings" to "service_role";

grant insert on table "public"."settings" to "service_role";

grant references on table "public"."settings" to "service_role";

grant select on table "public"."settings" to "service_role";

grant trigger on table "public"."settings" to "service_role";

grant truncate on table "public"."settings" to "service_role";

grant update on table "public"."settings" to "service_role";

grant delete on table "public"."shared_credentials" to "anon";

grant insert on table "public"."shared_credentials" to "anon";

grant references on table "public"."shared_credentials" to "anon";

grant select on table "public"."shared_credentials" to "anon";

grant trigger on table "public"."shared_credentials" to "anon";

grant truncate on table "public"."shared_credentials" to "anon";

grant update on table "public"."shared_credentials" to "anon";

grant delete on table "public"."shared_credentials" to "authenticated";

grant insert on table "public"."shared_credentials" to "authenticated";

grant references on table "public"."shared_credentials" to "authenticated";

grant select on table "public"."shared_credentials" to "authenticated";

grant trigger on table "public"."shared_credentials" to "authenticated";

grant truncate on table "public"."shared_credentials" to "authenticated";

grant update on table "public"."shared_credentials" to "authenticated";

grant delete on table "public"."shared_credentials" to "service_role";

grant insert on table "public"."shared_credentials" to "service_role";

grant references on table "public"."shared_credentials" to "service_role";

grant select on table "public"."shared_credentials" to "service_role";

grant trigger on table "public"."shared_credentials" to "service_role";

grant truncate on table "public"."shared_credentials" to "service_role";

grant update on table "public"."shared_credentials" to "service_role";

grant delete on table "public"."shared_workflow" to "anon";

grant insert on table "public"."shared_workflow" to "anon";

grant references on table "public"."shared_workflow" to "anon";

grant select on table "public"."shared_workflow" to "anon";

grant trigger on table "public"."shared_workflow" to "anon";

grant truncate on table "public"."shared_workflow" to "anon";

grant update on table "public"."shared_workflow" to "anon";

grant delete on table "public"."shared_workflow" to "authenticated";

grant insert on table "public"."shared_workflow" to "authenticated";

grant references on table "public"."shared_workflow" to "authenticated";

grant select on table "public"."shared_workflow" to "authenticated";

grant trigger on table "public"."shared_workflow" to "authenticated";

grant truncate on table "public"."shared_workflow" to "authenticated";

grant update on table "public"."shared_workflow" to "authenticated";

grant delete on table "public"."shared_workflow" to "service_role";

grant insert on table "public"."shared_workflow" to "service_role";

grant references on table "public"."shared_workflow" to "service_role";

grant select on table "public"."shared_workflow" to "service_role";

grant trigger on table "public"."shared_workflow" to "service_role";

grant truncate on table "public"."shared_workflow" to "service_role";

grant update on table "public"."shared_workflow" to "service_role";

grant delete on table "public"."smogon_meta_snapshot" to "anon";

grant insert on table "public"."smogon_meta_snapshot" to "anon";

grant references on table "public"."smogon_meta_snapshot" to "anon";

grant select on table "public"."smogon_meta_snapshot" to "anon";

grant trigger on table "public"."smogon_meta_snapshot" to "anon";

grant truncate on table "public"."smogon_meta_snapshot" to "anon";

grant update on table "public"."smogon_meta_snapshot" to "anon";

grant delete on table "public"."smogon_meta_snapshot" to "authenticated";

grant insert on table "public"."smogon_meta_snapshot" to "authenticated";

grant references on table "public"."smogon_meta_snapshot" to "authenticated";

grant select on table "public"."smogon_meta_snapshot" to "authenticated";

grant trigger on table "public"."smogon_meta_snapshot" to "authenticated";

grant truncate on table "public"."smogon_meta_snapshot" to "authenticated";

grant update on table "public"."smogon_meta_snapshot" to "authenticated";

grant delete on table "public"."smogon_meta_snapshot" to "service_role";

grant insert on table "public"."smogon_meta_snapshot" to "service_role";

grant references on table "public"."smogon_meta_snapshot" to "service_role";

grant select on table "public"."smogon_meta_snapshot" to "service_role";

grant trigger on table "public"."smogon_meta_snapshot" to "service_role";

grant truncate on table "public"."smogon_meta_snapshot" to "service_role";

grant update on table "public"."smogon_meta_snapshot" to "service_role";

grant delete on table "public"."tag" to "anon";

grant insert on table "public"."tag" to "anon";

grant references on table "public"."tag" to "anon";

grant select on table "public"."tag" to "anon";

grant trigger on table "public"."tag" to "anon";

grant truncate on table "public"."tag" to "anon";

grant update on table "public"."tag" to "anon";

grant delete on table "public"."tag" to "authenticated";

grant insert on table "public"."tag" to "authenticated";

grant references on table "public"."tag" to "authenticated";

grant select on table "public"."tag" to "authenticated";

grant trigger on table "public"."tag" to "authenticated";

grant truncate on table "public"."tag" to "authenticated";

grant update on table "public"."tag" to "authenticated";

grant delete on table "public"."tag" to "service_role";

grant insert on table "public"."tag" to "service_role";

grant references on table "public"."tag" to "service_role";

grant select on table "public"."tag" to "service_role";

grant trigger on table "public"."tag" to "service_role";

grant truncate on table "public"."tag" to "service_role";

grant update on table "public"."tag" to "service_role";

grant delete on table "public"."tag_entity" to "anon";

grant insert on table "public"."tag_entity" to "anon";

grant references on table "public"."tag_entity" to "anon";

grant select on table "public"."tag_entity" to "anon";

grant trigger on table "public"."tag_entity" to "anon";

grant truncate on table "public"."tag_entity" to "anon";

grant update on table "public"."tag_entity" to "anon";

grant delete on table "public"."tag_entity" to "authenticated";

grant insert on table "public"."tag_entity" to "authenticated";

grant references on table "public"."tag_entity" to "authenticated";

grant select on table "public"."tag_entity" to "authenticated";

grant trigger on table "public"."tag_entity" to "authenticated";

grant truncate on table "public"."tag_entity" to "authenticated";

grant update on table "public"."tag_entity" to "authenticated";

grant delete on table "public"."tag_entity" to "service_role";

grant insert on table "public"."tag_entity" to "service_role";

grant references on table "public"."tag_entity" to "service_role";

grant select on table "public"."tag_entity" to "service_role";

grant trigger on table "public"."tag_entity" to "service_role";

grant truncate on table "public"."tag_entity" to "service_role";

grant update on table "public"."tag_entity" to "service_role";

grant delete on table "public"."test_case_execution" to "anon";

grant insert on table "public"."test_case_execution" to "anon";

grant references on table "public"."test_case_execution" to "anon";

grant select on table "public"."test_case_execution" to "anon";

grant trigger on table "public"."test_case_execution" to "anon";

grant truncate on table "public"."test_case_execution" to "anon";

grant update on table "public"."test_case_execution" to "anon";

grant delete on table "public"."test_case_execution" to "authenticated";

grant insert on table "public"."test_case_execution" to "authenticated";

grant references on table "public"."test_case_execution" to "authenticated";

grant select on table "public"."test_case_execution" to "authenticated";

grant trigger on table "public"."test_case_execution" to "authenticated";

grant truncate on table "public"."test_case_execution" to "authenticated";

grant update on table "public"."test_case_execution" to "authenticated";

grant delete on table "public"."test_case_execution" to "service_role";

grant insert on table "public"."test_case_execution" to "service_role";

grant references on table "public"."test_case_execution" to "service_role";

grant select on table "public"."test_case_execution" to "service_role";

grant trigger on table "public"."test_case_execution" to "service_role";

grant truncate on table "public"."test_case_execution" to "service_role";

grant update on table "public"."test_case_execution" to "service_role";

grant delete on table "public"."test_run" to "anon";

grant insert on table "public"."test_run" to "anon";

grant references on table "public"."test_run" to "anon";

grant select on table "public"."test_run" to "anon";

grant trigger on table "public"."test_run" to "anon";

grant truncate on table "public"."test_run" to "anon";

grant update on table "public"."test_run" to "anon";

grant delete on table "public"."test_run" to "authenticated";

grant insert on table "public"."test_run" to "authenticated";

grant references on table "public"."test_run" to "authenticated";

grant select on table "public"."test_run" to "authenticated";

grant trigger on table "public"."test_run" to "authenticated";

grant truncate on table "public"."test_run" to "authenticated";

grant update on table "public"."test_run" to "authenticated";

grant delete on table "public"."test_run" to "service_role";

grant insert on table "public"."test_run" to "service_role";

grant references on table "public"."test_run" to "service_role";

grant select on table "public"."test_run" to "service_role";

grant trigger on table "public"."test_run" to "service_role";

grant truncate on table "public"."test_run" to "service_role";

grant update on table "public"."test_run" to "service_role";

grant delete on table "public"."tool" to "anon";

grant insert on table "public"."tool" to "anon";

grant references on table "public"."tool" to "anon";

grant select on table "public"."tool" to "anon";

grant trigger on table "public"."tool" to "anon";

grant truncate on table "public"."tool" to "anon";

grant update on table "public"."tool" to "anon";

grant delete on table "public"."tool" to "authenticated";

grant insert on table "public"."tool" to "authenticated";

grant references on table "public"."tool" to "authenticated";

grant select on table "public"."tool" to "authenticated";

grant trigger on table "public"."tool" to "authenticated";

grant truncate on table "public"."tool" to "authenticated";

grant update on table "public"."tool" to "authenticated";

grant delete on table "public"."tool" to "service_role";

grant insert on table "public"."tool" to "service_role";

grant references on table "public"."tool" to "service_role";

grant select on table "public"."tool" to "service_role";

grant trigger on table "public"."tool" to "service_role";

grant truncate on table "public"."tool" to "service_role";

grant update on table "public"."tool" to "service_role";

grant delete on table "public"."user" to "anon";

grant insert on table "public"."user" to "anon";

grant references on table "public"."user" to "anon";

grant select on table "public"."user" to "anon";

grant trigger on table "public"."user" to "anon";

grant truncate on table "public"."user" to "anon";

grant update on table "public"."user" to "anon";

grant delete on table "public"."user" to "authenticated";

grant insert on table "public"."user" to "authenticated";

grant references on table "public"."user" to "authenticated";

grant select on table "public"."user" to "authenticated";

grant trigger on table "public"."user" to "authenticated";

grant truncate on table "public"."user" to "authenticated";

grant update on table "public"."user" to "authenticated";

grant delete on table "public"."user" to "service_role";

grant insert on table "public"."user" to "service_role";

grant references on table "public"."user" to "service_role";

grant select on table "public"."user" to "service_role";

grant trigger on table "public"."user" to "service_role";

grant truncate on table "public"."user" to "service_role";

grant update on table "public"."user" to "service_role";

grant delete on table "public"."user_api_keys" to "anon";

grant insert on table "public"."user_api_keys" to "anon";

grant references on table "public"."user_api_keys" to "anon";

grant select on table "public"."user_api_keys" to "anon";

grant trigger on table "public"."user_api_keys" to "anon";

grant truncate on table "public"."user_api_keys" to "anon";

grant update on table "public"."user_api_keys" to "anon";

grant delete on table "public"."user_api_keys" to "authenticated";

grant insert on table "public"."user_api_keys" to "authenticated";

grant references on table "public"."user_api_keys" to "authenticated";

grant select on table "public"."user_api_keys" to "authenticated";

grant trigger on table "public"."user_api_keys" to "authenticated";

grant truncate on table "public"."user_api_keys" to "authenticated";

grant update on table "public"."user_api_keys" to "authenticated";

grant delete on table "public"."user_api_keys" to "service_role";

grant insert on table "public"."user_api_keys" to "service_role";

grant references on table "public"."user_api_keys" to "service_role";

grant select on table "public"."user_api_keys" to "service_role";

grant trigger on table "public"."user_api_keys" to "service_role";

grant truncate on table "public"."user_api_keys" to "service_role";

grant update on table "public"."user_api_keys" to "service_role";

grant delete on table "public"."variables" to "anon";

grant insert on table "public"."variables" to "anon";

grant references on table "public"."variables" to "anon";

grant select on table "public"."variables" to "anon";

grant trigger on table "public"."variables" to "anon";

grant truncate on table "public"."variables" to "anon";

grant update on table "public"."variables" to "anon";

grant delete on table "public"."variables" to "authenticated";

grant insert on table "public"."variables" to "authenticated";

grant references on table "public"."variables" to "authenticated";

grant select on table "public"."variables" to "authenticated";

grant trigger on table "public"."variables" to "authenticated";

grant truncate on table "public"."variables" to "authenticated";

grant update on table "public"."variables" to "authenticated";

grant delete on table "public"."variables" to "service_role";

grant insert on table "public"."variables" to "service_role";

grant references on table "public"."variables" to "service_role";

grant select on table "public"."variables" to "service_role";

grant trigger on table "public"."variables" to "service_role";

grant truncate on table "public"."variables" to "service_role";

grant update on table "public"."variables" to "service_role";

grant delete on table "public"."webhook_entity" to "anon";

grant insert on table "public"."webhook_entity" to "anon";

grant references on table "public"."webhook_entity" to "anon";

grant select on table "public"."webhook_entity" to "anon";

grant trigger on table "public"."webhook_entity" to "anon";

grant truncate on table "public"."webhook_entity" to "anon";

grant update on table "public"."webhook_entity" to "anon";

grant delete on table "public"."webhook_entity" to "authenticated";

grant insert on table "public"."webhook_entity" to "authenticated";

grant references on table "public"."webhook_entity" to "authenticated";

grant select on table "public"."webhook_entity" to "authenticated";

grant trigger on table "public"."webhook_entity" to "authenticated";

grant truncate on table "public"."webhook_entity" to "authenticated";

grant update on table "public"."webhook_entity" to "authenticated";

grant delete on table "public"."webhook_entity" to "service_role";

grant insert on table "public"."webhook_entity" to "service_role";

grant references on table "public"."webhook_entity" to "service_role";

grant select on table "public"."webhook_entity" to "service_role";

grant trigger on table "public"."webhook_entity" to "service_role";

grant truncate on table "public"."webhook_entity" to "service_role";

grant update on table "public"."webhook_entity" to "service_role";

grant delete on table "public"."workflow_dependency" to "anon";

grant insert on table "public"."workflow_dependency" to "anon";

grant references on table "public"."workflow_dependency" to "anon";

grant select on table "public"."workflow_dependency" to "anon";

grant trigger on table "public"."workflow_dependency" to "anon";

grant truncate on table "public"."workflow_dependency" to "anon";

grant update on table "public"."workflow_dependency" to "anon";

grant delete on table "public"."workflow_dependency" to "authenticated";

grant insert on table "public"."workflow_dependency" to "authenticated";

grant references on table "public"."workflow_dependency" to "authenticated";

grant select on table "public"."workflow_dependency" to "authenticated";

grant trigger on table "public"."workflow_dependency" to "authenticated";

grant truncate on table "public"."workflow_dependency" to "authenticated";

grant update on table "public"."workflow_dependency" to "authenticated";

grant delete on table "public"."workflow_dependency" to "service_role";

grant insert on table "public"."workflow_dependency" to "service_role";

grant references on table "public"."workflow_dependency" to "service_role";

grant select on table "public"."workflow_dependency" to "service_role";

grant trigger on table "public"."workflow_dependency" to "service_role";

grant truncate on table "public"."workflow_dependency" to "service_role";

grant update on table "public"."workflow_dependency" to "service_role";

grant delete on table "public"."workflow_entity" to "anon";

grant insert on table "public"."workflow_entity" to "anon";

grant references on table "public"."workflow_entity" to "anon";

grant select on table "public"."workflow_entity" to "anon";

grant trigger on table "public"."workflow_entity" to "anon";

grant truncate on table "public"."workflow_entity" to "anon";

grant update on table "public"."workflow_entity" to "anon";

grant delete on table "public"."workflow_entity" to "authenticated";

grant insert on table "public"."workflow_entity" to "authenticated";

grant references on table "public"."workflow_entity" to "authenticated";

grant select on table "public"."workflow_entity" to "authenticated";

grant trigger on table "public"."workflow_entity" to "authenticated";

grant truncate on table "public"."workflow_entity" to "authenticated";

grant update on table "public"."workflow_entity" to "authenticated";

grant delete on table "public"."workflow_entity" to "service_role";

grant insert on table "public"."workflow_entity" to "service_role";

grant references on table "public"."workflow_entity" to "service_role";

grant select on table "public"."workflow_entity" to "service_role";

grant trigger on table "public"."workflow_entity" to "service_role";

grant truncate on table "public"."workflow_entity" to "service_role";

grant update on table "public"."workflow_entity" to "service_role";

grant delete on table "public"."workflow_history" to "anon";

grant insert on table "public"."workflow_history" to "anon";

grant references on table "public"."workflow_history" to "anon";

grant select on table "public"."workflow_history" to "anon";

grant trigger on table "public"."workflow_history" to "anon";

grant truncate on table "public"."workflow_history" to "anon";

grant update on table "public"."workflow_history" to "anon";

grant delete on table "public"."workflow_history" to "authenticated";

grant insert on table "public"."workflow_history" to "authenticated";

grant references on table "public"."workflow_history" to "authenticated";

grant select on table "public"."workflow_history" to "authenticated";

grant trigger on table "public"."workflow_history" to "authenticated";

grant truncate on table "public"."workflow_history" to "authenticated";

grant update on table "public"."workflow_history" to "authenticated";

grant delete on table "public"."workflow_history" to "service_role";

grant insert on table "public"."workflow_history" to "service_role";

grant references on table "public"."workflow_history" to "service_role";

grant select on table "public"."workflow_history" to "service_role";

grant trigger on table "public"."workflow_history" to "service_role";

grant truncate on table "public"."workflow_history" to "service_role";

grant update on table "public"."workflow_history" to "service_role";

grant delete on table "public"."workflow_publish_history" to "anon";

grant insert on table "public"."workflow_publish_history" to "anon";

grant references on table "public"."workflow_publish_history" to "anon";

grant select on table "public"."workflow_publish_history" to "anon";

grant trigger on table "public"."workflow_publish_history" to "anon";

grant truncate on table "public"."workflow_publish_history" to "anon";

grant update on table "public"."workflow_publish_history" to "anon";

grant delete on table "public"."workflow_publish_history" to "authenticated";

grant insert on table "public"."workflow_publish_history" to "authenticated";

grant references on table "public"."workflow_publish_history" to "authenticated";

grant select on table "public"."workflow_publish_history" to "authenticated";

grant trigger on table "public"."workflow_publish_history" to "authenticated";

grant truncate on table "public"."workflow_publish_history" to "authenticated";

grant update on table "public"."workflow_publish_history" to "authenticated";

grant delete on table "public"."workflow_publish_history" to "service_role";

grant insert on table "public"."workflow_publish_history" to "service_role";

grant references on table "public"."workflow_publish_history" to "service_role";

grant select on table "public"."workflow_publish_history" to "service_role";

grant trigger on table "public"."workflow_publish_history" to "service_role";

grant truncate on table "public"."workflow_publish_history" to "service_role";

grant update on table "public"."workflow_publish_history" to "service_role";

grant delete on table "public"."workflow_statistics" to "anon";

grant insert on table "public"."workflow_statistics" to "anon";

grant references on table "public"."workflow_statistics" to "anon";

grant select on table "public"."workflow_statistics" to "anon";

grant trigger on table "public"."workflow_statistics" to "anon";

grant truncate on table "public"."workflow_statistics" to "anon";

grant update on table "public"."workflow_statistics" to "anon";

grant delete on table "public"."workflow_statistics" to "authenticated";

grant insert on table "public"."workflow_statistics" to "authenticated";

grant references on table "public"."workflow_statistics" to "authenticated";

grant select on table "public"."workflow_statistics" to "authenticated";

grant trigger on table "public"."workflow_statistics" to "authenticated";

grant truncate on table "public"."workflow_statistics" to "authenticated";

grant update on table "public"."workflow_statistics" to "authenticated";

grant delete on table "public"."workflow_statistics" to "service_role";

grant insert on table "public"."workflow_statistics" to "service_role";

grant references on table "public"."workflow_statistics" to "service_role";

grant select on table "public"."workflow_statistics" to "service_role";

grant trigger on table "public"."workflow_statistics" to "service_role";

grant truncate on table "public"."workflow_statistics" to "service_role";

grant update on table "public"."workflow_statistics" to "service_role";

grant delete on table "public"."workflows_tags" to "anon";

grant insert on table "public"."workflows_tags" to "anon";

grant references on table "public"."workflows_tags" to "anon";

grant select on table "public"."workflows_tags" to "anon";

grant trigger on table "public"."workflows_tags" to "anon";

grant truncate on table "public"."workflows_tags" to "anon";

grant update on table "public"."workflows_tags" to "anon";

grant delete on table "public"."workflows_tags" to "authenticated";

grant insert on table "public"."workflows_tags" to "authenticated";

grant references on table "public"."workflows_tags" to "authenticated";

grant select on table "public"."workflows_tags" to "authenticated";

grant trigger on table "public"."workflows_tags" to "authenticated";

grant truncate on table "public"."workflows_tags" to "authenticated";

grant update on table "public"."workflows_tags" to "authenticated";

grant delete on table "public"."workflows_tags" to "service_role";

grant insert on table "public"."workflows_tags" to "service_role";

grant references on table "public"."workflows_tags" to "service_role";

grant select on table "public"."workflows_tags" to "service_role";

grant trigger on table "public"."workflows_tags" to "service_role";

grant truncate on table "public"."workflows_tags" to "service_role";

grant update on table "public"."workflows_tags" to "service_role";


  create policy "Canonical league config is manageable by service role"
  on "public"."canonical_league_config"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Canonical league config is viewable by authenticated users"
  on "public"."canonical_league_config"
  as permissive
  for select
  to authenticated
using (true);


CREATE TRIGGER trigger_update_bulbapedia_mechanics_updated_at BEFORE UPDATE ON public.bulbapedia_mechanics FOR EACH ROW EXECUTE FUNCTION public.update_bulbapedia_mechanics_updated_at();

CREATE TRIGGER canonical_league_config_updated_at BEFORE UPDATE ON public.canonical_league_config FOR EACH ROW EXECUTE FUNCTION public.update_canonical_league_config_updated_at();

CREATE TRIGGER trigger_update_smogon_meta_snapshot_updated_at BEFORE UPDATE ON public.smogon_meta_snapshot FOR EACH ROW EXECUTE FUNCTION public.update_smogon_meta_snapshot_updated_at();

CREATE TRIGGER workflow_version_increment BEFORE UPDATE ON public.workflow_entity FOR EACH ROW EXECUTE FUNCTION public.increment_workflow_version();


