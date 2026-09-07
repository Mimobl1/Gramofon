const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

html = html.replace(/createRecordMeshes\(\)/g, 'rebuildMeshes()');

fs.writeFileSync('public/archive.html', html);
