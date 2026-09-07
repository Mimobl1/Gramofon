const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf8');

const collectionDec = html.indexOf('let collection = [];');
const newCollectionVars = `let originalCollection = [];
        let collection = [];
        let activeGenre = "ALL";`;
html = html.replace('let collection = [];', newCollectionVars);

const applyData = `function applyCollectionData(data) {
            const normalized = Array.isArray(data) ? data.map(normalizeCollectionItem).filter(Boolean) : [];
            originalCollection = normalized.map((item, idx) => ({
                ...item,
                color: uniqueAlbumColorByIndex(idx)
            }));
            filterCollection();
        }

        function filterCollection() {
            if (activeGenre === "ALL") {
                collection = [...originalCollection];
            } else {
                collection = originalCollection.filter(item => 
                    item.name.includes(activeGenre) || item.author.includes(activeGenre) || item.folder.toUpperCase().includes(activeGenre)
                );
            }
            totalMeshes = collection.length;
            maxScroll = Math.max(0, (totalMeshes - 1) * scrollSensitivity);
            openStates = new Array(totalMeshes).fill(false);
            targetScroll = Math.max(0, Math.min(maxScroll, targetScroll));
            currentScroll = Math.max(0, Math.min(maxScroll, currentScroll));
            
            if (scene) {
                rebuildMeshes();
            }
        }
        
        function rebuildMeshes() {
            groups.forEach(g => scene.remove(g));
            groups = [];
            
            const coverGeo = new THREE.BoxGeometry(6, 6, 0.12);
            coverGeo.translate(0, 4, 0);
            const sharedDiskNormalMap = generateVinylNormalMap(1024);

            for (let i = 0; i < totalMeshes; i++) {
                const group = new THREE.Group();
                const item = collection[i];
                const texture = generateCoverTexture(item, 1024);
                
                const material = new THREE.MeshStandardMaterial({ 
                    map: texture, 
                    roughness: 0.5, 
                    metalness: 0.65,
                    transparent: true 
                });
                const edgeMat = new THREE.MeshStandardMaterial({ 
                    color: new THREE.Color(item.color), 
                    roughness: 0.5, 
                    metalness: 0.65,
                    transparent: true 
                });
                
                const cover = new THREE.Mesh(coverGeo, [edgeMat, edgeMat, edgeMat, edgeMat, material, material]);
                cover.name = "cover";
                const disk = createVinylDisk(item, sharedDiskNormalMap);
                disk.position.set(0, 4, -0.05);
                
                group.add(disk);
                group.add(cover);
                group.userData = { 
                    index: i, 
                    openProgress: 0, 
                    openAmount: 0,   
                    hoverVal: 0,
                    tiltX: 0
                };
                scene.add(group);
                groups.push(group);
            }
            lastIndex = -1; // force update of UI
        }`;

html = html.replace(/function applyCollectionData\(data\) \{[\s\S]*?targetScroll\)\);\n            currentScroll = Math.max\(0, Math.min\(maxScroll, currentScroll\)\);\n        \}/, applyData);

const eventListeners = `
            // Upload button logic
            document.getElementById("uploadBtn")?.addEventListener("click", () => {
                alert("Upload functionality will be implemented soon!");
            });

            // Genre pills logic
            const genreBtns = document.querySelectorAll(".genre-pill");
            genreBtns.forEach(btn => {
                btn.addEventListener("click", (e) => {
                    const genre = e.target.getAttribute("data-genre");
                    if (!genre || genre === activeGenre) return;
                    
                    genreBtns.forEach(b => b.classList.remove("active"));
                    e.target.classList.add("active");
                    activeGenre = genre;
                    
                    filterCollection();
                });
            });
`;

html = html.replace('// Verify collection source before app init so archive is ready immediately.', eventListeners + '\n            // Verify collection source before app init so archive is ready immediately.');

fs.writeFileSync('public/archive.html', html);
