/**
 * Email Service — Gmail SMTP via Nodemailer
 * Used for: welcome emails, exam link sharing, result notifications
 */
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const APP_NAME = 'SMART Q-GEN';

// ─── Templates ────────────────────────────────────────────────────

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
      ${role === 'admin' ? `
      <p style="color:#64748b;line-height:1.6;">You can now:</p>
      <ul style="color:#64748b;line-height:1.8;">
        <li>Upload syllabus PDFs and auto-generate MCQs</li>
        <li>Create timed exams with QR codes</li>
        <li>Monitor students with real-time proctoring</li>
        <li>View detailed analytics for every student</li>
      </ul>
      ` : `
      <p style="color:#64748b;line-height:1.6;">You can now join exams using a link or QR code shared by your teacher.</p>
      `}
      <div style="text-align:center;margin:24px 0;">
        <a href="${BASE_URL}" style="background:#4f46e5;color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:600;display:inline-block;">
          Open Dashboard →
        </a>
      </div>
    </div>
    <div style="background:#f8fafc;padding:16px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">© 2024 ${APP_NAME} | Powered by Google Gemini AI</p>
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
      <p style="color:#94a3b8;font-size:12px;text-align:center;">Or copy this link:<br/>
        <a href="${examLink}" style="color:#4f46e5;">${examLink}</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

function resultTemplate(studentName, examTitle, score, correct, wrong, total) {
  const percent = total ? Math.round((correct / total) * 100) : 0;
  const grade = percent >= 80 ? '🏆 Excellent' : percent >= 60 ? '👍 Good' : percent >= 40 ? '📚 Average' : '💪 Keep Practicing';
  return `
<!DOCTYPE html>
<html>
<body style="font-family:Inter,Arial,sans-serif;background:#f8fafc;margin:0;padding:20px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#10b981,#0891b2);padding:32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;">📊 Exam Results</h1>
      <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;">${grade}</p>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#1e293b;margin:0 0 4px;">Hi ${studentName}!</h2>
      <p style="color:#64748b;margin:0 0 24px;">Results for: <b>${examTitle}</b></p>
      <div style="background:#f1f5f9;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
        <p style="font-size:48px;font-weight:700;color:#4f46e5;margin:0;">${score}</p>
        <p style="color:#64748b;margin:4px 0 0;font-size:14px;">out of ${total}</p>
        <div style="margin-top:16px;display:flex;justify-content:space-around;">
          <div><p style="color:#10b981;font-size:24px;font-weight:700;margin:0;">${correct}</p><p style="color:#64748b;font-size:12px;margin:4px 0 0;">Correct</p></div>
          <div><p style="color:#ef4444;font-size:24px;font-weight:700;margin:0;">${wrong}</p><p style="color:#64748b;font-size:12px;margin:4px 0 0;">Wrong</p></div>
          <div><p style="color:#6366f1;font-size:24px;font-weight:700;margin:0;">${percent}%</p><p style="color:#64748b;font-size:12px;margin:4px 0 0;">Accuracy</p></div>
        </div>
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

async function sendWelcomeEmail(to, name, role) {
  try {
    await transporter.sendMail({
      from: `"${APP_NAME}" <${process.env.GMAIL_USER}>`,
      to,
      subject: `Welcome to ${APP_NAME} 🎓`,
      html: welcomeTemplate(name, role)
    });
    console.log(`✅ Welcome email sent to ${to}`);
  } catch (err) {
    console.error('❌ Welcome email failed:', err.message);
    // Don't throw — email failure shouldn't block registration
  }
}

async function sendExamLinkEmail(to, adminName, examTitle, examLink, duration, numQuestions) {
  try {
    await transporter.sendMail({
      from: `"${APP_NAME}" <${process.env.GMAIL_USER}>`,
      to,
      subject: `📋 Exam Invitation: ${examTitle}`,
      html: examLinkTemplate(adminName, examTitle, examLink, duration, numQuestions)
    });
    console.log(`✅ Exam link sent to ${to}`);
    return true;
  } catch (err) {
    console.error('❌ Exam link email failed:', err.message);
    throw err;
  }
}

async function sendResultEmail(to, studentName, examTitle, score, correct, wrong, total) {
  try {
    await transporter.sendMail({
      from: `"${APP_NAME}" <${process.env.GMAIL_USER}>`,
      to,
      subject: `📊 Your ${examTitle} Results are Ready!`,
      html: resultTemplate(studentName, examTitle, score, correct, wrong, total)
    });
    console.log(`✅ Result email sent to ${to}`);
  } catch (err) {
    console.error('❌ Result email failed:', err.message);
  }
}

module.exports = { sendWelcomeEmail, sendExamLinkEmail, sendResultEmail };
