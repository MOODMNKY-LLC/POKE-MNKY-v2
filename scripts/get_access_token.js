const fs = require('fs');
const path = require('path');
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
  if(!ANON_KEY){ console.error('Anon key not found'); process.exit(1) }

  const supabase = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession:false }});
  const email = process.argv[2] || 'coach1@example.com';
  const password = process.argv[3] || 'Test1234!';
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if(error){ console.error('SignIn error:', error); process.exit(1) }
  console.log(data.session.access_token);
}

main().catch(e=>{ console.error(e); process.exit(1) });

