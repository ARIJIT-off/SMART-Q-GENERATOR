const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendOtpEmail, sendWelcomeEmail } = require('../services/emailService');

const makeToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
  try {
    const { email, role } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    if (!email.includes('@')) return res.status(400).json({ message: 'Enter a valid email address' });

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60000);

    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      user = new User({
        email: email.toLowerCase(),
        role: role || 'student',
        name: email.split('@')[0],
        passwordHash: 'pending'
      });
    } else {
      if (role) user.role = role;
    }
    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    await sendOtpEmail(user.email, otp);
    res.json({ message: 'OTP sent to your email. Check inbox and spam folder.' });
  } catch (err) {
    console.error('send-otp error:', err.message);
    res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
  }
});

// POST /api/auth/check-otp  (step 2 — just validate OTP, no PIN set yet)
router.post('/check-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'No account found. Please request OTP first.' });
    if (user.otp !== otp) return res.status(400).json({ message: 'Incorrect OTP code. Check your email and try again.' });
    if (user.otpExpires < new Date()) return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });

    res.json({ valid: true, message: 'OTP verified!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/verify-otp  (verify OTP + set 4-digit PIN)
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp, pin } = req.body;
    if (!email || !otp || !pin)
      return res.status(400).json({ message: 'Email, OTP and PIN are required' });
    if (!/^\d{4}$/.test(pin))
      return res.status(400).json({ message: 'PIN must be exactly 4 digits' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'No account found. Please request OTP first.' });
    if (user.otp !== otp) return res.status(400).json({ message: 'Incorrect OTP code' });
    if (user.otpExpires < new Date()) return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });

    const isNew = user.passwordHash === 'pending';
    user.passwordHash = pin;  // pre-save hook will bcrypt this
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    if (isNew) sendWelcomeEmail(user.email, user.name, user.role).catch(() => {});

    res.json({
      token: makeToken(user._id),
      user: { _id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('verify-otp error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, pin } = req.body;
    if (!email || !pin)
      return res.status(400).json({ message: 'Email and PIN are required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.matchPassword(pin))) {
      return res.status(401).json({ message: 'Invalid email or PIN' });
    }
    res.json({
      token: makeToken(user._id),
      user: { _id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', require('../middleware/authMiddleware').protect, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
