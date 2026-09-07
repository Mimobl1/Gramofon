const fs = require('fs');
let html = fs.readFileSync('public/vinyl-player.html', 'utf-8');

html = html.replace('cubic-bezier(0.32, 0, 0.67, 0)', 'ease-in');
html = html.replace('cubic-bezier(0.33, 1, 0.68, 1)', 'ease-out');

fs.writeFileSync('public/vinyl-player.html', html);
