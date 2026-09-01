const fs = require('fs');

let adminJs = fs.readFileSync('public/js/admin.js', 'utf8');

// A. Update result row to be clickable
adminJs = adminJs.replace(
  /<tr class="result-row">/g,
  `<tr class="result-row" onclick="viewSubmission('\${examId}', '\${s._id}')" style="cursor:pointer;">`
);

// B. Append the viewSubmission and override logic
const overrideLogic = `
async function viewSubmission(examId, subId) {
  // Let's create or show a modal dynamically
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

// Append to the end of admin.js
fs.appendFileSync('public/js/admin.js', '\n' + overrideLogic);

console.log('Fixed admin results logic');
