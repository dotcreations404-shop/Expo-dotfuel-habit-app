const sb = window.sb;

sb.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_OUT' || !session) {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app-screen').style.display   = 'none';
    return;
  }
  if (session) {
    const email = session.user.email;
    if (email !== ADMIN_EMAIL) {
      await sb.auth.signOut();
      document.getElementById('login-err').style.display = 'block';
      return;
    }
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-screen').style.display   = 'block';
    document.getElementById('user-email').textContent      = email;
    document.getElementById('user-avatar').textContent     = email[0].toUpperCase();
    initEmojiPickers();
    // Non-blocking — show UI first, load data in background
    loadAll().catch(err => console.error('loadAll error:', err));
  }
});

// Check session on page load — ensures login screen shows even if
// onAuthStateChange doesn't fire for a pre-existing empty state
(async () => {
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
      document.getElementById('login-screen').style.display = 'flex';
      document.getElementById('app-screen').style.display   = 'none';
    }
  } catch (e) {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app-screen').style.display   = 'none';
  }
})();

async function signInGoogle() {
  await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.href }
  });
}
async function signOut() {
  await sb.auth.signOut();
}


window.signInGoogle = signInGoogle;
window.signOut = signOut;
