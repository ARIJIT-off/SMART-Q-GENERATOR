import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function CreateExam() {
  const [questions, setQuestions] = useState([]);
  const [selected, setSelected] = useState([]);
  const [form, setForm] = useState({
    title: '', description: '', duration: 30,
    marksPerQuestion: 1, negativeMarking: 0
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/admin/questions')
      .then(res => setQuestions(res.data.questions))
      .catch(() => toast.error('Failed to load questions'))
      .finally(() => setFetching(false));
  }, []);

  const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const selectAll = () => setSelected(questions.map(q => q._id));
  const clearAll = () => setSelected([]);

  const submit = async () => {
    if (!form.title) return toast.error('Enter exam title');
    if (selected.length < 1) return toast.error('Select at least 1 question');
    setLoading(true);
    try {
      const res = await api.post('/admin/exams', {
        ...form, questionIds: selected
      });
      toast.success('Exam created!');
      navigate(`/admin/exams`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create exam');
    } finally { setLoading(false); }
  };

  if (fetching) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <Link to="/admin" className="text-indigo-600 text-sm mb-4 inline-block">← Dashboard</Link>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Create New Exam</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Exam Settings */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 h-fit">
            <h2 className="font-semibold text-gray-700 mb-4">Exam Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Exam Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))}
                  className="mt-1 w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="e.g. Mid-term Physics Exam" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
                  className="mt-1 w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                  rows={2} placeholder="Optional description..." />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Duration (minutes)</label>
                <input type="number" min={5} max={300} value={form.duration}
                  onChange={e => setForm(f => ({...f, duration: Number(e.target.value)}))}
                  className="mt-1 w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Marks per Q</label>
                  <input type="number" min={0.5} step={0.5} value={form.marksPerQuestion}
                    onChange={e => setForm(f => ({...f, marksPerQuestion: Number(e.target.value)}))}
                    className="mt-1 w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Negative Marking</label>
                  <input type="number" min={0} step={0.25} value={form.negativeMarking}
                    onChange={e => setForm(f => ({...f, negativeMarking: Number(e.target.value)}))}
                    className="mt-1 w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-indigo-50 rounded-xl text-sm text-indigo-700">
              <b>Selected: {selected.length}</b> questions &nbsp;|&nbsp; Total Marks: <b>{(selected.length * form.marksPerQuestion).toFixed(1)}</b>
            </div>

            <button onClick={submit} disabled={loading}
              className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl">
              {loading ? 'Creating...' : '🚀 Create & Publish Exam'}
            </button>
          </div>

          {/* Question Selection */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-gray-700">Select Questions ({questions.length} available)</h2>
              <div className="flex gap-2 text-xs">
                <button onClick={selectAll} className="text-indigo-600 hover:underline">All</button>
                <span>|</span>
                <button onClick={clearAll} className="text-gray-500 hover:underline">None</button>
              </div>
            </div>

            {questions.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>No questions yet.</p>
                <Link to="/admin/upload" className="text-indigo-600 text-sm hover:underline">Upload a syllabus first →</Link>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {questions.map(q => (
                  <label key={q._id}
                    className={`flex items-start gap-3 border rounded-xl p-3 cursor-pointer transition-colors
                      ${selected.includes(q._id) ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="checkbox" checked={selected.includes(q._id)} onChange={() => toggle(q._id)}
                      className="mt-0.5 accent-indigo-600" />
                    <div>
                      <p className="text-sm text-gray-700 line-clamp-2">{q.text}</p>
                      <span className="text-xs text-gray-400">{q.topic} · {q.difficulty}</span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
