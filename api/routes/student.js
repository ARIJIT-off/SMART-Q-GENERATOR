const express    = require('express');
const router     = express.Router();
const { protect }           = require('../middleware/authMiddleware');
const { sendResultEmail }   = require('../services/emailService');
const { gradeTextAnswer }   = require('../services/mcqService');
const Exam       = require('../models/Exam');
const Question   = require('../models/Question');
const Submission = require('../models/Submission');

// ─── Score Calculator ───────────────────────────────────────────────────────
async function calcScores(examId, answers) {
  const exam = await Exam.findById(examId).populate('questions');
  if (!exam) throw new Error('Exam not found');

  const qMap = {};
  exam.questions.forEach(q => { qMap[q._id.toString()] = q; });

  let correct = 0, wrong = 0, attended = 0, score = 0;
  let maxScore = 0;
  const topicMap   = {};
  const enriched   = [];   // answers enriched with AI grading for SAQ/LAQ
  let   hasPending = false;

  for (const a of answers) {
    const q = qMap[a.questionId?.toString()];
    if (!q) { enriched.push(a); continue; }

    const topic = q.topic || 'General';
    if (!topicMap[topic]) topicMap[topic] = { correct: 0, total: 0 };
    topicMap[topic].total++;

    const answerEntry = {
      questionId:    a.questionId,
      questionType:  q.type || 'mcq',
      questionMarks: q.type === 'mcq' ? exam.marksPerQuestion : q.marks,
      selectedIndex: a.selectedIndex ?? -1,
      textAnswer:    a.textAnswer    || '',
      aiScore:       null,
      aiFeedback:    '',
      teacherScore:  null,
      teacherNote:   '',
      timeTakenSec:  a.timeTakenSec  || 0
    };

    if (q.type === 'mcq') {
      maxScore += exam.marksPerQuestion;
      if (a.selectedIndex === -1 || a.selectedIndex === undefined) {
        enriched.push(answerEntry);
        continue;
      }
      attended++;
      if (a.selectedIndex === q.answerIndex) {
        correct++;
        score += exam.marksPerQuestion;
        topicMap[topic].correct++;
      } else {
        wrong++;
        score -= (exam.negativeMarking || 0);
      }
    } else {
      // SAQ or LAQ — AI grade
      maxScore += q.marks;
      const text = (a.textAnswer || '').trim();
      if (text.length < 3) {
        // Unattempted
        enriched.push(answerEntry);
        continue;
      }
      attended++;
      try {
        const { score: aiScore, feedback } = await gradeTextAnswer(
          q.text, q.modelAnswer, q.marks, text
        );
        answerEntry.aiScore    = aiScore;
        answerEntry.aiFeedback = feedback;
        score += aiScore;
        topicMap[topic].correct += aiScore / q.marks; // proportional credit
      } catch {
        hasPending = true; // mark for teacher review
      }
    }

    enriched.push(answerEntry);
  }

  const notAttended = answers.length - attended;
  const topicScores = {};
  Object.keys(topicMap).forEach(t => {
    topicScores[t] = topicMap[t].total > 0
      ? Math.round((topicMap[t].correct / topicMap[t].total) * 100) : 0;
  });

  return {
    enrichedAnswers: enriched,
    score:           Math.max(0, parseFloat(score.toFixed(2))),
    maxScore,
    correct, wrong, attended, notAttended,
    topicScores,
    gradingPending: hasPending
  };
}

// POST /api/student/submit
router.post('/submit', protect, async (req, res) => {
  try {
    const { examId, answers, location, cheatingAttempted, cheatingEvents, autoSubmitted, totalTimeSec } = req.body;
    if (!examId || !answers?.length)
      return res.status(400).json({ message: 'examId and answers are required' });

    const existing = await Submission.findOne({ examId, studentId: req.user._id });
    if (existing) return res.status(409).json({
      message: 'You have already submitted this exam.',
      submissionId: existing._id
    });

    const { enrichedAnswers, score, maxScore, correct, wrong, attended, notAttended, topicScores, gradingPending } =
      await calcScores(examId, answers);

    const exam = await Exam.findById(examId);

    const submission = await Submission.create({
      examId,
      studentId:    req.user._id,
      studentName:  req.user.name || req.user.email,
      studentEmail: req.user.email,
      location:     location || { lat: 0, lng: 0, city: 'Unknown', country: 'Unknown' },
      answers:      enrichedAnswers,
      cheatingAttempted: cheatingAttempted || false,
      cheatingEvents:    cheatingEvents    || [],
      autoSubmitted:     autoSubmitted     || false,
      totalTimeSec:      totalTimeSec      || 0,
      score, maxScore, correct, wrong, attended, notAttended, topicScores, gradingPending
    });

    sendResultEmail(
      req.user.email,
      req.user.name || req.user.email,
      exam?.title   || 'Exam',
      score, maxScore, correct, wrong, answers.length
    ).catch(() => {});

    res.status(201).json({ submission, submissionId: submission._id });
  } catch (err) {
    console.error('Submit error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/student/result/:submissionId
router.get('/result/:submissionId', protect, async (req, res) => {
  try {
    const submission = await Submission.findOne({
      _id: req.params.submissionId,
      studentId: req.user._id
    });
    if (!submission) return res.status(404).json({ message: 'Submission not found' });

    const exam = await Exam.findById(submission.examId).populate('questions');
    const qMap = {};
    exam?.questions.forEach(q => { qMap[q._id.toString()] = q; });

    const enrichedAnswers = submission.answers.map(a => {
      const q = qMap[a.questionId?.toString()];
      return {
        questionId:    a.questionId,
        questionText:  q?.text        || 'Question unavailable',
        questionType:  q?.type        || a.questionType || 'mcq',
        marks:         q?.marks       || 1,
        modelAnswer:   q?.modelAnswer || '',
        // MCQ
        options:       q?.options     || [],
        selectedIndex: a.selectedIndex,
        correctIndex:  q?.answerIndex,
        // SAQ / LAQ
        textAnswer:    a.textAnswer   || '',
        aiScore:       a.aiScore,
        aiFeedback:    a.aiFeedback   || '',
        teacherScore:  a.teacherScore,
        teacherNote:   a.teacherNote  || '',
        // Common
        topic:         q?.topic       || 'General',
        difficulty:    q?.difficulty  || 'medium',
        timeTakenSec:  a.timeTakenSec || 0,
        isCorrect:     a.questionType !== 'mcq' ? null
          : (a.selectedIndex !== -1 && a.selectedIndex === q?.answerIndex),
        isAttended:    a.questionType === 'mcq'
          ? a.selectedIndex !== -1
          : (a.textAnswer || '').trim().length > 0
      };
    });

    res.json({
      submission,
      enrichedAnswers,
      exam: {
        title:            exam?.title,
        duration:         exam?.duration,
        marksPerQuestion: exam?.marksPerQuestion,
        negativeMarking:  exam?.negativeMarking
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/student/my-submissions
router.get('/my-submissions', protect, async (req, res) => {
  try {
    const submissions = await Submission.find({ studentId: req.user._id })
      .populate('examId', 'title duration marksPerQuestion')
      .sort({ submittedAt: -1 });
    res.json({ submissions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
