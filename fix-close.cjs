const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

html = html.replace(
  '        const closeEditModal = () => {\n            editModalOverlay.classList.remove("active");\n            filterCollection(); \n            rebuildMeshes();\n            lastIndex = -1;\n        };',
  '        const closeEditModal = () => {\n            editModalOverlay.classList.remove("active");\n            filterCollection();\n            lastIndex = -1;\n        };'
);

fs.writeFileSync('public/archive.html', html);
