const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

html = html.replace(
  '            originalCollection = normalized.map((item, idx) => {',
  '            originalCollection = normalized.map((item, idx) => {\n                const folderOverrides = overrides[item.folder] || {};\n                if (folderOverrides.deleted) return null;'
);

html = html.replace(
  '                return {\n                    ...item,',
  '                return {\n                    ...item,'
);

// We need to add .filter(Boolean) to the end of originalCollection assignment.
const endOfMap = html.indexOf('            });\n            collection = [...originalCollection];');
if (endOfMap !== -1) {
    html = html.substring(0, endOfMap) + '            }).filter(Boolean);\n            collection = [...originalCollection];' + html.substring(endOfMap + 15);
}

fs.writeFileSync('public/archive.html', html);
