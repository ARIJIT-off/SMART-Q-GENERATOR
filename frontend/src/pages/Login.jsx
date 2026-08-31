import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../utils/api';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  // Tabs: true = Sign In, false = Create Account / Reset Password
  const [isLogin, setIsLogin] = useState(true);
  
  // Common
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);
  
  // Login specific
  const [loginPin, setLoginPin] = useState('');

  // OTP Flow Specific
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [newPin, setNewPin] = useState('');

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email) return toast.error('Email is required');
    
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { email, role });
      toast.success('4-digit OTP sent to your email!');
      setOtpSent(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP. Check email settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndSetPin = async (e) => {
    e.preventDefault();
    if (otp.length !== 4) return toast.error('OTP must be 4 digits');
    if (newPin.length !== 4) return toast.error('PIN must be exactly 4 digits');

    setLoading(true);
    try {
      const res = await api.post('/auth/register', { 
        email, 
        otp, 
        password: newPin 
      });
      toast.success('Account verified & PIN set!');
      login(res.data.user, res.data.token);
      navigate(res.data.user.role === 'admin' ? '/admin' : '/student');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (loginPin.length !== 4) return toast.error('PIN must be 4 digits');

    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password: loginPin });
      toast.success(`Welcome back, ${res.data.user.name}!`);
      login(res.data.user, res.data.token);
      navigate(res.data.user.role === 'admin' ? '/admin' : '/student');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid email or PIN');
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setOtpSent(false);
    setOtp('');
    setNewPin('');
    setLoginPin('');
  };

  return (
    <div className="min-h-screen bg-[#310c7a] flex flex-col items-center justify-center p-4">
      
      {/* Brand */}
      <div className="text-center mb-10">
        <div className="bg-indigo-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30">
          <span className="text-3xl">🎓</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">SMART Q-GEN</h1>
        <p className="text-indigo-200 text-sm">AI-Powered Exam Platform</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-[24px] p-8 shadow-2xl"
      >
        {/* Toggle */}
        <div className="flex p-1 bg-gray-50 rounded-xl mb-8">
          <button
            onClick={() => { setIsLogin(true); resetState(); }}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${isLogin ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsLogin(false); resetState(); }}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${!isLogin ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Sign Up / Reset PIN
          </button>
        </div>

        {/* ─── SIGN IN FLOW ────────────────────────────────────────────── */}
        {isLogin && (
          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
              <input
                type="email" required
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-semibold text-gray-700">4-Digit PIN</label>
                <button type="button" onClick={() => setIsLogin(false)} className="text-xs text-indigo-600 font-medium hover:underline">
                  Forgot PIN?
                </button>
              </div>
              <input
                type="password" required
                maxLength={4}
                pattern="[0-9]{4}"
                value={loginPin} onChange={e => setLoginPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-center tracking-[1em] text-lg font-bold"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-70 mt-2"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        )}

        {/* ─── SIGN UP / RESET PIN FLOW ────────────────────────────────── */}
        {!isLogin && !otpSent && (
          <form onSubmit={handleSendOtp} className="space-y-5">
            <div className="bg-indigo-50 text-indigo-800 text-xs p-3 rounded-lg border border-indigo-100 mb-4 text-center">
              Enter your email to receive a 4-digit verification OTP.
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
              <input
                type="email" required
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">I am a...</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${role === 'student' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${role === 'admin' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  Teacher / Admin
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-70 mt-2"
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        )}

        {/* ─── OTP VERIFICATION & PIN SET ──────────────────────────────── */}
        {!isLogin && otpSent && (
          <form onSubmit={handleVerifyAndSetPin} className="space-y-5">
            <div className="text-center mb-6">
              <p className="text-sm text-gray-500">Code sent to</p>
              <p className="font-semibold text-gray-800">{email}</p>
              <button type="button" onClick={() => setOtpSent(false)} className="text-xs text-indigo-600 hover:underline mt-1">
                Change Email
              </button>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 text-center">Enter 4-Digit OTP</label>
              <input
                type="text" required
                maxLength={4}
                pattern="[0-9]{4}"
                value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="0000"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-center tracking-[1em] text-xl font-bold text-indigo-600"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 text-center mt-6">Create your 4-Digit PIN</label>
              <p className="text-xs text-gray-400 text-center mb-3">You will use this PIN to log in next time.</p>
              <input
                type="password" required
                maxLength={4}
                pattern="[0-9]{4}"
                value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-center tracking-[1em] text-xl font-bold"
              />
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-70 mt-4"
            >
              {loading ? 'Verifying...' : 'Verify & Save PIN'}
            </button>
          </form>
        )}

      </motion.div>
    </div>
  );
}
