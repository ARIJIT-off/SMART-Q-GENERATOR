const fs = require('fs');
let h = fs.readFileSync('public/admin.html', 'utf8');

// Move pdfFile input outside of uploadZone div
h = h.replace(
  /<input type="file" id="pdfFile" accept="\.pdf" style="display:none">\s*<\/div>/,
  '</div>\n              <input type="file" id="pdfFile" accept=".pdf" style="display:none">'
);

// Move pyqFile input outside of pyqZone div
h = h.replace(
  /<input type="file" id="pyqFile" accept="\.pdf" style="display:none">\s*<\/div>/,
  '</div>\n              <input type="file" id="pyqFile" accept=".pdf" style="display:none">'
);

fs.writeFileSync('public/admin.html', h);
console.log('Fixed admin.html');

let js = fs.readFileSync('public/js/admin.js', 'utf8');
js = js.replace(
  /uploadZone\.addEventListener\('click', \(\) => pdfFile\.click\(\)\);/,
  `uploadZone.addEventListener('click', (e) => { if (e.target !== pdfFile) pdfFile.click(); });`
);
js = js.replace(
  /pyqZone\.addEventListener\('click', \(\) => pyqFile\.click\(\)\);/,
  `pyqZone.addEventListener('click', (e) => { if (e.target !== pyqFile) pyqFile.click(); });`
);
fs.writeFileSync('public/js/admin.js', js);
console.log('Fixed admin.js');
