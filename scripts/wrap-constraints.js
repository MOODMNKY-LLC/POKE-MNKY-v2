const fs = require('fs');
const path = 'supabase/migrations/20260118175907_remote_schema.sql';
let sql = fs.readFileSync(path, 'utf8');
const pattern = /^alter table "public"."([^"]+)" add constraint "([^"]+)" (FOREIGN KEY|CHECK|UNIQUE)([^\n]+);$/gm;
sql = sql.replace(pattern, (m, table, conname, type, rest) => {
  return 'do $$ begin if not exists (select 1 from pg_constraint where conname = \'' + conname + '\') then alter table "public"."' + table + '" add constraint "' + conname + '" ' + type + rest + '; end if; end $$;';
});
fs.writeFileSync(path, sql);
console.log('Done');
