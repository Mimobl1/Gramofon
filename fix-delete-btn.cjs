const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

const oldLogic = `        const deleteAlbumBtn = document.getElementById('deleteAlbumBtn');
        if (deleteAlbumBtn) {
            deleteAlbumBtn.addEventListener('click', () => {
                const targetIdx = lastIndex === -1 ? 0 : lastIndex;
                if (targetIdx >= 0 && targetIdx < collection.length) {
                    const item = collection[targetIdx];
                    if(confirm("Da li ste sigurni da želite da obrišete album: " + item.name + "?")) {
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
                        
                        collection.splice(targetIdx, 1);
                        const origIndex = originalCollection.findIndex(x => x._uid === folderKey);
                        if(origIndex !== -1) originalCollection.splice(origIndex, 1);
                        
                        filterCollection();
                        lastIndex = -1;
                        if(playingIndex === targetIdx) {
                           playingIndex = -1;
                           localStorage.removeItem(PLAYING_UID_KEY);
                        }
                    }
                }
            });
        }`;

const newLogic = `        const deleteAlbumBtn = document.getElementById('deleteAlbumBtn');
        if (deleteAlbumBtn) {
            deleteAlbumBtn.addEventListener('click', () => {
                if (lastIndex >= 0 && lastIndex < collection.length) {
                    const customConfirmOverlay = document.getElementById("customConfirmOverlay");
                    if (customConfirmOverlay) customConfirmOverlay.classList.add("active");
                }
            });
        }`;

html = html.replace(oldLogic, newLogic);

fs.writeFileSync('public/archive.html', html);
