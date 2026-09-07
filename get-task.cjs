const fs = require('fs');
console.log(fs.readFileSync('public/archive.html', 'utf-8').indexOf('customConfirmOverlay'));
