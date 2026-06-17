import os
import re

html_path = '/Users/doran/app-dotfuel-shop/apps/admin/index.html'
src_dir = '/Users/doran/app-dotfuel-shop/apps/admin/src'

os.makedirs(src_dir, exist_ok=True)

with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

style_match = re.search(r'<style>(.*?)</style>', content, re.DOTALL)
if style_match:
    styles = style_match.group(1).strip()
    with open(os.path.join(src_dir, 'styles.css'), 'w', encoding='utf-8') as f:
        f.write(styles)
    content = content[:style_match.start()] + '<link rel="stylesheet" href="/src/styles.css">' + content[style_match.end():]

scripts_matches = list(re.finditer(r'<script>(.*?)</script>', content, re.DOTALL))
if scripts_matches:
    last_script_match = scripts_matches[-1]
    scripts = last_script_match.group(1).strip()
    with open(os.path.join(src_dir, 'main.js'), 'w', encoding='utf-8') as f:
        f.write(scripts)
    content = content[:last_script_match.start()] + '<script type="module" src="/src/main.js"></script>' + content[last_script_match.end():]

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(content)
