
with open('public/admin.html', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

content = content.replace('?? ', '')
with open('public/admin.html', 'w', encoding='utf-8') as f:
    f.write(content)

