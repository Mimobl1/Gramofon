const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');
html = html.replace('tracks: ca.tracks.map(t => t.name),', 'tracks: ca.tracks,');
html = html.replace('tracks: fileData.map(t => t.name),', 'tracks: fileData,'); // Note: I didn't replace this exact line because it was never there. Wait, I did `html = html.replace('tracks: fileData,', 'tracks: fileData.map(t => t.name),');` in fix-tracks.cjs. Did it match anything? Let's just fix the startup load.
fs.writeFileSync('public/archive.html', html);
