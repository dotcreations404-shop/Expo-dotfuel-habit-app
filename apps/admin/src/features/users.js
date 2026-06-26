const sb = window.sb;

if (!window.usersData) {
  window.usersData = [];
}

async function getAdminHeaders() {
  const { data: { session } } = await sb.auth.getSession();
  const token = session ? session.access_token : '';
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  };
}

async function loadUsers() {
  const tbody = document.getElementById('users-tbody');
  try {
    const { data, error } = await withTimeout(
      sb.from('admin_user_view').select('*')
    );
    if (error) throw error;
    window.usersData = data || [];
    renderUsers(window.usersData);
  } catch (err) {
    if (tbody) tbody.innerHTML = `<tr class="empty-row"><td colspan="8" style="color:var(--red)">Error: ${err.message}</td></tr>`;
  }
}

const modeLabelsU = { burn:'🔥 Burn', belly_fat:'🎯 Belly Fat', slim_tone:'✨ Slim & Tone', build:'💪 Build', balance:'⚖️ Balance', reset:'🌱 Reset', perform:'⚡ Perform' };

function renderUsers(users) {
  const tbody = document.getElementById('users-tbody');
  const countEl = document.getElementById('users-count');
  const onboarded = users.filter(u => u.calorie_target).length;
  const incomplete = users.length - onboarded;
  const proCount   = users.filter(u => u.is_pro).length;

  document.getElementById('u-stat-total').textContent      = users.length;
  document.getElementById('u-stat-active').textContent     = onboarded;
  document.getElementById('u-stat-pro').textContent        = proCount;
  document.getElementById('u-stat-incomplete').textContent = incomplete;
  if (countEl) countEl.textContent = users.length + ' users · ' + proCount + ' Pro';

  if (!users.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="8">No users yet.</td></tr>';
    return;
  }

  tbody.innerHTML = users.map(u => {
    const name     = u.name || '—';
    const email    = u.email || u.id.slice(0, 8) + '...';
    const mode     = modeLabelsU[u.fuel_mode] || '—';
    const target   = u.calorie_target ? u.calorie_target.toLocaleString() + ' kcal' : '—';
    const streak   = u.streak_days ? u.streak_days + ' 🔥' : '—';
    const days     = u.days_logged || 0;
    const meals    = u.meal_count  || 0;
    const lastSeen = u.last_sign_in_at
      ? new Date(u.last_sign_in_at).toLocaleDateString('en-IN', { day:'numeric', month:'short' })
      : '—';
    const provider = u.provider || 'google';
    const initials = (u.name || u.email || '?')[0].toUpperCase();
    const isAdmin  = u.email === 'dotcreations404@gmail.com';
    const dotColor = u.calorie_target ? 'var(--lime)' : 'var(--muted)';
    const isPro    = u.is_pro || false;

    const proToggle = isAdmin
      ? `<span style="font-size:11px;color:var(--muted)">—</span>`
      : `<div onclick="toggleProUser('${u.id}',${isPro})"
              title="${isPro ? 'Click to revoke Pro' : 'Click to grant Pro'}"
              style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;user-select:none">
           <div style="position:relative;width:40px;height:22px;flex-shrink:0">
             <div style="position:absolute;inset:0;border-radius:11px;background:${isPro ? '#ffc107' : 'rgba(255,255,255,0.15)'};transition:background 0.2s"></div>
             <div style="position:absolute;top:2px;${isPro ? 'left:20px' : 'left:2px'};width:18px;height:18px;border-radius:50%;background:${isPro ? '#000' : '#888'};transition:left 0.2s"></div>
           </div>
           <span style="font-size:11px;font-weight:700;color:${isPro ? '#ffc107' : 'var(--muted)'}">${isPro ? 'Pro' : 'Free'}</span>
         </div>`;

    const actions = isAdmin
      ? `<span style="font-size:11px;color:var(--muted)">Protected</span>`
      : `<div class="action-btns">
           <button class="edit-btn" style="background:rgba(194,240,0,0.1);color:var(--lime)" onclick="syncUserStreak('${u.id}')">Sync</button>
           <button class="edit-btn" style="background:rgba(255,255,255,0.06);color:#fff" onclick="openDailyLogsModal('${u.id}','${(u.email||name).replace(/'/g,"\\'")}')">Logs</button>
           <button class="del-btn" onclick="confirmDeleteUser('${u.id}','${(u.email||name).replace(/'/g,"\\'")}')">Delete</button>
         </div>`;

    return `<tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:32px;height:32px;border-radius:50%;background:${dotColor};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;color:var(--black);flex-shrink:0">${initials}</div>
          <div>
            <div class="name-cell">${name}${isAdmin ? ' <span style="font-size:9px;background:rgba(194,240,0,0.15);color:var(--lime);padding:1px 6px;border-radius:6px;font-weight:800">ADMIN</span>' : ''}${isPro ? ' <span style="font-size:9px;background:rgba(255,193,7,0.15);color:#ffc107;padding:1px 6px;border-radius:6px;font-weight:800">⭐ PRO</span>' : ''}</div>
            <div class="meta-cell">${email}</div>
          </div>
        </div>
      </td>
      <td><span style="font-size:11px;font-weight:700;background:rgba(255,255,255,0.06);padding:3px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px">${provider}</span></td>
      <td class="meta-cell">${mode}</td>
      <td class="meta-cell">${target}</td>
      <td class="meta-cell">${days}</td>
      <td class="meta-cell">${meals}</td>
      <td class="meta-cell" style="white-space:nowrap">${lastSeen}</td>
      <td style="text-align:center">${proToggle}</td>
      <td>${actions}</td>
    </tr>`;
  }).join('');
}

function confirmDeleteUser(userId, identifier) {
  document.getElementById('delete-msg').textContent = `Permanently delete "${identifier}" and all their data? This cannot be undone.`;
  const btn = document.getElementById('delete-confirm-btn');
  btn.onclick = () => doDeleteUser(userId, identifier);
  document.getElementById('modal-delete').classList.add('open');
}

async function toggleProUser(userId, currentlyPro) {
  const grantPro = !currentlyPro;
  showToast(grantPro ? '⭐ Granting Pro...' : '🔄 Revoking Pro...');
  try {
    const { data: result, error } = await sb.functions.invoke('manage-pro', {
      body: { userId, grantPro }
    });
    if (error) throw new Error(error.message || 'Failed');
    if (result && result.error) throw new Error(result.error);

    // Update local cache and re-render
    const u = window.usersData.find(x => x.id === userId);
    if (u) u.is_pro = grantPro;
    renderUsers(window.usersData);
    showToast(grantPro ? '⭐ Pro ACTIVATED' : '✓ Pro revoked');
  } catch (err) {
    showToast('❌ Error: ' + err.message);
  }
}

async function doDeleteUser(userId, identifier) {
  closeModal('modal-delete');
  showToast('🗑️ DELETING USER...');

  try {
    const { data: result, error } = await sb.functions.invoke('delete-user', {
      body: { userId }
    });
    if (error) throw new Error(error.message || 'Delete failed');
    if (result && result.error) throw new Error(result.error);

    // Remove from local list and re-render
    window.usersData = window.usersData.filter(u => u.id !== userId);
    renderUsers(window.usersData);
    updateStats();
    showToast('✓ User deleted');
  } catch (err) {
    showToast('❌ Delete failed: ' + err.message);
  }
}


async function syncUserStreak(userId) {
  showToast('🔄 SYNCING USER DATA...');
  try {
    const { data: result, error } = await sb.functions.invoke('sync-user', {
      body: { userId }
    });
    if (error) throw new Error(error.message || 'Sync failed');
    if (result && result.error) throw new Error(result.error);
    
    showToast(`✓ Sync complete: 🔥 ${result.streak_days}`);
    
    // Update local cache and re-render
    const u = window.usersData.find(x => x.id === userId);
    if (u) {
      u.streak_days = result.streak_days;
      renderUsers(window.usersData);
    }
    
    if (typeof loadVol3Participants === 'function') {
      loadVol3Participants();
    }
  } catch (err) {
    showToast('❌ Sync failed: ' + err.message);
  }
}

// ── DAILY LOGS MODAL HANDLERS ──
function openDailyLogsModal(userId, nameOrEmail) {
  document.getElementById('daily-logs-userid').value = userId;
  document.getElementById('daily-logs-user-title').textContent = `Viewing logs for: ${nameOrEmail} (${userId})`;
  
  // Set date selector to today in local timezone
  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format
  document.getElementById('daily-logs-date').value = todayStr;
  
  document.getElementById('modal-daily-logs').classList.add('open');
  loadDailyLogForDate();
}

function closeDailyLogsModal() {
  document.getElementById('modal-daily-logs').classList.remove('open');
}

function loadDefaultTodayLog() {
  const todayStr = new Date().toLocaleDateString('en-CA');
  document.getElementById('daily-logs-date').value = todayStr;
  loadDailyLogForDate();
}

async function loadDailyLogForDate() {
  const userId = document.getElementById('daily-logs-userid').value;
  const date = document.getElementById('daily-logs-date').value;
  if (!userId || !date) return;

  showToast('🔄 Loading log...');
  
  // Clear inputs first
  document.getElementById('dl-calories').value = '';
  document.getElementById('dl-steps').value = '';
  document.getElementById('dl-protein').value = '';
  document.getElementById('dl-carbs').value = '';
  document.getElementById('dl-fat').value = '';
  document.getElementById('dl-water').value = '';
  document.getElementById('dl-score').value = '';
  document.getElementById('dl-tip').value = '';
  
  document.getElementById('vp-clean-meals').checked = false;
  document.getElementById('vp-workout').checked = false;
  document.getElementById('vp-read-page').checked = false;
  document.getElementById('vp-water-synced').checked = false;
  document.getElementById('vp-custom-task').checked = false;
  document.getElementById('vp-revival-applied').checked = false;
  document.getElementById('vp-calculated-success').checked = false;

  try {
    const { data: result, error } = await sb.functions.invoke('manage-user-logs', {
      body: { action: 'get', userId, date }
    });

    if (error) throw new Error(error.message);
    if (result && result.error) throw new Error(result.error);

    const { dailyLog, challengeProgress } = result;

    if (dailyLog) {
      document.getElementById('dl-calories').value = dailyLog.total_calories ?? '';
      document.getElementById('dl-steps').value = dailyLog.steps_count ?? '';
      document.getElementById('dl-protein').value = dailyLog.total_protein ?? '';
      document.getElementById('dl-carbs').value = dailyLog.total_carbs ?? '';
      document.getElementById('dl-fat').value = dailyLog.total_fat ?? '';
      document.getElementById('dl-water').value = dailyLog.water_ml ?? '';
      document.getElementById('dl-score').value = dailyLog.fuel_score ?? '';
      document.getElementById('dl-tip').value = dailyLog.fuel_coach_tip ?? '';
    }

    if (challengeProgress) {
      document.getElementById('vp-clean-meals').checked = !!challengeProgress.clean_meals;
      document.getElementById('vp-workout').checked = !!challengeProgress.workout;
      document.getElementById('vp-read-page').checked = !!challengeProgress.read_page;
      document.getElementById('vp-water-synced').checked = !!challengeProgress.water_synced_override;
      document.getElementById('vp-custom-task').checked = !!challengeProgress.custom_task_done;
      document.getElementById('vp-revival-applied').checked = !!challengeProgress.revival_applied;
      document.getElementById('vp-calculated-success').checked = !!challengeProgress.is_calculated_success;
    }

    showToast('✓ Logs loaded');
  } catch (err) {
    showToast('❌ Failed to load logs: ' + err.message);
  }
}

async function saveDailyLogData() {
  const userId = document.getElementById('daily-logs-userid').value;
  const date = document.getElementById('daily-logs-date').value;
  if (!userId || !date) return;

  const saveBtn = document.getElementById('dl-save-btn');
  saveBtn.disabled = true;
  showToast('💾 Saving logs...');

  const dataPayload = {
    calories: document.getElementById('dl-calories').value ? Number(document.getElementById('dl-calories').value) : null,
    steps: document.getElementById('dl-steps').value ? Number(document.getElementById('dl-steps').value) : null,
    protein: document.getElementById('dl-protein').value ? Number(document.getElementById('dl-protein').value) : null,
    carbs: document.getElementById('dl-carbs').value ? Number(document.getElementById('dl-carbs').value) : null,
    fat: document.getElementById('dl-fat').value ? Number(document.getElementById('dl-fat').value) : null,
    water: document.getElementById('dl-water').value ? Number(document.getElementById('dl-water').value) : null,
    score: document.getElementById('dl-score').value ? Number(document.getElementById('dl-score').value) : null,
    tip: document.getElementById('dl-tip').value || '',
    clean_meals: document.getElementById('vp-clean-meals').checked,
    workout: document.getElementById('vp-workout').checked,
    read_page: document.getElementById('vp-read-page').checked,
    water_synced: document.getElementById('vp-water-synced').checked,
    custom_task: document.getElementById('vp-custom-task').checked,
    revival_applied: document.getElementById('vp-revival-applied').checked,
    calculated_success: document.getElementById('vp-calculated-success').checked,
  };

  try {
    const { data: result, error } = await sb.functions.invoke('manage-user-logs', {
      body: {
        action: 'update',
        userId,
        date,
        data: dataPayload
      }
    });

    if (error) throw new Error(error.message);
    if (result && result.error) throw new Error(result.error);

    showToast('✓ Logs updated! Recalculating streak...');
    
    // Automatically trigger sync-user to update their streak_days
    await syncUserStreak(userId);
    
    closeDailyLogsModal();
  } catch (err) {
    showToast('❌ Failed to save: ' + err.message);
  } finally {
    saveBtn.disabled = false;
  }
}

window.getAdminHeaders = getAdminHeaders;
window.loadUsers = loadUsers;
window.renderUsers = renderUsers;
window.confirmDeleteUser = confirmDeleteUser;
window.toggleProUser = toggleProUser;
window.doDeleteUser = doDeleteUser;
window.syncUserStreak = syncUserStreak;

window.openDailyLogsModal = openDailyLogsModal;
window.closeDailyLogsModal = closeDailyLogsModal;
window.loadDailyLogForDate = loadDailyLogForDate;
window.loadDefaultTodayLog = loadDefaultTodayLog;
window.saveDailyLogData = saveDailyLogData;
