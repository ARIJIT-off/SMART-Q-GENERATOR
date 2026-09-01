const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { generateQuestionsFromPDF } = require('../services/mcqService');
const { sendExamLinkEmail } = require('../services/emailService');
const Question = require('../models/Question');
const Exam = require('../models/Exam');
const Submission = require('../models/Submission');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'), false);
  }
});

// POST /api/admin/upload-syllabus
router.post('/upload-syllabus', protect, requireRole('admin'), upload.fields([{ name: 'syllabus', maxCount: 1 }, { name: 'pyq', maxCount: 1 }]), async (req, res) => {
  try {
    if (!req.files || !req.files.syllabus) return res.status(400).json({ message: 'Syllabus PDF is required' });
    
    const breakdown = {
      mcq: parseInt(req.body.mcq) || 0,
      saq1: parseInt(req.body.saq1) || 0,
      saq2: parseInt(req.body.saq2) || 0,
      laq5: parseInt(req.body.laq5) || 0,
      laq10: parseInt(req.body.laq10) || 0
    };
    
    // Default fallback if nothing specified
    if (Object.values(breakdown).reduce((a,b)=>a+b, 0) === 0) breakdown.mcq = 20;

    const pyqBuffer = req.files.pyq ? req.files.pyq[0].buffer : null;
    const generated = await generateQuestionsFromPDF(req.files.syllabus[0].buffer, pyqBuffer, breakdown);
    
    const pdfName = req.files.syllabus[0].originalname;
    const batchId = Date.now().toString();
    const questions = generated.map(q => ({ ...q, pdfName, batchId }));
    
    res.json({ questions, count: questions.length });
  } catch (err) {
    console.error('Question gen error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

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
      .populate('questions', 'text topic')
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

    res.json({ exam, submissions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/admin/exams/:examId/submissions/:subId/override
router.patch('/exams/:examId/submissions/:subId/override', protect, requireRole('admin'), async (req, res) => {
  try {
    const { questionId, newScore } = req.body;
    const submission = await Submission.findOne({ _id: req.params.subId, examId: req.params.examId });
    if (!submission) return res.status(404).json({ message: 'Submission not found' });

    const ansIndex = submission.answers.findIndex(a => a.questionId.toString() === questionId);
    if (ansIndex === -1) return res.status(404).json({ message: 'Answer not found in submission' });

    submission.answers[ansIndex].teacherScore = Number(newScore);
    
    // Recalculate total score
    const exam = await Exam.findById(req.params.examId).populate('questions');
    let newTotalScore = 0;
    
    submission.answers.forEach(a => {
      const q = exam.questions.find(q => q._id.toString() === a.questionId.toString());
      if (!q) return;
      if (q.type === 'MCQ' || !q.type) {
        if (a.selectedIndex !== -1 && a.selectedIndex === q.answerIndex) {
          newTotalScore += (q.marks || exam.marksPerQuestion);
        } else if (a.selectedIndex !== -1) {
          newTotalScore -= (exam.negativeMarking || 0);
        }
      } else {
        newTotalScore += (a.teacherScore !== undefined ? a.teacherScore : (a.aiScore || 0));
      }
    });
    
    submission.score = Math.max(0, parseFloat(newTotalScore.toFixed(2)));
    await submission.save();

    res.json({ message: 'Score updated', submission });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
