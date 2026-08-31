import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { startProctoring, requestFullscreen, exitFullscreen, startCamera } from '../../utils/proctoring';
import toast from 'react-hot-toast';

export default function ExamRoom() {
  const { accessCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Exam state
  const [exam, setExam] = useState(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState([]); // {questionId, selectedIndex, timeTakenSec}
  const [submitted, setSubmitted] = useState(false);

  // Timing
  const [timeLeft, setTimeLeft] = useState(0); // seconds total
  const [qStartTime, setQStartTime] = useState(Date.now());
  const qTimesRef = useRef([]); // seconds per question

  // Proctoring
  const [cameraStream, setCameraStream] = useState(null);
  const [cheatingEvents, setCheatingEvents] = useState([]);
  const videoRef = useRef(null);
  const cleanupProctoring = useRef(null);
  const submittedRef = useRef(false);
  const answersRef = useRef([]);
  const qTimerRef = useRef(null);

  // Load exam
  useEffect(() => {
    const stored = sessionStorage.getItem('current_exam');
    if (!stored) { navigate('/student/join'); return; }
    const e = JSON.parse(stored);
    setExam(e);
    setTimeLeft(e.duration * 60);

    // Init answers array
    const initAnswers = e.questions.map(q => ({ questionId: q._id, selectedIndex: -1, timeTakenSec: 0 }));
    setAnswers(initAnswers);
    answersRef.current = initAnswers;
    qTimesRef.current = new Array(e.questions.length).fill(0);

    // Start camera
    startCamera().then(stream => {
      setCameraStream(stream);
      if (videoRef.current) videoRef.current.srcObject = stream;
    }).catch(() => toast('Camera unavailable', { icon: '⚠️' }));

    // Ensure fullscreen
    requestFullscreen();
  }, []);

  // Submit function
  const submitExam = useCallback(async (reason = 'manual', auto = false) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitted(true);

    // Record time for current question
    if (qTimerRef.current) clearInterval(qTimerRef.current);

    // Stop camera
    cameraStream?.getTracks().forEach(t => t.stop());

    // Exit fullscreen gracefully
    exitFullscreen();

    // Clean up proctoring
    cleanupProctoring.current?.();

    const finalAnswers = answersRef.current;
    const location = JSON.parse(sessionStorage.getItem('exam_location') || 'null');
    const totalTimeSec = exam ? (exam.duration * 60 - timeLeft) : 0;

    try {
      const res = await api.post('/student/submit', {
        examId: exam?._id,
        answers: finalAnswers,
        location,
        cheatingAttempted: cheatingEvents.length > 0 || auto,
        cheatingEvents: auto ? [...cheatingEvents, reason] : cheatingEvents,
        autoSubmitted: auto,
        totalTimeSec
      });

      if (auto) toast.error(`⚠️ Exam auto-submitted: ${reason.replace('-', ' ')}`);
      else toast.success('Exam submitted successfully!');

      sessionStorage.removeItem('current_exam');
      sessionStorage.removeItem('exam_location');
      navigate(`/exam/result/${res.data.submission._id}`);
    } catch (err) {
      toast.error('Submission failed: ' + (err.response?.data?.message || err.message));
    }
  }, [exam, timeLeft, cameraStream, cheatingEvents]);

  // Setup proctoring after exam loads
  useEffect(() => {
    if (!exam) return;
    const cleanup = startProctoring({
      onViolation: (type) => {
        setCheatingEvents(prev => [...prev, type]);
      },
      onAutoSubmit: (reason) => {
        submitExam(reason, true);
      }
    });
    cleanupProctoring.current = cleanup;
    return cleanup;
  }, [exam, submitExam]);

  // Countdown timer
  useEffect(() => {
    if (!exam || submitted) return;
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timer);
          submitExam('time-up', true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [exam, submitted, submitExam]);

  // Per-question timer
  useEffect(() => {
    if (!exam || submitted) return;
    setQStartTime(Date.now());
  }, [currentQ]);

  const recordQuestionTime = (qIdx) => {
    const elapsed = Math.round((Date.now() - qStartTime) / 1000);
    qTimesRef.current[qIdx] = (qTimesRef.current[qIdx] || 0) + elapsed;
  };

  const selectAnswer = (optIdx) => {
    const updated = answersRef.current.map((a, i) =>
      i === currentQ ? { ...a, selectedIndex: optIdx } : a
    );
    answersRef.current = updated;
    setAnswers([...updated]);
  };

  const goTo = (idx) => {
    recordQuestionTime(currentQ);
    // Update time for current question in answers
    answersRef.current = answersRef.current.map((a, i) =>
      i === currentQ ? { ...a, timeTakenSec: qTimesRef.current[currentQ] } : a
    );
    setCurrentQ(idx);
  };

  const formatTime = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  if (!exam) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
    </div>
  );

  const q = exam.questions[currentQ];
  const currentAnswer = answers[currentQ]?.selectedIndex;
  const answeredCount = answers.filter(a => a.selectedIndex !== -1).length;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col select-none" id="exam-root">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex justify-between items-center flex-shrink-0">
        <div>
          <h1 className="font-bold text-lg">{exam.title}</h1>
          <p className="text-gray-400 text-xs">{answeredCount}/{exam.questions.length} answered</p>
        </div>
        <div className={`text-2xl font-bold font-mono ${timeLeft < 300 ? 'text-red-400 animate-pulse' : 'text-green-400'}`}>
          ⏱ {formatTime(timeLeft)}
        </div>
        <button onClick={() => submitExam('manual')}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-xl text-sm">
          Submit Exam
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Question panel */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-2xl mx-auto">
            {/* Question number badge */}
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-indigo-600 text-white text-sm font-bold px-3 py-1 rounded-full">
                Q{currentQ + 1} of {exam.questions.length}
              </span>
              <span className="text-gray-400 text-sm">{q.topic}</span>
            </div>

            {/* Question text */}
            <div className="bg-gray-800 rounded-2xl p-6 mb-6 border border-gray-700">
              <p className="text-lg leading-relaxed">{q.text}</p>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {q.options.map((opt, oi) => {
                const isSelected = currentAnswer === oi;
                return (
                  <button key={oi} onClick={() => selectAnswer(oi)}
                    className={`w-full text-left px-5 py-4 rounded-xl border-2 font-medium transition-all
                      ${isSelected
                        ? 'border-indigo-500 bg-indigo-900/50 text-indigo-200'
                        : 'border-gray-700 bg-gray-800 hover:border-gray-500 text-gray-200'}`}>
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold mr-3
                      ${isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
                      {String.fromCharCode(65 + oi)}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>

            {/* Navigation */}
            <div className="flex justify-between mt-8">
              <button onClick={() => goTo(currentQ - 1)} disabled={currentQ === 0}
                className="border border-gray-600 text-gray-300 px-6 py-2.5 rounded-xl disabled:opacity-30 hover:border-gray-400">
                ← Previous
              </button>
              {currentQ < exam.questions.length - 1 ? (
                <button onClick={() => goTo(currentQ + 1)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-xl">
                  Next →
                </button>
              ) : (
                <button onClick={() => submitExam('manual')}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2.5 rounded-xl">
                  ✅ Submit Exam
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Question map sidebar */}
        <div className="w-52 bg-gray-800 border-l border-gray-700 p-4 overflow-y-auto flex-shrink-0">
          <p className="text-xs text-gray-400 font-semibold mb-3 uppercase tracking-wider">Questions</p>
          <div className="grid grid-cols-4 gap-1.5">
            {exam.questions.map((_, i) => {
              const isAnswered = answers[i]?.selectedIndex !== -1;
              const isCurrent = i === currentQ;
              return (
                <button key={i} onClick={() => goTo(i)}
                  className={`aspect-square rounded-lg text-xs font-bold transition-colors
                    ${isCurrent ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                      : isAnswered ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-4 space-y-1.5 text-xs text-gray-400">
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-600 rounded" /> Answered</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-gray-700 rounded" /> Not answered</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-indigo-600 rounded" /> Current</div>
          </div>
        </div>
      </div>

      {/* Camera PiP */}
      {cameraStream && (
        <div className="proctor-pip">
          <video ref={videoRef} autoPlay muted playsInline />
        </div>
      )}

      {/* Submitted overlay */}
      {submitted && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4" />
            <p className="text-white text-xl font-semibold">Submitting your exam...</p>
          </div>
        </div>
      )}
    </div>
  );
}
