# ⚡ SMART Q-GEN

**Live Application:** [https://smart-q-generator-v4sd.vercel.app](https://smart-q-generator-v4sd.vercel.app)

SMART Q-GEN is an AI-powered, proctored examination platform designed for seamless exam creation by teachers and secure test-taking by students. The platform generates MCQs directly from syllabus PDFs and enforces strict anti-cheat mechanisms during exams.

---

## 🏫 Teacher's Guide (Admin POV)

### 1. Sign Up & Authentication
* **Sign Up:** Go to the signup page, enter your Gmail address, and select **"Teacher"**. 
* **OTP Verification:** A 4-digit OTP will be sent to your email. Enter this to verify your identity.
* **Set PIN:** Create a secure 4-digit PIN. 
* **Login:** In the future, simply use your Email and this 4-digit PIN to securely log in.

### 2. Exam Creation & Management
* **Upload Syllabus:** On the dashboard, drag and drop your syllabus PDF. Specify the number of questions you want. The AI will parse the PDF and automatically generate a set of Multiple Choice Questions (MCQs).
* **Save to Bank:** Review the AI-generated questions and save them to your Question Bank.
* **Create Exam:** Go to the "Create Exam" tab. Give your exam a title, set the duration, marks per question, and negative marking. Select the questions you want to include from your bank and hit Create.

### 3. Share with Students
Once the exam is created, you can invite students in three ways:
* **Share Link:** Copy the unique exam URL and send it directly to your students.
* **Share QR Code:** Click "Show QR Code" and project/share it. Students can scan this with their devices to instantly join.
* **Email Invites:** Enter student email addresses in the dashboard to send them automated HTML invitation emails with the exam link.

---

## 🎓 Student's Guide (Student POV)

### 1. Authentication
* **Sign Up / Login:** Follow the same email + OTP + PIN process, but select **"Student"** during signup. 

### 2. Joining an Exam
* **Via Link:** Paste the exam link (or access code) provided by your teacher into the Join Exam input.
* **Via QR Code:** Click "Scan QR" to open your device's camera and scan the teacher's QR code to enter the exam instantly.

### 3. Exam Regulations & Proctoring
Before starting, you must accept the system permissions. SMART Q-GEN enforces strict proctoring:
* **Camera PIP:** Your camera will be active and visible as a Picture-in-Picture (PIP) during the entire exam.
* **Location Tracking:** Geographic location is logged with your submission.
* **Fullscreen Lock:** The exam requires Fullscreen mode. **If you exit fullscreen, you will be warned and eventually auto-submitted.**
* **Tab-Switching / Window Changes:** If you attempt to switch tabs, minimize the browser, or open another application, **the exam will instantly auto-submit** and flag your attempt as cheating.

---

## ✨ Key Features

* **No-Code AI Generation:** Teachers instantly turn PDF documents into structured MCQ assessments without manual typing.
* **Serverless Architecture:** Fast, lightweight Express API deployed on Vercel.
* **Passwordless-Style Auth:** Secure 4-digit PIN + Email OTP workflow backed by JWT tokens.
* **Anti-Cheat Engine:** 
  * Fullscreen enforcement
  * Visibility change detection (tab-switching)
  * Hardware camera PIP tracking
  * Right-click and keyboard shortcut blocking
* **Advanced Analytics:** Post-exam reports break down topic-by-topic understanding, time taken per question, and overall score percentage.
* **PDF Export:** Students can download their detailed answer scripts as PDFs for future study references.
