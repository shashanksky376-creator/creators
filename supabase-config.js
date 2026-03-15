// =====================================================
// Supabase Configuration — Affiliate PRO by Shashank
// Replace SUPABASE_URL and SUPABASE_ANON_KEY below
// with values from: supabase.com → Project → Settings → API
// =====================================================

const SUPABASE_URL = "https://qezdknrauecfankgfhtt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlemRrbnJhdWVjZmFua2dmaHR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MTkyODcsImV4cCI6MjA4OTA5NTI4N30.wEZEMIUrB_Z4OqPcIl2ptPCHyiZY1xNWN8QexvRwk_0";

let _supabase = null;

function initSupabase() {
  if (!_supabase) {
    _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _supabase;
}

// -------------------------------------------------------
// GENERATE a random session token for single-session enforcement
// -------------------------------------------------------
function generateSessionToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// -------------------------------------------------------
// AUTH: Send OTP to email (only if enrolled)
// -------------------------------------------------------
async function sendOTP(email) {
  const client = initSupabase();
  const { error } = await client.auth.signInWithOtp({
    email: email,
    options: { shouldCreateUser: false }
  });
  return { error };
}

// -------------------------------------------------------
// AUTH: Verify OTP + write new session token (kicks out old session)
// -------------------------------------------------------
async function verifyOTP(email, otp) {
  const client = initSupabase();
  const { data, error } = await client.auth.verifyOtp({
    email: email,
    token: otp,
    type: "email",
  });

  if (!error) {
    // Write a new session token — this invalidates any other device's session
    const sessionToken = generateSessionToken();
    localStorage.setItem("affiliate_pro_session", sessionToken);

    await client
      .from("enrolled_users")
      .update({ active_session_token: sessionToken })
      .eq("email", email);
  }

  return { data, error };
}

// -------------------------------------------------------
// ENROLLMENT CHECK: Is this user enrolled (paid)?
// Returns: false | { email, full_name, active_session_token }
// -------------------------------------------------------
async function checkEnrollment(email) {
  const client = initSupabase();
  const { data, error } = await client
    .from("enrolled_users")
    .select("email, full_name, active_session_token")
    .eq("email", email)
    .single();

  if (error || !data) return false;
  return data;
}

// -------------------------------------------------------
// SESSION CHECK: Validate current session is still the active one
// (Prevents two users logged in simultaneously on the same account)
// -------------------------------------------------------
async function validateActiveSession(email) {
  const localToken = localStorage.getItem("affiliate_pro_session");
  if (!localToken) return false;

  const enrollment = await checkEnrollment(email);
  if (!enrollment) return false;

  // If DB token differs from local token, another device has logged in
  if (enrollment.active_session_token !== localToken) {
    await signOut();
    return false;
  }

  return true;
}

// -------------------------------------------------------
// ENROLLMENT: Add user after successful Razorpay payment
// -------------------------------------------------------
async function enrollUser({ fullName, email, phone, razorpayPaymentId }) {
  const client = initSupabase();
  const { data, error } = await client
    .from("enrolled_users")
    .upsert([{
      full_name: fullName || "",
      email: email,
      phone: phone || null,
      razorpay_payment_id: razorpayPaymentId,
      enrolled_at: new Date().toISOString(),
    }], { onConflict: "email" });

  return { data, error };
}

// -------------------------------------------------------
// SESSION: Get current logged-in Supabase session
// -------------------------------------------------------
async function getSession() {
  const client = initSupabase();
  const { data: { session } } = await client.auth.getSession();
  return session;
}

// -------------------------------------------------------
// AUTH: Sign out and clear local session token
// -------------------------------------------------------
async function signOut() {
  localStorage.removeItem("affiliate_pro_session");
  const client = initSupabase();
  await client.auth.signOut();
  window.location.href = "/index.html";
}
