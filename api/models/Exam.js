const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const examSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  duration: { type: Number, required: true },       // minutes
  marksPerQuestion: { type: Number, default: 1 },
  negativeMarking: { type: Number, default: 0 },    // marks deducted per wrong answer
  status: { type: String, enum: ['draft', 'live', 'ended'], default: 'live' },
  accessCode: { type: String, default: () => uuidv4(), unique: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Exam', examSchema);
