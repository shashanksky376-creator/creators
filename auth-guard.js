// =====================================================
// Auth Guard — protects pages that require login + enrollment
// Include this script on any protected page (e.g. dashboard.html)
// =====================================================
// Usage:
//   1. Add <script src="supabase-config.js"></script> first
//   2. Add <script src="auth-guard.js"></script>
//   Optional: set window.REQUIRE_ENROLLMENT = false to only require login
// =====================================================

(async function () {
  const session = await getSession();

  if (!session) {
    // Not logged in → redirect to login
    window.location.href = "/login.html?reason=auth";
    return;
  }

  const email = session.user.email;
  const requireEnrollment = window.REQUIRE_ENROLLMENT !== false; // default: true

  if (requireEnrollment) {
    const enrolled = await checkEnrollment(email);
    if (!enrolled) {
      // Logged in but not a paid user
      await signOut();
      window.location.href = "/login.html?reason=not_enrolled";
      return;
    }
  }

  // User is authenticated and enrolled — page continues loading normally
  console.log("✅ Auth check passed for:", email);
})();
