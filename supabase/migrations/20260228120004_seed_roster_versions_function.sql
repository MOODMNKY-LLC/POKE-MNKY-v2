-- CHATGPT-V3: Seed team_roster_versions for a season/week from current draft_picks (active).
-- Call from app or cron when a new week starts or for backfill.
-- Refs: plan Phase C.1

create or replace function public.seed_roster_versions_for_week(
  p_season_id uuid,
  p_week_number integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_snapshot jsonb;
begin
  for r in
    select
      dp.team_id,
      jsonb_agg(
        jsonb_build_object(
          'pokemon_id', dp.pokemon_id,
          'points', dp.points_snapshot,
          'is_tera_captain', false,
          'tera_types', '[]'::jsonb
        )
      ) as snapshot
    from draft_picks dp
    where dp.season_id = p_season_id
      and dp.status = 'active'
    group by dp.team_id
  loop
    insert into team_roster_versions (
      team_id,
      season_id,
      week_number,
      snapshot
    ) values (
      r.team_id,
      p_season_id,
      p_week_number,
      r.snapshot
    )
    on conflict (team_id, season_id, week_number)
    do update set snapshot = excluded.snapshot;
  end loop;
end;
$$;

comment on function public.seed_roster_versions_for_week is 'Build team_roster_versions for a season/week from active draft_picks. Use for week 1 seed or backfill.';

grant execute on function public.seed_roster_versions_for_week(uuid, integer) to service_role;
grant execute on function public.seed_roster_versions_for_week(uuid, integer) to authenticated;
