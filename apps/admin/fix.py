import os
html_path = '/Users/doran/app-dotfuel-shop/apps/admin/index.html'
src_dir = '/Users/doran/app-dotfuel-shop/apps/admin/src'

with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

# The JS starts at <script>\n// ── Supabase
start_marker = '<script>\n// ── Supabase'
start_idx = content.find(start_marker)
if start_idx != -1:
    js_content = content[start_idx + 8:] # skip <script>
    # Find </body>
    end_idx = js_content.rfind('</body>')
    if end_idx != -1:
        js_code = js_content[:end_idx].replace('</script>', '').strip()
        with open(os.path.join(src_dir, 'main.js'), 'w', encoding='utf-8') as f:
            f.write(js_code)
        
        # Replace the <script> block in index.html
        new_content = content[:start_idx] + '\n</body>\n</html>\n'
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Fixed successfully!")
    else:
        print("Could not find </body>")
else:
    print("Could not find <script>")
