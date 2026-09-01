const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
  questionType:  { type: String, default: 'mcq' },  // 'mcq' | 'saq' | 'laq'
  questionMarks: { type: Number, default: 1 },

  // MCQ
  selectedIndex: { type: Number, default: -1 },     // -1 = not attempted

  // SAQ / LAQ
  textAnswer:    { type: String, default: '' },
  aiScore:       { type: Number, default: null },    // AI awarded score
  aiFeedback:    { type: String, default: '' },      // AI evaluation comment

  // Teacher override (non-MCQ)
  teacherScore:  { type: Number, default: null },    // null = not overridden yet
  teacherNote:   { type: String, default: '' },

  timeTakenSec:  { type: Number, default: 0 }
}, { _id: false });

const submissionSchema = new mongoose.Schema({
  examId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  studentId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentName:  { type: String, default: '' },
  studentEmail: { type: String, default: '' },
  location: {
    lat:     { type: Number, default: 0 },
    lng:     { type: Number, default: 0 },
    city:    { type: String, default: 'Unknown' },
    country: { type: String, default: 'Unknown' }
  },
  answers:            [answerSchema],
  cheatingAttempted:  { type: Boolean, default: false },
  cheatingEvents:     [{ type: String }],
  autoSubmitted:      { type: Boolean, default: false },
  submittedAt:        { type: Date, default: Date.now },

  // Computed totals
  score:       { type: Number, default: 0 },
  maxScore:    { type: Number, default: 0 },
  correct:     { type: Number, default: 0 },  // MCQ correct
  wrong:       { type: Number, default: 0 },  // MCQ wrong
  attended:    { type: Number, default: 0 },
  notAttended: { type: Number, default: 0 },
  totalTimeSec:{ type: Number, default: 0 },
  topicScores: { type: Map, of: Number },

  // Pending AI grading (true while grading SAQ/LAQ)
  gradingPending: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Submission', submissionSchema);
