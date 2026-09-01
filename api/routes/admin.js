const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const { protect }      = require('../middleware/authMiddleware');
const { requireRole }  = require('../middleware/roleMiddleware');
const { generateMixedQuestions } = require('../services/mcqService');
const { sendExamLinkEmail }      = require('../services/emailService');
const Question   = require('../models/Question');
const Exam       = require('../models/Exam');
const Submission = require('../models/Submission');

// ─── Multer ────────────────────────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'), false);
  }
});

// POST /api/admin/upload-syllabus
// Fields: syllabus (required), pyq (optional)
router.post('/upload-syllabus',
  protect, requireRole('admin'),
  upload.fields([
    { name: 'syllabus', maxCount: 1 },
    { name: 'pyq',      maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      if (!req.files?.syllabus?.[0]) return res.status(400).json({ message: 'No syllabus PDF uploaded' });

      // Parse question counts
      let counts = { mcq: 5, saq1: 0, saq2: 0, laq5: 0, laq10: 0 };
      try { counts = { ...counts, ...JSON.parse(req.body.questionCounts || '{}') }; } catch {}

      const pyqBuffer = req.files?.pyq?.[0]?.buffer || null;
      const generated = await generateMixedQuestions(req.files.syllabus[0].buffer, counts, pyqBuffer);

      const pdfName = req.files.syllabus[0].originalname;
      const batchId = Date.now().toString();
      const questions = generated.map(q => ({ ...q, pdfName, batchId }));

      res.json({ questions, count: questions.length });
    } catch (err) {
      console.error('Question gen error:', err.message);
      res.status(500).json({ message: err.message });
    }
  }
);

// POST /api/admin/questions/save
router.post('/questions/save', protect, requireRole('admin'), async (req, res) => {
  try {
    const { questions } = req.body;
    if (!questions?.length) return res.status(400).json({ message: 'No questions provided' });
    const saved = await Question.insertMany(
      questions.map(q => ({ ...q, createdBy: req.user._id }))
    );
    res.status(201).json({ saved, count: saved.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/questions
router.get('/questions', protect, requireRole('admin'), async (req, res) => {
  try {
    const questions = await Question.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
    res.json({ questions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/admin/questions/:id
router.put('/questions/:id', protect, requireRole('admin'), async (req, res) => {
  try {
    const q = await Question.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      req.body, { new: true }
    );
    if (!q) return res.status(404).json({ message: 'Question not found' });
    res.json({ question: q });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/admin/questions/:id
router.delete('/questions/:id', protect, requireRole('admin'), async (req, res) => {
  try {
    await Question.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    res.json({ message: 'Question deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Teacher: Override a student's non-MCQ answer mark ────────────────────
// PATCH /api/admin/submissions/:submissionId/grade-answer
router.patch('/submissions/:submissionId/grade-answer', protect, requireRole('admin'), async (req, res) => {
  try {
    const { questionId, score, note } = req.body;
    if (score == null || !questionId) return res.status(400).json({ message: 'questionId and score required' });

    const submission = await Submission.findById(req.params.submissionId);
    if (!submission) return res.status(404).json({ message: 'Submission not found' });

    // Verify exam belongs to this teacher
    const exam = await Exam.findOne({ _id: submission.examId, createdBy: req.user._id });
    if (!exam) return res.status(403).json({ message: 'Not authorised' });

    // Update specific answer
    let found = false;
    submission.answers = submission.answers.map(a => {
      if (a.questionId?.toString() === questionId) {
        found = true;
        a.teacherScore = Math.max(0, parseFloat(score));
        a.teacherNote  = note || '';
      }
      return a;
    });
    if (!found) return res.status(404).json({ message: 'Answer not found' });

    // Recalculate total score
    let newScore = 0;
    const questions = await Question.find({ _id: { $in: submission.answers.map(a => a.questionId) } });
    const qMap = {};
    questions.forEach(q => qMap[q._id.toString()] = q);

    submission.answers.forEach(a => {
      const q = qMap[a.questionId?.toString()];
      if (!q) return;
      if (q.type === 'mcq') {
        if (a.selectedIndex !== -1 && a.selectedIndex === q.answerIndex) newScore += exam.marksPerQuestion;
        else if (a.selectedIndex !== -1) newScore -= (exam.negativeMarking || 0);
      } else {
        // Use teacher override if set, otherwise AI score
        const finalScore = a.teacherScore != null ? a.teacherScore : (a.aiScore || 0);
        newScore += finalScore;
      }
    });

    submission.score = Math.max(0, parseFloat(newScore.toFixed(2)));
    await submission.save();

    res.json({ message: 'Score updated', newTotalScore: submission.score });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Exams ──────────────────────────────────────────────────────────────────

// POST /api/admin/exams
router.post('/exams', protect, requireRole('admin'), async (req, res) => {
  try {
    const { title, description, questionIds, duration, marksPerQuestion, negativeMarking } = req.body;
    if (!title || !questionIds?.length || !duration)
      return res.status(400).json({ message: 'title, questionIds, and duration are required' });

    const exam = await Exam.create({
      title,
      description: description || '',
      questions: questionIds,
      duration: parseInt(duration),
      marksPerQuestion: parseFloat(marksPerQuestion) || 1,
      negativeMarking: parseFloat(negativeMarking) || 0,
      status: 'live',
      createdBy: req.user._id
    });
    res.status(201).json({ exam });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/exams
router.get('/exams', protect, requireRole('admin'), async (req, res) => {
  try {
    const exams = await Exam.find({ createdBy: req.user._id })
      .populate('questions', 'text topic type marks')
      .sort({ createdAt: -1 });
    res.json({ exams });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/admin/exams/:id/status
router.patch('/exams/:id/status', protect, requireRole('admin'), async (req, res) => {
  try {
    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { status: req.body.status },
      { new: true }
    );
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    res.json({ exam });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin/exams/:id/send-email
router.post('/exams/:id/send-email', protect, requireRole('admin'), async (req, res) => {
  try {
    const { emails } = req.body;
    if (!emails?.length) return res.status(400).json({ message: 'No emails provided' });

    const exam = await Exam.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    const baseUrl = process.env.FRONTEND_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` :
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5000'));

    const examLink = `${baseUrl}/exam/${exam.accessCode}`;

    const results = await Promise.allSettled(
      emails.map(e => sendExamLinkEmail(
        e.trim(), req.user.name, exam.title, examLink, exam.duration, exam.questions.length
      ))
    );
    const sent = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    res.json({ message: `Sent to ${sent} student(s).${failed ? ` ${failed} failed.` : ''}`, sent, failed });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/exams/:id/results
router.get('/exams/:id/results', protect, requireRole('admin'), async (req, res) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.id, createdBy: req.user._id })
      .populate('questions');
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    const submissions = await Submission.find({ examId: req.params.id })
      .sort({ submittedAt: -1 });

    // Enrich each submission's answers with question metadata
    const enriched = submissions.map(sub => {
      const qMap = {};
      exam.questions.forEach(q => qMap[q._id.toString()] = q);
      const enrichedAnswers = sub.answers.map(a => {
        const q = qMap[a.questionId?.toString()];
        return {
          questionId:   a.questionId,
          questionText: q?.text || '—',
          questionType: q?.type || a.questionType || 'mcq',
          marks:        q?.marks || 1,
          modelAnswer:  q?.modelAnswer || '',
          // MCQ fields
          options:      q?.options || [],
          selectedIndex:a.selectedIndex,
          correctIndex: q?.answerIndex,
          // SAQ/LAQ fields
          textAnswer:   a.textAnswer || '',
          aiScore:      a.aiScore,
          aiFeedback:   a.aiFeedback || '',
          teacherScore: a.teacherScore,
          teacherNote:  a.teacherNote || '',
          timeTakenSec: a.timeTakenSec || 0
        };
      });
      return { ...sub.toObject(), enrichedAnswers };
    });

    res.json({ exam, submissions: enriched });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
