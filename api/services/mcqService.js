/**
 * Question Generation Service
 * - generateMixedQuestions: generates MCQ + SAQ + LAQ from a syllabus PDF
 * - gradeTextAnswer: AI-grades a student's SAQ/LAQ answer
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI;
function getGenAI() {
  if (!genAI) genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI;
}

function pdfPart(buffer) {
  return { inlineData: { data: buffer.toString('base64'), mimeType: 'application/pdf' } };
}

/**
 * Generate a mixed set of questions from a syllabus PDF.
 * @param {Buffer} syllabusBuffer   - The syllabus PDF
 * @param {Object} counts           - { mcq, saq1, saq2, laq5, laq10 }
 * @param {Buffer|null} pyqBuffer   - Optional PYQ PDF for style context
 */
async function generateMixedQuestions(syllabusBuffer, counts = {}, pyqBuffer = null) {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured.');

  const { mcq = 5, saq1 = 0, saq2 = 0, laq5 = 0, laq10 = 0 } = counts;
  const totalQ = mcq + saq1 + saq2 + laq5 + laq10;
  if (totalQ === 0) throw new Error('Select at least 1 question type.');

  const model = getGenAI().getGenerativeModel({ model: 'gemini-3.6-flash' });

  const pyqInstruction = pyqBuffer
    ? `A Previous Year Question (PYQ) paper is also attached. Use its style, tone, and framing pattern when generating questions — but derive content from the syllabus, not the PYQ.`
    : '';

  const prompt = `You are an expert examiner. Based on the attached syllabus PDF, generate a question set.
${pyqInstruction}

Generate EXACTLY:
- ${mcq} MCQ (Multiple Choice Questions) — 4 options each, 1 correct
- ${saq1} SAQ-1 (Short Answer Questions worth 1 mark each) — answer in 2-3 sentences
- ${saq2} SAQ-2 (Short Answer Questions worth 2 marks each) — answer in 4-6 sentences  
- ${laq5} LAQ-5 (Long Answer Questions worth 5 marks each) — answer in 1-2 paragraphs
- ${laq10} LAQ-10 (Long Answer Questions worth 10 marks each) — answer in 3-5 paragraphs

STRICT RULES:
1. Vary topics to ensure broad syllabus coverage
2. Vary difficulty: easy/medium/hard
3. For SAQ/LAQ include a concise modelAnswer that a top student would write
4. For MCQ, all 4 options must be plausible

RESPOND ONLY with a raw JSON array (no markdown fences). Each item follows this schema:
{
  "type": "mcq" | "saq" | "laq",
  "marks": 1 | 1 | 2 | 5 | 10,
  "text": "Question text",
  "options": ["A", "B", "C", "D"],  // MCQ only, empty array for SAQ/LAQ
  "answerIndex": 0,                  // MCQ only (0-3), null for SAQ/LAQ
  "modelAnswer": "...",              // empty string for MCQ
  "topic": "Topic name",
  "difficulty": "easy" | "medium" | "hard"
}`;

  const parts = [prompt, pdfPart(syllabusBuffer)];
  if (pyqBuffer) parts.push(pdfPart(pyqBuffer));

  const result = await model.generateContent(parts);
  let raw = result.response.text().replace(/```json/gi, '').replace(/```/g, '').trim();

  let questions;
  try {
    questions = JSON.parse(raw);
  } catch {
    const m = raw.match(/\[[\s\S]*\]/);
    if (m) questions = JSON.parse(m[0]);
    else throw new Error('AI returned invalid JSON. Please try again.');
  }

  if (!Array.isArray(questions)) throw new Error('AI did not return an array.');

  // Normalise and validate
  return questions.map(q => {
    const rawType = String(q.type || 'mcq').toLowerCase();
    const type = ['mcq', 'saq', 'laq'].includes(rawType) ? rawType : 'mcq';
    const marks = Number(q.marks) || (type === 'mcq' ? 1 : type === 'saq' ? 1 : 5);
    return {
      type,
      marks,
      text: String(q.text || '').trim(),
      options: type === 'mcq' && Array.isArray(q.options)
        ? q.options.slice(0, 4).map(o => String(o).trim())
        : [],
      answerIndex: type === 'mcq' ? Math.min(3, Math.max(0, parseInt(q.answerIndex) || 0)) : null,
      modelAnswer: String(q.modelAnswer || '').trim(),
      topic: String(q.topic || 'General').trim().slice(0, 60),
      difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
      source: 'ai-generated'
    };
  });
}

/**
 * AI-grade a student's text answer for SAQ/LAQ.
 * @returns {{ score: number, feedback: string }}
 */
async function gradeTextAnswer(questionText, modelAnswer, marks, studentAnswer) {
  if (!studentAnswer || studentAnswer.trim().length < 3) {
    return { score: 0, feedback: 'No answer provided.' };
  }

  const model = getGenAI().getGenerativeModel({ model: 'gemini-3.6-flash' });

  const prompt = `You are a strict but fair examiner grading a student's answer.

Question: "${questionText}"
Maximum marks: ${marks}
Model answer (for reference): "${modelAnswer || 'Not provided — use your knowledge.'}"
Student's answer: "${studentAnswer}"

Grade the student's answer out of ${marks}. Consider: accuracy, completeness, clarity, and relevance.

RESPOND ONLY with raw JSON (no markdown fences):
{ "score": <number 0 to ${marks}>, "feedback": "<1-2 sentence evaluation>" }`;

  try {
    const result = await model.generateContent(prompt);
    let raw = result.response.text().replace(/```json/gi, '').replace(/```/g, '').trim();
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) raw = m[0];
    const parsed = JSON.parse(raw);
    const score = Math.min(marks, Math.max(0, Number(parsed.score) || 0));
    return { score, feedback: String(parsed.feedback || '') };
  } catch {
    // Fallback: basic keyword scoring
    return { score: Math.round(marks * 0.5), feedback: 'Auto-graded (AI unavailable). Teacher review recommended.' };
  }
}

// Legacy alias kept for backward compatibility
async function generateMCQsFromPDF(pdfBuffer, numQuestions = 20) {
  return generateMixedQuestions(pdfBuffer, { mcq: numQuestions });
}

module.exports = { generateMixedQuestions, generateMCQsFromPDF, gradeTextAnswer };
