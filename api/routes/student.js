const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { sendResultEmail } = require('../services/emailService');
const Exam = require('../models/Exam');
const Question = require('../models/Question');
const Submission = require('../models/Submission');

async function calcScores(examId, answers) {
  const exam = await Exam.findById(examId).populate('questions');
  if (!exam) throw new Error('Exam not found');

  const qMap = {};
  exam.questions.forEach(q => { qMap[q._id.toString()] = q; });

  let correct = 0, wrong = 0, attended = 0, score = 0;
  const topicMap = {};

  answers.forEach(a => {
    const q = qMap[a.questionId?.toString()];
    if (!q) return;
    const topic = q.topic || 'General';
    if (!topicMap[topic]) topicMap[topic] = { correct: 0, total: 0 };
    topicMap[topic].total++;

    if (a.selectedIndex === -1 || a.selectedIndex === undefined) return;
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
      ? Math.round((topicMap[t].correct / topicMap[t].total) * 100) : 0;
  });

  return {
    score: Math.max(0, parseFloat(score.toFixed(2))),
    maxScore: exam.questions.length * exam.marksPerQuestion,
    correct, wrong, attended, notAttended,
    topicScores,
    totalQuestions: answers.length
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

    const stats = await calcScores(examId, answers);
    const exam = await Exam.findById(examId);

    const submission = await Submission.create({
      examId,
      studentId: req.user._id,
      studentName: req.user.name || req.user.email,
      studentEmail: req.user.email,
      location: location || { lat: 0, lng: 0, city: 'Unknown', country: 'Unknown' },
      answers,
      cheatingAttempted: cheatingAttempted || false,
      cheatingEvents: cheatingEvents || [],
      autoSubmitted: autoSubmitted || false,
      totalTimeSec: totalTimeSec || 0,
      ...stats
    });

    sendResultEmail(
      req.user.email,
      req.user.name || req.user.email,
      exam?.title || 'Exam',
      stats.score,
      stats.maxScore,
      stats.correct,
      stats.wrong,
      answers.length
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

    const enrichedAnswers = submission.answers.map(a => {
      const q = exam?.questions.find(q => q._id.toString() === a.questionId?.toString());
      return {
        questionId: a.questionId,
        questionText: q?.text || 'Question unavailable',
        options: q?.options || [],
        selectedIndex: a.selectedIndex,
        correctIndex: q?.answerIndex,
        topic: q?.topic || 'General',
        difficulty: q?.difficulty || 'medium',
        timeTakenSec: a.timeTakenSec || 0,
        isCorrect: a.selectedIndex !== -1 && a.selectedIndex === q?.answerIndex,
        isAttended: a.selectedIndex !== -1
      };
    });

    res.json({
      submission,
      enrichedAnswers,
      exam: {
        title: exam?.title,
        duration: exam?.duration,
        marksPerQuestion: exam?.marksPerQuestion,
        negativeMarking: exam?.negativeMarking
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
