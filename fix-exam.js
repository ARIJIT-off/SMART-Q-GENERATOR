const fs = require('fs');

// 1. Update exam.js
let examJs = fs.readFileSync('public/js/exam.js', 'utf8');

// A. Init answers array
examJs = examJs.replace(
  /answers = questions\.map\(q => \(\{ questionId: q\._id, selectedIndex: -1, timeTakenSec: 0 \}\)\);/,
  `answers = questions.map(q => ({ questionId: q._id, selectedIndex: -1, textAnswer: '', timeTakenSec: 0 }));`
);

// B. renderQuestion function
const newRenderQuestion = `function renderQuestion(idx) {
  currentIdx = idx;
  qStartTime = Date.now();
  const q = questions[idx];
  const ans = answers[idx];
  const letters = ['A','B','C','D'];

  document.getElementById('qNum').textContent = \`Question \${idx + 1} of \${questions.length} • \${q.marks || examData.marksPerQuestion || 1} Marks\`;
  document.getElementById('qText').textContent = q.text;
  document.getElementById('qProgress').textContent = \`\${answers.filter(a => a.selectedIndex !== -1 || a.textAnswer.trim().length > 0).length}/\${questions.length} answered\`;

  const optionsContainer = document.getElementById('optionsList');
  if (q.type === 'MCQ' || !q.type) {
    optionsContainer.innerHTML = q.options.map((o, oi) => \`
      <li class="option-item \${oi === ans.selectedIndex ? 'selected' : ''}" onclick="selectOption(\${oi})">
        <span class="option-letter">\${letters[oi]}</span>\${o}
      </li>\`).join('');
  } else {
    optionsContainer.innerHTML = \`<textarea id="saqTextarea" placeholder="Type your answer here..." oninput="updateTextAnswer(this.value)" style="width: 100%; min-height: 150px; padding: 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); color: var(--text); font-family: inherit; font-size: 1rem; resize: vertical;">\${ans.textAnswer || ''}</textarea>\`;
  }

  document.getElementById('prevBtn').disabled = idx === 0;
  document.getElementById('nextBtn').disabled = idx === questions.length - 1;

  // Update nav grid
  document.querySelectorAll('.q-nav-btn').forEach((b, i) => {
    b.classList.toggle('active', i === idx);
    const isAns = answers[i].selectedIndex !== -1 || answers[i].textAnswer.trim().length > 0;
    b.classList.toggle('answered', isAns);
  });
}`;

examJs = examJs.replace(/function renderQuestion\(idx\) \{[\s\S]*?\n  \}\);\n\}/, newRenderQuestion);

// C. add updateTextAnswer
const newFunctions = `
function updateTextAnswer(val) {
  answers[currentIdx].textAnswer = val;
  // Update nav badge live
  const btn = document.querySelectorAll('.q-nav-btn')[currentIdx];
  if (val.trim().length > 0) btn.classList.add('answered');
  else btn.classList.remove('answered');
}

function selectOption(idx) {`;
examJs = examJs.replace(/function selectOption\(idx\) \{/, newFunctions);

// D. clearAnswer function
examJs = examJs.replace(
  /function clearAnswer\(\) \{\n    answers\[currentIdx\]\.selectedIndex = -1;/,
  `function clearAnswer() {
  answers[currentIdx].selectedIndex = -1;
  answers[currentIdx].textAnswer = '';`
);

// E. confirmSubmit count
examJs = examJs.replace(
  /const answered = answers\.filter\(a => a\.selectedIndex !== -1\)\.length;/,
  `const answered = answers.filter(a => a.selectedIndex !== -1 || a.textAnswer.trim().length > 0).length;`
);

fs.writeFileSync('public/js/exam.js', examJs);

// 2. Update exam.html optionsList container (just in case)
let examHtml = fs.readFileSync('public/exam.html', 'utf8');
examHtml = examHtml.replace(
  /<ul id="optionsList" class="options-list"><\/ul>/,
  `<div id="optionsList"></div>`
);
// Also fix any hardcoded lists in exam.css? The CSS class .options-list should apply safely.
fs.writeFileSync('public/exam.html', examHtml);

console.log('Fixed exam.js & exam.html');
