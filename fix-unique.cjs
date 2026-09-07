const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

html = html.replace(
  '        function normalizeCollectionItem(item) {',
  '        function normalizeCollectionItem(item, idx) {'
);
html = html.replace(
  '                tracks: tracks\n            };',
  '                tracks: tracks,\n                _uid: item._uid || (item.folder ? item.folder : "uid_" + idx + "_" + Math.random().toString(36).substr(2, 9))\n            };'
);

// Now update applyCollectionData and autoSaveEdits to use _uid instead of folderKey
html = html.replace(
  '            originalCollection = normalized.map((item, idx) => {\n                const folderKey = item.folder || item.name;',
  '            originalCollection = normalized.map((item, idx) => {\n                const folderKey = item._uid;'
);
html = html.replace(
  '                const folderKey = item.folder || item.name;\n                \n                let overrides = {};',
  '                const folderKey = item._uid;\n                \n                let overrides = {};'
);
html = html.replace(
  '                const origItem = originalCollection.find(x => (x.folder || x.name) === folderKey);',
  '                const origItem = originalCollection.find(x => x._uid === folderKey);'
);

html = html.replace(
  '                    const folderKey = item.folder || item.name;',
  '                    const folderKey = item._uid;'
);
html = html.replace(
  '                    const origIndex = originalCollection.findIndex(x => (x.folder || x.name) === folderKey);',
  '                    const origIndex = originalCollection.findIndex(x => x._uid === folderKey);'
);

fs.writeFileSync('public/archive.html', html);
