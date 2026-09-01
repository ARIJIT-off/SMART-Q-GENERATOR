/**
 * exam.js — Full Proctored Exam Logic
 */

// ── Auth ──────────────────────────────────────────────────────────────────
const _eUser = requireAuth();

// ── Extract access code from URL (/exam/<code>) ───────────────────────────
const accessCode = window.location.pathname.replace(/^\/exam\/?/, '').split('/')[0].trim();
if (!accessCode) {
  alert('Invalid exam link.'); window.location.href = '/student.html';
}

// ── State ─────────────────────────────────────────────────────────────────
let examData = null;
let questions = [];
let answers = [];           // { questionId, selectedIndex, timeTakenSec }
let currentIdx = 0;
let timerInterval = null;
let timeLeftSec = 0;
let qStartTime = Date.now();
let cheatingEvents = [];
let cheatingAttempted = false;
let locationData = { lat: 0, lng: 0, city: 'Unknown', country: 'Unknown' };
let camStream = null;
let submitted = false;
let fsWarningActive = false;
let fsWarningTimeout = null;

// ── Load Exam ─────────────────────────────────────────────────────────────
async function loadExam() {
  try {
    const data = await apiFetch(`/exam/${accessCode}`);
    examData = data.exam;
    questions = data.exam.questions;
    timeLeftSec = data.exam.duration * 60;

    answers = questions.map(q => ({ questionId: q._id, selectedIndex: -1, textAnswer: '', timeTakenSec: 0 }));

    document.getElementById('examTitleSetup').textContent = examData.title;
    document.getElementById('examMeta').textContent =
      `${questions.length} Questions · ${examData.duration} min · ${examData.marksPerQuestion} mark/question` +
      (examData.negativeMarking > 0 ? ` · -${examData.negativeMarking} negative` : '');

    document.getElementById('startBtn').disabled = false;
  } catch (err) {
    document.getElementById('setupMsg').innerHTML = `<div class="alert alert-error">❌ ${err.message}</div>`;
  }
}

// ── Setup: Permissions ────────────────────────────────────────────────────
async function startSetup() {
  document.getElementById('startBtn').disabled = true;
  await requestLocation();
  await requestCamera();
  const allOk = locOk && camOk;
  document.getElementById('beginBtn').style.display = 'block';
  if (!allOk) {
    document.getElementById('setupMsg').innerHTML =
      '<div class="alert alert-warning">Some permissions were denied. Camera and location are required for proctoring. You may still proceed, but it will be flagged.</div>';
  }
}

let locOk = false, camOk = false;

async function requestLocation() {
  const el = document.getElementById('locStatus');
  return new Promise(resolve => {
    if (!navigator.geolocation) { el.textContent = 'N/A'; el.className = 'perm-status denied'; resolve(); return; }
    navigator.geolocation.getCurrentPosition(
      async pos => {
        locationData.lat = pos.coords.latitude;
        locationData.lng = pos.coords.longitude;
        // Try reverse geocode
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
          const geo = await r.json();
          locationData.city = geo.address?.city || geo.address?.town || geo.address?.state || 'Unknown';
          locationData.country = geo.address?.country || 'Unknown';
        } catch {}
        el.textContent = 'Granted ✓'; el.className = 'perm-status granted'; locOk = true;
        resolve();
      },
      () => { el.textContent = 'Denied'; el.className = 'perm-status denied'; resolve(); },
      { timeout: 8000 }
    );
  });
}

async function requestCamera() {
  const el = document.getElementById('camStatus');
  try {
    camStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    el.textContent = 'Granted ✓'; el.className = 'perm-status granted'; camOk = true;
  } catch {
    el.textContent = 'Denied'; el.className = 'perm-status denied';
  }
}

// ── Begin Exam ────────────────────────────────────────────────────────────
async function beginExam() {
  // Go fullscreen
  await requestFullscreen();
  // Show cam PIP
  if (camStream) {
    const pip = document.getElementById('camera-pip');
    const vid = document.getElementById('camVideo');
    vid.srcObject = camStream;
    pip.style.display = 'block';
  }
  // Switch screens
  document.getElementById('setup-screen').style.display = 'none';
  document.getElementById('exam-screen').style.display = 'block';
  document.getElementById('examTitleBar').textContent = examData.title;

  // Build nav grid
  buildNavGrid();
  renderQuestion(0);
  startTimer();
  attachAntiCheat();
}

async function requestFullscreen() {
  const el = document.documentElement;
  const fsEl = document.getElementById('fsStatus');
  try {
    await (el.requestFullscreen?.() || el.webkitRequestFullscreen?.() || el.mozRequestFullScreen?.());
    fsEl.textContent = 'Active ✓'; fsEl.className = 'perm-status granted';
  } catch {
    fsEl.textContent = 'Failed'; fsEl.className = 'perm-status denied';
  }
}

async function reEnterFullscreen() {
  document.getElementById('fsWarn').style.display = 'none';
  fsWarningActive = false;
  clearTimeout(fsWarningTimeout);
  try {
    await document.documentElement.requestFullscreen();
  } catch {}
}

// ── Anti-Cheat ────────────────────────────────────────────────────────────
function attachAntiCheat() {
  // Tab/window switch → auto-submit
  document.addEventListener('visibilitychange', onVisibilityChange);

  // Fullscreen exit → warn then auto-submit
  document.addEventListener('fullscreenchange', onFullscreenChange);
  document.addEventListener('webkitfullscreenchange', onFullscreenChange);

  // Block right-click
  document.addEventListener('contextmenu', e => e.preventDefault());

  // Block common keyboard shortcuts
  document.addEventListener('keydown', e => {
    const blocked = ['F12','F11','Tab'];
    const ctrlBlocked = ['u','s','p','a','c','v','x'];
    if (blocked.includes(e.key)) e.preventDefault();
    if ((e.ctrlKey || e.metaKey) && ctrlBlocked.includes(e.key.toLowerCase())) e.preventDefault();
    if (e.altKey && e.key === 'Tab') e.preventDefault();
  });
}

function onVisibilityChange() {
  if (submitted) return;
  if (document.hidden) {
    logCheat('tab-switch');
    // Immediately auto-submit on tab switch
    triggerAutoSubmit('Tab switch detected');
  }
}

function onFullscreenChange() {
  if (submitted) return;
  const isFS = !!(document.fullscreenElement || document.webkitFullscreenElement);
  if (!isFS && !fsWarningActive) {
    logCheat('fullscreen-exit');
    fsWarningActive = true;
    document.getElementById('fsWarn').style.display = 'flex';
    // Give 5 seconds to re-enter, then auto-submit
    fsWarningTimeout = setTimeout(() => {
      if (fsWarningActive && !submitted) {
        document.getElementById('fsWarn').style.display = 'none';
        triggerAutoSubmit('Fullscreen exit — time limit exceeded');
      }
    }, 5000);
  }
}

function logCheat(event) {
  cheatingAttempted = true;
  cheatingEvents.push(event);
  const counter = document.getElementById('cheatCounter');
  counter.style.display = 'inline-block';
  counter.textContent = `⚠ ${cheatingEvents.length} warning${cheatingEvents.length > 1 ? 's' : ''}`;
}

async function triggerAutoSubmit(reason) {
  if (submitted) return;
  console.warn('Auto-submit:', reason);
  saveCurrentQTime();
  await submitExam(true);
  document.getElementById('cheat-overlay').style.display = 'flex';
}

function goToStudent() { window.location.href = '/student.html'; }

// ── Timer ─────────────────────────────────────────────────────────────────
function startTimer() {
  const el = document.getElementById('timer');
  timerInterval = setInterval(() => {
    timeLeftSec--;
    el.textContent = fmtTime(timeLeftSec);
    if (timeLeftSec <= 300) el.className = 'timer warn';
    if (timeLeftSec <= 60)  el.className = 'timer danger';
    if (timeLeftSec <= 0)   { clearInterval(timerInterval); submitExam(true); }
  }, 1000);
  el.textContent = fmtTime(timeLeftSec);
}

// ── Question Render ───────────────────────────────────────────────────────
function buildNavGrid() {
  const grid = document.getElementById('navGrid');
  grid.innerHTML = questions.map((_, i) =>
    `<button class="q-nav-btn" id="nav-${i}" onclick="goToQ(${i})">${i+1}</button>`
  ).join('');
}

function renderQuestion(idx) {
  currentIdx = idx;
  qStartTime = Date.now();
  const q   = questions[idx];
  const ans = answers[idx];
  const letters = ['A','B','C','D'];
  const rawQType = (q.type || 'mcq').toLowerCase();
  const marks = q.marks || examData.marksPerQuestion || 1;

  // Fallback for older questions generated before the SAQ/LAQ fix
  // If it's flagged as MCQ but has 0 options, treat it as SAQ or LAQ based on marks
  const isMcqFallback = rawQType === 'mcq' && (!q.options || q.options.length === 0);
  const qType = isMcqFallback ? (marks >= 5 ? 'laq' : 'saq') : rawQType;
  const isMcq = qType === 'mcq';

  // Type badge
  let typeBadge = '<span style="background:rgba(79,70,229,.25);color:#818cf8;padding:2px 8px;border-radius:4px;font-size:0.78rem;font-weight:700;">✅ MCQ</span>';
  if (qType === 'saq') typeBadge = `<span style="background:rgba(245,158,11,.2);color:#fbbf24;padding:2px 8px;border-radius:4px;font-size:0.78rem;font-weight:700;">📝 SAQ — ${marks} Mark${marks > 1 ? 's' : ''}</span>`;
  if (qType === 'laq') typeBadge = `<span style="background:rgba(239,68,68,.2);color:#f87171;padding:2px 8px;border-radius:4px;font-size:0.78rem;font-weight:700;">📋 LAQ — ${marks} Marks</span>`;


  document.getElementById('qNum').innerHTML = `Question ${idx + 1} of ${questions.length} &nbsp;·&nbsp; ${typeBadge}`;
  document.getElementById('qText').textContent = q.text;
  document.getElementById('qProgress').textContent =
    `${answers.filter(a => a.selectedIndex !== -1 || (a.textAnswer||'').trim().length > 0).length}/${questions.length} answered`;

  // Show/hide Clear Answer button (only relevant for MCQ)
  const clearBtn = document.getElementById('clearBtn');
  if (clearBtn) clearBtn.style.display = isMcq ? '' : 'none';

  const container = document.getElementById('optionsList');

  if (isMcq) {
    // MCQ: render as clickable option divs
    container.innerHTML = (q.options||[]).map((o, oi) => `
      <div class="option-item ${oi === ans.selectedIndex ? 'selected' : ''}" onclick="selectOption(${oi})" style="cursor:pointer;">
        <span class="option-letter">${letters[oi]}</span>${o}
      </div>`).join('');
  } else {
    // SAQ / LAQ: textarea answer box
    const rows = qType === 'saq' ? 5 : 12;
    const minH = qType === 'saq' ? '120px' : '260px';
    const hint = qType === 'saq'
      ? '✍️ Short Answer — write 2–6 clear sentences.'
      : '✍️ Long Answer — write detailed paragraphs with examples.';
    const wordCount = (ans.textAnswer||'').trim().split(/\s+/).filter(Boolean).length;

    container.innerHTML = `
      <div style="margin-bottom:10px;padding:10px 14px;background:rgba(79,70,229,.1);border-left:3px solid var(--primary);border-radius:6px;font-size:0.82rem;color:var(--dim);">
        ${hint}
      </div>
      <textarea id="ansTextarea"
        placeholder="Start writing your answer here…"
        rows="${rows}"
        style="
          width:100%;
          min-height:${minH};
          padding:16px;
          border:2px solid var(--border);
          border-radius:10px;
          background:var(--surface);
          color:var(--text);
          font-family:inherit;
          font-size:1rem;
          line-height:1.7;
          resize:vertical;
          outline:none;
          transition: border-color .2s;
          box-sizing:border-box;
        "
        onfocus="this.style.borderColor='var(--primary)'"
        onblur="this.style.borderColor='var(--border)'"
        oninput="updateTextAnswer(this.value)"
      >${ans.textAnswer || ''}</textarea>
      <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:0.75rem;color:var(--dim);">
        <span>Max marks: <b style="color:var(--primary);">${marks}</b> — AI will grade your answer</span>
        <span id="wordCountEl">${wordCount} words</span>
      </div>`;

    // Wire live word counter
    requestAnimationFrame(() => {
      const ta = document.getElementById('ansTextarea');
      if (ta) {
        ta.addEventListener('input', function() {
          const wc = this.value.trim().split(/\s+/).filter(Boolean).length;
          const el = document.getElementById('wordCountEl');
          if (el) el.textContent = wc + ' words';
        });
        ta.focus();
      }
    });
  }

  document.getElementById('prevBtn').disabled = idx === 0;
  document.getElementById('nextBtn').disabled = idx === questions.length - 1;

  // Update nav grid
  document.querySelectorAll('.q-nav-btn').forEach((b, i) => {
    b.classList.toggle('active', i === idx);
    const isAns = answers[i].selectedIndex !== -1 || (answers[i].textAnswer||'').trim().length > 0;
    b.classList.toggle('answered', isAns);
  });
}

function selectOption(optionIdx) {
  answers[currentIdx].selectedIndex = optionIdx;
  renderQuestion(currentIdx);
}

function clearAnswer() {
  const q = questions[currentIdx];
  const qType = (q.type || 'mcq').toLowerCase();
  if (qType === 'mcq') {
    answers[currentIdx].selectedIndex = -1;
  } else {
    answers[currentIdx].textAnswer = '';
    const ta = document.getElementById('ansTextarea');
    if (ta) ta.value = '';
  }
  renderQuestion(currentIdx);
}


function navigate(dir) {
  saveCurrentQTime();
  const next = currentIdx + dir;
  if (next >= 0 && next < questions.length) renderQuestion(next);
}

function goToQ(idx) {
  saveCurrentQTime();
  renderQuestion(idx);
}

// ── Notepad ───────────────────────────────────────────────────────────────
function toggleNotepad() {
  const panel = document.getElementById('notepadPanel');
  if (panel.style.display === 'none') {
    panel.style.display = 'flex';
    document.getElementById('notepadText').focus();
  } else {
    panel.style.display = 'none';
  }
}


function saveCurrentQTime() {
  answers[currentIdx].timeTakenSec += Math.round((Date.now() - qStartTime) / 1000);
  qStartTime = Date.now();
}

// ── Submit ────────────────────────────────────────────────────────────────
function confirmSubmit() {
  const answered = answers.filter(a => a.selectedIndex !== -1 || a.textAnswer.trim().length > 0).length;
  const notAnswered = answers.length - answered;
  document.getElementById('submitSummary').innerHTML =
    `<b>${answered}</b> answered, <b style="color:var(--warning)">${notAnswered}</b> unanswered out of ${answers.length} questions.<br>Once submitted, you cannot change your answers.`;
  document.getElementById('submitModal').classList.remove('hidden');
}

async function submitExam(isAuto = false) {
  if (submitted) return;
  submitted = true;
  document.getElementById('submitModal').classList.add('hidden');
  saveCurrentQTime();
  clearInterval(timerInterval);

  const totalTimeSec = (examData.duration * 60) - timeLeftSec;

  try {
    const data = await apiFetch('/student/submit', {
      method: 'POST',
      body: JSON.stringify({
        examId: examData._id,
        answers,
        location: locationData,
        cheatingAttempted,
        cheatingEvents,
        autoSubmitted: isAuto,
        totalTimeSec
      })
    });

    if (!isAuto) {
      // Normal submit — go to result page
      window.location.href = `/result.html?id=${data.submissionId}`;
    }
    // Auto-submit shows the overlay (already shown)
  } catch (err) {
    showToast('Submit failed: ' + err.message, 'error');
    submitted = false;
  }
}

// ── Boot ──────────────────────────────────────────────────────────────────
loadExam();
