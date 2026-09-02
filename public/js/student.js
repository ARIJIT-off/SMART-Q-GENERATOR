/**
 * student.js — Student Portal Logic
 */

const _sUser = requireRole('student');
renderUserChip();

let scanStream = null;
let scanAnimFrame = null;

// ── Join Exam ────────────────────────────────────────────────────────────
function joinExam() {
  const raw = document.getElementById('examLinkInput').value.trim();
  if (!raw) { showJoinMsg('Paste an exam link or access code.', 'error'); return; }

  // Extract access code from full URL or treat as code directly
  let code = raw;
  const match = raw.match(/\/exam\/([a-f0-9-]{36})/i);
  if (match) code = match[1];

  if (!code) { showJoinMsg('Invalid exam link format.', 'error'); return; }
  window.location.href = `/exam/${code}`;
}

function showJoinMsg(text, type) {
  document.getElementById('joinMsg').innerHTML = `<div class="alert alert-${type}">${text}</div>`;
}

document.getElementById('examLinkInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') joinExam();
});

// ── QR Scanner ───────────────────────────────────────────────────────────
async function openScanner() {
  const modal = document.getElementById('scanModal');
  modal.classList.remove('hidden');
  try {
    scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    const video = document.getElementById('scanVideo');
    video.srcObject = scanStream;
    await video.play();
    scanQRFrame(video);
  } catch (err) {
    showJoinMsg('Camera access denied. Please paste the link manually.', 'error');
    closeScanner();
  }
}

function closeScanner() {
  document.getElementById('scanModal').classList.add('hidden');
  if (scanStream) { scanStream.getTracks().forEach(t => t.stop()); scanStream = null; }
  if (scanAnimFrame) { cancelAnimationFrame(scanAnimFrame); scanAnimFrame = null; }
}

function scanQRFrame(video) {
  if (!scanStream) return;
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);

  try {
    // Try browser BarcodeDetector API first
    if ('BarcodeDetector' in window) {
      const bd = new BarcodeDetector({ formats: ['qr_code'] });
      bd.detect(canvas).then(codes => {
        if (codes.length) {
          closeScanner();
          document.getElementById('examLinkInput').value = codes[0].rawValue;
          joinExam();
          return;
        }
        scanAnimFrame = requestAnimationFrame(() => scanQRFrame(video));
      });
    } else {
      scanAnimFrame = requestAnimationFrame(() => scanQRFrame(video));
    }
  } catch {
    scanAnimFrame = requestAnimationFrame(() => scanQRFrame(video));
  }
}

// ── Exam History ─────────────────────────────────────────────────────────
async function loadHistory() {
  const list = document.getElementById('historyList');
  list.innerHTML = '<p style="color:var(--dim)">Loading…</p>';
  try {
    const data = await apiFetch('/student/my-submissions');
    const subs = data.submissions;
    if (!subs.length) {
      list.innerHTML = '<div class="history-empty"><p style="font-size:2rem;">📝</p><p>No exams taken yet.</p></div>';
      return;
    }
    const pct = (s) => s.maxScore > 0 ? Math.round((s.score / s.maxScore) * 100) : 0;
    const pctColor = (p) => p >= 70 ? 'var(--success)' : p >= 40 ? 'var(--warning)' : 'var(--danger)';
    list.innerHTML = subs.map(s => {
      const p = pct(s);
      const exam = s.examId;
      return `
        <div class="card card-sm" style="margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
          <div>
            <h4 style="margin-bottom:4px;">${exam?.title || 'Untitled Exam'}</h4>
            <p class="text-sm">${new Date(s.submittedAt).toLocaleString()} · ${exam?.duration || '?'} min</p>
            ${s.cheatingAttempted ? '<span class="badge badge-danger" style="margin-top:4px;">Cheating Flagged</span>' : ''}
            ${s.autoSubmitted ? '<span class="badge badge-warning" style="margin-top:4px;margin-left:4px;">Auto-Submitted</span>' : ''}
          </div>
          <div style="display:flex;align-items:center;gap:20px;">
            <div style="text-align:center;">
              <div style="font-size:1.8rem;font-weight:800;color:${pctColor(p)}">${p}%</div>
              <div class="text-sm" style="color:var(--dim);">${s.score}/${s.maxScore}</div>
            </div>
            <div style="text-align:center;">
              <div style="color:var(--success);font-weight:700;">${s.correct}</div><div class="text-sm" style="color:var(--dim);">Correct</div>
            </div>
            <div style="text-align:center;">
              <div style="color:var(--danger);font-weight:700;">${s.wrong}</div><div class="text-sm" style="color:var(--dim);">Wrong</div>
            </div>
            <a href="/result.html?id=${s._id}" class="btn btn-secondary btn-sm">📊 View Report</a>
          </div>
        </div>`;
    }).join('');
  } catch (err) {
    list.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

loadHistory();
