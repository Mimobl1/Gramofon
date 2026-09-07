const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

html = html.replace(
    '                overrides[folderKey].year = newYear;\n                overrides[folderKey].color = newColor;',
    '                overrides[folderKey].year = newYear;\n                overrides[folderKey].color = newColor;\n                overrides[folderKey].customCover = item.customCover || "";'
);

fs.writeFileSync('public/archive.html', html);
