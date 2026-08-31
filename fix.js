const fs = require('fs');
const files = [
    'frontend/src/pages/admin/AdminExams.jsx',
    'frontend/src/pages/admin/CreateExam.jsx',
    'frontend/src/pages/admin/ExamResults.jsx',
    'frontend/src/pages/admin/ReviewQuestions.jsx',
    'frontend/src/pages/admin/UploadSyllabus.jsx',
    'frontend/src/pages/student/ExamSetup.jsx',
    'frontend/src/pages/student/JoinExam.jsx'
];
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace all <a href= with <Link to=
    content = content.replace(/<a href=/g, '<Link to=');
    
    // Replace all </a> with </Link>
    content = content.replace(/<\/a>/g, '</Link>');
    
    if (content.includes('<Link')) {
        if (content.includes('react-router-dom') && !content.includes('Link,')) {
            // Add Link to existing react-router-dom import
            content = content.replace(/import \{ (.*?)\} from 'react-router-dom';/, "import { Link, $1} from 'react-router-dom';");
        } else if (!content.includes('react-router-dom')) {
            content = "import { Link } from 'react-router-dom';\n" + content;
        }
    }
    fs.writeFileSync(file, content, 'utf8');
});
console.log('Fixed');
