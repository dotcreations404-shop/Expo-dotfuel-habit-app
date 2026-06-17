const sb = window.sb;

function openAddBadge() {
  document.getElementById('badge-id').value    = '';
  document.getElementById('badge-name').value  = '';
  document.getElementById('badge-desc').value  = '';
  document.getElementById('badge-tier').value  = 'silver';
  document.getElementById('badge-modal-title').textContent = 'New Badge';
  selectedBadgeEmoji = '🏆';
  setPickerEmoji('badge-emoji-picker', '🏆', e => { selectedBadgeEmoji = e; });
  validateBadge();
  document.getElementById('modal-badge').classList.add('open');
}

function openEditBadge(id) {
  const b = window.badges.find(b => b.id === id);
  if (!b) return;
  document.getElementById('badge-id').value    = b.id;
  document.getElementById('badge-name').value  = b.name;
  document.getElementById('badge-desc').value  = b.description || '';
  document.getElementById('badge-tier').value  = b.tier;
  document.getElementById('badge-modal-title').textContent = 'Edit Badge';
  selectedBadgeEmoji = b.emoji || '🏆';
  setPickerEmoji('badge-emoji-picker', b.emoji || '🏆', e => { selectedBadgeEmoji = e; });
  validateBadge();
  document.getElementById('modal-badge').classList.add('open');
}

function validateBadge() {
  const name = document.getElementById('badge-name').value.trim();
  document.getElementById('badge-save').disabled = !name;
}

async function saveBadge() {
  const id      = document.getElementById('badge-id').value;
  const payload = {
    name:        document.getElementById('badge-name').value.trim(),
    description: document.getElementById('badge-desc').value.trim(),
    emoji:       selectedBadgeEmoji,
    tier:        document.getElementById('badge-tier').value,
  };

  let error;
  if (id) {
    ({ error } = await sb.from('badges').update(payload).eq('id', id));
  } else {
    ({ error } = await sb.from('badges').insert(payload));
  }

  if (error) {
    showToast('❌ Error: ' + error.message);
  } else {
    closeModal('modal-badge');
    await loadBadges(); updateStats();
    showToast(id ? '✓ Badge updated' : '✓ Badge created');
  }
}


window.openAddBadge = openAddBadge;
window.openEditBadge = openEditBadge;
window.validateBadge = validateBadge;
window.saveBadge = saveBadge;
