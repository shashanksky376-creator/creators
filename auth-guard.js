// =====================================================
// Auth Guard — protects pages that require login + enrollment
// Include AFTER supabase-config.js on any protected page
// =====================================================

(async function () {
  const session = await getSession();

  if (!session) {
    window.location.href = "/login.html?reason=auth";
    return;
  }

  const email = session.user.email;

  // Check enrollment
  const enrollment = await checkEnrollment(email);
  if (!enrollment) {
    await signOut();
    window.location.href = "/login.html?reason=not_enrolled";
    return;
  }

  // ---- Single-session enforcement ----
  // If a different device/browser has logged in after this one,
  // the DB token will differ from our local token → sign out this device.
  const isValidSession = await validateActiveSession(email);
  if (!isValidSession) {
    // signOut() is called inside validateActiveSession if mismatch
    // Just in case it didn't redirect:
    window.location.href = "/login.html?reason=session_expired";
    return;
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
      window.location.href = "/login.html?reason=session_expired";
    }
  }, 60000);

  console.log("✅ Auth check passed for:", email);
})();
