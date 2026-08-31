import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    api.get('/student/my-submissions')
      .then(res => setSubmissions(res.data.submissions))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎓</span>
          <span className="font-bold text-xl text-gray-800">SMART Q-GEN</span>
          <span className="ml-2 bg-cyan-100 text-cyan-700 text-xs font-semibold px-2 py-0.5 rounded-full">Student</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Hi, <b>{user?.name}</b></span>
          <button onClick={logout} className="text-sm text-red-500 hover:text-red-700 font-medium">Logout</button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="bg-gradient-to-r from-indigo-600 to-cyan-500 rounded-2xl p-8 text-white mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold mb-1">Ready to take an exam?</h2>
            <p className="text-indigo-100">Join using your exam link or scan the QR code</p>
          </div>
          <Link to="/student/join"
            className="bg-white text-indigo-700 font-bold px-6 py-3 rounded-xl hover:bg-indigo-50 whitespace-nowrap">
            Join Exam →
          </Link>
        </div>

        <h3 className="font-bold text-gray-700 mb-4">Past Exams</h3>
        {submissions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400">
            <p className="text-4xl mb-2">📝</p>
            <p>No exams taken yet. Join your first exam above!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {submissions.map(sub => (
              <Link key={sub._id} to={`/exam/result/${sub._id}`}
                className="flex items-center justify-between bg-white rounded-2xl border border-gray-200 p-5 hover:border-indigo-300 hover:shadow-sm transition-all">
                <div>
                  <p className="font-semibold text-gray-800">{sub.examId?.title || 'Exam'}</p>
                  <p className="text-sm text-gray-400">{new Date(sub.submittedAt).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-indigo-700 text-lg">{sub.score}</p>
                  <p className="text-xs text-gray-400">Score</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
