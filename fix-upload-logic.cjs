const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

const targetJS = `const resetAlbumsBtn = document.getElementById('resetAlbumsBtn');
        if (resetAlbumsBtn) {
            resetAlbumsBtn.addEventListener('click', () => {
                if(confirm("Da li ste sigurni da želite da obrišete sve izmene i vratite albume na defaultno stanje?")) {
                    localStorage.removeItem('vinyl_album_overrides_v1');
                    location.reload();
                }
            });
        }`;

const newJS = `
        const dbPromise = new Promise((resolve, reject) => {
            const req = indexedDB.open("VinylCollectionDB", 1);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains("albums")) {
                    db.createObjectStore("albums", { keyPath: "id" });
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });

        // Load custom albums on startup
        dbPromise.then(db => {
            const tx = db.transaction("albums", "readonly");
            const store = tx.objectStore("albums");
            const req = store.getAll();
            req.onsuccess = () => {
                const customAlbums = req.result || [];
                if(customAlbums.length > 0) {
                    customAlbums.forEach(ca => {
                        const newItem = {
                            name: ca.name,
                            author: ca.author,
                            color: ca.color,
                            folder: ca.folder,
                            cover: ca.customCover || "",
                            tracks: ca.tracks,
                            customCover: ca.customCover || "",
                            useCustomCover: !!ca.customCover,
                            _uid: ca.folder
                        };
                        collection.unshift(newItem);
                        originalCollection.unshift(newItem);
                    });
                    groups.forEach(g => { if(g) scene.remove(g); });
                    groups = [];
                    createRecordMeshes();
                    filterCollection();
                }
            };
        });

        const deleteAlbumBtn = document.getElementById('deleteAlbumBtn');
        if (deleteAlbumBtn) {
            deleteAlbumBtn.addEventListener('click', () => {
                if (lastIndex >= 0 && lastIndex < collection.length) {
                    const item = collection[lastIndex];
                    if(confirm("Da li ste sigurni da želite da obrišete ovaj album?")) {
                        const folderKey = item._uid;
                        
                        // Remove from IndexedDB if it's a local upload
                        if (folderKey.startsWith("LOCAL://")) {
                             const albumId = folderKey.replace("LOCAL://", "");
                             dbPromise.then(db => {
                                 const tx = db.transaction("albums", "readwrite");
                                 tx.objectStore("albums").delete(albumId);
                             });
                        }
                        
                        const overrides = JSON.parse(localStorage.getItem('vinyl_album_overrides_v1') || '{}');
                        overrides[folderKey] = { ...overrides[folderKey], deleted: true };
                        localStorage.setItem('vinyl_album_overrides_v1', JSON.stringify(overrides));
                        
                        collection.splice(lastIndex, 1);
                        const origIndex = originalCollection.findIndex(x => x._uid === folderKey);
                        if(origIndex !== -1) originalCollection.splice(origIndex, 1);
                        
                        if(groups[lastIndex]) {
                            scene.remove(groups[lastIndex]);
                            groups.splice(lastIndex, 1);
                        }
                        
                        filterCollection();
                        lastIndex = -1;
                    }
                } else {
                    alert("Morate prvo kliknuti (selektovati) album da biste ga obrisali.");
                }
            });
        }`;

html = html.replace(targetJS, newJS);

// Replace upload logic with IndexedDB logic
const oldUploadJS = `uploadAlbumInput.addEventListener('change', (e) => {
                const files = Array.from(e.target.files);
                if (!files.length) return;

                const audioFiles = files.filter(f => f.type.startsWith('audio/') || f.name.match(/\\.(mp3|wav|flac|m4a|ogg)$/i));
                const imageFile = files.find(f => f.type.startsWith('image/') || f.name.match(/\\.(jpg|jpeg|png)$/i));

                if (!audioFiles.length) {
                    alert("Nisu pronađeni audio fajlovi u selektovanom folderu.");
                    return;
                }

                const albumId = "custom_" + Date.now();
                window.__localUploadedFiles = window.__localUploadedFiles || {};
                window.__localUploadedFiles[albumId] = audioFiles;

                let customCoverUrl = "";
                if (imageFile) {
                    customCoverUrl = URL.createObjectURL(imageFile);
                }

                const folderName = files[0].webkitRelativePath ? files[0].webkitRelativePath.split('/')[0] : "Novi Album";

                const newItem = {
                    name: folderName.toUpperCase(),
                    author: "UPLOADED ALBUM",
                    color: "#1a1a1a",
                    folder: "LOCAL://" + albumId,
                    cover: customCoverUrl,
                    tracks: audioFiles.map(f => f.name).sort(),
                    customCover: customCoverUrl,
                    useCustomCover: !!customCoverUrl,
                    _uid: "LOCAL://" + albumId
                };

                collection.unshift(newItem);
                originalCollection.unshift(newItem);
                
                // Remove all existing groups from scene
                groups.forEach(g => {
                    if (g) scene.remove(g);
                });
                
                createRecordMeshes();
                filterCollection();
                
                uploadAlbumInput.value = "";
            });`;

const newUploadJS = `uploadAlbumInput.addEventListener('change', async (e) => {
                const files = Array.from(e.target.files);
                if (!files.length) return;

                const audioFiles = files.filter(f => f.type.startsWith('audio/') || f.name.match(/\\.(mp3|wav|flac|m4a|ogg)$/i));
                const imageFile = files.find(f => f.type.startsWith('image/') || f.name.match(/\\.(jpg|jpeg|png)$/i));

                if (!audioFiles.length) {
                    alert("Nisu pronađeni audio fajlovi u selektovanom folderu.");
                    return;
                }
                
                const progressEl = document.getElementById('uploadProgress');
                progressEl.style.display = 'block';

                const db = await dbPromise;
                const albumId = "custom_" + Date.now();
                
                const fileData = [];
                let processed = 0;
                for (let i = 0; i < audioFiles.length; i++) {
                    const f = audioFiles[i];
                    const buffer = await f.arrayBuffer();
                    fileData.push({ name: f.name, type: f.type, data: buffer });
                    processed++;
                    progressEl.innerText = \`Uploading... \${Math.round((processed/audioFiles.length)*100)}%\`;
                }

                let customCoverUrl = "";
                let coverData = null;
                let coverType = null;
                if (imageFile) {
                    coverData = await imageFile.arrayBuffer();
                    coverType = imageFile.type;
                    const blob = new Blob([coverData], { type: coverType });
                    customCoverUrl = URL.createObjectURL(blob);
                }

                const folderName = files[0].webkitRelativePath ? files[0].webkitRelativePath.split('/')[0] : "Novi Album";
                
                const newAlbumRecord = {
                    id: albumId,
                    name: folderName.toUpperCase(),
                    author: "UPLOADED ALBUM",
                    color: "#1a1a1a",
                    folder: "LOCAL://" + albumId,
                    tracks: fileData.map(f => f.name).sort(),
                    files: fileData,
                    coverData: coverData,
                    coverType: coverType,
                    customCover: customCoverUrl
                };
                
                const tx = db.transaction("albums", "readwrite");
                tx.objectStore("albums").put(newAlbumRecord);
                await new Promise(r => tx.oncomplete = r);
                
                progressEl.style.display = 'none';

                const newItem = {
                    name: newAlbumRecord.name,
                    author: newAlbumRecord.author,
                    color: newAlbumRecord.color,
                    folder: newAlbumRecord.folder,
                    cover: customCoverUrl,
                    tracks: newAlbumRecord.tracks,
                    customCover: customCoverUrl,
                    useCustomCover: !!customCoverUrl,
                    _uid: newAlbumRecord.folder
                };

                collection.unshift(newItem);
                originalCollection.unshift(newItem);
                
                // Clear existing groups array to rebuild meshes
                groups.forEach(g => {
                    if (g) scene.remove(g);
                });
                groups = [];
                
                createRecordMeshes();
                filterCollection();
                
                uploadAlbumInput.value = "";
            });`;

html = html.replace(oldUploadJS, newUploadJS);

fs.writeFileSync('public/archive.html', html);
