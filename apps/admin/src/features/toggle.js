const sb = window.sb;

async function toggleChallenge(id, currentState) {
  const newState = !currentState;
  const { error } = await sb.from('challenges').update({ is_active: newState }).eq('id', id);
  if (!error) {
    const c = window.challenges.find(c => c.id === id);
    if (c) c.is_active = newState;
    renderChallenges(); updateStats();
    showToast(newState ? '✅ Challenge visible to users' : '🙈 Challenge hidden');
  }
}


window.toggleChallenge = toggleChallenge;
