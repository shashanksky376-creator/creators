const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = "https://qezdknrauecfankgfhtt.supabase.co";
// From supabase-config.js (anon key) or service role. Anon key is okay for upserts with RLS? 
// No, we need the Service Role Key for upserting users from backend script, or we can just use the ANON key if RLS allows it.
// Let's check RLS for enrolled_users. rzp-sync.html uses Anon key to delete!
// "const db = window.supabase.createClient( ... "  then db.from('enrolled_users').delete().eq...
// So ANON key has full auth. Let's use the ANON key.
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlemRrbnJhdWVjZmFua2dmaHR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MTkyODcsImV4cCI6MjA4OTA5NTI4N30.wEZEMIUrB_Z4OqPcIl2ptPCHyiZY1xNWN8QexvRwk_0";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const usersToAdd = [
  {
    full_name: "Student",
    email: "shashisy8422841@gmail.com",
    phone: "9035025830",
    razorpay_payment_id: "pay_Sbo3gPr8EBebZA",
    enrolled_at: new Date('2026-04-10T18:58:00+05:30').toISOString()
  },
  {
    full_name: "Student",
    email: "vajayalaxmijadhav1985@gmail.com",
    phone: "9148221495",
    razorpay_payment_id: "pay_SbnsuYI3DeQev6",
    enrolled_at: new Date('2026-04-10T18:48:00+05:30').toISOString()
  },
  {
    full_name: "Student",
    email: "ms2094894@gmail.com",
    phone: "9148102860",
    razorpay_payment_id: "pay_Sbnohw991A9tDj",
    enrolled_at: new Date('2026-04-10T18:44:00+05:30').toISOString()
  },
  {
    full_name: "Student",
    email: "upparajay203@gmail.com",
    phone: "7619521629",
    razorpay_payment_id: "pay_SbnloEaaR8zvDW",
    enrolled_at: new Date('2026-04-10T18:41:00+05:30').toISOString()
  },
  {
    full_name: "Student",
    email: "priyankagujetti97@gmail.com",
    phone: "7204258144",
    razorpay_payment_id: "pay_Sb0o7BlhaTUkQQ",
    enrolled_at: new Date('2026-04-08T18:47:00+05:30').toISOString()
  }
];

async function syncUsers() {
  for (const u of usersToAdd) {
    const { data, error } = await supabase
      .from('enrolled_users')
      .upsert([u], { onConflict: "email" });
    
    if (error) {
      console.error(`Failed to add ${u.email}:`, error.message);
    } else {
      console.log(`Successfully added ${u.email}`);
    }
  }
  console.log('Sync complete.');
}

syncUsers();
