const sb = window.sb;

const tierColors = { gold:'color:#F5B400', silver:'color:#9E9E9E', bronze:'color:#CD7F32' };
function renderBadges() {
  const tbody = document.getElementById('badges-tbody');
  if (window.badges.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="5">No badges yet. Click + New Badge to add one.</td></tr>';
    return;
  }
  tbody.innerHTML = window.badges.map(b => `
    <tr>
      <td class="emoji-cell">${b.emoji || '🏆'}</td>
      <td><div class="name-cell">${b.name}</div></td>
      <td class="meta-cell">${b.description || ''}</td>
      <td><span style="font-size:12px;font-weight:700;text-transform:uppercase;${tierColors[b.tier] || ''}">${b.tier}</span></td>
      <td>
        <div class="action-btns">
          <button class="edit-btn" onclick="openEditBadge('${b.id}')">Edit</button>
          <button class="del-btn"  onclick="confirmDelete('badge','${b.id}','${b.name.replace(/'/g,"\\'")}')">Delete</button>
        </div>
      </td>
    </tr>`).join('');
}


window.renderBadges = renderBadges;
