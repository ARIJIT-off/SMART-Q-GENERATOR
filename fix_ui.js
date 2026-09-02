const fs = require('fs');
const path = require('path');

const scriptInject = \
<script>
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
</body>\;

const htmlFiles = ['admin.html', 'exam.html', 'index.html', 'login.html', 'result.html', 'signup.html', 'student.html'];
htmlFiles.forEach(f => {
  const p = path.join('public', f);
  let content = fs.readFileSync(p, 'utf8');
  if (!content.includes('filled-state')) {
    content = content.replace('</body>', scriptInject);
    fs.writeFileSync(p, content);
  }
});

const jsFiles = ['exam.js', 'admin.js'];
jsFiles.forEach(f => {
  const p = path.join('public', 'js', f);
  let content = fs.readFileSync(p, 'utf8');
  content = content.replace(/rgba\(79,70,229,\.25\)/g, "var(--bg)");
  content = content.replace(/color:#818cf8;/g, "color:var(--text);");
  content = content.replace(/rgba\(245,158,11,\.2\)/g, "var(--bg)");
  content = content.replace(/color:#fbbf24;/g, "color:var(--text);");
  content = content.replace(/rgba\(239,68,68,\.2\)/g, "var(--bg)");
  content = content.replace(/color:#f87171;/g, "color:var(--text);");
  fs.writeFileSync(p, content);
});
console.log('Done!');
