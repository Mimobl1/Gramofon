const fs = require('fs');

// 1. Update archive.html
let archiveHtml = fs.readFileSync('public/archive.html', 'utf-8');

archiveHtml = archiveHtml.replace(
    /metalness: isCustom \? 0\.75 : 0\.65/g,
    'metalness: isCustom ? 0.5 : 0.65'
);

archiveHtml = archiveHtml.replace(
    /roughness: isCustom \? 0\.25 : 0\.5/g,
    'roughness: isCustom ? 0.4 : 0.5'
);

fs.writeFileSync('public/archive.html', archiveHtml);

// 2. Update vinyl-player.html
let playerHtml = fs.readFileSync('public/vinyl-player.html', 'utf-8');

playerHtml = playerHtml.replace(
    /mutedLabel = desaturateAndToneHex\(color, 0\.0, 0\.3\) \|\| color;/g,
    'mutedLabel = desaturateAndToneHex(color, 0.0, 0.1) || color;'
);

playerHtml = playerHtml.replace(
    /const d = 0\.3; \/\/ desaturate by 30%/g,
    'const d = 0.15; // desaturate by 15%'
);

playerHtml = playerHtml.replace(
    /const k = 0\.15; \/\/ darken by 15%/g,
    'const k = 0.05; // darken by 5%'
);

fs.writeFileSync('public/vinyl-player.html', playerHtml);
