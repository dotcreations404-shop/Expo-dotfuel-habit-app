const sb = window.sb;

async function loadFeedback() {
  const tbody = document.getElementById('feedback-tbody');
  const el    = document.getElementById('feedback-count');
  try {
    const { data, count, error } = await sb.from('feedback').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(50);
    if (error) throw error;
    if (el) el.textContent = (count || 0) + ' responses';
    renderFeedback(data || []);
  } catch (err) {
    if (el) el.textContent = 'Error loading';
    if (tbody) tbody.innerHTML = `<tr class="empty-row"><td colspan="5" style="color:var(--red)">Error: ${err.message}</td></tr>`;
  }
}

function renderFeedback(items) {
  const tbody = document.getElementById('feedback-tbody');
  if (!items.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="5">No feedback yet.</td></tr>';
    return;
  }
  const catBg   = { general:'rgba(255,255,255,0.08)', bug:'rgba(255,59,59,0.15)', feature:'rgba(43,92,230,0.15)', praise:'rgba(0,232,122,0.15)' };
  const catCol  = { general:'var(--muted)', bug:'var(--red)', feature:'#6fa3ff', praise:'var(--green)' };
  tbody.innerHTML = items.map(f => `
    <tr>
      <td style="font-size:15px;white-space:nowrap">${f.rating ? '⭐'.repeat(f.rating) : '—'}</td>
      <td><span style="font-size:10px;font-weight:800;padding:3px 10px;border-radius:20px;text-transform:uppercase;background:${catBg[f.category]||catBg.general};color:${catCol[f.category]||catCol.general}">${f.category}</span></td>
      <td style="max-width:280px"><div style="font-size:13px;color:var(--white);line-height:1.5;white-space:normal">${f.message}</div></td>
      <td class="meta-cell">${f.email || 'Anonymous'}</td>
      <td class="meta-cell" style="white-space:nowrap">${new Date(f.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</td>
    </tr>`).join('');
}


window.loadFeedback = loadFeedback;
window.renderFeedback = renderFeedback;
