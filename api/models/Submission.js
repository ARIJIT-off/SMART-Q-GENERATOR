const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
  selectedIndex: { type: Number, default: -1 },  // -1 = not attempted (for MCQ)
  textAnswer: { type: String, default: '' },     // For SAQ/LAQ
  aiScore: { type: Number },                     // Assigned by AI for SAQ/LAQ
  teacherScore: { type: Number },                // Override by teacher
  aiFeedback: { type: String, default: '' },     // Explanation of marking
  timeTakenSec: { type: Number, default: 0 }
}, { _id: false });

const submissionSchema = new mongoose.Schema({
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentName: { type: String, default: '' },
  studentEmail: { type: String, default: '' },
  location: {
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
    city: { type: String, default: 'Unknown' },
    country: { type: String, default: 'Unknown' }
  },
  answers: [answerSchema],
  cheatingAttempted: { type: Boolean, default: false },
  cheatingEvents: [{ type: String }],  // ['tab-switch', 'fullscreen-exit', ...]
  autoSubmitted: { type: Boolean, default: false },
  submittedAt: { type: Date, default: Date.now },
  // Computed scores (server-side)
  score: { type: Number, default: 0 },
  maxScore: { type: Number, default: 0 },
  correct: { type: Number, default: 0 },
  wrong: { type: Number, default: 0 },
  attended: { type: Number, default: 0 },
  notAttended: { type: Number, default: 0 },
  totalTimeSec: { type: Number, default: 0 },
  topicScores: { type: Map, of: Number }  // topic → % correct
}, { timestamps: true });

module.exports = mongoose.model('Submission', submissionSchema);
