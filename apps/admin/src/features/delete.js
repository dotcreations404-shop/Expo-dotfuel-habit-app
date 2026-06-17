const sb = window.sb;

function confirmDelete(type, id, name) {
  document.getElementById('delete-msg').textContent = `Delete "${name}"? This cannot be undone.`;
  const btn = document.getElementById('delete-confirm-btn');
  btn.onclick = () => doDelete(type, id);
  document.getElementById('modal-delete').classList.add('open');
}

async function doDelete(type, id) {
  const table = type === 'challenge' ? 'challenges' : 'badges';
  const { error } = await sb.from(table).delete().eq('id', id);
  closeModal('modal-delete');
  if (error) {
    showToast('❌ Error: ' + error.message);
  } else {
    if (type === 'challenge') { await loadChallenges(); }
    else                      { await loadBadges(); }
    updateStats();
    showToast('🗑️ Deleted successfully');
  }
}


window.confirmDelete = confirmDelete;
window.doDelete = doDelete;
