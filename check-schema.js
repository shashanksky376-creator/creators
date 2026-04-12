const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://qezdknrauecfankgfhtt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlemRrbnJhdWVjZmFua2dmaHR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MTkyODcsImV4cCI6MjA4OTA5NTI4N30.wEZEMIUrB_Z4OqPcIl2ptPCHyiZY1xNWN8QexvRwk_0';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('enrolled_users').select('*').limit(1);
  fs.writeFileSync('schema.json', JSON.stringify(data[0], null, 2));
}
run();
