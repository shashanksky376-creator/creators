// =====================================================
// Auth Guard — protects pages that require login + enrollment
// Include AFTER supabase-config.js on any protected page
// =====================================================

(async function () {
  let session = await getSession();

  // If no session yet but we have an OAuth access token in the URL,
  // wait a moment for Supabase to process it.
  if (!session && window.location.hash.includes('access_token')) {
    await new Promise(r => setTimeout(r, 2000));
    session = await getSession();
  }

  if (!session) {
    window.location.href = "/login.html?reason=auth";
    return;
  }

  const email = session.user.email.toLowerCase().trim();

  // Check enrollment — only requirement is the email exists in enrolled_users
  const enrollment = await checkEnrollment(email);
  if (!enrollment) {
    console.warn("Not enrolled:", email);
    window.location.replace("/login.html?reason=not_enrolled");
    return;
  }

  // All good — store user info globally for use by the page
  window.ENROLLED_USER = {
    email: enrollment.email,
    fullName: enrollment.full_name || "Student",
    videoAccessRequested: enrollment.video_access_requested || false,
    videoAccessGranted: enrollment.video_access_granted || false
  };
  window.IS_ADMIN = isAdmin(email);

  console.log("✅ Auth check passed for:", email);
})();
