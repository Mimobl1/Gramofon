const fs = require('fs');
let html = fs.readFileSync('public/vinyl-player.html', 'utf-8');

const oldFunc = `      const readDuration=(src)=>new Promise((resolve)=>{
        const a=new Audio();
        a.preload="metadata";
        let absoluteUrl = "";
        
        if (currentAlbumFolder && currentAlbumFolder.startsWith("LOCAL://")) {
            const albumId = currentAlbumFolder.replace("LOCAL://", "");
            indexedDB.open("VinylCollectionDB", 1).onsuccess = (e) => {
                const db = e.target.result;
                const tx = db.transaction("albums", "readonly");
                const store = tx.objectStore("albums");
                store.get(albumId).onsuccess = (e2) => {
                    const album = e2.target.result;
                    if (album && album.files) {
                        const file = album.files.find(f => f.name === src);
                        if (file) {
                            const blob = new Blob([file.data], { type: file.type });
                            absoluteUrl = URL.createObjectURL(blob);
                            a.src = absoluteUrl;
                        } else {
                            a.src = "";
                        }
                    }
                };
            };
            return; // We handled src assignment async
        }
        
        let fullPath = src;
        if (currentAlbumFolder && !src.startsWith(currentAlbumFolder)) {
            fullPath = currentAlbumFolder + "/" + src;
        }

        if (!absoluteUrl) {
            a.src = "/music/" + fullPath;
        } else {
            a.src = absoluteUrl;
        }
        
        a.onloadedmetadata=()=>{
          resolve(a.duration);
        };
        a.onerror=()=>{
          resolve(0);
        };
      });`;

const newFunc = `      const readDuration=(src)=>new Promise((resolve)=>{
        const a=new Audio();
        a.preload="metadata";
        
        a.onloadedmetadata=()=>{
          resolve(a.duration);
        };
        a.onerror=()=>{
          resolve(0);
        };
        
        if (currentAlbumFolder && currentAlbumFolder.startsWith("LOCAL://")) {
            const albumId = currentAlbumFolder.replace("LOCAL://", "");
            indexedDB.open("VinylCollectionDB", 1).onsuccess = (e) => {
                const db = e.target.result;
                const tx = db.transaction("albums", "readonly");
                const store = tx.objectStore("albums");
                store.get(albumId).onsuccess = (e2) => {
                    const album = e2.target.result;
                    if (album && album.files) {
                        const file = album.files.find(f => f.name === src);
                        if (file) {
                            const blob = new Blob([file.data], { type: file.type });
                            a.src = URL.createObjectURL(blob);
                        } else {
                            resolve(0);
                        }
                    } else {
                        resolve(0);
                    }
                };
            };
            return;
        }
        
        let fullPath = src;
        if (currentAlbumFolder && !src.startsWith(currentAlbumFolder)) {
            fullPath = currentAlbumFolder + "/" + src;
        }
        a.src = "/music/" + fullPath;
      });`;

html = html.replace(oldFunc, newFunc);
fs.writeFileSync('public/vinyl-player.html', html);
