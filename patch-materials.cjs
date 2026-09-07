const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

html = html.replace(
/const material = new THREE\.MeshStandardMaterial\(\{ \s*map: texture, \s*roughness: 0\.5, \s*metalness: 0\.65,\s*transparent: true \s*\}\);/g,
`const isCustom = item.customCover && item.useCustomCover !== false;
                const material = new THREE.MeshStandardMaterial({ 
                    map: texture, 
                    roughness: isCustom ? 0.2 : 0.5, 
                    metalness: isCustom ? 1.0 : 0.65,
                    transparent: true 
                });`
);

// wait, the third one in syncColorToPreview:
html = html.replace(
/const texture = generateCoverTexture\(collection\[lastIndex\], 1024\);\s*const material = new THREE\.MeshStandardMaterial\(\{\s*map: texture,\s*roughness: 0\.5,\s*metalness: 0\.65,\s*transparent: true\s*\}\);/g,
`const texture = generateCoverTexture(collection[lastIndex], 1024);
                        const isCustom = collection[lastIndex].customCover && collection[lastIndex].useCustomCover !== false;
                        const material = new THREE.MeshStandardMaterial({ 
                             map: texture, 
                             roughness: isCustom ? 0.2 : 0.5, 
                             metalness: isCustom ? 1.0 : 0.65,
                            transparent: true 
                         });`
);

fs.writeFileSync('public/archive.html', html);
