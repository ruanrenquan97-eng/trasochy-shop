const fs = require('fs');
const path = require('path');
const uploadsDir = path.join(process.cwd(), 'uploads/skin');

const files = fs.readdirSync(uploadsDir)
  .filter(f => f.match(/\.(jpg|jpeg|png)$/i))
  .map(f => {
    const stat = fs.statSync(path.join(uploadsDir, f));
    return { name: f, time: stat.mtimeMs, size: stat.size };
  })
  .sort((a, b) => b.time - a.time);

console.log('Recent 5 uploaded images:');
files.slice(0, 5).forEach(f => console.log(`${f.name} (${f.size} bytes)`));
