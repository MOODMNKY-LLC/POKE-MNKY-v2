begin;

with current_season as (
  select id from seasons where is_current = true limit 1
),
seed as (
  select * from (values
    ('Hidden Mist MewTwo''s', 'Bryce', 'Kanto', 'Lance'),
    ('Leicester Lycanrocs', 'Bok Choy', 'Johto', 'Lance'),
    ('Twin River Tyranitars', 'Holly', 'Hoenn', 'Leon'),
    ('Boise State Mudsdales', 'Fouster', 'Sinnoh', 'Leon'),
    ('Grand Rapids Garchomps', 'Matt', 'Kanto', 'Lance'),
    ('Kalamazoo Kangaskhans', 'Andy W', 'Johto', 'Lance'),
    ('Jackson Jigglies', 'Mark', 'Hoenn', 'Leon'),
    ('Alabama Donphans', 'Jordan', 'Sinnoh', 'Leon'),
    ('Daycare Dittos', 'Pokegoat', 'Kanto', 'Lance'),
    ('Krazy Kecleon', 'Bfarias', 'Johto', 'Lance'),
    ('ToneBone Trouble Makers', 'Tony', 'Hoenn', 'Leon'),
    ('Manchester Milcerys', 'ShameWall', 'Sinnoh', 'Leon')
  ) as v(name, coach_name, division, conference)
)
insert into teams (
  name,
  coach_name,
  division,
  conference,
  season_id,
  wins,
  losses,
  differential,
  strength_of_schedule
)
select
  seed.name,
  seed.coach_name,
  seed.division,
  seed.conference,
  current_season.id,
  0,
  0,
  0,
  0
from seed, current_season
on conflict (name) do update
set
  coach_name = excluded.coach_name,
  division = excluded.division,
  conference = excluded.conference,
  season_id = excluded.season_id,
  wins = excluded.wins,
  losses = excluded.losses,
  differential = excluded.differential,
  strength_of_schedule = excluded.strength_of_schedule,
  updated_at = now();

delete from sheet_mappings
where config_id = 'b8b57a4c-de01-4c41-a33b-b547254a60e1'
  and sheet_name = 'Data'
  and table_name = 'teams';

insert into sheet_mappings (
  config_id,
  sheet_name,
  table_name,
  range,
  enabled,
  sync_order,
  column_mapping
) values (
  'b8b57a4c-de01-4c41-a33b-b547254a60e1',
  'Data',
  'teams',
  'A:N',
  true,
  1,
  '{}'::jsonb
);

commit;
