const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  // Question content
  text: { type: String, required: true },

  // MCQ only
  options: [{ type: String }],          // exactly 4 for MCQ, empty for SAQ/LAQ
  answerIndex: { type: Number },        // 0-3 for MCQ, null for SAQ/LAQ

  // Question type & marks
  type: {
    type: String,
    enum: ['mcq', 'saq', 'laq'],
    default: 'mcq'
  },
  marks: { type: Number, default: 1 }, // mcq=1(from exam), saq=1|2, laq=5|10

  // For AI grading of SAQ/LAQ
  modelAnswer: { type: String, default: '' },

  // Metadata
  topic: { type: String, default: 'General', trim: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  source: { type: String, default: 'ai-generated' },
  pdfName: { type: String },
  batchId: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Question', questionSchema);
