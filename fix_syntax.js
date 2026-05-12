const fs = require('fs');
const path = 'client/src/pages/SkinAnalysisProReport.tsx';
let c = fs.readFileSync(path, 'utf8');
c = c.replace(/\\\${/g, '${');
fs.writeFileSync(path, c);
console.log('Fixed syntax errors');
