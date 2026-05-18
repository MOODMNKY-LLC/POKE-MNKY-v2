begin;

delete from google_sheets_config
where spreadsheet_id = '1ezZTEqhLrE4id9EdXRIAd0J8hqiGE9dh9Ar5RvcPCLw';

insert into google_sheets_config (
  spreadsheet_id,
  enabled,
  sync_schedule
) values (
  '1ezZTEqhLrE4id9EdXRIAd0J8hqiGE9dh9Ar5RvcPCLw',
  true,
  'manual'
);

insert into league_config (
  config_type,
  section_title,
  section_type,
  content,
  subsections,
  embedded_tables,
  sheet_name,
  extracted_at
) values
(
  'rules',
  'League Conduct',
  'general_rules',
  'Coaches must be respectful of other coaches, property, and time. Team names are encouraged but must remain respectful. Matches must be completed within the weekly window. If one coach cannot make reasonable efforts, the result is a 0-3 loss. If both coaches cannot make reasonable efforts, the result is a 0-4 loss. Results are reported through the league docs workflow. Rule changes are voted on by the mods.',
  '[]'::jsonb,
  '[]'::jsonb,
  'Rules',
  now()
),
(
  'rules',
  'League Structure',
  'season_rules',
  'Teams must consist of at least 8 and no more than 10 Pokemon. The season draft budget is 120 points. The tera budget is 15 points. Coaches may make up to 10 free agency transactions through Week 8. Rosters lock after Week 6. Trades and free agency moves take effect the following Monday at 12:00 AM EST. The top 16 teams advance to playoffs, with the top 4 seeds determined by divisional leaders after Week 10.',
  '[]'::jsonb,
  '[]'::jsonb,
  'Rules',
  now()
),
(
  'rules',
  'Tera Rules',
  'battle_rules',
  'Each team may have up to 3 Tera Captains. Once Tera Types are set, coaches may change one non-primary Tera type once per season per Tera Captain at the cost of one free agency or trade transaction point. Tera Captains must retain their primary type as one of their allowed tera types. Stellar Tera type is banned.',
  '[]'::jsonb,
  '[]'::jsonb,
  'Rules',
  now()
)
on conflict (config_type, section_title) do update
set
  section_type = excluded.section_type,
  content = excluded.content,
  subsections = excluded.subsections,
  embedded_tables = excluded.embedded_tables,
  sheet_name = excluded.sheet_name,
  extracted_at = excluded.extracted_at,
  updated_at = now();

with current_season as (
  select id from seasons where is_current = true limit 1
)
insert into season_rules (
  season_id,
  rule_category,
  rule_key,
  rule_value
)
select
  current_season.id,
  v.rule_category,
  v.rule_key,
  v.rule_value
from current_season,
(
  values
    ('draft', 'draft_budget', to_jsonb(120)),
    ('draft', 'tera_budget', to_jsonb(15)),
    ('draft', 'roster_size_min', to_jsonb(8)),
    ('draft', 'roster_size_max', to_jsonb(10)),
    ('battle', 'transaction_cap', to_jsonb(10)),
    ('battle', 'free_agency_deadline_week', to_jsonb(8)),
    ('battle', 'roster_lock_week', to_jsonb(6)),
    ('battle', 'playoff_teams', to_jsonb(16)),
    ('battle', 'max_tera_captains', to_jsonb(3)),
    ('battle', 'stellar_tera_banned', to_jsonb(true)),
    ('battle', 'tera_type_change_cost', to_jsonb(1))
) as v(rule_category, rule_key, rule_value)
on conflict (season_id, rule_category, rule_key) do update
set rule_value = excluded.rule_value;

commit;
