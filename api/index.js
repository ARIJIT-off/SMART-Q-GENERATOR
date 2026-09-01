/**
 * api/index.js — Express app (Vercel serverless-compatible)
 * All routes are prefixed /api/...
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const examRoutes = require('./routes/exam');
const studentRoutes = require('./routes/student');

const app = express();

// ─── CORS ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, cb) => {
    // Allow all origins in production (Vercel handles security)
    cb(null, true);
  },
  credentials: true
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// ─── MongoDB ───────────────────────────────────────────────────────────
let isConnected = false;
async function connectDB() {
  if (isConnected && mongoose.connection.readyState === 1) return;
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
    });
    isConnected = true;
    console.log('✅ MongoDB Atlas connected');
  } catch (err) {
    console.error('❌ MongoDB error:', err.message);
    isConnected = false;
    throw err;
  }
}

// Ensure DB is connected on every request (Vercel serverless-safe)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(503).json({ message: 'Database unavailable. Please try again in a moment.' });
  }
});

// ─── Routes ────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/exam', examRoutes);
app.use('/api/student', studentRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({
  status: 'ok',
  time: new Date().toISOString(),
  env: process.env.NODE_ENV,
  db: isConnected ? 'connected' : 'disconnected'
}));

// ─── 404 ───────────────────────────────────────────────────────────────
app.use('/api/*', (req, res) => {
  res.status(404).json({ message: `API route ${req.originalUrl} not found` });
});

// ─── Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});

// ─── Static HTML serving (local dev) ────────────────────────────────────
// On Vercel, /public is served by the CDN. Locally, Express serves it.
const staticPath = path.join(__dirname, '..', 'public');
app.use(express.static(staticPath));
// Named routes → HTML files
app.get('/login',      (req, res) => res.sendFile(path.join(staticPath, 'login.html')));
app.get('/signup',     (req, res) => res.sendFile(path.join(staticPath, 'signup.html')));
app.get('/admin',      (req, res) => res.sendFile(path.join(staticPath, 'admin.html')));
app.get('/student',    (req, res) => res.sendFile(path.join(staticPath, 'student.html')));
app.get('/result',     (req, res) => res.sendFile(path.join(staticPath, 'result.html')));
app.get('/exam/:code', (req, res) => res.sendFile(path.join(staticPath, 'exam.html')));
app.get('/',           (req, res) => res.sendFile(path.join(staticPath, 'index.html')));

// ─── Start Server ────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n⚡ SMART Q-GEN running at http://localhost:${PORT}`);
    console.log(`   Login   → http://localhost:${PORT}/login.html`);
    console.log(`   Signup  → http://localhost:${PORT}/signup.html`);
    console.log(`   Admin   → http://localhost:${PORT}/admin.html`);
    console.log(`   Student → http://localhost:${PORT}/student.html\n`);
  });
}).catch(err => {
  console.error('Failed to connect to MongoDB:', err.message);
  process.exit(1);
});

module.exports = app;

