const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

const oldLogic = `            confirmOkBtn.addEventListener("click", () => {
                customConfirmOverlay.classList.remove("active");
                if (lastIndex >= 0 && lastIndex < collection.length) {
                    const item = collection[lastIndex];
                    const folderKey = item._uid;
                    
                    // Remove from overrides
                    const overrides = JSON.parse(localStorage.getItem('vinyl_album_overrides_v1') || '{}');
                    overrides[folderKey] = { ...overrides[folderKey], deleted: true };
                    localStorage.setItem('vinyl_album_overrides_v1', JSON.stringify(overrides));
                    
                    // Remove from collections
                    collection.splice(lastIndex, 1);
                    const origIndex = originalCollection.findIndex(x => x._uid === folderKey);
                    if(origIndex !== -1) originalCollection.splice(origIndex, 1);
                    
                    closeEditModal();
                    rebuildMeshes();
                }
            });`;

const newLogic = `            confirmOkBtn.addEventListener("click", () => {
                customConfirmOverlay.classList.remove("active");
                if (lastIndex >= 0 && lastIndex < collection.length) {
                    const item = collection[lastIndex];
                    const folderKey = item._uid;
                    
                    if (folderKey.startsWith("LOCAL://")) {
                         const albumId = folderKey.replace("LOCAL://", "");
                         dbPromise.then(db => {
                             const tx = db.transaction("albums", "readwrite");
                             tx.objectStore("albums").delete(albumId);
                         });
                    }
                    
                    // Remove from overrides
                    const overrides = JSON.parse(localStorage.getItem('vinyl_album_overrides_v1') || '{}');
                    overrides[folderKey] = { ...overrides[folderKey], deleted: true };
                    localStorage.setItem('vinyl_album_overrides_v1', JSON.stringify(overrides));
                    
                    // Remove from collections
                    collection.splice(lastIndex, 1);
                    const origIndex = originalCollection.findIndex(x => x._uid === folderKey);
                    if(origIndex !== -1) originalCollection.splice(origIndex, 1);
                    
                    closeEditModal();
                    
                    groups.forEach(g => { if(g) scene.remove(g); });
                    groups = [];
                    filterCollection();
                    
                    lastIndex = -1;
                    if(playingIndex === lastIndex) {
                       playingIndex = -1;
                       localStorage.removeItem(PLAYING_UID_KEY);
                    }
                }
            });`;

html = html.replace(oldLogic, newLogic);

fs.writeFileSync('public/archive.html', html);
