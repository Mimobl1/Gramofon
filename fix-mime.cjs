const fs = require('fs');
let html = fs.readFileSync('public/vinyl-player.html', 'utf-8');

html = html.replace('const blob = new Blob([file.data], { type: file.type });', 'const blob = new Blob([file.data], { type: file.type || "audio/mpeg" });');
html = html.replace('const blob = new Blob([file.data], { type: file.type });', 'const blob = new Blob([file.data], { type: file.type || "audio/mpeg" });');

fs.writeFileSync('public/vinyl-player.html', html);

let archiveHtml = fs.readFileSync('public/archive.html', 'utf-8');
archiveHtml = archiveHtml.replace('fileData.push({ name: f.name, type: f.type, data: buffer });', 'fileData.push({ name: f.name, type: f.type || (f.name.toLowerCase().endsWith(".mp3") ? "audio/mpeg" : (f.name.toLowerCase().endsWith(".wav") ? "audio/wav" : "audio/mpeg")), data: buffer });');

fs.writeFileSync('public/archive.html', archiveHtml);
