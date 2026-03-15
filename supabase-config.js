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
  const cleanEmail = email.toLowerCase().trim();

  // Pre-check: Is this user even in our enrolled list?
  const enrollment = await checkEnrollment(cleanEmail);
  if (!enrollment) {
    return { error: { message: "This email is not enrolled. Please purchase the course first." } };
  }

  // shouldCreateUser: true allows the auth user to be created on first login
  // We already verified they are in our 'enrolled_users' table above.
  const { error } = await client.auth.signInWithOtp({
    email: cleanEmail,
    options: { shouldCreateUser: true } 
  });
  return { error };
}

// -------------------------------------------------------
// AUTH: Verify OTP + write new session token (kicks out old session)
// -------------------------------------------------------
async function verifyOTP(email, otp) {
  const client = initSupabase();
  const cleanEmail = email.toLowerCase().trim();
  const { data, error } = await client.auth.verifyOtp({
    email: cleanEmail,
    token: otp,
    type: "email",
  });

  if (!error) {
    // Write a new session token — this invalidates any other device's session
    const sessionToken = generateSessionToken();
    
    // Store with user-specific keys to avoid stale tokens from other users
    localStorage.setItem(`af_pro_session_${cleanEmail}`, sessionToken);
    localStorage.setItem("affiliate_pro_last_user", cleanEmail);

    const { error: updateError } = await client
      .from("enrolled_users")
      .update({ active_session_token: sessionToken })
      .eq("email", cleanEmail);
      
    if (updateError) {
      console.error("Failed to update active session token in DB:", updateError);
    } else {
      console.log("Session token updated successfully for:", cleanEmail);
    }
  }

  return { data, error };
}

// -------------------------------------------------------
// ENROLLMENT CHECK: Is this user enrolled (paid)?
// Returns: false | { email, full_name, active_session_token }
// -------------------------------------------------------
async function checkEnrollment(email) {
  const client = initSupabase();
  const cleanEmail = email.toLowerCase().trim();
  const { data, error } = await client
    .from("enrolled_users")
    .select("email, full_name, active_session_token")
    .eq("email", cleanEmail)
    .single();

  if (error || !data) return false;
  return data;
}

// -------------------------------------------------------
// SESSION CHECK: Validate current session is still the active one
// (Prevents two users logged in simultaneously on the same account)
// -------------------------------------------------------
async function validateActiveSession(email) {
  const cleanEmail = email.toLowerCase().trim();
  const localToken = localStorage.getItem(`af_pro_session_${cleanEmail}`);
  
  if (!localToken) {
    console.warn("No local session token found for:", cleanEmail);
    return false;
  }

  try {
    const enrollment = await checkEnrollment(cleanEmail);
    if (!enrollment) return false;

    // If DB has no token yet, this might be a first-time login or transition.
    // We allow it to pass and the auth-guard will initialize it.
    if (!enrollment.active_session_token) {
      console.log("No token in DB yet for:", cleanEmail);
      return true;
    }

    // If DB token differs from local token, another device has logged in
    if (enrollment.active_session_token !== localToken) {
      console.error("Session mismatch! Other device likely logged in.", {
        db: enrollment.active_session_token,
        local: localToken
      });
      await signOut();
      return false;
    }

    return true;
  } catch (e) {
    console.error("Error validating session:", e);
    // On network error, we don't kick the user out immediately to avoid frustration
    return true; 
  }
}

// -------------------------------------------------------
// ENROLLMENT: Add user after successful Razorpay payment
// -------------------------------------------------------
async function enrollUser({ fullName, email, phone, razorpayPaymentId }) {
  const client = initSupabase();
  const cleanEmail = email.toLowerCase().trim();
  const { data, error } = await client
    .from("enrolled_users")
    .upsert([{
      full_name: fullName || "",
      email: cleanEmail,
      phone: phone || null,
      razorpay_payment_id: razorpayPaymentId,
      enrolled_at: new Date().toISOString(),
    }], { onConflict: "email" });

  return { data, error };
}

// -------------------------------------------------------
// AUTH: Sign in with Google (OAuth)
// -------------------------------------------------------
async function signInWithGoogle() {
  const client = initSupabase();
  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/dashboard.html'
    }
  });
  return { error };
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
  const client = initSupabase();
  
  // Get current user to clear their specific token
  const { data: { user } } = await client.auth.getUser();
  if (user && user.email) {
    const cleanEmail = user.email.toLowerCase().trim();
    localStorage.removeItem(`af_pro_session_${cleanEmail}`);
  }
  
  localStorage.removeItem("affiliate_pro_last_user");
  await client.auth.signOut();
  window.location.href = "/index.html";
}
