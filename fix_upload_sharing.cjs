const fs = require('fs');
let html = fs.readFileSync('public/vinyl-player.html', 'utf8');

html = html.replace(/window\.parent\.__localUploadedFiles/g, 'window.__localUploadedFiles');
fs.writeFileSync('public/vinyl-player.html', html);

let archiveHtml = fs.readFileSync('public/archive.html', 'utf8');
archiveHtml = archiveHtml.replace(/window\.parent\.__localUploadedFiles/g, '(window.parent || window).__localUploadedFiles');
fs.writeFileSync('public/archive.html', archiveHtml);
