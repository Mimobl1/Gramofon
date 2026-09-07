const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

const injection = `
            const texture = new THREE.CanvasTexture(canvas);
            
            if (item.customCover) {
                const img = new Image();
                img.onload = () => {
                    ctx.clearRect(0, 0, size, size);
                    ctx.drawImage(img, 0, 0, size, size);
                    texture.needsUpdate = true;
                };
                img.src = item.customCover;
            }
            
            texture.needsUpdate = true;
`;

html = html.replace(
    '            const texture = new THREE.CanvasTexture(canvas);\n            texture.needsUpdate = true;',
    injection
);

fs.writeFileSync('public/archive.html', html);
