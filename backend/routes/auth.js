const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendWelcomeEmail, sendOtpEmail } = require('../services/emailService');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// ─── POST /api/auth/send-otp (For Registration & Forgot Password) ───
router.post('/send-otp', async (req, res) => {
  try {
    const { email, role } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    // Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60000); // 10 minutes

    let user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      // Create a pending user
      user = new User({
        email: email.toLowerCase(),
        role: role || 'student',
        name: email.split('@')[0],
        passwordHash: 'pending'
      });
    } else {
      // If user exists, this acts as a forgot password flow.
      // Update role if explicitly provided during a re-signup.
      if (role) user.role = role;
    }

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    // Send the OTP via Gmail
    await sendOtpEmail(user.email, otp);

    res.json({ message: 'OTP sent to your email.' });
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ message: 'Failed to send OTP email. Please try again.' });
  }
});

// ─── POST /api/auth/register (Verify OTP & Set PIN) ──────────────
router.post('/register', async (req, res) => {
  try {
    const { email, otp, password } = req.body;
    
    if (!email || !otp || !password) 
      return res.status(400).json({ message: 'Email, OTP, and Password are required' });
    
    if (password.length !== 4 || isNaN(password))
      return res.status(400).json({ message: 'Password must be exactly a 4-digit number' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'User not found. Please request OTP first.' });

    if (user.otp !== otp) return res.status(400).json({ message: 'Invalid OTP code' });
    if (user.otpExpires < new Date()) return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });

    // OTP valid! Set the new 4-digit PIN and clear OTP
    user.passwordHash = password; // Will be hashed by pre-save hook
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    // Send a welcome email if they were pending
    if (user.passwordHash === 'pending') {
      sendWelcomeEmail(user.email, user.name, user.role);
    }

    // Log them in immediately
    res.status(200).json({
      token: generateToken(user._id),
      user: { _id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('Verify/Register error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      token: generateToken(user._id),
      user: { _id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────
router.get('/me', require('../middleware/authMiddleware').protect, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
