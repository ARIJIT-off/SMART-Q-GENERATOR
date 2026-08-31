import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { getLocation, startCamera, requestFullscreen } from '../../utils/proctoring';
import toast from 'react-hot-toast';

const STEPS = ['load', 'location', 'camera', 'fullscreen', 'ready'];

export default function ExamSetup() {
  const { accessCode } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [step, setStep] = useState('load');
  const [location, setLocation] = useState(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/exam/${accessCode}`)
      .then(res => {
        setExam(res.data.exam);
        // Store in session for exam room
        sessionStorage.setItem('current_exam', JSON.stringify(res.data.exam));
        sessionStorage.setItem('exam_location', JSON.stringify(null));
        setStep('location');
      })
      .catch(err => {
        setError(err.response?.data?.message || 'Exam not found');
      });
  }, [accessCode]);

  const handleLocation = async () => {
    try {
      const loc = await getLocation();
      setLocation(loc);
      sessionStorage.setItem('exam_location', JSON.stringify(loc));
      toast.success('Location captured');
      setStep('camera');
    } catch (err) {
      // Location denied — still allow, just log
      toast('Location denied — proceeding without it', { icon: '⚠️' });
      setLocation({ lat: 0, lng: 0, city: 'Computer Lab' });
      setStep('camera');
    }
  };

  const handleCamera = async () => {
    try {
      const stream = await startCamera();
      setCameraStream(stream);
      // Stop stream for now — ExamRoom will restart it
      stream.getTracks().forEach(t => t.stop());
      toast.success('Camera access granted');
      setStep('fullscreen');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleFullscreen = async () => {
    await requestFullscreen();
    setStep('ready');
  };

  const startExam = () => {
    navigate(`/exam/${accessCode}/take`);
  };

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-lg">
        <p className="text-5xl mb-4">❌</p>
        <h2 className="text-xl font-bold text-red-600 mb-2">Exam Unavailable</h2>
        <p className="text-gray-600">{error}</p>
        <Link to="/student" className="mt-4 inline-block text-indigo-600 hover:underline">← Back to Dashboard</Link>
      </div>
    </div>
  );

  if (step === 'load') return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
    </div>
  );

  const stepConfig = {
    location: {
      icon: '📍', title: 'Share Your Location',
      desc: 'Your location will be recorded as part of the exam session for verification purposes.',
      btnText: 'Allow Location', action: handleLocation, color: 'bg-blue-600 hover:bg-blue-700'
    },
    camera: {
      icon: '📷', title: 'Enable Camera',
      desc: 'Your camera will be active during the exam. A small preview will be visible. No video is recorded or stored.',
      btnText: 'Allow Camera', action: handleCamera, color: 'bg-purple-600 hover:bg-purple-700'
    },
    fullscreen: {
      icon: '🖥️', title: 'Go Fullscreen',
      desc: 'The exam must be taken in fullscreen mode. Exiting fullscreen will auto-submit your exam.',
      btnText: 'Enter Fullscreen', action: handleFullscreen, color: 'bg-indigo-600 hover:bg-indigo-700'
    },
    ready: {
      icon: '🚀', title: 'All Set!',
      desc: 'You are ready to begin the exam. Remember: switching tabs or exiting fullscreen will auto-submit. Good luck!',
      btnText: `Start Exam — ${exam?.title}`, action: startExam, color: 'bg-green-600 hover:bg-green-700'
    }
  };

  const currentStep = stepConfig[step];
  const stepIndex = STEPS.indexOf(step) - 1; // 0-based from location

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Exam info */}
        {exam && (
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-white">{exam.title}</h2>
            <p className="text-indigo-300 text-sm">{exam.questions.length} questions · {exam.duration} minutes</p>
          </div>
        )}

        {/* Progress steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {['Location', 'Camera', 'Fullscreen', 'Ready'].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                ${stepIndex > i ? 'bg-green-500 text-white' : stepIndex === i ? 'bg-white text-indigo-900' : 'bg-white/20 text-white/50'}`}>
                {stepIndex > i ? '✓' : i + 1}
              </div>
              {i < 3 && <div className={`w-8 h-0.5 ${stepIndex > i ? 'bg-green-500' : 'bg-white/20'}`} />}
            </div>
          ))}
        </div>

        {/* Step card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <p className="text-6xl mb-4">{currentStep.icon}</p>
          <h3 className="text-xl font-bold text-gray-800 mb-3">{currentStep.title}</h3>
          <p className="text-gray-500 mb-8 leading-relaxed">{currentStep.desc}</p>

          {/* Rules reminder at ready step */}
          {step === 'ready' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 text-left mb-6">
              <p className="font-semibold mb-2">⚠️ Exam Rules:</p>
              <ul className="space-y-1 list-disc pl-4">
                <li>Stay in fullscreen at all times</li>
                <li>Do not switch tabs or minimize the browser</li>
                <li>Keep your camera on throughout</li>
                <li>Violations will auto-submit the exam immediately</li>
              </ul>
            </div>
          )}

          <button onClick={currentStep.action}
            className={`w-full ${currentStep.color} text-white font-bold py-4 rounded-xl text-lg transition-colors`}>
            {currentStep.btnText}
          </button>
        </div>
      </div>
    </div>
  );
}
