const sb = window.sb;

window.challenges = []; window.badges = [];

async function loadAll() {
  // Load independently so one failure never blocks the other
  await Promise.allSettled([loadChallenges(), loadBadges()]);
  updateStats();
}

// Helper: race a promise against a timeout
function withTimeout(promise, ms = 8000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Query timed out after ' + ms + 'ms')), ms))
  ]);
}

async function loadChallenges() {
  const tbody = document.getElementById('challenges-tbody');
  try {
    const { data, error } = await withTimeout(
      sb.from('challenges').select('*').order('name')
    );
    if (error) throw error;
    window.challenges = data || [];
    renderChallenges();
  } catch (err) {
    window.challenges = [];
    if (tbody) tbody.innerHTML = `<tr class="empty-row"><td colspan="7" style="color:var(--red)">Failed to load: ${err.message}</td></tr>`;
  }
}

async function loadBadges() {
  const tbody = document.getElementById('badges-tbody');
  try {
    const { data, error } = await withTimeout(
      sb.from('badges').select('*').order('name')
    );
    if (error) throw error;
    window.badges = data || [];
    renderBadges();
  } catch (err) {
    window.badges = [];
    if (tbody) tbody.innerHTML = `<tr class="empty-row"><td colspan="5" style="color:var(--red)">Failed to load: ${err.message}</td></tr>`;
  }
}

function updateStats() {
  const active   = window.challenges.filter(c => c.is_active).length;
  const inactive = window.challenges.length - active;
  document.getElementById('stat-total').textContent    = window.challenges.length;
  document.getElementById('stat-active').textContent   = active;
  document.getElementById('stat-inactive').textContent = inactive;
  document.getElementById('stat-badges').textContent   = window.badges.length;
}


window.loadAll = loadAll;
window.withTimeout = withTimeout;
window.loadChallenges = loadChallenges;
window.loadBadges = loadBadges;
window.updateStats = updateStats;
