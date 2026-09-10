const fs = require('fs');
const content = fs.readFileSync('public/vinyl-player.html', 'utf8');
const lines = content.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('THREE') || l.includes('canvas')) {
    console.log(`${idx+1}: ${l.trim()}`);
  }
});
