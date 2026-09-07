const fs = require('fs');
let html = fs.readFileSync('public/vinyl-player.html', 'utf-8');
const lines = html.split('\n');
const start = lines.findIndex(l => l.includes('async function flipVinyl()'));
const end = lines.findIndex((l, i) => i > start && l.includes('document.body.classList.remove(\'is-flipping\');') && lines[i+1].includes('await sleep(120);'));
console.log(html.split('\n').slice(start, end + 9).join('\n'));
