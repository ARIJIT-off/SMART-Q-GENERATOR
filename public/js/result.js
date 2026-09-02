/**
 * result.js — Student Result Page Logic
 */

requireAuth();

const submissionId = new URLSearchParams(window.location.search).get('id');
if (!submissionId) { alert('Nsubmission ID found.'); window.location.href = '/student.html'; }

let resultData = null;

async function loadResult() {
  try {
    resultData = await apiFetch(`/student/result/${submissionId}`);
    renderResult(resultData);
  } catch (err) {
    document.getElementById('loadMsg').innerHTML = `<div class="alert alert-error">❌ ${err.message}</div>`;
  }
}

function renderResult({ submission, enrichedAnswers, exam }) {
  document.getElementById('loadMsg').style.display = 'none';
  const content = document.getElementById('resultContent');
  content.classList.remove('hidden');

  const pct = submission.maxScore > 0  Math.round((submission.score / submission.maxScore) * 100) : 0;
  const pctColor = pct >= 70  '#10b981' : pct >= 40  '#f59e0b' : '#ef4444';
  const avgTime = enrichedAnswers.length  Math.round(submission.totalTimeSec / enrichedAnswers.length) : 0;

  // Understanding level
  const level = pct >= 80  'Excellent' : pct >= 60  'Good' : pct >= 40  'Needs Improvement' : 'Poor';
  const levelColor = pct >= 80  '#10b981' : pct >= 60  '#0891b2' : pct >= 40  '#f59e0b' : '#ef4444';

  // Topic scores
  const topicScores = submission.topicScores instanceof Map
     Object.fromEntries(submission.topicScores)
    : (submission.topicScores || {});

  const topicBars = Object.entries(topicScores).map(([t, p]) => `
    <div class="topic-bar">
      <div class="topic-bar-label">${t}</div>
      <div class="topic-bar-track"><div class="topic-bar-fill" style="width:${p}%"></div></div>
      <div class="topic-bar-pct">${p}%</div>
    </div>`).join('');

  content.innerHTML = `
    <!-- Score Header -->
    <div class="result-header">
      <h2 style="color:#fff;margin-bottom:6px;">${exam.title || 'Exam Results'}</h2>
      <p style="color:rgba(255,255,255,.75);font-size:.9rem;margin-bottom:20px;">Submitted ${new Date(submission.submittedAt).toLocaleString()}</p>
      <div class="score-big" style="color:#fff;">${submission.score}<span style="font-size:2rem;opacity:.6;">/${submission.maxScore}</span></div>
      <div style="font-size:1.4rem;font-weight:700;margin-top:8px;color:rgba(255,255,255,.85);">${pct}% · <span style="color:${pct >= 70  '#6ee7b7' : pct >= 40  '#fcd34d' : '#fca5a5'}">${level}</span></div>
    </div>

    <!-- Stats Grid -->
    <div class="stats-grid mb-3">
      <div class="stat-card"><div class="stat-value" style="color:var(--success)">${submission.correct}</div><div class="stat-label">Correct</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--danger)">${submission.wrong}</div><div class="stat-label">Wrong</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--dim)">${submission.notAttended}</div><div class="stat-label">Not Attempted</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--info)">${submission.attended}</div><div class="stat-label">Attempted</div></div>
      <div class="stat-card"><div class="stat-value">${fmtDuration(avgTime)}</div><div class="stat-label">Avg Time/Q</div></div>
      <div class="stat-card"><div class="stat-value">${fmtDuration(submission.totalTimeSec)}</div><div class="stat-label">Total Time</div></div>
    </div>

    ${submission.cheatingAttempted  `
    <div class="alert alert-warning mb-3">
      ⚠️ Cheating detected: ${submission.cheatingEvents.join(', ') || 'unknown event'}
      ${submission.autoSubmitted  ' · <b>Auto-submitted</b>' : ''}
    </div>` : ''}

    <!-- Understanding Section -->
    ${topicBars  `
    <div class="card mb-3">
      <h3 style="margin-bottom:16px;">📚 Subject Understanding by Topic</h3>
      ${topicBars}
    </div>` : ''}

    <!-- Per-Question Time -->
    <div class="card mb-3">
      <h3 style="margin-bottom:16px;">⏱ Time per Question</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Q#</th><th>Topic</th><th>Time Taken</th><th>Status</th></tr></thead>
          <tbody>
            ${enrichedAnswers.map((a, i) => `
              <tr>
                <td>Q${i1}</td>
                <td><span class="tag">${a.topic}</span></td>
                <td>${fmtDuration(a.timeTakenSec)}</td>
                <td>${!a.isAttended  '<span class="badge badge-muted">Skipped</span>'
                    : a.isCorrect  '<span class="badge badge-success">Correct ✓</span>'
                    : '<span class="badge badge-danger">Wrong ✗</span>'}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Full Answer Script -->
    <div class="card">
      <h3 style="margin-bottom:16px;">📋 Answer Script with Explanations</h3>
      ${enrichedAnswers.map((a, i) => {
        const letters = ['A','B','C','D'];
        return `
        <div class="answer-row">
          <div class="answer-q">Q${i1}. ${a.questionText}
            <span class="badge badge-muted" style="margin-left:8px;">${a.topic}</span>
            ${!a.isAttended  '<span class="badge badge-muted" style="margin-left:4px;">Skipped</span>'
              : a.isCorrect  '<span class="badge badge-success" style="margin-left:4px;">✓ Correct</span>'
              : '<span class="badge badge-danger" style="margin-left:4px;">✗ Wrong</span>'}
          </div>
          <div class="answer-opts">
            ${a.options.map((o, oi) => {
              const isCorrect = oi === a.correctIndex;
              const isSelected = oi === a.selectedIndex;
              let cls = '';
              if (isCorrect) cls = 'correct-ans';
              if (isSelected && !isCorrect) cls = 'wrong-sel';
              let mark = `<span class="opt-mark neutral-mark">${letters[oi]}</span>`;
              if (isCorrect) mark = `<span class="opt-mark correct-mark">✓</span>`;
              if (isSelected && !isCorrect) mark = `<span class="opt-mark wrong-mark">✗</span>`;
              return `<div class="opt-line ${cls}">${mark}${o}${isSelected  ' <b style="margin-left:4px;font-size:.72rem;color:var(--dim)">(Your answer)</b>' : ''}${isCorrect  ' <b style="margin-left:4px;font-size:.72rem;color:var(--success)">(Correct answer)</b>' : ''}</div>`;
            }).join('')}
          </div>
        </div>`;
      }).join('')}
    </div>
  `;
}

function downloadReport() {
  window.print();
}

loadResult();
