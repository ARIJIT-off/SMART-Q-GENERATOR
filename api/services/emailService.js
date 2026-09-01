/**
 * Email Service — Nodemailer + Gmail SMTP
 * Anti-spam best practices: unique Message-ID, plain-text fallback, no emojis in subject.
 */
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');

const APP_NAME = 'SMART Q-GEN';

function createTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
}

function buildMail(to, subject, html, text) {
  return {
    from: `"${APP_NAME}" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    text,
    html,
    messageId: `<${uuidv4()}@smartqgen.app>`,
    headers: {
      'X-Priority': '1',
      'X-MSMail-Priority': 'High',
      'Importance': 'high'
    }
  };
}

// ─── Templates ─────────────────────────────────────────────────────────

function otpTemplate(otp) {
  return `<!DOCTYPE html>
<html>
<body style="font-family:Inter,Arial,sans-serif;background:#0f172a;margin:0;padding:24px;">
  <div style="max-width:520px;margin:0 auto;background:#1e293b;border-radius:20px;overflow:hidden;border:1px solid #334155;">
    <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:26px;font-weight:800;letter-spacing:-0.5px;">SMART Q-GEN</h1>
      <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:14px;">AI-Powered Exam Platform</p>
    </div>
    <div style="padding:40px 32px;text-align:center;">
      <h2 style="color:#f1f5f9;margin:0 0 10px;font-size:20px;">Your Verification Code</h2>
      <p style="color:#94a3b8;margin-bottom:28px;font-size:14px;">Enter this code to verify your email and set your PIN.</p>
      <div style="background:#0f172a;border:2px solid #4f46e5;border-radius:16px;padding:28px;font-size:56px;letter-spacing:16px;font-weight:900;color:#818cf8;margin-bottom:24px;font-family:monospace;">
        ${otp}
      </div>
      <p style="color:#64748b;font-size:13px;margin:0;">This code expires in <b style="color:#f59e0b;">10 minutes</b>. Do not share it with anyone.</p>
    </div>
    <div style="border-top:1px solid #334155;padding:20px 32px;text-align:center;">
      <p style="color:#475569;font-size:12px;margin:0;">If you didn't request this, please ignore this email.</p>
    </div>
  </div>
</body>
</html>`;
}

function welcomeTemplate(name, role) {
  const roleLabel = role === 'admin' ? 'Teacher / Admin' : 'Student';
  return `<!DOCTYPE html>
<html>
<body style="font-family:Inter,Arial,sans-serif;background:#0f172a;margin:0;padding:24px;">
  <div style="max-width:520px;margin:0 auto;background:#1e293b;border-radius:20px;overflow:hidden;border:1px solid #334155;">
    <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:26px;font-weight:800;">SMART Q-GEN</h1>
      <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:14px;">Account Created Successfully</p>
    </div>
    <div style="padding:36px 32px;">
      <h2 style="color:#f1f5f9;margin:0 0 12px;">Welcome, ${name}!</h2>
      <p style="color:#94a3b8;line-height:1.7;">Your <b style="color:#818cf8;">${roleLabel}</b> account on SMART Q-GEN is now active. You can log in using your email and 4-digit PIN.</p>
      <div style="background:#0f172a;border-radius:12px;padding:16px 20px;margin:24px 0;border-left:4px solid #4f46e5;">
        <p style="color:#94a3b8;margin:0;font-size:14px;"><b style="color:#f1f5f9;">Role:</b> ${roleLabel}</p>
        <p style="color:#94a3b8;margin:6px 0 0;font-size:14px;"><b style="color:#f1f5f9;">Email:</b> Already verified</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function examInviteTemplate(adminName, examTitle, examLink, duration, numQuestions) {
  return `<!DOCTYPE html>
<html>
<body style="font-family:Inter,Arial,sans-serif;background:#0f172a;margin:0;padding:24px;">
  <div style="max-width:520px;margin:0 auto;background:#1e293b;border-radius:20px;overflow:hidden;border:1px solid #334155;">
    <div style="background:linear-gradient(135deg,#0891b2,#4f46e5);padding:32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800;">Exam Invitation</h1>
      <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:14px;">SMART Q-GEN</p>
    </div>
    <div style="padding:36px 32px;">
      <h2 style="color:#f1f5f9;margin:0 0 4px;font-size:20px;">${examTitle}</h2>
      <p style="color:#94a3b8;margin:0 0 24px;font-size:14px;">Shared by <b style="color:#818cf8;">${adminName}</b></p>
      <div style="background:#0f172a;border-radius:12px;padding:20px;margin-bottom:20px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
          <span style="color:#64748b;font-size:14px;">Total Questions</span>
          <span style="color:#f1f5f9;font-weight:700;">${numQuestions}</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span style="color:#64748b;font-size:14px;">Duration</span>
          <span style="color:#f1f5f9;font-weight:700;">${duration} minutes</span>
        </div>
      </div>
      <div style="background:#1a1a2e;border:1px solid #f59e0b;border-radius:12px;padding:14px 16px;margin-bottom:24px;">
        <p style="color:#fbbf24;font-size:13px;margin:0;font-weight:600;">PROCTORED EXAM</p>
        <p style="color:#d97706;font-size:12px;margin:6px 0 0;">Camera must stay ON. Fullscreen required. Switching tabs will auto-submit your exam.</p>
      </div>
      <div style="text-align:center;">
        <a href="${examLink}" style="background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;text-decoration:none;padding:14px 36px;border-radius:12px;font-weight:700;display:inline-block;font-size:16px;">
          Start Exam Now
        </a>
      </div>
      <p style="color:#475569;font-size:12px;margin:20px 0 0;text-align:center;">Or copy this link: <a href="${examLink}" style="color:#818cf8;">${examLink}</a></p>
    </div>
  </div>
</body>
</html>`;
}

function resultTemplate(studentName, examTitle, score, maxScore, correct, wrong, total) {
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const color = pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444';
  return `<!DOCTYPE html>
<html>
<body style="font-family:Inter,Arial,sans-serif;background:#0f172a;margin:0;padding:24px;">
  <div style="max-width:520px;margin:0 auto;background:#1e293b;border-radius:20px;overflow:hidden;border:1px solid #334155;">
    <div style="background:linear-gradient(135deg,#10b981,#0891b2);padding:32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800;">Exam Results</h1>
      <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:14px;">SMART Q-GEN</p>
    </div>
    <div style="padding:36px 32px;text-align:center;">
      <h2 style="color:#f1f5f9;margin:0 0 4px;">Hi ${studentName}!</h2>
      <p style="color:#94a3b8;margin:0 0 28px;">Results for: <b>${examTitle}</b></p>
      <div style="background:#0f172a;border-radius:16px;padding:28px;margin-bottom:24px;">
        <p style="font-size:64px;font-weight:900;color:${color};margin:0;line-height:1;">${score}</p>
        <p style="color:#64748b;margin:6px 0 0;font-size:14px;">out of ${maxScore} marks</p>
        <p style="color:${color};font-size:18px;font-weight:700;margin:8px 0 0;">${pct}%</p>
      </div>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:24px;">
        <div style="background:#052e16;border:1px solid #10b981;border-radius:10px;padding:12px 20px;text-align:center;min-width:80px;">
          <p style="color:#10b981;font-size:22px;font-weight:800;margin:0;">${correct}</p>
          <p style="color:#6b7280;font-size:12px;margin:4px 0 0;">Correct</p>
        </div>
        <div style="background:#450a0a;border:1px solid #ef4444;border-radius:10px;padding:12px 20px;text-align:center;min-width:80px;">
          <p style="color:#ef4444;font-size:22px;font-weight:800;margin:0;">${wrong}</p>
          <p style="color:#6b7280;font-size:12px;margin:4px 0 0;">Wrong</p>
        </div>
        <div style="background:#1e293b;border:1px solid #475569;border-radius:10px;padding:12px 20px;text-align:center;min-width:80px;">
          <p style="color:#94a3b8;font-size:22px;font-weight:800;margin:0;">${total - correct - wrong}</p>
          <p style="color:#6b7280;font-size:12px;margin:4px 0 0;">Skipped</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ─── Send Functions ─────────────────────────────────────────────────────

async function sendOtpEmail(to, otp) {
  const text = `Your SMART Q-GEN verification code is: ${otp}\nIt expires in 10 minutes. Do not share it.`;
  await createTransporter().sendMail(buildMail(to, `${otp} - SMART Q-GEN Verification Code`, otpTemplate(otp), text));
  console.log(`OTP sent to ${to}`);
}

async function sendWelcomeEmail(to, name, role) {
  try {
    const text = `Welcome to SMART Q-GEN, ${name}! Your ${role === 'admin' ? 'Teacher' : 'Student'} account is now active.`;
    await createTransporter().sendMail(buildMail(to, `Welcome to SMART Q-GEN`, welcomeTemplate(name, role), text));
  } catch (err) { console.error('Welcome email failed:', err.message); }
}

async function sendExamLinkEmail(to, adminName, examTitle, examLink, duration, numQuestions) {
  const text = `Exam Invitation: "${examTitle}" by ${adminName}.\nLink: ${examLink}\nDuration: ${duration} min | Questions: ${numQuestions}`;
  await createTransporter().sendMail(buildMail(to, `Exam Invitation: ${examTitle}`, examInviteTemplate(adminName, examTitle, examLink, duration, numQuestions), text));
}

async function sendResultEmail(to, studentName, examTitle, score, maxScore, correct, wrong, total) {
  try {
    const text = `Hi ${studentName}, your results for "${examTitle}": Score ${score}/${maxScore}, Correct: ${correct}, Wrong: ${wrong}.`;
    await createTransporter().sendMail(buildMail(to, `Your ${examTitle} Results`, resultTemplate(studentName, examTitle, score, maxScore, correct, wrong, total), text));
  } catch (err) { console.error('Result email failed:', err.message); }
}

module.exports = { sendOtpEmail, sendWelcomeEmail, sendExamLinkEmail, sendResultEmail };
