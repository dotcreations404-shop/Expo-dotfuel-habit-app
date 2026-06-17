const sb = window.sb;

function switchTab(tab, el) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('tab-challenges').style.display = tab === 'challenges' ? 'block' : 'none';
  document.getElementById('tab-badges').style.display     = tab === 'badges'     ? 'block' : 'none';
  document.getElementById('tab-flags').style.display      = tab === 'flags'      ? 'block' : 'none';
  document.getElementById('tab-feedback').style.display   = tab === 'feedback'   ? 'block' : 'none';
  document.getElementById('tab-users').style.display      = tab === 'users'      ? 'block' : 'none';
  document.getElementById('tab-recipes').style.display    = tab === 'recipes'    ? 'block' : 'none';
  document.getElementById('tab-vol3').style.display       = tab === 'vol3'       ? 'block' : 'none';
  if (tab === 'flags')    loadFeatureFlags();
  if (tab === 'feedback') loadFeedback();
  if (tab === 'users')    loadUsers();
  if (tab === 'recipes')  loadAdminRecipes();
  if (tab === 'vol3')     loadVol3Participants();
}


window.switchTab = switchTab;
