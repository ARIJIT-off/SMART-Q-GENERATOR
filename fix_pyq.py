
with open('public/js/admin.js', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'document.getElementById(\'pyqLabel\').textContent = file.name;',
    'document.getElementById(\'pyqLabel\').textContent = file.name; document.getElementById(\'pyqLabel\').parentElement.classList.add(\'active-state\');'
)
# also remove emoji from pyqUpload if it exists (like ??)
content = content.replace('?? ', '')

with open('public/js/admin.js', 'w', encoding='utf-8') as f:
    f.write(content)

