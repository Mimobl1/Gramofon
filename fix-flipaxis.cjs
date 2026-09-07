const fs = require('fs');
let html = fs.readFileSync('public/vinyl-player.html', 'utf-8');

html = html.replace('rotateY(var(--flip-rot,0deg))', 'rotateX(var(--flip-rot,0deg))');

fs.writeFileSync('public/vinyl-player.html', html);
