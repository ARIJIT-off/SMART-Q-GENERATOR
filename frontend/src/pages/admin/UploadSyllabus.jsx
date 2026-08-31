import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function UploadSyllabus() {
  const [file, setFile] = useState(null);
  const [numQ, setNumQ] = useState(20);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();
  const navigate = useNavigate();

  const handleFile = (f) => {
    if (f && f.type === 'application/pdf') setFile(f);
    else toast.error('Please select a PDF file');
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const submit = async () => {
    if (!file) return toast.error('Please upload a PDF');
    setLoading(true);
    setProgress('Uploading and parsing PDF...');
    try {
      const fd = new FormData();
      fd.append('syllabus', file);
      fd.append('numQuestions', numQ);

      setProgress('Running local AI to generate MCQs (this may take 30–60 seconds)...');
      const res = await api.post('/admin/upload-syllabus', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 180000
      });

      const questions = res.data.questions;
      // Store for review page
      sessionStorage.setItem('generated_questions', JSON.stringify(questions));
      toast.success(`Generated ${questions.length} questions!`);
      navigate('/admin/review');
    } catch (err) {
      toast.error(err.response?.data?.message || 'MCQ generation failed');
    } finally {
      setLoading(false); setProgress('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <Link to="/admin" className="text-indigo-600 text-sm mb-4 inline-block">← Back to Dashboard</Link>
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Upload Syllabus PDF</h1>
        <p className="text-gray-500 mb-8">Upload your subject syllabus and our local AI will generate MCQs — no cloud APIs.</p>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors
            ${dragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 bg-white'}`}
        >
          <input ref={inputRef} type="file" accept=".pdf" className="hidden"
            onChange={e => handleFile(e.target.files[0])} />
          {file ? (
            <div>
              <span className="text-5xl">📄</span>
              <p className="mt-3 font-semibold text-gray-700">{file.name}</p>
              <p className="text-sm text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              <button className="mt-2 text-xs text-red-400 hover:text-red-600" onClick={e => { e.stopPropagation(); setFile(null); }}>Remove</button>
            </div>
          ) : (
            <div>
              <span className="text-5xl">☁️</span>
              <p className="mt-3 text-gray-600 font-medium">Drag & drop your syllabus PDF here</p>
              <p className="text-sm text-gray-400 mt-1">or click to browse files</p>
            </div>
          )}
        </div>

        {/* Num questions */}
        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">Number of Questions to Generate</label>
          <input type="range" min="5" max="50" value={numQ} onChange={e => setNumQ(Number(e.target.value))}
            className="w-full accent-indigo-600" />
          <p className="text-center text-indigo-600 font-bold mt-1">{numQ} Questions</p>
        </div>

        {loading && (
          <div className="mt-6 bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-indigo-700 text-sm">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600" />
              {progress}
            </div>
          </div>
        )}

        <button onClick={submit} disabled={loading || !file}
          className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">
          {loading ? 'Generating MCQs...' : 'Generate MCQs'}
        </button>
      </div>
    </div>
  );
}
