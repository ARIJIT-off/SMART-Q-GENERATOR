/**
 * Question Generation Service
 * Primary: OpenAI GPT-4o  (OPENAI_API_KEY)
 * Fallback: Google Gemini (GEMINI_API_KEY)
 *
 * - generateMixedQuestions: MCQ + SAQ + LAQ from a syllabus PDF
 * - gradeTextAnswer: AI-grade a student's SAQ/LAQ answer
 */

const OpenAI = require('openai');
const pdfParse = require('pdf-parse');

// ── Helpers ───────────────────────────────────────────────────────────────

let _openai;
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

async function extractPdfText(buffer) {
  try {
    const data = await pdfParse(buffer);
    return data.text.slice(0, 12000); // keep within token budget
  } catch {
    return '';
  }
}

function buildQuestionPrompt(counts, pyqText = '') {
  const { mcq = 5, saq1 = 0, saq2 = 0, laq5 = 0, laq10 = 0 } = counts;
  const pyqInstruction = pyqText
    ? `\nA Previous Year Question paper is also provided below for style/tone reference — derive all content from the syllabus.\n\nPYQ Reference:\n${pyqText.slice(0, 3000)}\n`
    : '';

  return `You are an expert examiner. Based on the syllabus content provided, generate a question set.
${pyqInstruction}
Generate EXACTLY:
- ${mcq} MCQ (Multiple Choice Questions) — 4 options each, 1 correct
- ${saq1} SAQ-1 (Short Answer, 1 mark) — answer in 2-3 sentences
- ${saq2} SAQ-2 (Short Answer, 2 marks) — answer in 4-6 sentences
- ${laq5} LAQ-5 (Long Answer, 5 marks) — answer in 1-2 paragraphs
- ${laq10} LAQ-10 (Long Answer, 10 marks) — answer in 3-5 paragraphs

STRICT RULES:
1. Vary topics across the full syllabus
2. Vary difficulty: easy/medium/hard
3. For SAQ/LAQ include a concise modelAnswer a top student would write
4. For MCQ all 4 options must be plausible

RESPOND ONLY with a raw JSON array (no markdown). Each item:
{
  "type": "mcq" | "saq" | "laq",
  "marks": 1 | 1 | 2 | 5 | 10,
  "text": "Question text",
  "options": ["A","B","C","D"],
  "answerIndex": 0,
  "modelAnswer": "...",
  "topic": "Topic name",
  "difficulty": "easy" | "medium" | "hard"
}`;
}

function parseAndNormalise(raw) {
  let questions;
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    questions = JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\[[\s\S]*\]/);
    if (m) questions = JSON.parse(m[0]);
    else throw new Error('AI returned invalid JSON. Please try again.');
  }
  if (!Array.isArray(questions)) throw new Error('AI did not return an array.');

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

// ── OpenAI Generation ─────────────────────────────────────────────────────

async function generateWithOpenAI(syllabusText, counts, pyqText) {
  const prompt = buildQuestionPrompt(counts, pyqText);
  const userContent = `${prompt}\n\nSyllabus Content:\n${syllabusText}`;

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: userContent }],
    temperature: 0.7,
    max_tokens: 6000
  });

  return response.choices[0].message.content;
}

// ── Gemini Generation (fallback) ──────────────────────────────────────────

async function generateWithGemini(syllabusBuffer, counts, pyqBuffer) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

  const pyqInstruction = pyqBuffer
    ? 'A PYQ paper is also attached. Use its style/tone but derive content from the syllabus.'
    : '';
  const prompt = buildQuestionPrompt(counts, '') + '\n' + pyqInstruction;

  const pdfPart = buf => ({ inlineData: { data: buf.toString('base64'), mimeType: 'application/pdf' } });
  const parts = [prompt, pdfPart(syllabusBuffer)];
  if (pyqBuffer) parts.push(pdfPart(pyqBuffer));

  const result = await model.generateContent(parts);
  return result.response.text();
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Generate a mixed set of questions from a syllabus PDF.
 * Tries OpenAI first, falls back to Gemini automatically.
 */
async function generateMixedQuestions(syllabusBuffer, counts = {}, pyqBuffer = null) {
  const { mcq = 5, saq1 = 0, saq2 = 0, laq5 = 0, laq10 = 0 } = counts;
  const totalQ = mcq + saq1 + saq2 + laq5 + laq10;
  if (totalQ === 0) throw new Error('Select at least 1 question type.');

  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasGemini = !!process.env.GEMINI_API_KEY;

  if (!hasOpenAI && !hasGemini) {
    throw new Error('No AI API key configured. Set OPENAI_API_KEY or GEMINI_API_KEY.');
  }

  let raw;
  let lastError;

  // ── Try OpenAI first ─────────────────────────────────────────────────────
  if (hasOpenAI) {
    try {
      console.log('[mcqService] Using OpenAI GPT-4o...');
      const syllabusText = await extractPdfText(syllabusBuffer);
      const pyqText = pyqBuffer ? await extractPdfText(pyqBuffer) : '';
      raw = await generateWithOpenAI(syllabusText, counts, pyqText);
      return parseAndNormalise(raw);
    } catch (err) {
      console.warn('[mcqService] OpenAI failed:', err.message, '— trying Gemini fallback...');
      lastError = err;
    }
  }

  // ── Fallback: Gemini ─────────────────────────────────────────────────────
  if (hasGemini) {
    try {
      console.log('[mcqService] Using Gemini fallback...');
      raw = await generateWithGemini(syllabusBuffer, counts, pyqBuffer);
      return parseAndNormalise(raw);
    } catch (err) {
      console.error('[mcqService] Gemini also failed:', err.message);
      lastError = err;
    }
  }

  throw lastError || new Error('All AI providers failed. Please try again.');
}

// ── AI Grading ────────────────────────────────────────────────────────────

/**
 * AI-grade a student's text answer for SAQ/LAQ.
 * Returns { score, feedback }
 */
async function gradeTextAnswer(questionText, modelAnswer, marks, studentAnswer) {
  if (!studentAnswer || studentAnswer.trim().length < 3) {
    return { score: 0, feedback: 'No answer provided.' };
  }

  const prompt = `You are a strict but fair examiner grading a student's answer.

Question: "${questionText}"
Maximum marks: ${marks}
Model answer (reference): "${modelAnswer || 'Not provided — use your knowledge.'}"
Student's answer: "${studentAnswer}"

Grade out of ${marks}. Consider accuracy, completeness, clarity, relevance.
RESPOND ONLY with raw JSON (no markdown):
{ "score": <0 to ${marks}>, "feedback": "<1-2 sentence evaluation>" }`;

  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasGemini = !!process.env.GEMINI_API_KEY;

  // Try OpenAI
  if (hasOpenAI) {
    try {
      const response = await getOpenAI().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 200
      });
      const raw = response.choices[0].message.content.replace(/```json/gi, '').replace(/```/g, '').trim();
      const m = raw.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(m ? m[0] : raw);
      const score = Math.min(marks, Math.max(0, Number(parsed.score) || 0));
      return { score, feedback: String(parsed.feedback || '') };
    } catch (err) {
      console.warn('[mcqService] OpenAI grading failed:', err.message);
    }
  }

  // Fallback: Gemini
  if (hasGemini) {
    try {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
      const result = await model.generateContent(prompt);
      let raw = result.response.text().replace(/```json/gi, '').replace(/```/g, '').trim();
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) raw = m[0];
      const parsed = JSON.parse(raw);
      const score = Math.min(marks, Math.max(0, Number(parsed.score) || 0));
      return { score, feedback: String(parsed.feedback || '') };
    } catch (err) {
      console.warn('[mcqService] Gemini grading failed:', err.message);
    }
  }

  // Last resort fallback
  return { score: Math.round(marks * 0.5), feedback: 'Auto-graded (AI unavailable). Teacher review recommended.' };
}

// Legacy alias
async function generateMCQsFromPDF(pdfBuffer, numQuestions = 20) {
  return generateMixedQuestions(pdfBuffer, { mcq: numQuestions });
}

module.exports = { generateMixedQuestions, generateMCQsFromPDF, gradeTextAnswer };
