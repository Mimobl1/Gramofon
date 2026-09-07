const fs = require('fs');
let html = fs.readFileSync('public/vinyl-player.html', 'utf-8');

html = html.replace('rot += speed * 1.365;', 'rot += speed * 2.05;');

fs.writeFileSync('public/vinyl-player.html', html);
