-- Tera assignment window: store resolution (assignments) when coach completes the window.
-- Applied at trade execution so draft_picks get is_tera_captain + tera_types.

alter table public.tera_assignment_windows
  add column if not exists resolution jsonb;

comment on column public.tera_assignment_windows.resolution is 'When completed with action=assign: { "assignments": [ { "pokemon_id": "uuid", "tera_types": ["type1","type2","type3"] } ] }. Applied to draft_picks at trade execution.';
