const { createClient } = require('@supabase/supabase-js');

// from web/.env.local
const SUPABASE_URL = "https://ijpuxusgcivfiyatgmac.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqcHV4dXNnY2l2Zml5YXRnbWFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MzgzOTksImV4cCI6MjA5OTExNDM5OX0.n7Qc5FQUfaSMHX5kxZMTeNzbzXITDD-cjbG5zGZOR6M";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
