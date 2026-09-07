const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

const oldAutoSave = `                overrides[folderKey].name = newName;
                overrides[folderKey].author = newAuthor;
                overrides[folderKey].genre = newGenre;
                overrides[folderKey].year = newYear;
                overrides[folderKey].color = newColor;
                overrides[folderKey].customCover = item.customCover || "";
                overrides[folderKey].useCustomCover = item.useCustomCover !== false;

                localStorage.setItem('vinyl_album_overrides_v1', JSON.stringify(overrides));`;

const newAutoSave = `                overrides[folderKey].name = newName;
                overrides[folderKey].author = newAuthor;
                overrides[folderKey].genre = newGenre;
                overrides[folderKey].year = newYear;
                overrides[folderKey].color = newColor;
                overrides[folderKey].useCustomCover = item.useCustomCover !== false;
                
                // Do not store base64 in localStorage to avoid QuotaExceededError
                delete overrides[folderKey].customCover;
                localStorage.setItem('vinyl_album_overrides_v1', JSON.stringify(overrides));
                
                // Save custom cover to IndexedDB
                if (item.customCover) {
                    dbPromise.then(db => {
                        const tx = db.transaction("covers", "readwrite");
                        tx.objectStore("covers").put({ id: folderKey, coverData: item.customCover });
                    });
                } else {
                    dbPromise.then(db => {
                        const tx = db.transaction("covers", "readwrite");
                        tx.objectStore("covers").delete(folderKey);
                    }).catch(()=>{});
                }`;

html = html.replace(oldAutoSave, newAutoSave);
fs.writeFileSync('public/archive.html', html);
