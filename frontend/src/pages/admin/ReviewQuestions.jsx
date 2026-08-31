import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function ReviewQuestions() {
  const [questions, setQuestions] = useState([]);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = sessionStorage.getItem('generated_questions');
    if (stored) setQuestions(JSON.parse(stored));
    else navigate('/admin/upload');
  }, []);

  const updateQ = (idx, field, value) => {
    setQuestions(qs => qs.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  const updateOption = (idx, optIdx, value) => {
    setQuestions(qs => qs.map((q, i) => {
      if (i !== idx) return q;
      const opts = [...q.options];
      opts[optIdx] = value;
      return { ...q, options: opts };
    }));
  };

  const deleteQ = (idx) => setQuestions(qs => qs.filter((_, i) => i !== idx));

  const addBlank = () => {
    setQuestions(qs => [...qs, {
      text: '', options: ['', '', '', ''], answerIndex: 0,
      topic: 'General', difficulty: 'medium', source: 'manual'
    }]);
  };

  const save = async () => {
    const valid = questions.filter(q => q.text && q.options.every(o => o));
    if (!valid.length) return toast.error('Please fill in all question fields');
    setSaving(true);
    try {
      const res = await api.post('/admin/questions/save', { questions: valid });
      toast.success(`Saved ${res.data.count} questions!`);
      sessionStorage.removeItem('generated_questions');
      navigate('/admin/create-exam');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <a href="/admin/upload" className="text-indigo-600 text-sm mb-4 inline-block">← Back</a>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Review Questions</h1>
            <p className="text-gray-500">{questions.length} questions generated. Edit, delete, or add more.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={addBlank} className="border border-indigo-300 text-indigo-600 font-medium px-4 py-2 rounded-xl hover:bg-indigo-50">+ Add Question</button>
            <button onClick={save} disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-xl">
              {saving ? 'Saving...' : 'Save & Continue →'}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-3">
                <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-1 rounded-full">Q{idx + 1}</span>
                <button onClick={() => deleteQ(idx)} className="text-red-400 hover:text-red-600 text-sm">🗑 Delete</button>
              </div>

              {/* Question text */}
              <textarea
                value={q.text}
                onChange={e => updateQ(idx, 'text', e.target.value)}
                className="w-full border border-gray-300 rounded-xl p-3 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                rows={2} placeholder="Question text..."
              />

              {/* Options */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {q.options.map((opt, oi) => (
                  <div key={oi} className={`flex items-center gap-2 border rounded-xl px-3 py-2 ${q.answerIndex === oi ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}>
                    <input type="radio" name={`ans-${idx}`} checked={q.answerIndex === oi}
                      onChange={() => updateQ(idx, 'answerIndex', oi)}
                      className="accent-green-500" />
                    <input value={opt} onChange={e => updateOption(idx, oi, e.target.value)}
                      className="flex-1 text-sm bg-transparent focus:outline-none"
                      placeholder={`Option ${oi + 1}`} />
                  </div>
                ))}
              </div>

              {/* Topic & difficulty */}
              <div className="flex gap-3">
                <input value={q.topic} onChange={e => updateQ(idx, 'topic', e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                  placeholder="Topic" />
                <select value={q.difficulty} onChange={e => updateQ(idx, 'difficulty', e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none">
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>
          ))}
        </div>

        {questions.length > 0 && (
          <button onClick={save} disabled={saving}
            className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl">
            {saving ? 'Saving...' : `Save ${questions.length} Questions & Create Exam →`}
          </button>
        )}
      </div>
    </div>
  );
}
