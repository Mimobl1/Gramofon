const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

html = html.replace(
    '                    year: folderOverrides.year || item.year || ""',
    '                    year: folderOverrides.year || item.year || "",\n                    customCover: folderOverrides.customCover || item.customCover || ""'
);

fs.writeFileSync('public/archive.html', html);
