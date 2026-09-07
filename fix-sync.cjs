const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

html = html.replace(
  '            const labelMesh = new THREE.Mesh(labelGeo, labelMat);',
  '            const labelMesh = new THREE.Mesh(labelGeo, labelMat);\n            labelMesh.name = "diskLabel";'
);

const newSync = `        const syncColorToPreview = () => {
            const newColor = editAlbumColor.value.trim();
            if (lastIndex >= 0 && lastIndex < collection.length && /^#[0-9A-Fa-f]{3,6}$/.test(newColor)) {
                collection[lastIndex].color = newColor;
                editAlbumColorSwatch.style.backgroundColor = newColor;
                if (groups[lastIndex]) {
                    const group = groups[lastIndex];
                    const cover = group.children.find(c => c.name === "cover");
                    if (cover) {
                        const edgeMat = new THREE.MeshStandardMaterial({ 
                             color: new THREE.Color(newColor), 
                             roughness: 0.5, 
                             metalness: 0.65,
                            transparent: true 
                         });
                        const texture = generateCoverTexture(collection[lastIndex], 1024);
                        const material = new THREE.MeshStandardMaterial({ 
                             map: texture, 
                             roughness: 0.5, 
                             metalness: 0.65,
                            transparent: true 
                         });
                        cover.material = [edgeMat, edgeMat, edgeMat, edgeMat, material, material];
                    }
                    const disk = group.children.find(c => c.name === "disk");
                    if (disk) {
                        const labelMesh = disk.children.find(c => c.name === "diskLabel");
                        if (labelMesh) {
                            const newLabelTexture = generateArchiveLabelTexture(collection[lastIndex], "A", 512);
                            labelMesh.material.map = newLabelTexture;
                            labelMesh.material.needsUpdate = true;
                        }
                    }
                }
            }
        };`;

html = html.replace(
    /        const syncColorToPreview = \(\) => \{[\s\S]*?        \};/,
    newSync
);

fs.writeFileSync('public/archive.html', html);
