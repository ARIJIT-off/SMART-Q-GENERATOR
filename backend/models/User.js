const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String }, // Optional now
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String }, // Hashed 4-digit PIN
  role: { type: String, enum: ['admin', 'student'], default: 'student' },
  otp: { type: String },
  otpExpires: { type: Date }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  if (!this.passwordHash || this.passwordHash === 'pending') return next();
  
  // Prevent double hashing if it's already a bcrypt hash
  if (this.passwordHash.startsWith('$2a$') || this.passwordHash.startsWith('$2b$')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

// Compare password
userSchema.methods.matchPassword = async function(enteredPassword) {
  if (!this.passwordHash || this.passwordHash === 'pending') return false;
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
