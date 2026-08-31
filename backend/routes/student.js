const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { sendResultEmail } = require('../services/emailService');
const Exam = require('../models/Exam');
const Question = require('../models/Question');
const Submission = require('../models/Submission');

// Helper: calculate scores server-side
async function calculateScores(examId, answers) {
  const exam = await Exam.findById(examId).populate('questions');
  if (!exam) throw new Error('Exam not found');

  const questionMap = {};
  exam.questions.forEach(q => { questionMap[q._id.toString()] = q; });

  let correct = 0, wrong = 0, attended = 0, score = 0;
  const topicMap = {};

  answers.forEach(a => {
    const q = questionMap[a.questionId?.toString()];
    if (!q) return;
    const topic = q.topic || 'General';
    if (!topicMap[topic]) topicMap[topic] = { correct: 0, total: 0 };
    topicMap[topic].total++;

    if (a.selectedIndex === -1) return; // not attended
    attended++;
    if (a.selectedIndex === q.answerIndex) {
      correct++;
      score += exam.marksPerQuestion;
      topicMap[topic].correct++;
    } else {
      wrong++;
      score -= (exam.negativeMarking || 0);
    }
  });

  const notAttended = answers.length - attended;
  const topicScores = {};
  Object.keys(topicMap).forEach(t => {
    topicScores[t] = topicMap[t].total > 0
      ? Math.round((topicMap[t].correct / topicMap[t].total) * 100)
      : 0;
  });

  return {
    score: Math.max(0, parseFloat(score.toFixed(2))),
    correct, wrong, attended, notAttended,
    topicScores,
    totalQuestions: answers.length,
    maxScore: exam.questions.length * exam.marksPerQuestion
  };
}

// ─── POST /api/student/submit ─────────────────────────────────────
router.post('/submit', protect, async (req, res) => {
  try {
    const { examId, answers, location, cheatingAttempted, cheatingEvents, autoSubmitted, totalTimeSec } = req.body;

    if (!examId || !answers?.length)
      return res.status(400).json({ message: 'examId and answers are required' });

    // Prevent duplicate submissions
    const existing = await Submission.findOne({ examId, studentId: req.user._id });
    if (existing) return res.status(409).json({
      message: 'You have already submitted this exam.',
      submissionId: existing._id
    });

    const stats = await calculateScores(examId, answers);
    const exam = await Exam.findById(examId);

    const submission = await Submission.create({
      examId,
      studentId: req.user._id,
      studentName: req.user.name,
      studentEmail: req.user.email,
      location: location || { lat: 0, lng: 0, city: 'Unknown' },
      answers,
      cheatingAttempted: cheatingAttempted || false,
      cheatingEvents: cheatingEvents || [],
      autoSubmitted: autoSubmitted || false,
      totalTimeSec: totalTimeSec || 0,
      ...stats
    });

    // Send result email (non-blocking)
    sendResultEmail(
      req.user.email,
      req.user.name,
      exam?.title || 'Exam',
      stats.score,
      stats.correct,
      stats.wrong,
      answers.length
    );

    res.status(201).json({ submission });
  } catch (err) {
    console.error('Submit error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/student/result/:submissionId ────────────────────────
router.get('/result/:submissionId', protect, async (req, res) => {
  try {
    const submission = await Submission.findOne({
      _id: req.params.submissionId,
      studentId: req.user._id
    });
    if (!submission) return res.status(404).json({ message: 'Submission not found' });

    const exam = await Exam.findById(submission.examId).populate('questions');

    const enrichedAnswers = submission.answers.map(a => {
      const q = exam.questions.find(q => q._id.toString() === a.questionId?.toString());
      return {
        questionId: a.questionId,
        questionText: q?.text || 'Question unavailable',
        options: q?.options || [],
        selectedIndex: a.selectedIndex,
        correctIndex: q?.answerIndex,
        topic: q?.topic || 'General',
        timeTakenSec: a.timeTakenSec || 0,
        isCorrect: a.selectedIndex !== -1 && a.selectedIndex === q?.answerIndex,
        isAttended: a.selectedIndex !== -1
      };
    });

    res.json({
      submission,
      enrichedAnswers,
      exam: { title: exam?.title, duration: exam?.duration, marksPerQuestion: exam?.marksPerQuestion }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/student/my-submissions ─────────────────────────────
router.get('/my-submissions', protect, async (req, res) => {
  try {
    const submissions = await Submission.find({ studentId: req.user._id })
      .populate('examId', 'title duration')
      .sort({ submittedAt: -1 });
    res.json({ submissions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
