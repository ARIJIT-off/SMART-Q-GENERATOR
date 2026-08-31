const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const examSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  duration: { type: Number, required: true }, // in minutes
  marksPerQuestion: { type: Number, default: 1 },
  negativeMarking: { type: Number, default: 0 }, // e.g. 0.25 deducted per wrong
  status: { type: String, enum: ['draft', 'scheduled', 'live', 'ended'], default: 'draft' },
  accessCode: { type: String, default: () => uuidv4(), unique: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  scheduledAt: { type: Date },
  endsAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Exam', examSchema);
