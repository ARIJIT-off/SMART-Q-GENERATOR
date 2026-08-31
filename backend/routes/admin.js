const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { generateMCQsFromPDF } = require('../services/mcqService');
const { sendExamLinkEmail } = require('../services/emailService');
const Question = require('../models/Question');
const Exam = require('../models/Exam');
const Submission = require('../models/Submission');

// ─── Multer: memory storage (Vercel has no persistent disk) ───────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'), false);
  }
});

// ─── POST /api/admin/upload-syllabus ──────────────────────────────
router.post('/upload-syllabus', protect, requireRole('admin'), upload.single('syllabus'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No PDF uploaded' });

    const numQuestions = Math.min(50, Math.max(5, parseInt(req.body.numQuestions) || 20));

    console.log(`Generating ${numQuestions} MCQs for ${req.file.originalname} (${req.file.size} bytes)`);
    const questions = await generateMCQsFromPDF(req.file.buffer, numQuestions);

    res.json({ questions, count: questions.length });
  } catch (err) {
    console.error('MCQ generation error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/admin/questions/save ───────────────────────────────
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

// ─── GET /api/admin/questions ─────────────────────────────────────
router.get('/questions', protect, requireRole('admin'), async (req, res) => {
  try {
    const questions = await Question.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
    res.json({ questions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── DELETE /api/admin/questions/:id ──────────────────────────────
router.delete('/questions/:id', protect, requireRole('admin'), async (req, res) => {
  try {
    await Question.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    res.json({ message: 'Question deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── PUT /api/admin/questions/:id ─────────────────────────────────
router.put('/questions/:id', protect, requireRole('admin'), async (req, res) => {
  try {
    const q = await Question.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      req.body,
      { new: true }
    );
    res.json({ question: q });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/admin/exams ────────────────────────────────────────
router.post('/exams', protect, requireRole('admin'), async (req, res) => {
  try {
    const { title, description, questionIds, duration, marksPerQuestion, negativeMarking } = req.body;
    if (!title || !questionIds?.length || !duration)
      return res.status(400).json({ message: 'title, questionIds, and duration are required' });

    const exam = await Exam.create({
      title,
      description: description || '',
      questions: questionIds,
      duration,
      marksPerQuestion: marksPerQuestion || 1,
      negativeMarking: negativeMarking || 0,
      status: 'live',
      createdBy: req.user._id
    });

    res.status(201).json({ exam });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/admin/exams ─────────────────────────────────────────
router.get('/exams', protect, requireRole('admin'), async (req, res) => {
  try {
    const exams = await Exam.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
    res.json({ exams });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── PATCH /api/admin/exams/:id/status ───────────────────────────
router.patch('/exams/:id/status', protect, requireRole('admin'), async (req, res) => {
  try {
    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { status: req.body.status },
      { new: true }
    );
    res.json({ exam });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/admin/exams/:id/send-email ─────────────────────────
// Send exam link to student emails
router.post('/exams/:id/send-email', protect, requireRole('admin'), async (req, res) => {
  try {
    const { emails } = req.body; // array of email strings
    if (!emails?.length) return res.status(400).json({ message: 'No emails provided' });

    const exam = await Exam.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const examLink = `${frontendUrl}/exam/${exam.accessCode}/setup`;

    const results = await Promise.allSettled(
      emails.map(email =>
        sendExamLinkEmail(
          email.trim(),
          req.user.name,
          exam.title,
          examLink,
          exam.duration,
          exam.questions.length
        )
      )
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    res.json({ message: `Sent to ${sent} students.${failed ? ` ${failed} failed.` : ''}`, sent, failed });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/admin/exams/:id/results ────────────────────────────
router.get('/exams/:id/results', protect, requireRole('admin'), async (req, res) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.id, createdBy: req.user._id })
      .populate('questions');
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    const submissions = await Submission.find({ examId: req.params.id })
      .sort({ submittedAt: -1 });

    res.json({ exam, submissions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
