const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  options: [{ type: String, required: true }],   // exactly 4 items
  answerIndex: { type: Number, required: true },  // 0-3
  topic: { type: String, default: 'General', trim: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  source: { type: String, default: 'ai-generated' },
  pdfName: { type: String },
  batchId: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Question', questionSchema);
