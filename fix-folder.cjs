const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

html = html.replace(
  '                const folderKey = item.folder;\n                const folderOverrides = overrides[folderKey] || {};',
  '                const folderKey = item.folder || item.name;\n                const folderOverrides = overrides[folderKey] || {};'
);
html = html.replace(
  '                const folderKey = item.folder;\n                \n                let overrides = {};',
  '                const folderKey = item.folder || item.name;\n                \n                let overrides = {};'
);
html = html.replace(
  '                const origItem = originalCollection.find(x => x.folder === folderKey);',
  '                const origItem = originalCollection.find(x => (x.folder || x.name) === folderKey);'
);

fs.writeFileSync('public/archive.html', html);
