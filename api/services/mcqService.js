/**
 * MCQ Generation Service
 * pdf-parse: extracts text locally (no cloud)
 * Google Gemini API: generates MCQs from extracted text
 */
const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI;
function getGenAI() {
  if (!genAI) genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI;
}

async function extractTextFromBuffer(buffer) {
  const data = await pdfParse(buffer);
  return data.text
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

async function generateMCQsWithGemini(syllabusText, numQuestions = 20) {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-1.5-flash' });
  const trimmed = syllabusText.slice(0, 14000);

  const prompt = `You are an expert educational assessment creator. Based on the syllabus below, generate exactly ${numQuestions} multiple-choice questions (MCQs).

SYLLABUS:
"""
${trimmed}
"""

STRICT RULES:
1. Each question must test conceptual understanding, not memorization
2. All 4 options must be plausible
3. Only ONE option is correct
4. Vary difficulty: 40% easy, 40% medium, 20% hard
5. Cover diverse topics from the content

Respond ONLY with a raw JSON array. No markdown, no explanations:
[
  {
    "text": "Question text?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answerIndex": 0,
    "topic": "Topic Name",
    "difficulty": "easy"
  }
]

Generate exactly ${numQuestions} questions:`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let questions;
  try {
    questions = JSON.parse(raw);
  } catch {
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) questions = JSON.parse(match[0]);
    else throw new Error('AI returned invalid JSON. Please try again.');
  }

  return questions
    .filter(q => q.text && Array.isArray(q.options) && q.options.length === 4 && typeof q.answerIndex === 'number')
    .map(q => ({
      text: String(q.text).trim(),
      options: q.options.map(o => String(o).trim()),
      answerIndex: Math.min(3, Math.max(0, parseInt(q.answerIndex))),
      topic: String(q.topic || 'General').trim().slice(0, 60),
      difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
      source: 'ai-generated'
    }));
}

async function generateMCQsFromPDF(pdfBuffer, numQuestions = 20) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }
  const text = await extractTextFromBuffer(pdfBuffer);
  if (!text || text.length < 100) {
    throw new Error('Could not extract readable text from this PDF. Ensure the PDF contains selectable (non-scanned) text.');
  }
  const questions = await generateMCQsWithGemini(text, numQuestions);
  if (!questions.length) {
    throw new Error('Could not generate questions from this content. Please try a different PDF.');
  }
  return questions;
}

module.exports = { generateMCQsFromPDF, extractTextFromBuffer };
