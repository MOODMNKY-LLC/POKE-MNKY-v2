const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function readEnv(key) {
  const env = fs.readFileSync(path.resolve(__dirname,'..','.env.local'),'utf8');
  const re = new RegExp('^\\s*'+key+'\\s*=\\s*(.*)$','im');
  const m = env.match(re);
  return m ? m[1].trim().replace(/^"|"$/g,'').replace(/\r$/,'') : null;
}

async function main() {
  const serviceKey = readEnv('SUPABASE_SERVICE_ROLE_KEY') || readEnv('SUPABASE_SECRET_KEY');
  const base = readEnv('SUPABASE_URL') || readEnv('NEXT_PUBLIC_SUPABASE_URL') || 'http://127.0.0.1:65432';
  if (!serviceKey) {
    console.error('Supabase service role key not found in .env.local');
    process.exit(2);
  }
  const supabase = createClient(base, serviceKey, { auth: { persistSession: false }});

  const email = process.argv[2] || 'coach1@example.com';

  // Find user id by email
  // Try admin listUsers to find user by email
  let authId = null;
  try {
    const list = await supabase.auth.admin.listUsers({ per_page: 100 });
    const found = list.data.users.find(u => (u.email || '').toLowerCase() === email.toLowerCase());
    if (found) authId = found.id;
  } catch (e) {
    // fallback: attempt to query profiles by email-like username (best-effort)
  }
  if (!authId) {
    console.error('Could not locate auth user by email via admin API. Ensure service role key has admin rights.');
    process.exit(1);
  }
  console.log('Auth user id:', authId);

  // Find profile -> team_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('id,team_id,display_name,role')
    .eq('id', authId)
    .limit(1)
    .maybeSingle();
  if (!profile) {
    console.error('No profile found for auth user:', authId);
    process.exit(1);
  }
  console.log('Profile:', profile);
  if (!profile.team_id) {
    console.error('Profile has no team_id assigned.');
    process.exit(1);
  }
  const teamId = profile.team_id;

  // Find first scheduled match for this team in current season
  const { data: match } = await supabase
    .from('matches')
    .select('id,week,season_id,matchweek_id,status,team1_id,team2_id')
    .eq('season_id', supabase.rpc ? undefined : null) // no-op for compatibility
    .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
    .eq('is_playoff', false)
    .order('week', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!match) {
    console.error('No match found for team:', teamId);
    process.exit(1);
  }

  console.log('First match found:');
  console.log('match_id:', match.id);
  console.log('week:', match.week);
  console.log('season_id:', match.season_id);
  console.log('matchweek_id:', match.matchweek_id);
  console.log('status:', match.status);
}

main().catch(e=>{
  console.error('Fatal error', e);
  process.exit(1);
});

