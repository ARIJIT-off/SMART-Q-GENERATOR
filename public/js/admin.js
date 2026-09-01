/**
 * admin.js — Admin Dashboard Logic
 */

// ── Guards ──────────────────────────────────────────────────────────────
const _user = requireRole('admin');
renderUserChip();

// ── State ───────────────────────────────────────────────────────────────
let generatedQuestions = [];
let bankQuestions = [];
let selectedQuestionIds = new Set();
let currentExamId = null;
let currentExamLink = '';

// ── Tabs ────────────────────────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${name}`).classList.add('active');
  event.currentTarget.classList.add('active');

  if (name === 'bank') loadBank();
  if (name === 'exams') loadExams();
  if (name === 'create') { loadBankForSelector(); loadExamSelect(); }
  if (name === 'results') loadExamSelect();
}

// ── UPLOAD & GENERATE ───────────────────────────────────────────────────
const uploadZone = document.getElementById('uploadZone');
const pdfFile = document.getElementById('pdfFile');
const pyqZone = document.getElementById('pyqZone');
const pyqFile = document.getElementById('pyqFile');

uploadZone.addEventListener('click', (e) => { if (e.target !== pdfFile) pdfFile.click(); });
uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('dragover'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault(); uploadZone.classList.remove('dragover');
  if (e.dataTransfer.files[0]) {
    pdfFile.files = e.dataTransfer.files;
    document.getElementById('fileName').textContent = '📄 ' + e.dataTransfer.files[0].name;
  }
});
pdfFile.addEventListener('change', () => {
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
});

async function generateMCQs() {
  if (!pdfFile.files[0]) { showMsg('genMsg', 'Please select a Syllabus PDF file.', 'error'); return; }

  const btn = document.getElementById('genBtn');
  btn.disabled = true;
  document.getElementById('genText').textContent = 'Generating...';
  document.getElementById('genSpinner').classList.remove('hidden');
  document.getElementById('genMsg').innerHTML = '<div class="alert alert-info">🤖 Parsing PDF and generating questions via AI... This may take 20–40 seconds.</div>';

  try {
    const fd = new FormData();
    fd.append('syllabus', pdfFile.files[0]);
    if (pyqFile.files[0]) fd.append('pyq', pyqFile.files[0]);

    fd.append('mcq', document.getElementById('q_mcq').value || 0);
    fd.append('saq1', document.getElementById('q_saq1').value || 0);
    fd.append('saq2', document.getElementById('q_saq2').value || 0);
    fd.append('laq5', document.getElementById('q_laq5').value || 0);
    fd.append('laq10', document.getElementById('q_laq10').value || 0);

    const data = await apiUpload('/admin/upload-syllabus', fd);
    generatedQuestions = data.questions;
    renderPreview(generatedQuestions);
    document.getElementById('genMsg').innerHTML = `<div class="alert alert-success">✅ Generated ${data.count} questions successfully!</div>`;
  } catch (err) {
    document.getElementById('genMsg').innerHTML = `<div class="alert alert-error">❌ ${err.message}</div>`;
  } finally {
    btn.disabled = false;
    document.getElementById('genText').textContent = '🤖 Generate Questions';
    document.getElementById('genSpinner').classList.add('hidden');
  }
}

function renderPreview(questions) {
  const panel = document.getElementById('previewPanel');
  const list  = document.getElementById('previewList');
  panel.style.display = 'block';
  document.getElementById('previewCount').textContent = questions.length;
  const letters = ['A','B','C','D'];
  list.innerHTML = questions.map((q, i) => `
    <div class="question-card">
      <div class="question-num">Q${i+1} • <span class="badge badge-info">${q.type || 'MCQ'} (${q.marks || 1}m)</span> • <span class="badge badge-${diffBadge(q.difficulty)}">${q.difficulty}</span> • ${q.topic}</div>
      <div class="question-text">${q.text}</div>
              ${(q.type === 'MCQ' || !q.type) ? `
                <ul class="options-list">
                  ${(q.options||[]).map((o,oi) => `
                    <li class="option-item ${oi === q.answerIndex ? 'correct' : ''}">
                      <span class="option-letter">${letters[oi]}</span>${o}
                    </li>`).join('')}
                </ul>
              ` : `
                <div style="margin-top:10px; padding:10px; background:var(--success-light); border-left:4px solid var(--success); border-radius:4px; font-size:0.9rem;">
                  <strong>Ideal Answer / Rubric:</strong><br>
                  ${q.idealAnswer || 'N/A'}
                </div>
              `}
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  } catch (err) {
    list.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

async function deleteQ(id) {
  if (!confirm('Delete this question?')) return;
  try {
    await apiFetch(`/admin/questions/${id}`, { method: 'DELETE' });
    document.getElementById(`bq-${id}`)?.remove();
    showToast('Question deleted', 'info');
    bankQuestions = bankQuestions.filter(q => q._id !== id);
    document.getElementById('bankCount').textContent = bankQuestions.length;
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── CREATE EXAM ──────────────────────────────────────────────────────────
async function loadBankForSelector() {
  const sel = document.getElementById('qSelector');
  sel.innerHTML = '<p style="color:var(--dim);font-size:.85rem;">Loading questions...</p>';
  try {
    const data = await apiFetch('/admin/questions');
    bankQuestions = data.questions;
    selectedQuestionIds.clear();
    updateSelCount();
    if (!bankQuestions.length) {
      sel.innerHTML = '<p style="color:var(--dim);font-size:.85rem;">No questions in bank. Generate some first.</p>';
      return;
    }
    
    const grouped = groupQuestions(bankQuestions);
    
    sel.innerHTML = grouped.map((g, idx) => `
      <div class="question-group" style="margin-bottom: 8px; border: 1px solid var(--border); border-radius: 6px; overflow: hidden;">
        <div class="group-header" style="background: var(--surface-light); padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
          <div onclick="toggleGroup('sel-${g.id}')" style="cursor: pointer; flex: 1; font-weight: 500; font-size: 0.9rem;">
            <span id="group-icon-sel-${g.id}" style="color:var(--dim); margin-right:4px;">▶</span>
            <span style="color:var(--primary); margin-right:6px;">Req #${grouped.length - idx}</span>
            <span>📄 ${g.pdfName}</span>
            <span class="badge badge-info" style="margin-left: 6px;">${g.questions.length} Qs</span>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="selectAllGroup('${g.id}', this)" style="font-size:0.75rem; padding: 2px 8px;">Select All</button>
        </div>
        <div id="group-content-sel-${g.id}" style="display: none; padding: 0;">
          ${g.questions.map(q => `
            <label style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;border-top:1px solid var(--border);cursor:pointer; background: var(--surface);">
              <input type="checkbox" class="cb-group-${g.id}" value="${q._id}" onchange="toggleQ(this)" style="margin-top:3px;accent-color:var(--primary);">
              <div>
                <div style="font-size:.88rem;color:var(--text);">${q.text}</div>
                <div class="text-sm" style="margin-top:4px;"><span class="tag">${q.topic}</span> <span class="badge badge-${diffBadge(q.difficulty)}">${q.difficulty}</span></div>
              </div>
            </label>
          `).join('')}
        </div>
      </div>
    `).join('');
  } catch (err) {
    sel.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

function selectAllGroup(groupId, btn) {
  const checkboxes = document.querySelectorAll(`.cb-group-${groupId}`);
  const allChecked = Array.from(checkboxes).every(cb => cb.checked);
  
  checkboxes.forEach(cb => {
    if (allChecked) {
      cb.checked = false;
      selectedQuestionIds.delete(cb.value);
    } else {
      cb.checked = true;
      selectedQuestionIds.add(cb.value);
    }
  });
  
  btn.textContent = allChecked ? 'Select All' : 'Deselect All';
  updateSelCount();
}

function toggleQ(cb) {
  if (cb.checked) selectedQuestionIds.add(cb.value);
  else selectedQuestionIds.delete(cb.value);
  updateSelCount();
}

function updateSelCount() {
  document.getElementById('selCount').textContent = selectedQuestionIds.size;
}

async function createExam() {
  const title    = document.getElementById('examTitle').value.trim();
  const desc     = document.getElementById('examDesc').value.trim();
  const duration = document.getElementById('examDuration').value;
  const marksPerQ = document.getElementById('marksPerQ').value;
  const negMarks  = document.getElementById('negMarks').value;
  const msg       = document.getElementById('createMsg');

  if (!title) { msg.innerHTML = '<div class="alert alert-error">Exam title is required.</div>'; return; }
  if (selectedQuestionIds.size === 0) { msg.innerHTML = '<div class="alert alert-error">Select at least 1 question.</div>'; return; }
  msg.innerHTML = '';

  const btn = document.getElementById('createExamBtn');
  btn.disabled = true;
  document.getElementById('createExamText').textContent = 'Creating…';
  document.getElementById('createExamSpinner').classList.remove('hidden');

  try {
    const data = await apiFetch('/admin/exams', {
      method: 'POST',
      body: JSON.stringify({
        title, description: desc,
        questionIds: [...selectedQuestionIds],
        duration, marksPerQuestion: marksPerQ, negativeMarking: negMarks
      })
    });
    currentExamId = data.exam._id;
    const baseUrl = window.location.origin;
    currentExamLink = `${baseUrl}/exam/${data.exam.accessCode}`;
    document.getElementById('examLinkDisplay').textContent = currentExamLink;
    document.getElementById('examLinkPanel').style.display = 'block';
    showToast('🎉 Exam created!', 'success');
  } catch (err) {
    msg.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  } finally {
    btn.disabled = false;
    document.getElementById('createExamText').textContent = '🚀 Create Exam & Get Link';
    document.getElementById('createExamSpinner').classList.add('hidden');
  }
}

function copyLink() {
  navigator.clipboard.writeText(currentExamLink).then(() => showToast('Link copied!', 'success'));
}

function showQR() {
  const modal = document.getElementById('qrModal');
  modal.classList.remove('hidden');
  QRCode.toCanvas(document.getElementById('qrCanvas'), currentExamLink, { width: 240, color: { dark: '#4f46e5', light: '#1e293b' } });
}

async function sendEmails() {
  const raw = document.getElementById('studentEmails').value.trim();
  if (!raw) { showToast('Enter at least one email.', 'error'); return; }
  const emails = raw.split(',').map(e => e.trim()).filter(e => e.includes('@'));
  if (!emails.length) { showToast('No valid emails found.', 'error'); return; }
  try {
    const data = await apiFetch(`/admin/exams/${currentExamId}/send-email`, {
      method: 'POST',
      body: JSON.stringify({ emails })
    });
    showToast(data.message, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── MY EXAMS ─────────────────────────────────────────────────────────────
async function loadExams() {
  const body = document.getElementById('examsBody');
  body.innerHTML = '<tr><td colspan="6" style="color:var(--dim);text-align:center;">Loading…</td></tr>';
  try {
    const data = await apiFetch('/admin/exams');
    if (!data.exams.length) {
      body.innerHTML = '<tr><td colspan="6" style="color:var(--dim);text-align:center;">No exams yet.</td></tr>';
      return;
    }
    const baseUrl = window.location.origin;
    body.innerHTML = data.exams.map(e => `
      <tr>
        <td><b>${e.title}</b></td>
        <td>${e.questions?.length || 0}</td>
        <td>${e.duration} min</td>
        <td><span class="badge badge-${e.status === 'live' ? 'success' : e.status === 'ended' ? 'danger' : 'warning'}">${e.status}</span></td>
        <td><span style="font-family:monospace;font-size:.75rem;color:var(--dim);">${e.accessCode?.slice(0,8)}…</span></td>
        <td style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn btn-secondary btn-sm" onclick="navigator.clipboard.writeText('${baseUrl}/exam/${e.accessCode}').then(()=>showToast('Copied!','success'))">📋 Copy</button>
          <button class="btn btn-${e.status === 'live' ? 'danger' : 'success'} btn-sm" onclick="toggleStatus('${e._id}','${e.status}')">
            ${e.status === 'live' ? '⏹ End' : '▶ Resume'}
          </button>
        </td>
      </tr>`).join('');
  } catch (err) {
    body.innerHTML = `<tr><td colspan="6"><div class="alert alert-error">${err.message}</div></td></tr>`;
  }
}

async function toggleStatus(id, currentStatus) {
  const newStatus = currentStatus === 'live' ? 'ended' : 'live';
  try {
    await apiFetch(`/admin/exams/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) });
    showToast(`Exam ${newStatus}`, 'info');
    loadExams();
  } catch (err) { showToast(err.message, 'error'); }
}

// ── RESULTS ───────────────────────────────────────────────────────────────
async function loadExamSelect() {
  const sel = document.getElementById('resultExamSelect');
  try {
    const data = await apiFetch('/admin/exams');
    sel.innerHTML = '<option value="">— Choose an exam —</option>' +
      data.exams.map(e => `<option value="${e._id}">${e.title}</option>`).join('');
  } catch (err) { showToast(err.message, 'error'); }
}

async function loadResults() {
  const examId = document.getElementById('resultExamSelect').value;
  const panel  = document.getElementById('resultsPanel');
  if (!examId) { panel.innerHTML = ''; return; }
  panel.innerHTML = '<p style="color:var(--dim)">Loading results…</p>';
  try {
    const data = await apiFetch(`/admin/exams/${examId}/results`);
    const { exam, submissions } = data;
    if (!submissions.length) {
      panel.innerHTML = '<div class="alert alert-info">No submissions yet for this exam.</div>'; return;
    }
    panel.innerHTML = `
      <div class="stats-grid mb-3" style="margin-top:16px;">
        <div class="stat-card"><div class="stat-value">${submissions.length}</div><div class="stat-label">Total Submissions</div></div>
        <div class="stat-card"><div class="stat-value" style="color:var(--success)">${Math.round(submissions.reduce((a,s) => a + s.score, 0) / submissions.length * 10) / 10}</div><div class="stat-label">Avg Score</div></div>
        <div class="stat-card"><div class="stat-value" style="color:var(--danger)">${submissions.filter(s => s.cheatingAttempted).length}</div><div class="stat-label">Cheating Flags</div></div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Student</th><th>Location</th><th>Score</th><th>Correct</th><th>Wrong</th>
            <th>Attended</th><th>Avg Time/Q</th><th>Total Time</th><th>Cheating</th><th>Auto-Submit</th>
          </tr></thead>
          <tbody>
            ${submissions.map(s => {
              const avgTime = s.answers?.length ? Math.round((s.totalTimeSec || 0) / s.answers.length) : 0;
              return `<tr class="result-row">
                <td>
                  <div>${s.studentName || 'Student'}</div>
                  <div class="text-sm" style="color:var(--dim);">${s.studentEmail}</div>
                </td>
                <td class="text-sm">${s.location?.city || '—'}<br><span style="color:var(--dim);font-size:.73rem;">${s.location?.country || ''}</span></td>
                <td><b style="color:var(--primary);">${s.score}</b>/${s.maxScore || '?'}</td>
                <td style="color:var(--success);">${s.correct}</td>
                <td style="color:var(--danger);">${s.wrong}</td>
                <td>${s.attended}/${s.answers?.length || 0}</td>
                <td>${avgTime}s</td>
                <td>${fmtDuration(s.totalTimeSec || 0)}</td>
                <td>${s.cheatingAttempted ? '<span class="badge badge-danger">YES</span>' : '<span class="badge badge-success">No</span>'}</td>
                <td>${s.autoSubmitted ? '<span class="badge badge-warning">Yes</span>' : '—'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  } catch (err) {
    panel.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

function showMsg(id, text, type = 'error') {
  document.getElementById(id).innerHTML = `<div class="alert alert-${type}">${text}</div>`;
}


async function viewSubmission(examId, subId) {
  // Let's create or show a modal dynamically
  let modal = document.getElementById('gradingModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'gradingModal';
    modal.className = 'modal hidden';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 800px; width:90%; padding:24px; border-radius:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <h3>Review & Grade Submission</h3>
          <button class="btn btn-sm" onclick="document.getElementById('gradingModal').classList.add('hidden')">Close</button>
        </div>
        <div id="gradingContent" style="max-height: 60vh; overflow-y: auto;">Loading...</div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  
  modal.classList.remove('hidden');
  document.getElementById('gradingContent').innerHTML = '<p>Loading submission details...</p>';
  
  try {
    const data = await apiFetch(`/student/result/${subId}`);
    if (!data.enrichedAnswers) throw new Error('Could not load answers');
    
    let html = '';
    data.enrichedAnswers.forEach((a, idx) => {
      if (a.type === 'MCQ' || !a.type) {
        html += `
          <div style="margin-bottom: 16px; padding: 12px; border: 1px solid var(--border); border-radius: 8px;">
            <p><strong>Q${idx+1}: ${a.questionText}</strong> <span class="badge badge-info">MCQ</span></p>
            <p style="color:${a.isCorrect ? 'var(--success)' : 'var(--danger)'}">Selected: ${a.options[a.selectedIndex] || 'Not answered'}</p>
          </div>
        `;
      } else {
        html += `
          <div style="margin-bottom: 16px; padding: 12px; border: 1px solid var(--border); border-radius: 8px;">
            <p><strong>Q${idx+1}: ${a.questionText}</strong> <span class="badge badge-warning">${a.type} (${a.marks}m)</span></p>
            <div style="background:var(--surface); padding:8px; margin:8px 0; border-radius:4px;">
              <small style="color:var(--dim)">Student Answer:</small><br>
              ${a.textAnswer || '<em>No answer provided</em>'}
            </div>
            <div style="background:var(--success-light); padding:8px; margin:8px 0; border-radius:4px; font-size:0.85rem;">
              <small>Ideal Answer:</small><br>
              ${a.idealAnswer || 'N/A'}
            </div>
            <div style="display:flex; gap:16px; align-items:center; margin-top:8px;">
              <div>
                <small style="color:var(--dim)">AI Score / Feedback:</small><br>
                <strong>${a.aiScore !== undefined ? a.aiScore : '?'} / ${a.marks}</strong> - <em>${a.aiFeedback || ''}</em>
              </div>
              <div style="flex:1;"></div>
              <div>
                <label style="font-size:0.85rem; font-weight:600;">Override Score:</label>
                <input type="number" id="override-${a.questionId}" value="${a.teacherScore !== undefined ? a.teacherScore : a.aiScore}" step="0.5" min="0" max="${a.marks}" style="width:70px; padding:4px; border:1px solid var(--border); border-radius:4px;">
                <button class="btn btn-sm btn-primary" onclick="overrideScore('${examId}', '${subId}', '${a.questionId}')">Save</button>
              </div>
            </div>
          </div>
        `;
      }
    });
    
    document.getElementById('gradingContent').innerHTML = html;
  } catch (err) {
    document.getElementById('gradingContent').innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

async function overrideScore(examId, subId, questionId) {
  const newScore = document.getElementById(`override-${questionId}`).value;
  try {
    await apiFetch(`/admin/exams/${examId}/submissions/${subId}/override`, {
      method: 'PATCH',
      body: JSON.stringify({ questionId, newScore })
    });
    showToast('Score overridden successfully!', 'success');
    loadResults(); // refresh background table
  } catch (err) {
    showToast(err.message, 'error');
  }
}
