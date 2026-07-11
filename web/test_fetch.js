const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
  const now = new Date();
  const next30 = new Date(now.getTime() + 30 * 60 * 60 * 1000);
  
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .is("result", null)
    .gt("kickoff", now.toISOString())
    .lt("kickoff", next30.toISOString())
    .order("kickoff")
    .limit(3);

  console.log("Error:", error);
  console.log("Data:", data);
}

main();
