const fs = require('fs');
let c = fs.readFileSync('public/js/admin.js', 'utf8');

const targetRegex = /<div class="question-text">\$\{q\.text\}<\/div>[\s\S]*?<\/ul>\s*<\/div>/;

const replaceWith = `<div class="question-text">\${q.text}</div>
              \${(q.type === 'MCQ' || !q.type) ? \`
                <ul class="options-list">
                  \${(q.options||[]).map((o,oi) => \`
                    <li class="option-item \${oi === q.answerIndex ? 'correct' : ''}">
                      <span class="option-letter">\${letters[oi]}</span>\${o}
                    </li>\`).join('')}
                </ul>
              \` : \`
                <div style="margin-top:10px; padding:10px; background:var(--success-light); border-left:4px solid var(--success); border-radius:4px; font-size:0.9rem;">
                  <strong>Ideal Answer / Rubric:</strong><br>
                  \${q.idealAnswer || 'N/A'}
                </div>
              \`}
            </div>`;

c = c.replace(targetRegex, replaceWith);
fs.writeFileSync('public/js/admin.js', c);
console.log('Fixed admin.js');
