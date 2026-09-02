import os

script_inject = '''<script>
document.addEventListener("input", function(e) {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") {
        if (e.target.value && e.target.value !== "0" && e.target.value.trim() !== "") {
            e.target.classList.add("filled-state");
        } else {
            e.target.classList.remove("filled-state");
        }
    }
});
</script>
</body>'''

html_files = ['admin.html', 'exam.html', 'index.html', 'login.html', 'result.html', 'signup.html', 'student.html']
for f in html_files:
    p = os.path.join('public', f)
    with open(p, 'r', encoding='utf-8') as file:
        content = file.read()
    if 'filled-state' not in content:
        content = content.replace('</body>', script_inject)
        with open(p, 'w', encoding='utf-8') as file:
            file.write(content)

js_files = ['exam.js', 'admin.js']
for f in js_files:
    p = os.path.join('public', 'js', f)
    with open(p, 'r', encoding='utf-8') as file:
        content = file.read()
    content = content.replace('rgba(79,70,229,.25)', 'var(--bg)')
    content = content.replace('color:#818cf8;', 'color:var(--text);')
    content = content.replace('rgba(245,158,11,.2)', 'var(--bg)')
    content = content.replace('color:#fbbf24;', 'color:var(--text);')
    content = content.replace('rgba(239,68,68,.2)', 'var(--bg)')
    content = content.replace('color:#f87171;', 'color:var(--text);')
    with open(p, 'w', encoding='utf-8') as file:
        file.write(content)
print('Done!')
