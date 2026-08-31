import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function ExamResults() {
  const { examId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    api.get(`/admin/exams/${examId}/results`)
      .then(res => setData(res.data))
      .catch(() => toast.error('Failed to load results'))
      .finally(() => setLoading(false));
  }, [examId]);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" /></div>;
  if (!data) return <div className="p-6 text-red-500">Failed to load results.</div>;

  const { exam, submissions } = data;
  const totalQ = exam.questions.length;
  const maxMarks = totalQ * exam.marksPerQuestion;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <a href="/admin/exams" className="text-indigo-600 text-sm mb-4 inline-block">← Back to Exams</a>
        <h1 className="text-2xl font-bold text-gray-800">{exam.title} — Results</h1>
        <p className="text-gray-500 mb-6">{submissions.length} submissions · {totalQ} questions · Max {maxMarks} marks</p>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Submitted', val: submissions.length, color: 'bg-indigo-600' },
            { label: 'Avg Score', val: submissions.length ? (submissions.reduce((s,x) => s + x.score, 0) / submissions.length).toFixed(1) : '—', color: 'bg-cyan-500' },
            { label: 'Cheating Flags', val: submissions.filter(s => s.cheatingAttempted).length, color: 'bg-red-500' },
            { label: 'Avg Time (min)', val: submissions.length ? Math.round(submissions.reduce((s,x) => s + x.totalTimeSec, 0) / submissions.length / 60) : '—', color: 'bg-emerald-500' },
          ].map(c => (
            <div key={c.label} className={`${c.color} text-white rounded-2xl p-5 text-center`}>
              <p className="text-3xl font-bold">{c.val}</p>
              <p className="text-sm opacity-80 mt-1">{c.label}</p>
            </div>
          ))}
        </div>

        {/* Student table */}
        {submissions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400">No submissions yet.</div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Student', 'Location', 'Score', 'Correct', 'Wrong', 'Time', 'Cheating', 'Details'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {submissions.map(sub => (
                  <>
                    <tr key={sub._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{sub.studentName}</p>
                        <p className="text-gray-400 text-xs">{sub.studentEmail}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{sub.location?.city || 'Computer Lab'}</td>
                      <td className="px-4 py-3 font-bold text-indigo-700">{sub.score}/{maxMarks}</td>
                      <td className="px-4 py-3 text-green-600 font-medium">{sub.correct}</td>
                      <td className="px-4 py-3 text-red-500 font-medium">{sub.wrong}</td>
                      <td className="px-4 py-3 text-gray-600">{Math.floor(sub.totalTimeSec / 60)}m {sub.totalTimeSec % 60}s</td>
                      <td className="px-4 py-3">
                        {sub.cheatingAttempted
                          ? <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs font-semibold">YES ⚠️</span>
                          : <span className="bg-green-100 text-green-600 px-2 py-0.5 rounded-full text-xs font-semibold">No ✓</span>}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => setExpanded(expanded === sub._id ? null : sub._id)}
                          className="text-indigo-600 hover:underline text-xs">
                          {expanded === sub._id ? 'Hide' : 'Expand'}
                        </button>
                      </td>
                    </tr>
                    {expanded === sub._id && (
                      <tr key={`${sub._id}-detail`}>
                        <td colSpan={8} className="px-4 pb-4 bg-gray-50">
                          <div className="pt-3">
                            {sub.cheatingAttempted && (
                              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3 text-sm text-red-700">
                                ⚠️ Cheating events: {sub.cheatingEvents?.join(', ')}
                              </div>
                            )}
                            <p className="text-xs font-semibold text-gray-500 mb-2">Time per question (seconds):</p>
                            <ResponsiveContainer width="100%" height={120}>
                              <BarChart data={sub.answers.map((a, i) => ({ name: `Q${i + 1}`, time: a.timeTakenSec }))}>
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <Tooltip />
                                <Bar dataKey="time" fill="#6366f1" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                            <div className="grid grid-cols-3 gap-3 mt-3 text-sm">
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <p className="text-gray-500 text-xs">Attended</p>
                                <p className="font-bold text-gray-700">{sub.attended}/{totalQ}</p>
                              </div>
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <p className="text-gray-500 text-xs">Avg Time/Q</p>
                                <p className="font-bold text-gray-700">
                                  {sub.answers.length ? Math.round(sub.totalTimeSec / sub.answers.length) : 0}s
                                </p>
                              </div>
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <p className="text-gray-500 text-xs">Total Time</p>
                                <p className="font-bold text-gray-700">{Math.floor(sub.totalTimeSec / 60)}m {sub.totalTimeSec % 60}s</p>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
