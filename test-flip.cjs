const fs = require('fs');
let html = fs.readFileSync('public/vinyl-player.html', 'utf-8');
if (html.includes('ease-in') && html.includes('ease-out') && !html.includes('HOLD_MS')) {
    console.log("Looks good");
}
