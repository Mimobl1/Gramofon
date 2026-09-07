const fs = require('fs');
let html = fs.readFileSync('public/vinyl-player.html', 'utf-8');

html = html.replace('await setDeckSourceByIndex(currentTrackIndex);\n    };', '};');

fs.writeFileSync('public/vinyl-player.html', html);
