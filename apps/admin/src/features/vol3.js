const sb = window.sb;

let vol3ParticipantsData = [];
let vol3UsersMap = {}; // mapping user_id -> user data from admin_user_view

async function loadVol3Participants() {
  const tbody = document.getElementById('vol3-table-body');
  if (!tbody) return;

  try {
    // Fetch users first for name mapping if not already loaded
    if (!usersData || usersData.length === 0) {
      const { data: ud } = await sb.from('admin_user_view').select('*');
      if (ud) usersData = ud;
    }
    
    usersData.forEach(u => {
      vol3UsersMap[u.id] = u;
    });

    const { data, error } = await sb
      .from('challenge_vol3_participants')
      .select('*')
      .order('joined_at', { ascending: false });

    if (error) throw error;
    vol3ParticipantsData = data || [];
    renderVol3Table();
  } catch (err) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="6" style="color:var(--red)">Error: ${err.message}</td></tr>`;
  }
}

function renderVol3Table() {
  const tbody = document.getElementById('vol3-table-body');
  const searchStr = (document.getElementById('vol3-search')?.value || '').toLowerCase();
  const filterVal = document.getElementById('vol3-filter')?.value || 'all';

  if (!tbody) return;

  let filtered = vol3ParticipantsData.filter(p => {
    const userMeta = vol3UsersMap[p.user_id] || {};
    const name = (userMeta.full_name || userMeta.email || 'Unknown User').toLowerCase();
    
    let matchSearch = name.includes(searchStr) || p.user_id.toLowerCase().includes(searchStr);
    let matchFilter = true;

    if (filterVal !== 'all') {
      if (filterVal === 'suspended') {
        matchFilter = p.is_suspended === true;
      } else {
        matchFilter = p.status === filterVal;
      }
    }

    return matchSearch && matchFilter;
  });

  if (!filtered.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No participants match your criteria.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    const userMeta = vol3UsersMap[p.user_id] || {};
    const name = userMeta.full_name || userMeta.email || 'Unknown User';
    const email = userMeta.email || '';
    
    let statusBadge = '';
    if (p.is_suspended) {
      statusBadge = `<span style="background:rgba(255,59,59,0.15);color:#FF3B3B;padding:4px 10px;border-radius:12px;font-size:10px;font-weight:800;text-transform:uppercase;">Suspended</span>`;
    } else if (p.status === 'active') {
      statusBadge = `<span style="background:rgba(194,240,0,0.15);color:#C2F000;padding:4px 10px;border-radius:12px;font-size:10px;font-weight:800;text-transform:uppercase;">Active</span>`;
    } else if (p.status === 'completed') {
      statusBadge = `<span style="background:rgba(0,232,122,0.15);color:#00E87A;padding:4px 10px;border-radius:12px;font-size:10px;font-weight:800;text-transform:uppercase;">Completed</span>`;
    } else {
      statusBadge = `<span style="background:rgba(255,255,255,0.1);color:#aaa;padding:4px 10px;border-radius:12px;font-size:10px;font-weight:800;text-transform:uppercase;">Failed</span>`;
    }

    const d = new Date(p.joined_at);
    const dateStr = d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });

    return `
      <tr>
        <td>
          <div style="font-weight:700;color:#fff;margin-bottom:4px">${name}</div>
          <div style="font-size:11px;color:var(--muted)">${email}</div>
          <div style="font-size:9px;color:rgba(255,255,255,0.2);margin-top:2px">${p.user_id}</div>
        </td>
        <td>${statusBadge}</td>
        <td><div style="font-weight:800;font-size:14px;color:#fff">${p.revivals_remaining}</div></td>
        <td><div style="font-size:11px;color:var(--muted);max-width:150px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${(p.cut_list || []).join(', ')}">${p.cut_list && p.cut_list.length ? p.cut_list.join(', ') : 'None'}</div></td>
        <td style="color:var(--muted)">${dateStr}</td>
        <td style="text-align:right">
          <button onclick="openVol3EditModal('${p.user_id}')" style="background:var(--surface);border:1px solid var(--border);color:#fff;padding:6px 12px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;text-transform:uppercase;">Edit</button>
        </td>
      </tr>
    `;
  }).join('');
}

function filterVol3Users() {
  renderVol3Table();
}

function openVol3EditModal(userId) {
  const p = vol3ParticipantsData.find(x => x.user_id === userId);
  if (!p) return;

  document.getElementById('vol3-edit-userid').value = p.user_id;
  document.getElementById('vol3-edit-status').value = p.status || 'active';
  document.getElementById('vol3-edit-revivals').value = p.revivals_remaining;
  document.getElementById('vol3-edit-suspended').checked = p.is_suspended === true;
  document.getElementById('vol3-edit-notes').value = p.admin_notes || '';

  document.getElementById('vol3-edit-modal').style.display = 'flex';
}

function closeVol3EditModal() {
  document.getElementById('vol3-edit-modal').style.display = 'none';
}

async function saveVol3Participant() {
  const userId = document.getElementById('vol3-edit-userid').value;
  const status = document.getElementById('vol3-edit-status').value;
  const revivals = parseInt(document.getElementById('vol3-edit-revivals').value, 10);
  const isSuspended = document.getElementById('vol3-edit-suspended').checked;
  const notes = document.getElementById('vol3-edit-notes').value;

  try {
    const { error } = await sb
      .from('challenge_vol3_participants')
      .update({
        status: status,
        revivals_remaining: isNaN(revivals) ? 0 : revivals,
        is_suspended: isSuspended,
        admin_notes: notes
      })
      .eq('user_id', userId);

    if (error) throw error;
    
    closeVol3EditModal();
    loadVol3Participants(); // reload grid
  } catch (err) {
    alert('Error saving participant: ' + err.message);
  }
}

// Push Notification Logic (Stubbed for Admin Dashboard)
function openVol3PushModal() {
  document.getElementById('vol3-push-title').value = '';
  document.getElementById('vol3-push-body').value = '';
  document.getElementById('vol3-push-modal').style.display = 'flex';
}

function closeVol3PushModal() {
  document.getElementById('vol3-push-modal').style.display = 'none';
}

async function sendVol3Broadcast() {
  const title = document.getElementById('vol3-push-title').value.trim();
  const body = document.getElementById('vol3-push-body').value.trim();
  
  if (!title || !body) return alert('Title and Message are required.');

  // NOTE: Insert integration to existing push endpoint (e.g., Supabase Edge Function)
  // Example: await sb.functions.invoke('send-push', { body: { audience: 'all_vol3_active', title, message: body } })
  
  console.log('BROADCAST PUSH DISPATCHED:', { title, body, audience: 'all' });
  alert('Broadcast push initiated. (Edge Function integration required)');
  closeVol3PushModal();
}

async function sendVol3DirectPush() {
  const userId = document.getElementById('vol3-edit-userid').value;
  
  const title = prompt("Enter Direct Push Title:", "Admin Message");
  if (!title) return;
  
  const body = prompt("Enter Message Body:");
  if (!body) return;

  // NOTE: Insert integration to existing push endpoint for a single user
  // Example: await sb.functions.invoke('send-push', { body: { user_id: userId, title, message: body } })

  console.log('DIRECT PUSH DISPATCHED:', { title, body, user_id: userId });
  alert('Direct push sent to user ' + userId + '. (Edge Function integration required)');
}
window.loadVol3Participants = loadVol3Participants;
window.renderVol3Table = renderVol3Table;
window.filterVol3Users = filterVol3Users;
window.openVol3EditModal = openVol3EditModal;
window.closeVol3EditModal = closeVol3EditModal;
window.saveVol3Participant = saveVol3Participant;
window.openVol3PushModal = openVol3PushModal;
window.closeVol3PushModal = closeVol3PushModal;
window.sendVol3Broadcast = sendVol3Broadcast;
window.sendVol3DirectPush = sendVol3DirectPush;
