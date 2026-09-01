const express = require('express');
const router = express.Router();
const Exam = require('../models/Exam');
const Question = require('../models/Question');

// GET /api/exam/:accessCode — public route, returns exam WITHOUT correct answers
router.get('/:accessCode', async (req, res) => {
  try {
    const exam = await Exam.findOne({ accessCode: req.params.accessCode })
      .populate('questions', 'text options topic difficulty');  // no answerIndex

    if (!exam) return res.status(404).json({ message: 'Exam not found. Check the link and try again.' });
    if (exam.status === 'ended') return res.status(410).json({ message: 'This exam has ended.' });

    res.json({
      exam: {
        _id: exam._id,
        title: exam.title,
        description: exam.description,
        duration: exam.duration,
        marksPerQuestion: exam.marksPerQuestion,
        negativeMarking: exam.negativeMarking,
        questionCount: exam.questions.length,
        questions: exam.questions   // no answerIndex in populate
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
