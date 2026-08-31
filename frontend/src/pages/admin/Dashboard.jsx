import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AdminDashboard() {
  const { user, logout } = useAuth();

  const cards = [
    {
      to: '/admin/upload',
      icon: '📄',
      title: 'Upload Syllabus',
      desc: 'Upload a PDF and generate MCQs with local AI',
      color: 'from-indigo-500 to-indigo-600'
    },
    {
      to: '/admin/create-exam',
      icon: '✏️',
      title: 'Create Exam',
      desc: 'Build an exam from your question bank',
      color: 'from-purple-500 to-purple-600'
    },
    {
      to: '/admin/exams',
      icon: '📋',
      title: 'My Exams',
      desc: 'Manage exams, view QR codes & results',
      color: 'from-cyan-500 to-cyan-600'
    },
    {
      to: '/admin/upload',
      icon: '🗂️',
      title: 'Question Bank',
      desc: 'Browse and edit all saved questions',
      color: 'from-emerald-500 to-emerald-600'
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎓</span>
          <span className="font-bold text-xl text-gray-800">SMART Q-GEN</span>
          <span className="ml-2 bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full">Admin</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Hi, <b>{user?.name}</b></span>
          <button onClick={logout} className="text-sm text-red-500 hover:text-red-700 font-medium">Logout</button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Admin Dashboard</h2>
        <p className="text-gray-500 mb-8">Create exams, upload syllabi, and monitor student performance.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {cards.map(c => (
            <Link key={c.title} to={c.to}
              className="group rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow bg-white border border-gray-100">
              <div className={`bg-gradient-to-r ${c.color} p-6 flex items-center gap-4`}>
                <span className="text-4xl">{c.icon}</span>
                <div>
                  <h3 className="text-xl font-bold text-white">{c.title}</h3>
                  <p className="text-white/80 text-sm">{c.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
