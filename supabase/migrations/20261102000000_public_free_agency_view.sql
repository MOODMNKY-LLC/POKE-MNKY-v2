-- public free-agency projection
-- purpose: let anonymous team pages read sheet free-agency moves
-- affected: view public.v_public_free_agency
-- special: originally created with security_invoker=false so the view owner could
--           read transaction_audit without granting anon table SELECT. Later
--           20261114053802 flips the live view to security_invoker=true (caller
--           privileges + RLS). Do not revert to definer if audit is tightened —
--           use column grants on the public projection columns instead.
--           the projection lists only public move columns. do not add actor identifiers.

create or replace view public.v_public_free_agency
with (security_invoker = false) as
select
  a.id,
  a.season_id,
  a.team_id,
  t.name as team_name,
  a.action,
  nullif(a.payload ->> 'add', '') as added_name,
  nullif(a.payload ->> 'drop', '') as dropped_name,
  case
    when (a.payload ->> 'effective_week_inferred') ~ '^[0-9]+$'
      then (a.payload ->> 'effective_week_inferred')::integer
    else null
  end as effective_week,
  a.created_at
from public.transaction_audit a
join public.teams t on t.id = a.team_id
where a.action in (
  'free_agency_add',
  'free_agency_add_drop',
  'drop',
  'free_agency_transaction'
);

comment on view public.v_public_free_agency is
  'Free-agency moves safe for public pages. Omits actor discord ids and user ids.';

grant select on public.v_public_free_agency to anon, authenticated, service_role;
