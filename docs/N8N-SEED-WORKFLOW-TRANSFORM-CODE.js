// Paste this into the "Transform and Filter to Supabase" Code node
// in workflow "Draft Pool Seed (Notion → Supabase)" (ID: iOxLpBtSr16lVVpc).
// Fixes: draft_pool_point_value_check (point_value must be 1-20).

// Seed workflow: filter 'Added to Draft Board' and transform to draft_pool rows
// Enforce point_value 1-20 (draft_pool_point_value_check)
function firstItem(value) {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  if (value.results && Array.isArray(value.results)) return value.results[0] ?? null;
  return value;
}
function getTitle(prop) {
  const arr = prop?.title;
  return Array.isArray(arr) && arr.length ? (arr[0]?.plain_text ?? null) : null;
}
function getNumber(prop) {
  return typeof prop?.number === 'number' ? prop.number : null;
}
function getSelectName(prop) {
  return prop?.select?.name ?? null;
}
function getCheckbox(prop) {
  return typeof prop?.checkbox === 'boolean' ? prop.checkbox : false;
}
function clampPointValue(n) {
  if (n == null || Number.isNaN(n)) return 12;
  const v = Math.round(Number(n));
  return Math.min(20, Math.max(1, v));
}
const season = $('Get Current Season').first().json;
const season_id = season?.id ?? null;
if (!season_id) throw new Error('No current season found');
const raw = $input.all();
const out = [];
for (const item of raw) {
  const page = firstItem(item.json);
  const props = page?.properties ?? page;
  if (!props) continue;
  const added = getCheckbox(props['Added to Draft Board']);
  if (!added) continue;
  const pokemon_name = getTitle(props['Name']);
  if (!pokemon_name) continue;
  const point_value = clampPointValue(getNumber(props['Point Value']));
  const status_raw = getSelectName(props['Status']);
  const status = status_raw ? String(status_raw).toLowerCase() : null;
  const tera_captain_eligible = getCheckbox(props['Tera Captain Eligible']);
  const pokemon_id = getNumber(props['Pokemon ID (PokeAPI)']);
  out.push({ json: { pokemon_name, point_value, status, tera_captain_eligible, pokemon_id, season_id, banned_reason: null } });
}
return out;
