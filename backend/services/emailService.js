/**
 * Email Service — Gmail SMTP via Nodemailer
 * Used for: OTPs, welcome emails, exam link sharing, result notifications
 */
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

const BASE_URL = process.env.FRONTEND_URL || 
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173'));
const APP_NAME = 'SMART Q-GEN';

// ─── Templates ────────────────────────────────────────────────────

function otpTemplate(otp) {
  return `
<!DOCTYPE html>
<html>
<body style="font-family:Inter,Arial,sans-serif;background:#f8fafc;margin:0;padding:20px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:28px;">🔐 ${APP_NAME}</h1>
    </div>
    <div style="padding:40px 32px;text-align:center;">
      <h2 style="color:#1e293b;margin:0 0 16px;">Your Verification Code</h2>
      <p style="color:#64748b;margin-bottom:32px;">Use the 4-digit code below to verify your email and set your password.</p>
      <div style="background:#f1f5f9;border-radius:12px;padding:24px;font-size:48px;letter-spacing:12px;font-weight:900;color:#4f46e5;margin-bottom:24px;">
        ${otp}
      </div>
      <p style="color:#94a3b8;font-size:14px;">This code expires in 10 minutes. Do not share it with anyone.</p>
    </div>
  </div>
</body>
</html>`;
}

function welcomeTemplate(name, role) {
  return `
<!DOCTYPE html>
<html>
<body style="font-family:Inter,Arial,sans-serif;background:#f8fafc;margin:0;padding:20px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:28px;">🎓 ${APP_NAME}</h1>
      <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;">AI-Powered Exam Platform</p>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#1e293b;margin:0 0 8px;">Welcome, ${name}! 🎉</h2>
      <p style="color:#64748b;line-height:1.6;">
        Your <b>${role === 'admin' ? 'Teacher/Admin' : 'Student'}</b> account has been created successfully.
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${BASE_URL}" style="background:#4f46e5;color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:600;display:inline-block;">
          Open Dashboard →
        </a>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function examLinkTemplate(adminName, examTitle, examLink, duration, numQuestions) {
  return `
<!DOCTYPE html>
<html>
<body style="font-family:Inter,Arial,sans-serif;background:#f8fafc;margin:0;padding:20px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#0891b2,#4f46e5);padding:32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;">📋 Exam Invitation</h1>
      <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;">${APP_NAME}</p>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#1e293b;margin:0 0 4px;">${examTitle}</h2>
      <p style="color:#64748b;margin:0 0 24px;">Shared by <b>${adminName}</b></p>
      <div style="background:#f1f5f9;border-radius:12px;padding:16px;margin-bottom:24px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="color:#64748b;font-size:14px;">📝 Questions</span>
          <span style="color:#1e293b;font-weight:600;font-size:14px;">${numQuestions}</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span style="color:#64748b;font-size:14px;">⏱ Duration</span>
          <span style="color:#1e293b;font-weight:600;font-size:14px;">${duration} minutes</span>
        </div>
      </div>
      <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:12px;padding:12px;margin-bottom:24px;font-size:13px;color:#856404;">
        ⚠️ This is a proctored exam. Keep camera ON and stay in fullscreen. Switching tabs auto-submits the exam.
      </div>
      <div style="text-align:center;margin:24px 0;">
        <a href="${examLink}" style="background:#4f46e5;color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:600;display:inline-block;font-size:16px;">
          Start Exam →
        </a>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function resultTemplate(studentName, examTitle, score, correct, wrong, total) {
  const percent = total ? Math.round((correct / total) * 100) : 0;
  return `
<!DOCTYPE html>
<html>
<body style="font-family:Inter,Arial,sans-serif;background:#f8fafc;margin:0;padding:20px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#10b981,#0891b2);padding:32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;">📊 Exam Results</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#1e293b;margin:0 0 4px;">Hi ${studentName}!</h2>
      <p style="color:#64748b;margin:0 0 24px;">Results for: <b>${examTitle}</b></p>
      <div style="background:#f1f5f9;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
        <p style="font-size:48px;font-weight:700;color:#4f46e5;margin:0;">${score}</p>
        <p style="color:#64748b;margin:4px 0 0;font-size:14px;">out of ${total}</p>
      </div>
      <div style="text-align:center;">
        <a href="${BASE_URL}/student" style="background:#4f46e5;color:#fff;text-decoration:none;padding:12px 28px;border-radius:12px;font-weight:600;display:inline-block;">
          View Full Report →
        </a>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ─── Send Functions ────────────────────────────────────────────────

async function sendOtpEmail(to, otp) {
  try {
    await transporter.sendMail({
      from: `"${APP_NAME}" <${process.env.GMAIL_USER}>`,
      to,
      subject: `${otp} is your verification code`,
      html: otpTemplate(otp)
    });
    console.log(`✅ OTP sent to ${to}`);
  } catch (err) {
    console.error('❌ OTP email failed:', err.message);
    throw err; // Crucial: Throw error so frontend knows it failed
  }
}

async function sendWelcomeEmail(to, name, role) {
  try {
    await transporter.sendMail({
      from: `"${APP_NAME}" <${process.env.GMAIL_USER}>`,
      to,
      subject: `Welcome to ${APP_NAME} 🎓`,
      html: welcomeTemplate(name, role)
    });
  } catch (err) { console.error('❌ Welcome email failed:', err.message); }
}

async function sendExamLinkEmail(to, adminName, examTitle, examLink, duration, numQuestions) {
  try {
    await transporter.sendMail({
      from: `"${APP_NAME}" <${process.env.GMAIL_USER}>`,
      to,
      subject: `📋 Exam Invitation: ${examTitle}`,
      html: examLinkTemplate(adminName, examTitle, examLink, duration, numQuestions)
    });
    return true;
  } catch (err) { throw err; }
}

async function sendResultEmail(to, studentName, examTitle, score, correct, wrong, total) {
  try {
    await transporter.sendMail({
      from: `"${APP_NAME}" <${process.env.GMAIL_USER}>`,
      to,
      subject: `📊 Your ${examTitle} Results are Ready!`,
      html: resultTemplate(studentName, examTitle, score, correct, wrong, total)
    });
  } catch (err) { console.error('❌ Result email failed:', err.message); }
}

module.exports = { sendOtpEmail, sendWelcomeEmail, sendExamLinkEmail, sendResultEmail };
