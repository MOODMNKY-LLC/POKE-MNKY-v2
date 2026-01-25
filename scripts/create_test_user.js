const fs = require('fs');
const path = require('path');
async function main(){
  const env = fs.readFileSync(path.resolve(__dirname,'..','.env.local'),'utf8');
  const get = (key)=> {
    const re = new RegExp('^\\s*'+key+'\\s*=\\s*(.*)$','im');
    const m = env.match(re);
    if(!m) return null;
    return m[1].trim().replace(/^\"|\"$/g,'').replace(/\\r$/,'');
  }
  const serviceKey = get('SUPABASE_SERVICE_ROLE_KEY') || get('SUPABASE_SECRET_KEY') || get('SUPABASE_SERVICE_ROLE_KEY');
  const base = get('SUPABASE_URL') || get('NEXT_PUBLIC_SUPABASE_URL') || 'http://127.0.0.1:65432';
  if(!serviceKey){ console.error('service role key not found in .env.local'); process.exit(2) }
  const url = base.replace(/\"/g,'');
  // Use supabase-js admin method
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false }});
  const payload = { email: 'coach1@example.com', password: 'Test1234!', email_confirm: true };
  const { data, error } = await supabase.auth.admin.createUser(payload);
  if(error){
    console.error('ERROR', error.message || error);
    process.exit(2);
  }
  console.log(JSON.stringify(data, null, 2));
}
main().catch(e=>{ console.error(e); process.exit(1) });

