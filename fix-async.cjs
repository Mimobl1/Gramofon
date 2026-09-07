const fs = require('fs');
let html = fs.readFileSync('public/vinyl-player.html', 'utf-8');

html = html.replace('function applyAlbumFromQuery(selectedOverride = null) {', 'async function applyAlbumFromQuery(selectedOverride = null) {');
html = html.replace('applyAlbumFromQuery(selected);', 'await applyAlbumFromQuery(selected);'); // in applySelectedAlbumAndStart
html = html.replace('applyAlbumFromQuery();', 'applyAlbumFromQuery();'); // If there are any other calls... wait, let's check where applyAlbumFromQuery is called.

fs.writeFileSync('public/vinyl-player.html', html);
