const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

// I duplicated folderOverrides variable.
html = html.replace(
  '                const folderOverrides = overrides[item.folder] || {};\n                if (folderOverrides.deleted) return null;\n                const folderKey = item.folder;\n                const folderOverrides = overrides[folderKey] || {};',
  '                const folderKey = item.folder;\n                const folderOverrides = overrides[folderKey] || {};\n                if (folderOverrides.deleted) return null;'
);

html = html.replace(
  '                };\n            });\n            filterCollection();',
  '                };\n            }).filter(Boolean);\n            filterCollection();'
);

fs.writeFileSync('public/archive.html', html);
