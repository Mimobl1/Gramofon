const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

html = html.replace('tracks: ca.tracks,', 'tracks: ca.tracks.map(t => t.name),');
html = html.replace('tracks: fileData,', 'tracks: fileData.map(t => t.name),');

fs.writeFileSync('public/archive.html', html);
