const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

html = html.replace(
"const isEditModalActive = () => document.getElementById('editModalOverlay').classList.contains('active') || document.getElementById('rightColorPickerContainer').classList.contains('active');",
"const isEditModalActive = () => document.getElementById('editModalOverlay').classList.contains('active') || document.getElementById('rightColorPickerContainer').classList.contains('active') || (document.getElementById('reorderModalOverlay') && document.getElementById('reorderModalOverlay').classList.contains('active'));"
);

fs.writeFileSync('public/archive.html', html);
