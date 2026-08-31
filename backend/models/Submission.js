const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
  selectedIndex: { type: Number, default: -1 }, // -1 = not attended
  timeTakenSec: { type: Number, default: 0 }
}, { _id: false });

const submissionSchema = new mongoose.Schema({
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentName: { type: String },
  studentEmail: { type: String },
  location: {
    lat: Number,
    lng: Number,
    city: String,
    country: String,
    ip: String
  },
  answers: [answerSchema],
  cheatingAttempted: { type: Boolean, default: false },
  cheatingEvents: [{ type: String }], // e.g. ['tab-switch', 'fullscreen-exit']
  submittedAt: { type: Date, default: Date.now },
  autoSubmitted: { type: Boolean, default: false },
  score: { type: Number, default: 0 },
  correct: { type: Number, default: 0 },
  wrong: { type: Number, default: 0 },
  attended: { type: Number, default: 0 },
  notAttended: { type: Number, default: 0 },
  totalTimeSec: { type: Number, default: 0 },
  topicScores: { type: Map, of: Number } // topic -> % correct
});

module.exports = mongoose.model('Submission', submissionSchema);
