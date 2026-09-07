const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');
// check what lastIndex is at the time of deleteAlbumBtn
html = html.replace('const targetIdx = lastIndex === -1 ? 0 : lastIndex;', 'const targetIdx = lastIndex === -1 ? 0 : lastIndex; console.log("targetIdx", targetIdx);');
fs.writeFileSync('public/archive.html', html);
