/**
 * MCQ Generation Service
 * Uses pdf-parse (lightweight) + Google Gemini API (free)
 * Zero Python, zero heavy ML libraries — Vercel compatible
 */
const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Extract text from an in-memory PDF buffer (Vercel-safe: no disk I/O)
 */
async function extractTextFromBuffer(buffer) {
  const data = await pdfParse(buffer);
  const text = data.text
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
  return text;
}

/**
 * Generate MCQs using Google Gemini API (gemini-1.5-flash — FREE)
 */
async function generateMCQsWithGemini(syllabusText, numQuestions = 20) {
  const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

  // Trim text to avoid token limits (Gemini free: 1M tokens/day)
  const trimmedText = syllabusText.slice(0, 12000);

  const prompt = `You are an expert educational assessment creator. Based on the following syllabus/study material, generate exactly ${numQuestions} multiple-choice questions (MCQs).

SYLLABUS CONTENT:
"""
${trimmedText}
"""

STRICT RULES:
1. Each question must test understanding, not just memory
2. All 4 options must be plausible (no obviously wrong options)
3. Only ONE option is correct
4. Questions must cover different topics from the content
5. Vary difficulty: 40% easy, 40% medium, 20% hard

Respond ONLY with a valid JSON array. No markdown, no explanation, just raw JSON:
[
  {
    "text": "Full question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answerIndex": 0,
    "topic": "Topic name (2-4 words)",
    "difficulty": "easy|medium|hard"
  }
]

Generate exactly ${numQuestions} questions now:`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text().trim();

  // Strip markdown code fences if present
  const cleaned = responseText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let questions;
  try {
    questions = JSON.parse(cleaned);
  } catch (parseErr) {
    // Try to extract JSON array from response
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) {
      questions = JSON.parse(match[0]);
    } else {
      throw new Error('Gemini returned invalid JSON. Please try again.');
    }
  }

  // Validate and sanitize
  const validated = questions
    .filter(q => q.text && Array.isArray(q.options) && q.options.length === 4 && typeof q.answerIndex === 'number')
    .map(q => ({
      text: String(q.text).trim(),
      options: q.options.map(o => String(o).trim()),
      answerIndex: Math.min(3, Math.max(0, parseInt(q.answerIndex))),
      topic: String(q.topic || 'General').trim().slice(0, 60),
      difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
      source: 'ai-generated'
    }));

  return validated;
}

/**
 * Main export: takes PDF buffer, returns MCQ array
 */
async function generateMCQsFromPDF(pdfBuffer, numQuestions = 20) {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY is not configured. Get your free key at: https://aistudio.google.com/app/apikey');
  }

  const text = await extractTextFromBuffer(pdfBuffer);
  if (!text || text.length < 100) {
    throw new Error('Could not extract readable text from this PDF. Please ensure the PDF contains selectable text.');
  }

  const questions = await generateMCQsWithGemini(text, numQuestions);
  if (!questions.length) {
    throw new Error('Gemini could not generate questions from this content. Try a different PDF.');
  }

  return questions;
}

module.exports = { generateMCQsFromPDF, extractTextFromBuffer };
