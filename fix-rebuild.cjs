const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

html = html.replace(
  '                    closeEditModal();\n                }\n            });',
  '                    closeEditModal();\n                    rebuildMeshes();\n                }\n            });'
);

fs.writeFileSync('public/archive.html', html);
