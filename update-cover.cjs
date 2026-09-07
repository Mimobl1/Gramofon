const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

html = html.replace(
    'ctx.drawImage(img, 0, 0, size, size);\\n                    texture.needsUpdate = true;',
    'ctx.filter = "saturate(1.25) brightness(0.85) contrast(1.1)";\\n                    ctx.drawImage(img, 0, 0, size, size);\\n                    ctx.filter = "none";\\n                    texture.needsUpdate = true;'
);

fs.writeFileSync('public/archive.html', html);
