import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar
} from 'recharts';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';

export default function ResultPage() {
  const { submissionId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/student/result/${submissionId}`)
      .then(res => setData(res.data))
      .catch(() => toast.error('Failed to load results'))
      .finally(() => setLoading(false));
  }, [submissionId]);

  const downloadPDF = () => {
    if (!data) return;
    const { submission, enrichedAnswers, exam } = data;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text('SMART Q-GEN — Answer Script', 20, 20);
    doc.setFontSize(12);
    doc.text(`Exam: ${exam.title}`, 20, 32);
    doc.text(`Student: ${submission.studentName} (${submission.studentEmail})`, 20, 40);
    doc.text(`Score: ${submission.score} | Correct: ${submission.correct} | Wrong: ${submission.wrong}`, 20, 48);
    doc.text(`Total Time: ${Math.floor(submission.totalTimeSec / 60)}m ${submission.totalTimeSec % 60}s`, 20, 56);

    let y = 68;
    enrichedAnswers.forEach((a, i) => {
      if (y > 260) { doc.addPage(); y = 20; }
      const status = !a.isAttended ? '○ NOT ATTENDED' : a.isCorrect ? '✓ CORRECT' : '✗ WRONG';
      doc.setFontSize(10);
      doc.text(`Q${i + 1}: ${(a.questionText || '').slice(0, 80)}`, 20, y);
      y += 7;
      a.options?.forEach((opt, oi) => {
        const prefix = oi === a.correctIndex ? '✓' : oi === a.selectedIndex && !a.isCorrect ? '✗' : ' ';
        doc.text(`  ${prefix} ${String.fromCharCode(65 + oi)}. ${opt.slice(0, 70)}`, 25, y);
        y += 5;
      });
      doc.text(`  Status: ${status} | Time: ${a.timeTakenSec}s`, 25, y);
      y += 9;
    });

    doc.save(`QGEN_Result_${submission.studentName}.pdf`);
    toast.success('Downloaded!');
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" /></div>;
  if (!data) return <div className="p-6 text-red-500">Failed to load result.</div>;

  const { submission, enrichedAnswers, exam } = data;
  const totalQ = enrichedAnswers.length;
  const avgTime = totalQ ? Math.round(submission.totalTimeSec / totalQ) : 0;
  const scorePercent = submission.score && (submission.attended * 1) ? Math.round((submission.correct / submission.attended) * 100) : 0;

  // Topic radar data
  const topicData = Object.entries(submission.topicScores || {}).map(([topic, score]) => ({
    topic: topic.slice(0, 12), score
  }));

  // Per-question time data
  const timeData = enrichedAnswers.map((a, i) => ({
    name: `Q${i + 1}`, time: a.timeTakenSec,
    fill: a.isCorrect ? '#10b981' : !a.isAttended ? '#94a3b8' : '#ef4444'
  }));

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <Link to="/student" className="text-indigo-600 text-sm mb-4 inline-block">← Dashboard</Link>

        {/* Result hero */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white mb-6">
          <h1 className="text-2xl font-bold mb-1">{exam.title} — Results</h1>
          <p className="text-indigo-200 text-sm mb-5">Submitted: {new Date(submission.submittedAt).toLocaleString()}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Score', val: submission.score, sub: `/ ${totalQ * 1}` },
              { label: 'Correct', val: submission.correct, color: 'text-green-300' },
              { label: 'Wrong', val: submission.wrong, color: 'text-red-300' },
              { label: 'Not Attended', val: submission.notAttended, color: 'text-gray-300' },
            ].map(c => (
              <div key={c.label} className="bg-white/10 rounded-xl p-4 text-center">
                <p className={`text-3xl font-bold ${c.color || 'text-white'}`}>{c.val}<span className="text-sm font-normal opacity-70">{c.sub}</span></p>
                <p className="text-sm text-indigo-200 mt-1">{c.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Cheating flag */}
        {submission.cheatingAttempted && (
          <div className="bg-red-50 border border-red-300 rounded-xl p-4 mb-6 text-red-700 text-sm">
            ⚠️ <b>Cheating flag raised</b> — Events detected: {submission.cheatingEvents?.join(', ')}
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Time', val: `${Math.floor(submission.totalTimeSec/60)}m ${submission.totalTimeSec%60}s` },
            { label: 'Avg Time/Q', val: `${avgTime}s` },
            { label: 'Accuracy', val: `${scorePercent}%` },
            { label: 'Understanding', val: topicData.length ? `${Math.round(topicData.reduce((s,t)=>s+t.score,0)/topicData.length)}%` : '—' },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-5 text-center">
              <p className="text-2xl font-bold text-gray-800">{c.val}</p>
              <p className="text-sm text-gray-500 mt-1">{c.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Per-question time chart */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-700 mb-4">Time Per Question (seconds)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={timeData}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => [`${v}s`, 'Time']} />
                <Bar dataKey="time" radius={[4, 4, 0, 0]}>
                  {timeData.map((entry, i) => (
                    <rect key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Topic radar */}
          {topicData.length >= 3 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-700 mb-4">Subject Understanding</h3>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={topicData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="topic" tick={{ fontSize: 10 }} />
                  <Radar dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-700 mb-4">Topic Scores</h3>
              <div className="space-y-3">
                {topicData.map(t => (
                  <div key={t.topic}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{t.topic}</span>
                      <span className="font-semibold text-indigo-600">{t.score}%</span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-2">
                      <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${t.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Download button */}
        <button onClick={downloadPDF}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl mb-6 flex items-center justify-center gap-2">
          📥 Download Answer Script (PDF)
        </button>

        {/* Per-question detailed review */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="font-semibold text-gray-700">Detailed Answer Review</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {enrichedAnswers.map((a, i) => (
              <div key={i} className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                    ${a.isCorrect ? 'bg-green-100 text-green-700' : !a.isAttended ? 'bg-gray-100 text-gray-500' : 'bg-red-100 text-red-600'}`}>
                    {a.isCorrect ? '✓ Correct' : !a.isAttended ? '○ Not Attended' : '✗ Wrong'}
                  </span>
                  <span className="text-xs text-gray-400">⏱ {a.timeTakenSec}s</span>
                </div>
                <p className="text-sm font-medium text-gray-800 mb-3">Q{i + 1}: {a.questionText}</p>
                <div className="space-y-1">
                  {a.options?.map((opt, oi) => (
                    <div key={oi} className={`text-sm px-3 py-1.5 rounded-lg flex items-center gap-2
                      ${oi === a.correctIndex ? 'bg-green-50 text-green-700 font-medium'
                        : oi === a.selectedIndex && !a.isCorrect ? 'bg-red-50 text-red-600'
                        : 'text-gray-500'}`}>
                      <span>{oi === a.correctIndex ? '✓' : oi === a.selectedIndex && !a.isCorrect ? '✗' : '○'}</span>
                      <span>{String.fromCharCode(65 + oi)}. {opt}</span>
                      {oi === a.selectedIndex && !a.isCorrect && <span className="ml-auto text-xs text-red-400">Your answer</span>}
                      {oi === a.correctIndex && <span className="ml-auto text-xs text-green-500">Correct answer</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
