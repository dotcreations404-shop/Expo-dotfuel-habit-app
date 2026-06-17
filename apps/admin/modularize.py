import os
import re

src_dir = '/Users/doran/app-dotfuel-shop/apps/admin/src'
main_js_path = os.path.join(src_dir, 'main.js')

with open(main_js_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Define sections
sections = re.split(r'// ── (.+?) ─+', content)
parsed_sections = {}
for i in range(1, len(sections), 2):
    name = sections[i].strip()
    body = sections[i+1]
    parsed_sections[name] = body

# Ensure directories exist
for d in ['api', 'features', 'ui']:
    os.makedirs(os.path.join(src_dir, d), exist_ok=True)

# Helper to find all top-level functions and variables
def get_exports(body):
    funcs = re.findall(r'async function\s+([a-zA-Z0-9_]+)\s*\(|function\s+([a-zA-Z0-9_]+)\s*\(', body)
    func_names = [f[0] or f[1] for f in funcs]
    return func_names

# Map sections to files
mapping = {
    'Supabase': 'api/supabase.js',
    'Auth': 'features/auth.js',
    'Data': 'features/data.js',
    'Render Challenges': 'features/challenges.js',
    'Render Badges': 'features/badges.js',
    'Tabs': 'ui/tabs.js',
    'Users': 'features/users.js',
    'Feature Flags': 'features/flags.js',
    'Feedback': 'features/feedback.js',
    'Toggle Active': 'features/toggle.js',
    'Emoji Pickers': 'ui/emoji.js',
    'Challenge Modal': 'ui/modals_challenge.js',
    'Badge Modal': 'ui/modals_badge.js',
    'Delete': 'features/delete.js',
    'Modals': 'ui/modals.js',
    'Toast': 'ui/toast.js',
    'Admin Recipes': 'features/recipes.js',
    'Vol3 Administrative Control Panel': 'features/vol3.js'
}

all_exports = []
for name, file_path in mapping.items():
    if name in parsed_sections:
        body = parsed_sections[name]
        funcs = get_exports(body)
        all_exports.extend(funcs)
        
        # Rewrite Supabase exports
        if name == 'Supabase':
            body = body.replace('const SUPABASE_URL', 'export const SUPABASE_URL')
            body = body.replace('const SUPABASE_KEY', 'export const SUPABASE_KEY')
            body = body.replace('const ADMIN_EMAIL', 'export const ADMIN_EMAIL')
            body = body.replace('const sb', 'export const sb')
        
        # Make all functions global for simplicity (avoiding circular dependency hell in this migration step)
        global_assigns = "\n".join([f"window.{func} = {func};" for func in funcs])
        
        # We need `sb` everywhere, let's just make it global in supabase.js
        if name == 'Supabase':
            global_assigns += "\nwindow.sb = sb;\nwindow.ADMIN_EMAIL = ADMIN_EMAIL;\n"
            
        file_content = body + "\n" + global_assigns + "\n"
        
        if name != 'Supabase':
            file_content = "const sb = window.sb;\n" + file_content
            
        with open(os.path.join(src_dir, file_path), 'w', encoding='utf-8') as f:
            f.write(file_content)

# Write main.js that imports everything
main_content = ""
for file_path in mapping.values():
    main_content += f"import './{file_path}';\n"
    
with open(main_js_path, 'w', encoding='utf-8') as f:
    f.write(main_content)

print("Modularization complete!")
