const fs = require('fs');
const content = fs.readFileSync('public/archive.html', 'utf8');
const lines = content.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('keydown')) {
    console.log(`${idx+1}: ${l.trim()}`);
  }
});
