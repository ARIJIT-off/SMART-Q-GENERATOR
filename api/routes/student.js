const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { sendResultEmail } = require('../services/emailService');
const Exam = require('../models/Exam');
const Question = require('../models/Question');
const Submission = require('../models/Submission');

const { evaluateSubjectiveAnswer } = require('../services/mcqService');

async function calcScores(examId, answers) {
  const exam = await Exam.findById(examId).populate('questions');
  if (!exam) throw new Error('Exam not found');

  const qMap = {};
  exam.questions.forEach(q => { qMap[q._id.toString()] = q; });

  let correct = 0, wrong = 0, attended = 0, score = 0, maxScore = 0;
  const topicMap = {};

  const evaluationPromises = answers.map(async (a) => {
    const q = qMap[a.questionId?.toString()];
    if (!q) return a;
    
    maxScore += (q.marks || exam.marksPerQuestion);
    
    const topic = q.topic || 'General';
    if (!topicMap[topic]) topicMap[topic] = { correct: 0, total: 0 };
    topicMap[topic].total++;

    if (q.type === 'MCQ' || !q.type) {
      if (a.selectedIndex === -1 || a.selectedIndex === undefined) return a;
      attended++;
      if (a.selectedIndex === q.answerIndex) {
        correct++;
        score += (q.marks || exam.marksPerQuestion);
        topicMap[topic].correct++;
      } else {
        wrong++;
        score -= (exam.negativeMarking || 0);
      }
    } else {
      if (!a.textAnswer || !a.textAnswer.trim()) return a;
      attended++;
      // Evaluate subjective answer
      const evaluation = await evaluateSubjectiveAnswer(q.text, q.idealAnswer, a.textAnswer, q.marks);
      a.aiScore = evaluation.score;
      a.teacherScore = evaluation.score; // default teacherScore to aiScore initially
      a.aiFeedback = evaluation.feedback;
      score += evaluation.score;
      if (evaluation.score > 0) topicMap[topic].correct++; // loosely count partial marks as correct for topic tracking
    }
    return a;
  });

  const evaluatedAnswers = await Promise.all(evaluationPromises);

  const notAttended = answers.length - attended;
  const topicScores = {};
  Object.keys(topicMap).forEach(t => {
    topicScores[t] = topicMap[t].total > 0
      ? Math.round((topicMap[t].correct / topicMap[t].total) * 100) : 0;
  });

  return {
    evaluatedAnswers,
    stats: {
      score: Math.max(0, parseFloat(score.toFixed(2))),
      maxScore,
      correct, wrong, attended, notAttended,
      topicScores,
      totalQuestions: answers.length
    }
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

    const { evaluatedAnswers, stats } = await calcScores(examId, answers);
    const exam = await Exam.findById(examId);

    const submission = await Submission.create({
      examId,
      studentId: req.user._id,
      studentName: req.user.name || req.user.email,
      studentEmail: req.user.email,
      location: location || { lat: 0, lng: 0, city: 'Unknown', country: 'Unknown' },
      answers: evaluatedAnswers,
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
      evaluatedAnswers.length
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
        type: q?.type || 'MCQ',
        marks: q?.marks || exam?.marksPerQuestion || 1,
        options: q?.options || [],
        selectedIndex: a.selectedIndex,
        correctIndex: q?.answerIndex,
        textAnswer: a.textAnswer,
        aiScore: a.aiScore,
        teacherScore: a.teacherScore,
        aiFeedback: a.aiFeedback,
        idealAnswer: q?.idealAnswer,
        topic: q?.topic || 'General',
        difficulty: q?.difficulty || 'medium',
        timeTakenSec: a.timeTakenSec || 0,
        isCorrect: (q?.type === 'MCQ' || !q?.type) 
          ? (a.selectedIndex !== -1 && a.selectedIndex === q?.answerIndex)
          : (a.teacherScore > 0),
        isAttended: (q?.type === 'MCQ' || !q?.type) 
          ? (a.selectedIndex !== -1)
          : (!!a.textAnswer)
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
