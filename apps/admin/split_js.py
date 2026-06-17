import os
import re

src_dir = '/Users/doran/app-dotfuel-shop/apps/admin/src'
main_js_path = os.path.join(src_dir, 'main.js')

with open(main_js_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Define sections
sections = re.split(r'// ── (.+?) ─+', content)
# sections[0] is everything before the first section
parsed_sections = {}
for i in range(1, len(sections), 2):
    name = sections[i].strip()
    body = sections[i+1]
    parsed_sections[name] = body

# Ensure directories exist
for d in ['api', 'features', 'ui']:
    os.makedirs(os.path.join(src_dir, d), exist_ok=True)

def write_module(filename, imports, body):
    # Extract functions to attach to window
    funcs = re.findall(r'async function\s+([a-zA-Z0-9_]+)\s*\(|function\s+([a-zA-Z0-9_]+)\s*\(', body)
    func_names = [f[0] or f[1] for f in funcs]
    
    exports = ""
    if func_names:
        exports = "\n// Attach to window for HTML inline handlers\n"
        for func in func_names:
            exports += f"window.{func} = {func};\n"
            
    content = imports + "\n" + body + "\n" + exports
    with open(os.path.join(src_dir, filename), 'w', encoding='utf-8') as f:
        f.write(content)

# Supabase API
write_module('api/supabase.js', '', parsed_sections.get('Supabase', ''))

# Auth
auth_imports = "import { sb, ADMIN_EMAIL } from '../api/supabase.js';\nimport { loadAll, initEmojiPickers } from './main.js';\n"
write_module('features/auth.js', auth_imports, parsed_sections.get('Auth', ''))

# For the rest, we'll keep them in main.js for now and incrementally move them, 
# because of circular dependencies (like Data depends on Render, Render depends on Data).
# Actually, if we just export them all, it might be tricky.
# Let's just output the Python script and think.
