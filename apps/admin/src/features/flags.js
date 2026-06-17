const sb = window.sb;

let featureFlags = [];

async function loadFeatureFlags() {
  const tbody = document.getElementById('flags-tbody');
  try {
    const { data, error } = await sb.from('feature_flags').select('*').order('label');
    if (error) throw error;
    featureFlags = data || [];
    renderFeatureFlags();
  } catch (err) {
    featureFlags = [];
    if (tbody) tbody.innerHTML = `<tr class="empty-row"><td colspan="4" style="color:var(--red)">Error: ${err.message}</td></tr>`;
  }
}

function renderFeatureFlags() {
  const tbody = document.getElementById('flags-tbody');
  if (!featureFlags.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="4">No feature flags configured.</td></tr>';
    return;
  }
  tbody.innerHTML = featureFlags.map(f => `
    <tr>
      <td><div class="name-cell">${f.label}</div><div class="meta-cell" style="font-family:monospace;font-size:11px">${f.key}</div></td>
      <td>
        <button class="toggle-btn ${f.is_enabled ? 'on' : 'off'}" onclick="toggleFlag('${f.id}','enabled',${f.is_enabled})">
          <div class="toggle-knob"></div>
        </button>
        <div style="font-size:10px;color:var(--muted);margin-top:4px;text-align:center">${f.is_enabled ? 'Enabled' : 'Disabled'}</div>
      </td>
      <td>
        <button class="toggle-btn ${f.is_greyed_out ? 'on' : 'off'}" style="${f.is_greyed_out ? 'background:var(--muted)' : ''}" onclick="toggleFlag('${f.id}','greyed',${f.is_greyed_out})">
          <div class="toggle-knob"></div>
        </button>
        <div style="font-size:10px;color:var(--muted);margin-top:4px;text-align:center">${f.is_greyed_out ? 'Greyed out' : 'Normal'}</div>
      </td>
      <td>
        <span style="font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;text-transform:uppercase;${f.is_enabled && !f.is_greyed_out ? 'background:rgba(0,232,122,0.12);color:var(--green)' : 'background:rgba(255,255,255,0.06);color:var(--muted)'}">
          ${f.is_enabled && !f.is_greyed_out ? '✓ Live' : f.is_greyed_out ? '◑ Greyed' : '✗ Off'}
        </span>
      </td>
    </tr>`).join('');
}

async function toggleFlag(id, field, current) {
  const col = field === 'enabled' ? 'is_enabled' : 'is_greyed_out';
  const { error } = await sb.from('feature_flags').update({ [col]: !current, updated_at: new Date().toISOString() }).eq('id', id);
  if (!error) { await loadFeatureFlags(); showToast(field === 'enabled' ? '✓ Flag updated' : '✓ Grey-out toggled'); }
  else showToast('❌ Error: ' + error.message);
}


window.loadFeatureFlags = loadFeatureFlags;
window.renderFeatureFlags = renderFeatureFlags;
window.toggleFlag = toggleFlag;
