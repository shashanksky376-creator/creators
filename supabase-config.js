// =====================================================
// Supabase Configuration — Affiliate PRO by Shashank
// =====================================================
// IMPORTANT: Replace the values below with your actual
// Supabase project URL and anon key from:
// supabase.com → Your Project → Settings → API
// =====================================================

const SUPABASE_URL = "YOUR_SUPABASE_URL";       // e.g. https://abcdefgh.supabase.co
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";  // long string starting with eyJ...

// Load the Supabase client library (loaded via CDN in each HTML page)
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

let supabase = null;

function initSupabase() {
  if (!supabase) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabase;
}

// -------------------------------------------------------
// AUTH: Send OTP to email
// -------------------------------------------------------
async function sendOTP(email) {
  const client = initSupabase();
  const { error } = await client.auth.signInWithOtp({
    email: email,
    options: {
      shouldCreateUser: false, // Only allow users who already exist in enrolled_users
    }
  });
  return { error };
}

// -------------------------------------------------------
// AUTH: Verify OTP entered by user
// -------------------------------------------------------
async function verifyOTP(email, otp) {
  const client = initSupabase();
  const { data, error } = await client.auth.verifyOtp({
    email: email,
    token: otp,
    type: "email",
  });
  return { data, error };
}

// -------------------------------------------------------
// ENROLLMENT CHECK: Is this user enrolled (paid)?
// -------------------------------------------------------
async function checkEnrollment(email) {
  const client = initSupabase();
  const { data, error } = await client
    .from("enrolled_users")
    .select("email")
    .eq("email", email)
    .single();

  if (error || !data) return false;
  return true;
}

// -------------------------------------------------------
// ENROLLMENT: Add user after successful Razorpay payment
// -------------------------------------------------------
async function enrollUser({ email, phone, razorpayPaymentId }) {
  const client = initSupabase();
  const { data, error } = await client
    .from("enrolled_users")
    .upsert([
      {
        email: email,
        phone: phone || null,
        razorpay_payment_id: razorpayPaymentId,
        enrolled_at: new Date().toISOString(),
      },
    ], { onConflict: "email" });

  return { data, error };
}

// -------------------------------------------------------
// SESSION: Get current logged-in user
// -------------------------------------------------------
async function getSession() {
  const client = initSupabase();
  const { data: { session } } = await client.auth.getSession();
  return session;
}

// -------------------------------------------------------
// AUTH: Sign out
// -------------------------------------------------------
async function signOut() {
  const client = initSupabase();
  await client.auth.signOut();
  window.location.href = "/claude-sales-page.html";
}
