# 🎓 SMART Q-GEN — AI-Powered Proctored Exam Platform

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

**SMART Q-GEN** is a full-stack proctored exam platform. Upload a syllabus PDF → Gemini AI generates MCQs → create timed exams → students take them under camera + fullscreen proctoring → rich analytics for both admin and students.

---

## 🏗 Architecture

```
frontend/    → React 18 + Vite + TailwindCSS  → Vercel (Project 1)
backend/     → Node.js Express serverless      → Vercel (Project 2)
             → MongoDB Atlas (cloud DB)
             → Google Gemini API (free MCQ generation)
             → Gmail SMTP (email notifications)
```

---

## ⚡ Quick Deploy to Vercel

### Step 1 — Get a Free Gemini API Key
1. Go to **https://aistudio.google.com/app/apikey**
2. Click "Create API Key" — it's **100% free**, no credit card needed
3. Copy the key (looks like `AIza...`)

### Step 2 — Deploy the Backend to Vercel

1. Go to **https://vercel.com/new**
2. Import your GitHub repo: `ARIJIT-off/SMART-Q-GENERATOR`
3. Set **Root Directory** → `backend`
4. Add these **Environment Variables**:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `MONGO_URI` | `mongodb+srv://apalprojects02_db_user:DsIUKp5DDR4bMY5h@smartqgen.2x8hul9.mongodb.net/smartqgen?retryWrites=true&w=majority` |
| `JWT_SECRET` | `smartqgen_super_secret_jwt_key_2024_v2` |
| `JWT_REFRESH_SECRET` | `smartqgen_refresh_secret_2024_v2` |
| `GMAIL_USER` | `arijitp203@gmail.com` |
| `GMAIL_APP_PASSWORD` | `txcbkeoktuazvity` |
| `GEMINI_API_KEY` | *(your key from Step 1)* |
| `FRONTEND_URL` | *(paste frontend URL after Step 3)* |

5. Click **Deploy** → note your backend URL (e.g. `https://smart-qgen-backend.vercel.app`)

### Step 3 — Deploy the Frontend to Vercel

1. Go to **https://vercel.com/new** again
2. Import the SAME repo: `ARIJIT-off/SMART-Q-GENERATOR`
3. Set **Root Directory** → `frontend`
4. Add Environment Variable:

| Variable | Value |
|---|---|
| `VITE_API_URL` | *(your backend URL from Step 2)* |

5. Click **Deploy** → your app is live! 🎉

### Step 4 — Update CORS/email URL
- Go back to your **backend** Vercel project
- Update `FRONTEND_URL` to your frontend Vercel URL
- Redeploy backend

---

## 💻 Local Development

### Prerequisites
- Node.js 18+
- MongoDB (local) OR use the Atlas URI directly

### Run locally
```powershell
# Terminal 1 — Backend
cd backend
cp .env.example .env   # add your GEMINI_API_KEY
npm install
npm run dev            # http://localhost:5000

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev            # http://localhost:5173
```

---

## ✨ Features

| Feature | Details |
|---|---|
| 🧠 MCQ Generation | Google Gemini API (free) generates questions from any PDF |
| 🔐 Auth | Email + JWT, Admin / Student roles |
| 📋 Exam Creation | Select questions, set duration, marks, negative marking |
| 🔗 Exam Sharing | QR code + link + Gmail email to students |
| 🖥️ Proctoring | Fullscreen lock, camera PiP, tab-switch auto-submit |
| 📊 Analytics | Per-question timing, topic radar, accuracy charts |
| 📥 PDF Download | Answer script with your mistakes vs correct answers |
| ✉️ Email Notifications | Welcome, exam invitation, result emails via Gmail |

---

## 🔑 Environment Variables Reference

### Backend (`backend/.env`)
```env
MONGO_URI=mongodb+srv://...
JWT_SECRET=...
GMAIL_USER=arijitp203@gmail.com
GMAIL_APP_PASSWORD=txcbkeoktuazvity
GEMINI_API_KEY=AIza...   ← Get free from aistudio.google.com
FRONTEND_URL=https://your-frontend.vercel.app
```

### Frontend (`frontend/.env.production`)
```env
VITE_API_URL=https://your-backend.vercel.app
```
