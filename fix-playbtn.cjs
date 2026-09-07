const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

html = html.replace("const currentIdx = Math.round(currentScroll / scrollSensitivity);", "const currentIdx = interactiveIndex !== -1 ? interactiveIndex : Math.round(currentScroll / scrollSensitivity);");

fs.writeFileSync('public/archive.html', html);
