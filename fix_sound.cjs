const fs = require('fs');
let html = fs.readFileSync('public/vinyl-player.html', 'utf8');

const target = 'async function runDropInAnimation() {';
const replacement = `async function runDropInAnimation() {
      try { sleeveSound.currentTime = 0; sleeveSound.play().catch(()=>{}); } catch (_) {}`;

html = html.replace(target, replacement);
fs.writeFileSync('public/vinyl-player.html', html);
