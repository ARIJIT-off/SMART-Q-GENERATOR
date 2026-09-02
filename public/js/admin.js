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
const pdfFile    = document.getElementById('pdfFile');

uploadZone.addEventListener('click', () => pdfFile.click());
uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('dragover'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault(); uploadZone.classList.remove('dragover');
  if (e.dataTransfer.files[0]) {
    pdfFile.files = e.dataTransfer.files;
    document.getElementById('fileName').textContent = '📄 '  e.dataTransfer.files[0].name;
  }
});
pdfFile.addEventListener('change', () => {
  if (pdfFile.files[0]) document.getElementById('fileName').textContent = '📄 '  pdfFile.files[0].name;
});

function onPyqSelected() {
  const f = document.getElementById('pyqFile').files[0];
  document.getElementById('pyqFileName').textContent = f  '📜 '  f.name : 'optional — helps AI frame better questions';
}

function updateTotal() {
  const total = ['qMCQ','qSAQ1','qSAQ2','qLAQ5','qLAQ10']
    .reduce((s, id) => s  (parseInt(document.getElementById(id).value) || 0), 0);
  document.getElementById('totalQCount').textContent = total;
}

async function generateQuestions() {
  if (!pdfFile.files[0]) { showMsg('genMsg', 'Please select a syllabus PDF.', 'error'); return; }

  const counts = {
    mcq:  parseInt(document.getElementById('qMCQ').value)  || 0,
    saq1: parseInt(document.getElementById('qSAQ1').value) || 0,
    saq2: parseInt(document.getElementById('qSAQ2').value) || 0,
    laq5: parseInt(document.getElementById('qLAQ5').value) || 0,
    laq10:parseInt(document.getElementById('qLAQ10').value)|| 0,
  };
  const total = Object.values(counts).reduce((a,b) => ab, 0);
  if (total === 0) { showMsg('genMsg', 'Add at least 1 question.', 'error'); return; }

  const btn = document.getElementById('genBtn');
  btn.disabled = true;
  document.getElementById('genText').textContent = 'Generating…';
  document.getElementById('genSpinner').classList.remove('hidden');
  document.getElementById('genMsg').innerHTML = `<div class="alert alert-info">🤖 Generating ${total} questions via AI… This may take 20–60 seconds.</div>`;

  try {
    const fd = new FormData();
    fd.append('syllabus', pdfFile.files[0]);
    fd.append('questionCounts', JSON.stringify(counts));
    const pyqF = document.getElementById('pyqFile').files[0];
    if (pyqF) fd.append('pyq', pyqF);

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

// keep old alias for legacy calls
const generateMCQs = generateQuestions;

function qTypeBadge(type, marks, options = []) {
  const rawQType = (type || 'mcq').toLowerCase();
  const isMcqFallback = rawQType === 'mcq' && (!options || options.length === 0);
  const finalType = isMcqFallback  (marks >= 5  'laq' : 'saq') : rawQType;

  if (finalType === 'mcq')  return `<span class="badge badge-info">MCQ</span>`;
  if (finalType === 'saq')  return `<span class="badge badge-warning">SAQ ${marks}M</span>`;
  if (finalType === 'laq')  return `<span class="badge badge-danger">LAQ ${marks}M</span>`;
  return `<span class="badge badge-info">${finalType}</span>`;
}

function renderPreview(questions) {
  const panel = document.getElementById('previewPanel');
  const list  = document.getElementById('previewList');
  panel.style.display = 'block';
  document.getElementById('previewCount').textContent = questions.length;
  const letters = ['A','B','C','D'];
  list.innerHTML = questions.map((q, i) => {
    const rawQType = (q.type || 'mcq').toLowerCase();
    const isMcqFallback = rawQType === 'mcq' && (!q.options || q.options.length === 0);
    const finalType = isMcqFallback  (q.marks >= 5  'laq' : 'saq') : rawQType;

    return `
    <div class="question-card">
      <div class="question-num">
        Q${i1} · ${qTypeBadge(q.type, q.marks, q.options)} · <span class="badge badge-${diffBadge(q.difficulty)}">${q.difficulty}</span> · <span class="tag">${q.topic}</span>
      </div>
      <div class="question-text">${q.text}</div>
      ${finalType === 'mcq'  `
        <ul class="options-list">
          ${(q.options||[]).map((o, oi) => `
            <li class="option-item ${oi === q.answerIndex  'correct' : ''}">
              <span class="option-letter">${letters[oi]}</span>${o}
            </li>`).join('')}
        </ul>` : `
        <div style="margin-top:8px;padding:10px;background:var(--surface-light);border-radius:6px;border-left:3px solid var(--primary);">
          <div style="font-size:0.75rem;color:var(--dim);margin-bottom:4px;">Model Answer</div>
          <div style="font-size:0.85rem;color:var(--text);">${q.modelAnswer || '—'}</div>
        </div>`}
    </div>`
  }).join('');
}

function diffBadge(d) { return d === 'easy'  'success' : d === 'hard'  'danger' : 'warning'; }

async function saveToBank() {
  if (!generatedQuestions.length) return;
  try {
    const data = await apiFetch('/admin/questions/save', {
      method: 'POST',
      body: JSON.stringify({ questions: generatedQuestions })
    });
    showToast(`✅ ${data.count} questions saved tbank!`, 'success');
    generatedQuestions = [];
    document.getElementById('previewPanel').style.display = 'none';
  } catch (err) {
    showToast(err.message, 'error');
  }
}


// ── QUESTION BANK ────────────────────────────────────────────────────────
function groupQuestions(questions) {
  const groups = {};
  questions.forEach((q, i) => {
    const key = q.batchId || 'legacy';
    if (!groups[key]) {
      groups[key] = {
        id: key,
        pdfName: q.pdfName || 'Manual / Legacy Questions',
        date: new Date(q.createdAt).toLocaleString(),
        questions: []
      };
    }
    groups[key].questions.push(q);
  });
  return Object.values(groups).sort((a,b) => b.id.localeCompare(a.id));
}

function toggleGroup(groupId) {
  const el = document.getElementById(`group-content-${groupId}`);
  const icon = document.getElementById(`group-icon-${groupId}`);
  if (el.style.display === 'none') {
    el.style.display = 'block';
    icon.textContent = '▼';
  } else {
    el.style.display = 'none';
    icon.textContent = '▶';
  }
}

async function loadBank() {
  const list = document.getElementById('bankList');
  list.innerHTML = '<p style="color:var(--dim)">Loading…</p>';
  try {
    const data = await apiFetch('/admin/questions');
    bankQuestions = data.questions;
    document.getElementById('bankCount').textContent = bankQuestions.length;
    if (!bankQuestions.length) { list.innerHTML = '<p style="color:var(--dim)">Nquestions yet. Upload a syllabus tgenerate some.</p>'; return; }
    
    const grouped = groupQuestions(bankQuestions);
    const letters = ['A','B','C','D'];
    
    list.innerHTML = grouped.map((g, idx) => `
      <div class="question-group" style="margin-bottom: 12px; border: 1px solid var(--border); border-radius: 8px; overflow: hidden;">
        <div class="group-header" onclick="toggleGroup('${g.id}')" style="background: var(--surface-light); padding: 12px 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
          <div style="font-weight: 500;">
            <span style="color:var(--primary); margin-right:8px;">Req #${grouped.length - idx}</span>
            <span>📄 ${g.pdfName}</span>
            <span class="badge badge-info" style="margin-left: 8px;">${g.questions.length} Qs</span>
          </div>
          <span id="group-icon-${g.id}" style="color:var(--dim);">▶</span>
        </div>
        <div id="group-content-${g.id}" style="display: none; padding: 16px; background: var(--surface);">
          ${g.questions.map((q, i) => `
            <div class="question-card" id="bq-${q._id}">
              <div class="question-num" style="display:flex;justify-content:space-between;align-items:center;">
                <span>Q${i1} • <span class="badge badge-${diffBadge(q.difficulty)}">${q.difficulty}</span> • <span class="tag">${q.topic}</span></span>
                <button class="btn btn-danger btn-sm" onclick="deleteQ('${q._id}')">🗑</button>
              </div>
              <div class="question-text">${q.text}</div>
              <ul class="options-list">
                ${q.options.map((o,oi) => `
                  <li class="option-item ${oi === q.answerIndex  'correct' : ''}">
                    <span class="option-letter">${letters[oi]}</span>${o}
                  </li>`).join('')}
              </ul>
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
  if (!confirm('Delete this question')) return;
  try {
    await apiFetch(`/admin/questions/${id}`, { method: 'DELETE' });
    document.getElementById(`bq-${id}`).remove();
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
      sel.innerHTML = '<p style="color:var(--dim);font-size:.85rem;">Nquestions in bank. Generate some first.</p>';
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
  
  btn.textContent = allChecked  'Select All' : 'Deselect All';
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
  if (!emails.length) { showToast('Nvalid emails found.', 'error'); return; }
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
      body.innerHTML = '<tr><td colspan="6" style="color:var(--dim);text-align:center;">Nexams yet.</td></tr>';
      return;
    }
    const baseUrl = window.location.origin;
    body.innerHTML = data.exams.map(e => `
      <tr>
        <td><b>${e.title}</b></td>
        <td>${e.questions.length || 0}</td>
        <td>${e.duration} min</td>
        <td><span class="badge badge-${e.status === 'live'  'success' : e.status === 'ended'  'danger' : 'warning'}">${e.status}</span></td>
        <td><span style="font-family:monospace;font-size:.75rem;color:var(--dim);">${e.accessCode.slice(0,8)}…</span></td>
        <td style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn btn-secondary btn-sm" onclick="navigator.clipboard.writeText('${baseUrl}/exam/${e.accessCode}').then(()=>showToast('Copied!','success'))">📋 Copy</button>
          <button class="btn btn-${e.status === 'live'  'danger' : 'success'} btn-sm" onclick="toggleStatus('${e._id}','${e.status}')">
            ${e.status === 'live'  '⏹ End' : '▶ Resume'}
          </button>
        </td>
      </tr>`).join('');
  } catch (err) {
    body.innerHTML = `<tr><td colspan="6"><div class="alert alert-error">${err.message}</div></td></tr>`;
  }
}

async function toggleStatus(id, currentStatus) {
  const newStatus = currentStatus === 'live'  'ended' : 'live';
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
    sel.innerHTML = '<option value="">— Choose an exam —</option>' 
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
      panel.innerHTML = '<div class="alert alert-info">Nsubmissions yet for this exam.</div>'; return;
    }
    const hasNonMcq = submissions.some(s =>
      s.enrichedAnswers.some(a => a.questionType !== 'mcq')
    );

    panel.innerHTML = `
      <div class="stats-grid mb-3" style="margin-top:16px;">
        <div class="stat-card"><div class="stat-value">${submissions.length}</div><div class="stat-label">Total Submissions</div></div>
        <div class="stat-card"><div class="stat-value" style="color:var(--success)">${Math.round(submissions.reduce((a,s) => a  s.score, 0) / submissions.length * 10) / 10}</div><div class="stat-label">Avg Score</div></div>
        <div class="stat-card"><div class="stat-value" style="color:var(--danger)">${submissions.filter(s => s.cheatingAttempted).length}</div><div class="stat-label">Cheating Flags</div></div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Student</th><th>Location</th><th>Score</th><th>MCQ Correct</th><th>Wrong</th>
            <th>Attended</th><th>Total Time</th><th>Cheating</th>
            ${hasNonMcq  '<th>Grade Review</th>' : ''}
          </tr></thead>
          <tbody>
            ${submissions.map(s => {
              return `<tr class="result-row">
                <td>
                  <div>${s.studentName || 'Student'}</div>
                  <div class="text-sm" style="color:var(--dim);">${s.studentEmail}</div>
                  ${s.gradingPending  '<span class="badge badge-warning">AI Grading Pending</span>' : ''}
                </td>
                <td class="text-sm">${s.location.city || '—'}<br><span style="color:var(--dim);font-size:.73rem;">${s.location.country || ''}</span></td>
                <td><b style="color:var(--primary);">${s.score}</b>/${s.maxScore || ''}</td>
                <td style="color:var(--success);">${s.correct}</td>
                <td style="color:var(--danger);">${s.wrong}</td>
                <td>${s.attended}/${s.answers.length || 0}</td>
                <td>${fmtDuration(s.totalTimeSec || 0)}</td>
                <td>${s.cheatingAttempted  '<span class="badge badge-danger">YES</span>' : '<span class="badge badge-success">No</span>'}</td>
                ${hasNonMcq  `<td><button class="btn btn-secondary btn-sm" onclick='openGradeModal(${JSON.stringify(s)})'>✏️ Review & Grade</button></td>` : ''}
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  } catch (err) {
    panel.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

// ── Teacher Grade Override Modal ──────────────────────────────────────────
let currentGradingSubmission = null;

function openGradeModal(submission) {
  currentGradingSubmission = submission;
  document.getElementById('gradeModalStudent').textContent = submission.studentName || submission.studentEmail;
  const body = document.getElementById('gradeModalBody');
  const nonMcq = (submission.enrichedAnswers || []).filter(a => a.questionType !== 'mcq');

  if (!nonMcq.length) {
    body.innerHTML = '<p style="color:var(--dim)">NSAQ/LAQ answers treview for this student.</p>';
  } else {
    body.innerHTML = nonMcq.map(a => {
      const finalScore = a.teacherScore != null  a.teacherScore : (a.aiScore  '—');
      const badge = a.questionType === 'saq'  `badge-warning` : `badge-danger`;
      return `
        <div style="border:1px solid var(--border);border-radius:8px;padding:16px;margin-bottom:16px;">
          <div style="display:flex;gap:8px;margin-bottom:8px;align-items:center;">
            <span class="badge ${badge}">${a.questionType.toUpperCase()} — ${a.marks}M</span>
            <span class="tag">${a.questionText}</span>
          </div>

          <div style="margin:10px 0;padding:10px;background:var(--surface-light);border-radius:6px;">
            <div style="font-size:0.72rem;color:var(--dim);margin-bottom:4px;">Student's Answer</div>
            <div style="font-size:0.88rem;">${a.textAnswer || '<i style="color:var(--dim)">Not attempted</i>'}</div>
          </div>

          ${a.modelAnswer  `<div style="margin:10px 0;padding:10px;background:var(--surface-light);border-radius:6px;border-left:3px solid var(--primary);">
            <div style="font-size:0.72rem;color:var(--dim);margin-bottom:4px;">Model Answer</div>
            <div style="font-size:0.85rem;">${a.modelAnswer}</div>
          </div>` : ''}

          <div style="display:flex;gap:12px;align-items:flex-start;margin-top:12px;">
            <div>
              <div style="font-size:0.72rem;color:var(--dim);">AI Score</div>
              <b style="color:var(--primary);">${a.aiScore != null  a.aiScore : '—'} / ${a.marks}</b>
              ${a.aiFeedback  `<div style="font-size:0.75rem;color:var(--dim);margin-top:4px;max-width:300px;">${a.aiFeedback}</div>` : ''}
            </div>
            <div style="flex:1;">
              <label style="font-size:0.72rem;color:var(--dim);">Override Score (0 – ${a.marks})</label>
              <div style="display:flex;gap:8px;margin-top:4px;">
                <input type="number" id="os-${a.questionId}" min="0" max="${a.marks}" step="0.5"
                  value="${a.teacherScore != null  a.teacherScore : (a.aiScore  '')}"
                  style="width:80px;" class="form-control">
                <input type="text" id="on-${a.questionId}" placeholder="Note (optional)" class="form-control" style="flex:1;" value="${a.teacherNote||''}">
                <button class="btn btn-success btn-sm" onclick="submitGradeOverride('${submission._id}','${a.questionId}',${a.marks})">Save</button>
              </div>
            </div>
          </div>
        </div>`;
    }).join('');
  }
  document.getElementById('gradeModal').classList.remove('hidden');
}

function closeGradeModal() {
  document.getElementById('gradeModal').classList.add('hidden');
  currentGradingSubmission = null;
}

async function submitGradeOverride(submissionId, questionId, maxMarks) {
  const scoreEl = document.getElementById(`os-${questionId}`);
  const noteEl  = document.getElementById(`on-${questionId}`);
  const score   = parseFloat(scoreEl.value);
  if (isNaN(score) || score < 0 || score > maxMarks) {
    showToast(`Score must be 0–${maxMarks}`, 'error'); return;
  }
  try {
    const res = await apiFetch(`/admin/submissions/${submissionId}/grade-answer`, {
      method: 'PATCH',
      body: JSON.stringify({ questionId, score, note: noteEl.value })
    });
    showToast(`✅ Score saved. New total: ${res.newTotalScore}`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function showMsg(id, text, type = 'error') {
  document.getElementById(id).innerHTML = `<div class="alert alert-${type}">${text}</div>`;
}
