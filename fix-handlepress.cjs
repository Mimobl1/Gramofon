const fs = require('fs');
let html = fs.readFileSync('public/vinyl-player.html', 'utf-8');

html = html.replace('function handlePress(btn,type,opts={}){', 'async function handlePress(btn,type,opts={}){');

fs.writeFileSync('public/vinyl-player.html', html);
