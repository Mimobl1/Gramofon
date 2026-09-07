const fs = require('fs');
let html = fs.readFileSync('public/vinyl-player.html', 'utf-8');

html = html.replace('rot += speed * 2.73;', 'rot += speed * 1.365;');

fs.writeFileSync('public/vinyl-player.html', html);
