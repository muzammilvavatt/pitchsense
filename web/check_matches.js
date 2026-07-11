const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
  const { data, error } = await supabase.from('matches').select('*').order('kickoff');
  if (error) console.error(error);
  else console.table(data.map(m => ({ id: m.id, home: m.home_team, away: m.away_team, kickoff: m.kickoff, result: m.result })));
}

main();
