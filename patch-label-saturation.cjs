const fs = require('fs');
let html = fs.readFileSync('public/vinyl-player.html', 'utf-8');

html = html.replace(
    'const mutedLabel = desaturateAndToneHex(color, 0.58, isLightTheme ? 0.08 : 0.04) || color;',
    'const mutedLabel = desaturateAndToneHex(color, 0.0, isLightTheme ? 0.08 : 0.04) || color;'
);

fs.writeFileSync('public/vinyl-player.html', html);
