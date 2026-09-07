const fs = require('fs');
let html = fs.readFileSync('public/vinyl-player.html', 'utf-8');

html = html.replace('async function applySelectedAlbumAndStart(selected){', 'async function applySelectedAlbumAndStart(selected){\nconsole.log("applySelectedAlbumAndStart START", selected);');
html = html.replace('await runDropInAnimation();', 'console.log("Before runDropInAnimation"); await runDropInAnimation(); console.log("After runDropInAnimation");');

fs.writeFileSync('public/vinyl-player.html', html);
