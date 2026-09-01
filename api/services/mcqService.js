/**
 * Question Generation & Evaluation Service
 * Google Gemini API: generates questions natively from PDF buffer via inlineData
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI;
function getGenAI() {
  if (!genAI) genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI;
}

async function generateQuestionsFromPDF(syllabusBuffer, pyqBuffer, breakdown) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  try {
    const model = getGenAI().getGenerativeModel({ model: 'gemini-3.6-flash' });

    let prompt = `You are an expert educator. Based on the attached syllabus document (first PDF), generate an exam question set.
    
    You must generate exactly:
    - ${breakdown.mcq} Multiple Choice Questions (1 mark each)
    - ${breakdown.saq1} Short Answer Questions (1 mark each)
    - ${breakdown.saq2} Short Answer Questions (2 marks each)
    - ${breakdown.laq5} Long Answer Questions (5 marks each)
    - ${breakdown.laq10} Long Answer Questions (10 marks each)
    
    Ensure the questions cover various topics found in the syllabus document, ranging from easy to hard.
    `;

    if (pyqBuffer) {
      prompt += `\n\nThere is a second PDF attached which contains Previous Year Questions (PYQs). Analyze its style, difficulty, and structure. Ensure your generated questions match the style and formatting conventions seen in the PYQ document.\n`;
    }

    prompt += `
    IMPORTANT: Respond ONLY with a valid JSON array of objects. Do not use markdown code blocks like \`\`\`json. 
    Just output the raw JSON array.
    
    Schema for each object:
    [
      {
        "type": "MCQ", // or "SAQ_1", "SAQ_2", "LAQ_5", "LAQ_10"
        "marks": 1, // 1, 2, 5, or 10 corresponding to type
        "text": "The question text",
        "options": ["Option A", "Option B", "Option C", "Option D"], // ONLY for MCQ
        "answerIndex": 0, // ONLY for MCQ (0-3)
        "idealAnswer": "A comprehensive model answer or rubric that can be used to grade a student's answer automatically", // ONLY for SAQ and LAQ
        "topic": "Brief topic name (1-2 words)",
        "difficulty": "easy" // easy, medium, hard
      }
    ]
    `;

    const parts = [prompt];
    
    // Add Syllabus
    parts.push({
      inlineData: {
        data: syllabusBuffer.toString('base64'),
        mimeType: 'application/pdf'
      }
    });

    // Add optional PYQ
    if (pyqBuffer) {
      parts.push({
        inlineData: {
          data: pyqBuffer.toString('base64'),
          mimeType: 'application/pdf'
        }
      });
    }

    const result = await model.generateContent(parts);
    let responseText = result.response.text();
    
    responseText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    let questions = JSON.parse(responseText);
    
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error("AI did not return a valid question array.");
    }
    
    return questions.map(q => {
      const isMCQ = q.type === 'MCQ';
      return {
        type: ['MCQ', 'SAQ_1', 'SAQ_2', 'LAQ_5', 'LAQ_10'].includes(q.type) ? q.type : 'MCQ',
        marks: q.marks || (isMCQ ? 1 : 2),
        text: String(q.text).trim(),
        options: isMCQ && Array.isArray(q.options) ? q.options.map(o => String(o).trim()) : [],
        answerIndex: isMCQ ? Math.min(3, Math.max(0, parseInt(q.answerIndex) || 0)) : undefined,
        idealAnswer: isMCQ ? undefined : (q.idealAnswer || ''),
        topic: String(q.topic || 'General').trim().slice(0, 60),
        difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
        source: 'ai-generated'
      };
    });

  } catch (err) {
    console.error('Gemini Question generation failed:', err);
    throw new Error('Failed to generate questions: ' + err.message);
  }
}

async function evaluateSubjectiveAnswer(questionText, idealAnswer, studentAnswer, maxMarks) {
  if (!studentAnswer || !studentAnswer.trim()) {
    return { score: 0, feedback: "No answer provided." };
  }

  try {
    const model = getGenAI().getGenerativeModel({ model: 'gemini-3.6-flash' });
    const prompt = `You are an expert examiner. Grade the student's answer based on the ideal answer rubric.
    
    Question: ${questionText}
    Max Marks: ${maxMarks}
    Ideal Answer / Rubric: ${idealAnswer}
    
    Student's Answer:
    "${studentAnswer}"
    
    Evaluate strictly but fairly. 
    IMPORTANT: Respond ONLY with a valid JSON object. No markdown formatting.
    {
      "score": <number between 0 and ${maxMarks}, can use 0.5 steps>,
      "feedback": "<1-2 short sentences explaining why marks were awarded or deducted>"
    }
    `;

    const result = await model.generateContent(prompt);
    let responseText = result.response.text();
    responseText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    const evaluation = JSON.parse(responseText);
    return {
      score: Math.min(maxMarks, Math.max(0, Number(evaluation.score) || 0)),
      feedback: evaluation.feedback || "Evaluated by AI."
    };
  } catch (err) {
    console.error('AI Evaluation failed:', err);
    return { score: 0, feedback: "AI evaluation failed. Needs manual grading." };
  }
}

module.exports = { generateQuestionsFromPDF, evaluateSubjectiveAnswer };
