const sb = window.sb;

function openAddChallenge() {
  document.getElementById('ch-id').value       = '';
  document.getElementById('ch-name').value     = '';
  document.getElementById('ch-desc').value     = '';
  document.getElementById('ch-type').value     = 'diet';
  document.getElementById('ch-duration').value = '7';
  document.getElementById('ch-metric').value   = 'protein_target';
  document.getElementById('ch-value').value    = '1';
  document.getElementById('ch-active').value   = 'true';
  document.getElementById('ch-modal-title').textContent = 'New Challenge';
  document.getElementById('ch-modal-sub').textContent   = 'Add a new challenge to the app';
  document.getElementById('ch-save').textContent        = 'SAVE CHALLENGE →';
  selectedChallengeEmoji = '💪';
  setPickerEmoji('ch-emoji-picker', '💪', e => { selectedChallengeEmoji = e; });
  validateChallenge();
  document.getElementById('modal-challenge').classList.add('open');
}

function openEditChallenge(id) {
  const c = window.challenges.find(c => c.id === id);
  if (!c) return;
  document.getElementById('ch-id').value       = c.id;
  document.getElementById('ch-name').value     = c.name;
  document.getElementById('ch-desc').value     = c.description || '';
  document.getElementById('ch-type').value     = c.type;
  document.getElementById('ch-duration').value = c.duration_days;
  document.getElementById('ch-metric').value   = c.goal_metric;
  document.getElementById('ch-value').value    = c.goal_value;
  document.getElementById('ch-active').value   = String(c.is_active);
  document.getElementById('ch-modal-title').textContent = 'Edit Challenge';
  document.getElementById('ch-modal-sub').textContent   = 'Update challenge details';
  document.getElementById('ch-save').textContent        = 'SAVE CHANGES →';
  selectedChallengeEmoji = c.emoji || '💪';
  setPickerEmoji('ch-emoji-picker', c.emoji || '💪', e => { selectedChallengeEmoji = e; });
  validateChallenge();
  document.getElementById('modal-challenge').classList.add('open');
}

function validateChallenge() {
  const name = document.getElementById('ch-name').value.trim();
  const dur  = parseInt(document.getElementById('ch-duration').value);
  document.getElementById('ch-save').disabled = !(name && dur > 0);
}

async function saveChallenge() {
  const id       = document.getElementById('ch-id').value;
  const payload  = {
    name:         document.getElementById('ch-name').value.trim(),
    description:  document.getElementById('ch-desc').value.trim(),
    emoji:        selectedChallengeEmoji,
    type:         document.getElementById('ch-type').value,
    duration_days:parseInt(document.getElementById('ch-duration').value),
    goal_metric:  document.getElementById('ch-metric').value,
    goal_value:   parseInt(document.getElementById('ch-value').value) || 1,
    is_active:    document.getElementById('ch-active').value === 'true',
  };

  let error;
  if (id) {
    ({ error } = await sb.from('challenges').update(payload).eq('id', id));
  } else {
    ({ error } = await sb.from('challenges').insert(payload));
  }

  if (error) {
    showToast('❌ Error: ' + error.message);
  } else {
    closeModal('modal-challenge');
    await loadChallenges(); updateStats();
    showToast(id ? '✓ Challenge updated' : '✓ Challenge created');
  }
}


window.openAddChallenge = openAddChallenge;
window.openEditChallenge = openEditChallenge;
window.validateChallenge = validateChallenge;
window.saveChallenge = saveChallenge;
