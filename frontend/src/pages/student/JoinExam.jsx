import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function JoinExam() {
  const [link, setLink] = useState('');
  const [scanning, setScanning] = useState(false);
  const navigate = useNavigate();

  const joinByLink = () => {
    const trimmed = link.trim();
    if (!trimmed) return toast.error('Please paste the exam link');
    // Extract access code from URL or use as-is
    const match = trimmed.match(/\/exam\/([^/]+)\/setup/);
    const code = match ? match[1] : trimmed;
    navigate(`/exam/${code}/setup`);
  };

  const startScan = () => {
    setScanning(true);
    // Dynamically load html5-qrcode to avoid SSR issues
    import('html5-qrcode').then(({ Html5Qrcode }) => {
      const scanner = new Html5Qrcode('qr-reader');
      scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          scanner.stop().then(() => {
            setScanning(false);
            // Navigate to extracted code
            const match = decodedText.match(/\/exam\/([^/]+)\/setup/);
            const code = match ? match[1] : decodedText;
            navigate(`/exam/${code}/setup`);
          });
        },
        (err) => {} // scanning error, ignore
      ).catch(err => { toast.error('Camera not available'); setScanning(false); });
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <a href="/student" className="text-indigo-600 text-sm mb-4 inline-block">← Dashboard</a>
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Join an Exam</h1>
          <p className="text-gray-500 mb-6">Paste the exam link or scan the QR code</p>

          {/* Link input */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 block mb-2">Exam Link</label>
            <div className="flex gap-2">
              <input
                value={link}
                onChange={e => setLink(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && joinByLink()}
                placeholder="Paste exam link or code here..."
                className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button onClick={joinByLink}
                className="bg-indigo-600 text-white font-semibold px-5 py-3 rounded-xl hover:bg-indigo-700">
                Go
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-sm text-gray-400">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* QR Scanner */}
          {!scanning ? (
            <button onClick={startScan}
              className="w-full border-2 border-dashed border-gray-300 hover:border-indigo-400 text-gray-600 hover:text-indigo-600 py-8 rounded-2xl flex flex-col items-center gap-2 transition-colors">
              <span className="text-4xl">📷</span>
              <span className="font-medium">Scan QR Code</span>
              <span className="text-sm text-gray-400">Click to open camera</span>
            </button>
          ) : (
            <div>
              <div id="qr-reader" className="rounded-xl overflow-hidden" />
              <button onClick={() => setScanning(false)}
                className="mt-3 w-full border border-gray-200 text-gray-600 py-2 rounded-xl hover:bg-gray-50 text-sm">
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
