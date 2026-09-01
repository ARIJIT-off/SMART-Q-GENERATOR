const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, default: 'pending' },
  role: { type: String, enum: ['admin', 'student'], default: 'student' },
  otp: { type: String },
  otpExpires: { type: Date }
}, { timestamps: true });

// Hash the 4-digit PIN before saving (only when it's a plain number)
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  if (!this.passwordHash || this.passwordHash === 'pending') return next();
  if (this.passwordHash.startsWith('$2a$') || this.passwordHash.startsWith('$2b$')) return next();
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

userSchema.methods.matchPassword = async function (entered) {
  if (!this.passwordHash || this.passwordHash === 'pending') return false;
  return bcrypt.compare(entered, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
