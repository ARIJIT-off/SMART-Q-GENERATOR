const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  type: { type: String, enum: ['MCQ', 'SAQ_1', 'SAQ_2', 'LAQ_5', 'LAQ_10'], default: 'MCQ' },
  marks: { type: Number, default: 1 },
  options: [{ type: String }],
  answerIndex: { type: Number },
  idealAnswer: { type: String }, // Used by AI to grade subjective questions
  topic: { type: String, default: 'General', trim: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  source: { type: String, default: 'ai-generated' },
  pdfName: { type: String },
  batchId: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Question', questionSchema);
