const fs = require('fs');
const content = fs.readFileSync('public/vinyl-player.html', 'utf8');
const lines = content.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('WebGLRenderer') || l.includes('setPixelRatio')) {
    console.log(`${idx+1}: ${l.trim()}`);
  }
});
