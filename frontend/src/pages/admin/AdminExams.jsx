import { useState, useEffect } from 'react';
import { Link, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function AdminExams() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qrExam, setQrExam] = useState(null);
  const [emailModal, setEmailModal] = useState(null);
  const [emailInput, setEmailInput] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.get('/admin/exams')
      .then(res => setExams(res.data.exams))
      .catch(() => toast.error('Failed to load exams'))
      .finally(() => setLoading(false));
  }, []);

  const examLink = (code) => `${window.location.origin}/exam/${code}/setup`;

  const changeStatus = async (id, status) => {
    try {
      const res = await api.patch(`/admin/exams/${id}/status`, { status });
      setExams(es => es.map(e => e._id === id ? res.data.exam : e));
      toast.success(`Exam ${status}`);
    } catch { toast.error('Failed to update status'); }
  };

  const copyLink = (code) => {
    navigator.clipboard.writeText(examLink(code));
    toast.success('Link copied!');
  };

  const sendEmails = async () => {
    if (!emailInput.trim()) return toast.error('Enter at least one email');
    const emails = emailInput.split(/[\n,;]+/).map(e => e.trim()).filter(e => e.includes('@'));
    if (!emails.length) return toast.error('No valid emails found');
    setSending(true);
    try {
      const res = await api.post(`/admin/exams/${emailModal._id}/send-email`, { emails });
      toast.success(res.data.message);
      setEmailModal(null);
      setEmailInput('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Email send failed');
    } finally { setSending(false); }
  };

  const statusColor = (s) => ({
    draft: 'bg-gray-100 text-gray-600',
    scheduled: 'bg-yellow-100 text-yellow-700',
    live: 'bg-green-100 text-green-700',
    ended: 'bg-red-100 text-red-600'
  }[s] || '');

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <Link to="/admin" className="text-indigo-600 text-sm">← Dashboard</Link>
            <h1 className="text-2xl font-bold text-gray-800 mt-1">My Exams</h1>
          </div>
          <Link to="/admin/create-exam" className="bg-indigo-600 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-indigo-700">
            + New Exam
          </Link>
        </div>

        {exams.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center text-gray-400">
            <p className="text-4xl mb-3">📋</p>
            <p>No exams yet. <Link to="/admin/create-exam" className="text-indigo-600 hover:underline">Create one →</Link></p>
          </div>
        ) : (
          <div className="space-y-4">
            {exams.map(exam => (
              <div key={exam._id} className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex flex-wrap justify-between items-start gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-bold text-gray-800 text-lg">{exam.title}</h3>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusColor(exam.status)}`}>
                        {exam.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{exam.questions.length} questions · {exam.duration} min · {exam.marksPerQuestion} mark/Q</p>
                    <p className="text-xs text-gray-400 mt-1">Created: {new Date(exam.createdAt).toLocaleDateString()}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => copyLink(exam.accessCode)}
                      className="border border-gray-200 text-gray-600 text-sm px-3 py-1.5 rounded-lg hover:bg-gray-50 flex items-center gap-1">
                      🔗 Copy Link
                    </button>
                    <button onClick={() => setQrExam(exam)}
                      className="border border-indigo-200 text-indigo-600 text-sm px-3 py-1.5 rounded-lg hover:bg-indigo-50 flex items-center gap-1">
                      📷 QR Code
                    </button>
                    <button onClick={() => { setEmailModal(exam); setEmailInput(''); }}
                      className="border border-emerald-200 text-emerald-600 text-sm px-3 py-1.5 rounded-lg hover:bg-emerald-50 flex items-center gap-1">
                      ✉️ Email Link
                    </button>
                    <Link to={`/admin/exams/${exam._id}/results`}
                      className="border border-cyan-200 text-cyan-600 text-sm px-3 py-1.5 rounded-lg hover:bg-cyan-50 flex items-center gap-1">
                      📊 Results
                    </Link>
                    {exam.status === 'live' && (
                      <button onClick={() => changeStatus(exam._id, 'ended')}
                        className="border border-red-200 text-red-500 text-sm px-3 py-1.5 rounded-lg hover:bg-red-50">
                        ⛔ End Exam
                      </button>
                    )}
                    {exam.status === 'ended' && (
                      <button onClick={() => changeStatus(exam._id, 'live')}
                        className="border border-green-200 text-green-600 text-sm px-3 py-1.5 rounded-lg hover:bg-green-50">
                        ▶ Reopen
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QR Modal */}
      {qrExam && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setQrExam(null)}>
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg text-gray-800 mb-2">{qrExam.title}</h3>
            <p className="text-sm text-gray-500 mb-5">Scan to join the exam</p>
            <div className="flex justify-center">
              <QRCodeSVG value={examLink(qrExam.accessCode)} size={220} />
            </div>
            <p className="text-xs text-gray-400 mt-4 break-all">{examLink(qrExam.accessCode)}</p>
            <button onClick={() => { copyLink(qrExam.accessCode); }}
              className="mt-3 w-full bg-indigo-600 text-white py-2 rounded-xl text-sm hover:bg-indigo-700">
              📋 Copy Link
            </button>
            <button onClick={() => setQrExam(null)} className="mt-2 w-full border border-gray-200 text-gray-600 py-2 rounded-xl text-sm hover:bg-gray-50">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {emailModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setEmailModal(null)}>
          <div className="bg-white rounded-2xl p-8 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg text-gray-800 mb-1">✉️ Email Exam Link</h3>
            <p className="text-sm text-gray-500 mb-4">
              Send "<b>{emailModal.title}</b>" link to students via Gmail
            </p>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Student Emails (one per line, or comma-separated)
            </label>
            <textarea
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              placeholder="student1@gmail.com&#10;student2@gmail.com&#10;student3@gmail.com"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none h-32"
            />
            <button onClick={sendEmails} disabled={sending}
              className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl">
              {sending ? 'Sending...' : `📨 Send Exam Link via Gmail`}
            </button>
            <button onClick={() => setEmailModal(null)} className="mt-2 w-full border border-gray-200 text-gray-600 py-2 rounded-xl text-sm hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
