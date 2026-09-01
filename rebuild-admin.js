const fs = require('fs');
let base = fs.readFileSync('public/js/admin.js', 'utf8');

// 1. UPLOAD & GENERATE Listeners
let js = base.replace(
  /const uploadZone = document\.getElementById\('uploadZone'\);\nconst pdfFile = document\.getElementById\('pdfFile'\);/,
  `const uploadZone = document.getElementById('uploadZone');\nconst pdfFile = document.getElementById('pdfFile');\nconst pyqZone = document.getElementById('pyqZone');\nconst pyqFile = document.getElementById('pyqFile');`
);

js = js.replace(
  /uploadZone\.addEventListener\('click', \(\) => pdfFile\.click\(\)\);/,
  `uploadZone.addEventListener('click', (e) => { if (e.target !== pdfFile) pdfFile.click(); });`
);

js = js.replace(
  /pdfFile\.addEventListener\('change', \(\) => \{[\s\S]*?\}\);/,
  `pdfFile.addEventListener('change', () => {
  if (pdfFile.files[0]) document.getElementById('fileName').textContent = '📄 ' + pdfFile.files[0].name;
});

// PYQ Upload listeners
pyqZone.addEventListener('click', (e) => { if (e.target !== pyqFile) pyqFile.click(); });
pyqZone.addEventListener('dragover', e => { e.preventDefault(); pyqZone.classList.add('dragover'); });
pyqZone.addEventListener('dragleave', () => pyqZone.classList.remove('dragover'));
pyqZone.addEventListener('drop', e => {
  e.preventDefault(); pyqZone.classList.remove('dragover');
  if (e.dataTransfer.files[0]) {
    pyqFile.files = e.dataTransfer.files;
    document.getElementById('pyqFileName').textContent = '📝 ' + e.dataTransfer.files[0].name;
  }
});
pyqFile.addEventListener('change', () => {
  if (pyqFile.files[0]) document.getElementById('pyqFileName').textContent = '📝 ' + pyqFile.files[0].name;
});`
);

// 2. generateMCQs
js = js.replace(
  /if \(\!pdfFile\.files\[0\]\) \{ showMsg\('genMsg', 'Please select a PDF file\.', 'error'\); return; \}\n  const numQ = parseInt\(document\.getElementById\('numQ'\)\.value\) \|\| 20;/,
  `if (!pdfFile.files[0]) { showMsg('genMsg', 'Please select a Syllabus PDF file.', 'error'); return; }`
);
js = js.replace(/Generating…/g, 'Generating...');
js = js.replace(/Generating MCQs/g, 'Generating questions');
js = js.replace(/Generate MCQs/g, 'Generate Questions');
js = js.replace(/fd\.append\('numQuestions', numQ\);/,
  `if (pyqFile.files[0]) fd.append('pyq', pyqFile.files[0]);\n\n    fd.append('mcq', document.getElementById('q_mcq').value || 0);\n    fd.append('saq1', document.getElementById('q_saq1').value || 0);\n    fd.append('saq2', document.getElementById('q_saq2').value || 0);\n    fd.append('laq5', document.getElementById('q_laq5').value || 0);\n    fd.append('laq10', document.getElementById('q_laq10').value || 0);`
);

// 3. renderPreview
js = js.replace(
  /<div class="question-num">Q\$\{i\+1\} · <span class="badge badge-\$\{diffBadge\(q\.difficulty\)\}">\$\{q\.difficulty\}<\/span> · \$\{q\.topic\}<\/div>\n\s*<div class="question-text">\$\{q\.text\}<\/div>\n\s*<ul class="options-list">\n\s*\$\{q\.options\.map\(\(o, oi\) => `\n\s*<li class="option-item \$\{oi === q\.answerIndex \? 'correct' : ''\}">\n\s*<span class="option-letter">\$\{letters\[oi\]\}<\/span>\$\{o\}\n\s*<\/li>`\)\.join\(''\)\}\n\s*<\/ul>/,
  `<div class="question-num">Q\${i+1} • <span class="badge badge-info">\${q.type || 'MCQ'} (\${q.marks || 1}m)</span> • <span class="badge badge-\${diffBadge(q.difficulty)}">\${q.difficulty}</span> • \${q.topic}</div>
      <div class="question-text">\${q.text}</div>
      \${(q.type === 'MCQ' || !q.type) ? \`
        <ul class="options-list">
          \${(q.options||[]).map((o, oi) => \`
            <li class="option-item \${oi === q.answerIndex ? 'correct' : ''}">
              <span class="option-letter">\${letters[oi]}</span>\${o}
            </li>\`).join('')}
        </ul>
      \` : \`
        <div style="margin-top:10px; padding:10px; background:var(--success-light); border-left:4px solid var(--success); border-radius:4px; font-size:0.9rem;">
          <strong>Ideal Answer / Rubric:</strong><br>
          \${q.idealAnswer || 'N/A'}
        </div>
      \`}`
);

// 4. loadBank (Question Card rendering)
js = js.replace(
  /<div class="question-num" style="display:flex;justify-content:space-between;align-items:center;">\n\s*<span>Q\$\{i\+1\} • <span class="badge badge-\$\{diffBadge\(q\.difficulty\)\}">\$\{q\.difficulty\}<\/span> • <span class="tag">\$\{q\.topic\}<\/span><\/span>\n\s*<button class="btn btn-danger btn-sm" onclick="deleteQ\('\$\{q\._id\}'\)">🗑<\/button>\n\s*<\/div>\n\s*<div class="question-text">\$\{q\.text\}<\/div>\n\s*<ul class="options-list">\n\s*\$\{q\.options\.map\(\(o,oi\) => `\n\s*<li class="option-item \$\{oi === q\.answerIndex \? 'correct' : ''\}">\n\s*<span class="option-letter">\$\{letters\[oi\]\}<\/span>\$\{o\}\n\s*<\/li>`\)\.join\(''\)\}\n\s*<\/ul>/,
  `<div class="question-num" style="display:flex;justify-content:space-between;align-items:center;">
                <span>Q\${i+1} • <span class="badge badge-info">\${q.type || 'MCQ'} (\${q.marks || 1}m)</span> • <span class="badge badge-\${diffBadge(q.difficulty)}">\${q.difficulty}</span> • <span class="tag">\${q.topic}</span></span>
                <button class="btn btn-danger btn-sm" onclick="deleteQ('\${q._id}')">🗑</button>
              </div>
              <div class="question-text">\${q.text}</div>
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
              \`}`
);

// 5. Result Row onClick
js = js.replace(
  /<tr class="result-row">/g,
  `<tr class="result-row" onclick="viewSubmission('\${examId}', '\${s._id}')" style="cursor:pointer;">`
);

// 6. Append Grading Modal Logic
const overrideLogic = `
async function viewSubmission(examId, subId) {
  let modal = document.getElementById('gradingModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'gradingModal';
    modal.className = 'modal hidden';
    modal.innerHTML = \`
      <div class="modal-content" style="max-width: 800px; width:90%; padding:24px; border-radius:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <h3>Review & Grade Submission</h3>
          <button class="btn btn-sm" onclick="document.getElementById('gradingModal').classList.add('hidden')">Close</button>
        </div>
        <div id="gradingContent" style="max-height: 60vh; overflow-y: auto;">Loading...</div>
      </div>
    \`;
    document.body.appendChild(modal);
  }
  
  modal.classList.remove('hidden');
  document.getElementById('gradingContent').innerHTML = '<p>Loading submission details...</p>';
  
  try {
    const data = await apiFetch(\`/student/result/\${subId}\`);
    if (!data.enrichedAnswers) throw new Error('Could not load answers');
    
    let html = '';
    data.enrichedAnswers.forEach((a, idx) => {
      if (a.type === 'MCQ' || !a.type) {
        html += \`
          <div style="margin-bottom: 16px; padding: 12px; border: 1px solid var(--border); border-radius: 8px;">
            <p><strong>Q\${idx+1}: \${a.questionText}</strong> <span class="badge badge-info">MCQ</span></p>
            <p style="color:\${a.isCorrect ? 'var(--success)' : 'var(--danger)'}">Selected: \${a.options[a.selectedIndex] || 'Not answered'}</p>
          </div>
        \`;
      } else {
        html += \`
          <div style="margin-bottom: 16px; padding: 12px; border: 1px solid var(--border); border-radius: 8px;">
            <p><strong>Q\${idx+1}: \${a.questionText}</strong> <span class="badge badge-warning">\${a.type} (\${a.marks}m)</span></p>
            <div style="background:var(--surface); padding:8px; margin:8px 0; border-radius:4px;">
              <small style="color:var(--dim)">Student Answer:</small><br>
              \${a.textAnswer || '<em>No answer provided</em>'}
            </div>
            <div style="background:var(--success-light); padding:8px; margin:8px 0; border-radius:4px; font-size:0.85rem;">
              <small>Ideal Answer:</small><br>
              \${a.idealAnswer || 'N/A'}
            </div>
            <div style="display:flex; gap:16px; align-items:center; margin-top:8px;">
              <div>
                <small style="color:var(--dim)">AI Score / Feedback:</small><br>
                <strong>\${a.aiScore !== undefined ? a.aiScore : '?'} / \${a.marks}</strong> - <em>\${a.aiFeedback || ''}</em>
              </div>
              <div style="flex:1;"></div>
              <div>
                <label style="font-size:0.85rem; font-weight:600;">Override Score:</label>
                <input type="number" id="override-\${a.questionId}" value="\${a.teacherScore !== undefined ? a.teacherScore : a.aiScore}" step="0.5" min="0" max="\${a.marks}" style="width:70px; padding:4px; border:1px solid var(--border); border-radius:4px;">
                <button class="btn btn-sm btn-primary" onclick="overrideScore('\${examId}', '\${subId}', '\${a.questionId}')">Save</button>
              </div>
            </div>
          </div>
        \`;
      }
    });
    
    document.getElementById('gradingContent').innerHTML = html;
  } catch (err) {
    document.getElementById('gradingContent').innerHTML = \`<div class="alert alert-error">\${err.message}</div>\`;
  }
}

async function overrideScore(examId, subId, questionId) {
  const newScore = document.getElementById(\`override-\${questionId}\`).value;
  try {
    await apiFetch(\`/admin/exams/\${examId}/submissions/\${subId}/override\`, {
      method: 'PATCH',
      body: JSON.stringify({ questionId, newScore })
    });
    showToast('Score overridden successfully!', 'success');
    loadResults(); // refresh background table
  } catch (err) {
    showToast(err.message, 'error');
  }
}
`;

js += '\n' + overrideLogic;

fs.writeFileSync('public/js/admin.js', js);
console.log('Recreated admin.js safely');
