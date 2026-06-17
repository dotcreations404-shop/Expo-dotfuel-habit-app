const sb = window.sb;

const SUPABASE_URL_ADMIN  = 'https://xljamnukzgystdthzgud.supabase.co';
const SUPABASE_ANON_KEY   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsamFtbnVremd5c3RkdGh6Z3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTkwODUsImV4cCI6MjA4OTQ5NTA4NX0.lpGkMe7XvOEcSSuKh229X5AbBeho0w-vpZwPdNwk1CE';

async function loadAdminRecipes() {
  const listEl = document.getElementById('recipes-list');
  if (!listEl) return;
  listEl.innerHTML = '<div style="text-align:center;padding:24px;font-size:13px;color:var(--muted)">Loading...</div>';

  const res = await fetch(`${SUPABASE_URL_ADMIN}/rest/v1/recipes?select=*&order=created_at.desc`, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY }
  });
  const recipes = await res.json();

  if (!Array.isArray(recipes) || recipes.length === 0) {
    listEl.innerHTML = '<div style="text-align:center;padding:24px;font-size:13px;color:var(--muted)">No recipes yet. Click + New Recipe to add the first one.</div>';
    return;
  }

  listEl.innerHTML = `
    <table style="width:100%;border-collapse:collapse">
      <thead><tr style="border-bottom:1px solid rgba(255,255,255,0.08)">
        <th style="text-align:left;padding:10px 12px;font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--muted)">Recipe</th>
        <th style="text-align:center;padding:10px 8px;font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--muted)">Macros</th>
        <th style="text-align:center;padding:10px 8px;font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--muted)">Status</th>
        <th style="text-align:right;padding:10px 12px;font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--muted)">Actions</th>
      </tr></thead>
      <tbody>
        ${recipes.map(r => `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.04)">
          <td style="padding:12px">
            <div style="display:flex;align-items:center;gap:10px">
              ${r.photo_url ? `<img src="${r.photo_url}" style="width:44px;height:44px;border-radius:10px;object-fit:cover;flex-shrink:0">` : '<div style="width:44px;height:44px;border-radius:10px;background:var(--surface);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">🍽️</div>'}
              <div>
                <div style="font-size:13px;font-weight:700;color:#fff">${r.title}</div>
                <div style="font-size:11px;color:var(--muted);margin-top:1px">${r.prep_time_min || '?'} min · ${r.servings || 1} serving${(r.servings||1)>1?'s':''}</div>
              </div>
            </div>
          </td>
          <td style="padding:12px;text-align:center">
            <div style="font-size:13px;font-weight:800;color:#C2F000">${r.calories||0} kcal</div>
            <div style="font-size:10px;color:var(--muted);margin-top:2px">${r.protein_g||0}P · ${r.carbs_g||0}C · ${r.fat_g||0}F</div>
          </td>
          <td style="padding:12px;text-align:center">
            <span style="font-size:11px;font-weight:800;padding:3px 10px;border-radius:20px;${r.is_published ? 'background:rgba(194,240,0,0.15);color:#C2F000' : 'background:rgba(255,255,255,0.06);color:var(--muted)'}">
              ${r.is_published ? '✓ Published' : 'Draft'}
            </span>
          </td>
          <td style="padding:12px;text-align:right">
            <button onclick="editRecipe(${JSON.stringify(JSON.stringify(r))})" class="edit-btn">Edit</button>
            <button onclick="togglePublish('${r.id}', ${r.is_published})" class="edit-btn" style="background:${r.is_published ? 'rgba(255,80,80,0.15)' : 'rgba(194,240,0,0.15)'};color:${r.is_published ? '#ff5050' : '#C2F000'}">${r.is_published ? 'Unpublish' : 'Publish'}</button>
            <button onclick="deleteRecipe('${r.id}')" class="del-btn">Delete</button>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

function openRecipeForm() {
  document.getElementById('rf-id').value           = '';
  document.getElementById('rf-title').value        = '';
  document.getElementById('rf-photo').value        = '';
  document.getElementById('rf-desc').value         = '';
  document.getElementById('rf-cals').value         = '';
  document.getElementById('rf-protein').value      = '';
  document.getElementById('rf-carbs').value        = '';
  document.getElementById('rf-fat').value          = '';
  document.getElementById('rf-time').value         = '15';
  document.getElementById('rf-servings').value     = '1';
  document.getElementById('rf-ingredients').value  = '';
  document.getElementById('rf-instructions').value = '';
  document.getElementById('rf-published').checked  = false;
  document.getElementById('recipe-form-title').textContent = 'New Recipe';
  document.getElementById('rf-save-btn').textContent = 'SAVE RECIPE';
  document.getElementById('recipe-form-panel').style.display = 'block';
  document.getElementById('recipe-form-panel').scrollIntoView({ behavior: 'smooth' });
}

function editRecipe(jsonStr) {
  const r = JSON.parse(jsonStr);
  document.getElementById('rf-id').value           = r.id;
  document.getElementById('rf-title').value        = r.title || '';
  document.getElementById('rf-photo').value        = r.photo_url || '';
  document.getElementById('rf-desc').value         = r.description || '';
  document.getElementById('rf-cals').value         = r.calories || '';
  document.getElementById('rf-protein').value      = r.protein_g || '';
  document.getElementById('rf-carbs').value        = r.carbs_g || '';
  document.getElementById('rf-fat').value          = r.fat_g || '';
  document.getElementById('rf-time').value         = r.prep_time_min || 15;
  document.getElementById('rf-servings').value     = r.servings || 1;
  document.getElementById('rf-instructions').value = r.instructions || '';
  document.getElementById('rf-published').checked  = r.is_published || false;
  // Format ingredients back to text
  const ings = Array.isArray(r.ingredients) ? r.ingredients : [];
  document.getElementById('rf-ingredients').value = ings.map(i =>
    typeof i === 'string' ? i : `${i.emoji||''} ${i.name||''} ${i.amount||''}`.trim()
  ).join('\n');
  document.getElementById('recipe-form-title').textContent = 'Edit Recipe';
  document.getElementById('rf-save-btn').textContent = 'UPDATE RECIPE';
  document.getElementById('recipe-form-panel').style.display = 'block';
  document.getElementById('recipe-form-panel').scrollIntoView({ behavior: 'smooth' });
}

function closeRecipeForm() {
  document.getElementById('recipe-form-panel').style.display = 'none';
}

function parseIngredients(text) {
  return text.trim().split('\n').filter(Boolean).map(line => {
    const parts = line.trim().split(' ');
    // Check if first char is emoji (multi-byte)
    const emojiMatch = line.match(/^(\p{Emoji}\s*)/u);
    if (emojiMatch) {
      const rest = line.slice(emojiMatch[0].length).trim();
      const words = rest.split(' ');
      const amount = words[words.length - 1];
      const name   = words.slice(0, -1).join(' ');
      return { emoji: emojiMatch[1].trim(), name, amount };
    }
    return { emoji: '•', name: line, amount: '' };
  });
}

async function saveRecipe() {
  const id    = document.getElementById('rf-id').value;
  const title = document.getElementById('rf-title').value.trim();
  if (!title) { alert('Title is required'); return; }

  const btn = document.getElementById('rf-save-btn');
  btn.textContent = 'SAVING...'; btn.disabled = true;

  const payload = {
    title,
    description:   document.getElementById('rf-desc').value.trim() || null,
    photo_url:     document.getElementById('rf-photo').value.trim() || null,
    calories:      parseInt(document.getElementById('rf-cals').value)    || null,
    protein_g:     parseInt(document.getElementById('rf-protein').value) || 0,
    carbs_g:       parseInt(document.getElementById('rf-carbs').value)   || 0,
    fat_g:         parseInt(document.getElementById('rf-fat').value)     || 0,
    prep_time_min: parseInt(document.getElementById('rf-time').value)    || 15,
    servings:      parseInt(document.getElementById('rf-servings').value)|| 1,
    ingredients:   parseIngredients(document.getElementById('rf-ingredients').value),
    instructions:  document.getElementById('rf-instructions').value.trim() || null,
    is_published:  document.getElementById('rf-published').checked,
    updated_at:    new Date().toISOString()
  };

  const method = id ? 'PATCH' : 'POST';
  const url    = id
    ? `${SUPABASE_URL_ADMIN}/rest/v1/recipes?id=eq.${id}`
    : `${SUPABASE_URL_ADMIN}/rest/v1/recipes`;

  const res = await fetch(url, {
    method,
    headers: {
      'apikey':        SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + await getAdminToken(),
      'Content-Type':  'application/json',
      'Prefer':        'return=minimal'
    },
    body: JSON.stringify(payload)
  });

  btn.disabled = false;
  if (res.ok || res.status === 201 || res.status === 204) {
    btn.textContent = id ? 'UPDATE RECIPE' : 'SAVE RECIPE';
    closeRecipeForm();
    loadAdminRecipes();
    showNotif(id ? '✓ Recipe updated' : '✓ Recipe created', 'success');
  } else {
    const err = await res.text();
    btn.textContent = id ? 'UPDATE RECIPE' : 'SAVE RECIPE';
    alert('Error: ' + err);
  }
}

async function togglePublish(id, currentState) {
  const res = await fetch(`${SUPABASE_URL_ADMIN}/rest/v1/recipes?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + await getAdminToken(),
      'Content-Type': 'application/json', 'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ is_published: !currentState, updated_at: new Date().toISOString() })
  });
  if (res.ok || res.status === 204) {
    loadAdminRecipes();
    showNotif(!currentState ? '✓ Recipe published' : '✓ Recipe unpublished', 'success');
  }
}

async function deleteRecipe(id) {
  if (!confirm('Delete this recipe permanently?')) return;
  const res = await fetch(`${SUPABASE_URL_ADMIN}/rest/v1/recipes?id=eq.${id}`, {
    method: 'DELETE',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + await getAdminToken() }
  });
  if (res.ok || res.status === 204) { loadAdminRecipes(); showNotif('Recipe deleted', 'error'); }
}

async function getAdminToken() {
  try {
    const { data: { session } } = await sb.auth.getSession();
    return session?.access_token || SUPABASE_ANON_KEY;
  } catch(e) {
    return SUPABASE_ANON_KEY;
  }
}

function showNotif(msg, type) {
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:${type==='success'?'#C2F000':'#ff5050'};color:#000;padding:10px 20px;border-radius:20px;font-weight:800;font-size:13px;z-index:9999;animation:fadeUp 0.3s both`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}


window.loadAdminRecipes = loadAdminRecipes;
window.openRecipeForm = openRecipeForm;
window.editRecipe = editRecipe;
window.closeRecipeForm = closeRecipeForm;
window.parseIngredients = parseIngredients;
window.saveRecipe = saveRecipe;
window.togglePublish = togglePublish;
window.deleteRecipe = deleteRecipe;
window.getAdminToken = getAdminToken;
window.showNotif = showNotif;
