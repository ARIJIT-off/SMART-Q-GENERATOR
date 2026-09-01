/**
 * MCQ Generation Service
 * Google Gemini API: generates MCQs natively from PDF buffer via inlineData
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI;
function getGenAI() {
  if (!genAI) genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI;
}

async function generateMCQsFromPDF(pdfBuffer, numQuestions = 20) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  try {
    const model = getGenAI().getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are an expert educator. Based on the attached syllabus/document, generate exactly ${numQuestions} multiple-choice questions. 
    Ensure the questions cover various topics found in the document, ranging from easy to hard.
    
    IMPORTANT: Respond ONLY with a valid JSON array of objects. Do not use markdown code blocks like \`\`\`json. 
    Just output the raw JSON array.
    
    Schema for each object:
    [
      {
        "text": "The question text",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "answerIndex": 0,
        "topic": "Brief topic name (1-2 words)",
        "difficulty": "easy"
      }
    ]
    `;

    // Pass the PDF directly to Gemini 1.5 Flash via inlineData
    const pdfPart = {
      inlineData: {
        data: pdfBuffer.toString('base64'),
        mimeType: 'application/pdf'
      }
    };

    const result = await model.generateContent([prompt, pdfPart]);
    let responseText = result.response.text();
    
    // Clean up response if it has markdown formatting
    responseText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    let mcqs = JSON.parse(responseText);
    
    // Validate output
    if (!Array.isArray(mcqs) || mcqs.length === 0) {
      throw new Error("AI did not return a valid question array.");
    }
    
    // Clean up and enforce constraints
    return mcqs.map(q => ({
      text: String(q.text).trim(),
      options: Array.isArray(q.options) ? q.options.map(o => String(o).trim()) : [],
      answerIndex: Math.min(3, Math.max(0, parseInt(q.answerIndex) || 0)),
      topic: String(q.topic || 'General').trim().slice(0, 60),
      difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
      source: 'ai-generated'
    }));

  } catch (err) {
    console.error('Gemini MCQ generation failed:', err);
    throw new Error('Failed to generate MCQs from PDF: ' + err.message);
  }
}

module.exports = { generateMCQsFromPDF };
