// =====================================================
// Auth Guard — protects pages that require login + enrollment
// Include AFTER supabase-config.js on any protected page
// =====================================================

(async function () {
  let session = await getSession();
 
  // If no session yet but we have an OAuth access token in the URL,
  // wait a moment for Supabase to process it.
  if (!session && window.location.hash.includes('access_token')) {
    await new Promise(r => setTimeout(r, 1000));
    session = await getSession();
  }

  if (!session) {
    window.location.href = "/login.html?reason=auth";
    return;
  }

  const email = session.user.email.toLowerCase();

  // Check enrollment
  const enrollment = await checkEnrollment(email);
  if (!enrollment) {
    await signOut();
    window.location.href = "/login.html?reason=not_enrolled";
    return;
  }

  // ---- Single-session enforcement ----
  let localToken = localStorage.getItem("affiliate_pro_session");
  
  // If no local token exists (e.g. user clicked a Magic Link or logged in with Google), 
  // we initialize it if they are already in our enrollment list.
  if (!localToken) {
    localToken = generateSessionToken();
    localStorage.setItem("affiliate_pro_session", localToken);
    
    // Update the DB so our local token matches
    const client = initSupabase();
    await client
      .from("enrolled_users")
      .update({ active_session_token: localToken })
      .eq("email", email);
    
    console.log("Initialized new session for direct login:", email);
    
    // We JUST set this, so we don't need to validate it immediately (race condition prevention)
  } else {
    const isValidSession = await validateActiveSession(email);
    if (!isValidSession) {
      window.location.href = "/index.html?reason=session_expired";
      return;
    }
  }

  // All good — store name for display
  window.ENROLLED_USER = {
    email: email,
    fullName: enrollment.full_name || "Student"
  };

  // Poll every 60s to catch remote logouts
  setInterval(async () => {
    const valid = await validateActiveSession(email);
    if (!valid) {
      window.location.href = "/index.html?reason=session_expired";
    }
  }, 60000);

  console.log("✅ Auth check passed for:", email);
})();
