const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

html = html.replace(
    'const labelMat = new THREE.MeshStandardMaterial({ map: labelTexture, roughness: 0.5, metalness: 0.6 });',
    'const labelMat = new THREE.MeshStandardMaterial({ map: labelTexture, roughness: 0.25, metalness: 0.25 });'
);

fs.writeFileSync('public/archive.html', html);
