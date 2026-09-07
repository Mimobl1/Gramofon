const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

html = html.replace('<button class="genre-pill" data-genre="SOUL">SOUL</button>', '');

fs.writeFileSync('public/archive.html', html);
