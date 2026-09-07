const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

html = html.replace('<div class="archive-title">Album Archive</div>', '<div class="archive-title">Vinyl Collection</div>');
html = html.replace(/document\.querySelector\('\.archive-title'\)\.innerText = "Loaded " \+ [^;]+;/g, '');
html = html.replace(/document\.querySelector\('\.archive-title'\)\.innerText = "ERROR: [^;]+;/g, '');

fs.writeFileSync('public/archive.html', html);
