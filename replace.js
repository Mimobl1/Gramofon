const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');
html = html.replace(
  '<label>\n                Boja (Hex)',
  '<div class="edit-modal-field">\n                Boja (Hex)'
);
html = html.replace(
  '                </div>\n            </label>\n            <div class="edit-modal-actions"',
  '                </div>\n            </div>\n            <div class="edit-modal-actions"'
);
fs.writeFileSync('public/archive.html', html);
