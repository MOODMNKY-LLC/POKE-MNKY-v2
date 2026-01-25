const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

async function readEnv(key) {
  const env = fs.readFileSync(path.resolve(__dirname,'..','.env.local'),'utf8');
  const re = new RegExp('^\\s*'+key+'\\s*=\\s*(.*)$','im');
  const m = env.match(re);
  return m ? m[1].trim().replace(/^"|"$/g,'').replace(/\\r$/,'') : null;
}

async function main(){
  const serviceKey = await readEnv('SUPABASE_SERVICE_ROLE_KEY') || await readEnv('SUPABASE_SECRET_KEY');
  const base = await readEnv('SUPABASE_URL') || await readEnv('NEXT_PUBLIC_SUPABASE_URL') || 'http://127.0.0.1:65432';
  if(!serviceKey) { console.error('Service role key not found in .env.local'); process.exit(2) }
  const supabase = createClient(base, serviceKey, { auth: { persistSession:false }});

  // Demo coaches: email => team_slug
  const demo = [
    { email: 'coach2@example.com', team_slug: 'lancester-lycanrocs', display_name: 'Coach Two' },
    { email: 'coach3@example.com', team_slug: 'miami-blazin', display_name: 'Coach Three' },
    { email: 'coach4@example.com', team_slug: 'team-9', display_name: 'Coach Four' },
  ];

  for(const c of demo){
    console.log('Creating user', c.email);
    const pw = 'Test1234!';
    const { data: user, error: createErr } = await supabase.auth.admin.createUser({
      email: c.email,
      password: pw,
      email_confirm: true
    });
    if(createErr) {
      console.error('Create user error:', createErr.message || createErr);
      continue;
    }

    // find team id by slug
    const { data: team } = await supabase.from('teams').select('id').eq('slug', c.team_slug).limit(1).maybeSingle();
    const team_id = team?.id ?? null;

    // upsert profile
    const profile = {
      id: user.user.id,
      username: c.email.split('@')[0],
      display_name: c.display_name,
      role: 'coach',
      team_id,
    };
    const { error: pErr } = await supabase.from('profiles').upsert(profile).select();
    if(pErr) {
      console.error('Profile upsert error:', pErr);
      continue;
    }
    console.log('Created coach', c.email, '-> team', c.team_slug);
  }
  console.log('Demo coaches seeded.');
}

main().catch(e=>{ console.error(e); process.exit(1) });

