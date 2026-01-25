const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

function readEnv(key) {
  const env = fs.readFileSync(path.resolve(__dirname,'..','.env.local'),'utf8');
  const re = new RegExp('^\\s*'+key+'\\s*=\\s*(.*)$','im');
  const m = env.match(re);
  return m ? m[1].trim().replace(/^"|"$/g,'').replace(/\\r$/,'') : null;
}

async function main(){
  const SUPABASE_URL = readEnv('SUPABASE_URL') || readEnv('NEXT_PUBLIC_SUPABASE_URL') || 'http://127.0.0.1:65432';
  const ANON_KEY = readEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') || readEnv('SUPABASE_ANON_KEY');
  const APP_URL = readEnv('APP_URL') || readEnv('NEXT_PUBLIC_APP_URL') || 'http://localhost:3000';
  if(!ANON_KEY){
    console.error('Anon key not found in .env.local');
    process.exit(1);
  }

  // 1) get match info using admin helper
  let stdout = '';
  try {
    stdout = execSync(`node scripts/print_first_match.js coach1@example.com`, { encoding: 'utf8', stdio: ['pipe','pipe','pipe'] });
  } catch(e){
    console.error('Failed to run print_first_match.js', e.message);
    process.exit(1);
  }
  // parse match_id, season_id, matchweek_id, week
  const matchIdLine = stdout.split(/\\r?\\n/).find(l=>l.includes('match_id:'));
  const seasonLine = stdout.split(/\\r?\\n/).find(l=>l.includes('season_id:'));
  const matchweekLine = stdout.split(/\\r?\\n/).find(l=>l.includes('matchweek_id:'));
  const weekLine = stdout.split(/\\r?\\n/).find(l=>l.includes('week:'));
  const match_id = matchIdLine ? matchIdLine.split('match_id:')[1].trim() : '';
  const season_id = seasonLine ? seasonLine.split('season_id:')[1].trim() : '';
  const matchweek_id = matchweekLine ? matchweekLine.split('matchweek_id:')[1].trim() : '';
  const week_number = weekLine ? weekLine.split('week:')[1].trim() : '1';

  // 2) sign in as coach1 to get access token
  const supabase = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false }});
  const email = 'coach1@example.com';
  const password = 'Test1234!';
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if(error || !data?.session?.access_token){
    console.error('Failed to sign in for access token', error?.message || 'no token');
    process.exit(1);
  }
  const ACCESS_TOKEN = data.session.access_token;

  // Print Postman environment variables
  console.log('POSTMAN_ENV_VARS:');
  console.log(`APP_URL=${APP_URL}`);
  console.log(`SUPABASE_URL=${SUPABASE_URL}`);
  console.log(`MATCH_ID=${match_id}`);
  console.log(`SEASON_ID=${season_id}`);
  console.log(`MATCHWEEK_ID=${matchweek_id}`);
  console.log(`WEEK_NUMBER=${week_number}`);
  console.log(`ACCESS_TOKEN=${ACCESS_TOKEN}`);
}

main().catch(e=>{ console.error(e); process.exit(1) });

