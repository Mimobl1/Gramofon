const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

const checkFunc = `            // Desktop Mouse Events\n            const isEditModalActive = () => document.getElementById('editModalOverlay').classList.contains('active') || document.getElementById('rightColorPickerContainer').classList.contains('active');\n`;

html = html.replace('            // Desktop Mouse Events', checkFunc);

html = html.replace(
  "            window.addEventListener('wheel', (e) => {\n                if (launchIndex !== -1) return;",
  "            window.addEventListener('wheel', (e) => {\n                if (isEditModalActive() || launchIndex !== -1) return;"
);
html = html.replace(
  "            window.addEventListener('mousedown', (e) => {\n               if (e.target.closest('#play-button')) return;",
  "            window.addEventListener('mousedown', (e) => {\n               if (isEditModalActive()) return;\n               if (e.target.closest('#play-button')) return;"
);
html = html.replace(
  "            window.addEventListener('touchstart', (e) => {\n                touchStartY = e.touches[0].clientY;",
  "            window.addEventListener('touchstart', (e) => {\n                if (isEditModalActive()) return;\n                touchStartY = e.touches[0].clientY;"
);
html = html.replace(
  "            window.addEventListener('touchmove', (e) => {\n                if (launchIndex !== -1) return;",
  "            window.addEventListener('touchmove', (e) => {\n                if (isEditModalActive() || launchIndex !== -1) return;"
);
html = html.replace(
  "            window.addEventListener('touchend', (e) => {\n                if (!isTouchMove) {",
  "            window.addEventListener('touchend', (e) => {\n                if (isEditModalActive()) return;\n                if (!isTouchMove) {"
);

fs.writeFileSync('public/archive.html', html);
