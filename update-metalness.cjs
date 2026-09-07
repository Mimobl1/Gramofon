const fs = require('fs');

let archiveHtml = fs.readFileSync('public/archive.html', 'utf-8');

archiveHtml = archiveHtml.replace(
    /metalness: isCustom \? 0\.5 : 0\.65/g,
    'metalness: isCustom ? 0.6 : 0.65'
);

fs.writeFileSync('public/archive.html', archiveHtml);
