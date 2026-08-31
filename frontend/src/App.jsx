import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import Login from './pages/Login';
import AdminDashboard from './pages/admin/Dashboard';
import UploadSyllabus from './pages/admin/UploadSyllabus';
import ReviewQuestions from './pages/admin/ReviewQuestions';
import CreateExam from './pages/admin/CreateExam';
import AdminExams from './pages/admin/AdminExams';
import ExamResults from './pages/admin/ExamResults';
import StudentDashboard from './pages/student/Dashboard';
import JoinExam from './pages/student/JoinExam';
import ExamSetup from './pages/student/ExamSetup';
import ExamRoom from './pages/student/ExamRoom';
import ResultPage from './pages/student/ResultPage';

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/student'} replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/student'} /> : <Login />} />
      
      {/* Admin routes */}
      <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/upload" element={<ProtectedRoute role="admin"><UploadSyllabus /></ProtectedRoute>} />
      <Route path="/admin/review" element={<ProtectedRoute role="admin"><ReviewQuestions /></ProtectedRoute>} />
      <Route path="/admin/create-exam" element={<ProtectedRoute role="admin"><CreateExam /></ProtectedRoute>} />
      <Route path="/admin/exams" element={<ProtectedRoute role="admin"><AdminExams /></ProtectedRoute>} />
      <Route path="/admin/exams/:examId/results" element={<ProtectedRoute role="admin"><ExamResults /></ProtectedRoute>} />
      
      {/* Student routes */}
      <Route path="/student" element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
      <Route path="/student/join" element={<ProtectedRoute role="student"><JoinExam /></ProtectedRoute>} />
      <Route path="/exam/:accessCode/setup" element={<ProtectedRoute role="student"><ExamSetup /></ProtectedRoute>} />
      <Route path="/exam/:accessCode/take" element={<ProtectedRoute role="student"><ExamRoom /></ProtectedRoute>} />
      <Route path="/exam/result/:submissionId" element={<ProtectedRoute role="student"><ResultPage /></ProtectedRoute>} />
      
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        <AppRoutes />
      </HashRouter>
    </AuthProvider>
  );
}
