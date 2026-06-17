const sb = window.sb;

function renderChallenges() {
  const tbody = document.getElementById('challenges-tbody');
  if (window.challenges.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="7">No challenges yet. Click + New Challenge to add one.</td></tr>';
    return;
  }
  const metricLabels = { protein_target:'Protein Target', calorie_target:'Calorie', fuel_score:'Fuel Score ≥', water_goal:'Water Goal', steps:'Steps ≥', morning_workout:'Morning Workout', food_variety:'Food Variety ≥', clean_meals:'Clean Meals/day ≥' };
  tbody.innerHTML = window.challenges.map(c => `
    <tr>
      <td class="emoji-cell">${c.emoji || '🎯'}</td>
      <td>
        <div class="name-cell">${c.name}</div>
        <div class="meta-cell">${c.description || ''}</div>
      </td>
      <td><span class="type-badge type-${c.type}">${c.type}</span></td>
      <td class="meta-cell">${c.duration_days} days</td>
      <td class="meta-cell">${metricLabels[c.goal_metric] || c.goal_metric} ${c.goal_value}</td>
      <td>
        <button class="toggle-btn ${c.is_active ? 'on' : 'off'}" onclick="toggleChallenge('${c.id}', ${c.is_active})">
          <div class="toggle-knob"></div>
        </button>
      </td>
      <td>
        <div class="action-btns">
          <button class="edit-btn" onclick="openEditChallenge('${c.id}')">Edit</button>
          <button class="del-btn"  onclick="confirmDelete('challenge','${c.id}','${c.name.replace(/'/g,"\\'")}')">Delete</button>
        </div>
      </td>
    </tr>`).join('');
}


window.renderChallenges = renderChallenges;
