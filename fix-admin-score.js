const fs = require('fs');
let adminRoute = fs.readFileSync('api/routes/admin.js', 'utf8');

const target = `    submission.answers[ansIndex].teacherScore = Number(newScore);
    await submission.save();`;

const replacement = `    submission.answers[ansIndex].teacherScore = Number(newScore);
    
    // Recalculate total score
    const exam = await Exam.findById(req.params.examId).populate('questions');
    let newTotalScore = 0;
    
    submission.answers.forEach(a => {
      const q = exam.questions.find(q => q._id.toString() === a.questionId.toString());
      if (!q) return;
      if (q.type === 'MCQ' || !q.type) {
        if (a.selectedIndex !== -1 && a.selectedIndex === q.answerIndex) {
          newTotalScore += (q.marks || exam.marksPerQuestion);
        } else if (a.selectedIndex !== -1) {
          newTotalScore -= (exam.negativeMarking || 0);
        }
      } else {
        newTotalScore += (a.teacherScore !== undefined ? a.teacherScore : (a.aiScore || 0));
      }
    });
    
    submission.score = Math.max(0, parseFloat(newTotalScore.toFixed(2)));
    await submission.save();`;

adminRoute = adminRoute.replace(target, replacement);
fs.writeFileSync('api/routes/admin.js', adminRoute);
console.log('Fixed score recalculation');
