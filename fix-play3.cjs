const fs = require('fs');
let html = fs.readFileSync('public/vinyl-player.html', 'utf-8');

html = html.replace('if (album && album.files) {', 'if (album && album.files) { console.log("Found album in DB:", albumId);');

fs.writeFileSync('public/vinyl-player.html', html);
