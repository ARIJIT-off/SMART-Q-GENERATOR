const express = require('express');
const router = express.Router();
const Exam = require('../models/Exam');

// GET /api/exam/:accessCode  — Public: get exam info by access code/link
router.get('/:accessCode', async (req, res) => {
  try {
    const exam = await Exam.findOne({ accessCode: req.params.accessCode })
      .populate('questions', 'text options topic difficulty'); // NOT answerIndex for security

    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    if (exam.status === 'ended') return res.status(410).json({ message: 'Exam has ended' });
    if (exam.status === 'draft') return res.status(403).json({ message: 'Exam is not live yet' });

    // Don't send correct answers to student
    const safeExam = {
      _id: exam._id,
      title: exam.title,
      description: exam.description,
      duration: exam.duration,
      marksPerQuestion: exam.marksPerQuestion,
      negativeMarking: exam.negativeMarking,
      status: exam.status,
      accessCode: exam.accessCode,
      questions: exam.questions.map(q => ({
        _id: q._id,
        text: q.text,
        options: q.options,
        topic: q.topic
      }))
    };

    res.json({ exam: safeExam });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
