const fs = require('fs');
let html = fs.readFileSync('public/vinyl-player.html', 'utf-8');

html = html.replace('const setDeckSourceByIndex=(idx)=>{', 'const setDeckSourceByIndex=async(idx)=>{');

const oldLogic2 = `      if (currentAlbumFolder && currentAlbumFolder.startsWith("LOCAL://")) {
          const albumId = currentAlbumFolder.replace("LOCAL://", "");
          const localFiles = (window.parent && window.__localUploadedFiles) ? window.__localUploadedFiles[albumId] : null;
          if (localFiles) {
              const file = localFiles.find(f => f.name === trackName);
              if (file) {
                  absoluteUrl = URL.createObjectURL(file);
              }
          }
      }`;

const newLogic2 = `      if (currentAlbumFolder && currentAlbumFolder.startsWith("LOCAL://")) {
          const albumId = currentAlbumFolder.replace("LOCAL://", "");
          const db = await new Promise((resolve, reject) => {
              const req = indexedDB.open("VinylCollectionDB", 1);
              req.onsuccess = () => resolve(req.result);
              req.onerror = () => reject(req.error);
          });
          const tx = db.transaction("albums", "readonly");
          const store = tx.objectStore("albums");
          const album = await new Promise((resolve) => {
              const req = store.get(albumId);
              req.onsuccess = () => resolve(req.result);
              req.onerror = () => resolve(null);
          });
          if (album && album.files) {
              const file = album.files.find(f => f.name === trackName);
              if (file) {
                  const blob = new Blob([file.data], { type: file.type });
                  absoluteUrl = URL.createObjectURL(blob);
              }
          }
      }`;

html = html.replace(oldLogic2, newLogic2);

const oldLogic3 = `        if (currentAlbumFolder && currentAlbumFolder.startsWith("LOCAL://")) {
            const albumId = currentAlbumFolder.replace("LOCAL://", "");
            const localFiles = (window.parent && window.__localUploadedFiles) ? window.__localUploadedFiles[albumId] : null;
            if (localFiles) {
                const file = localFiles.find(f => f.name === src);
                if (file) {
                    absoluteUrl = URL.createObjectURL(file);
                }
            }
        }`;

const newLogic3 = `        if (currentAlbumFolder && currentAlbumFolder.startsWith("LOCAL://")) {
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
                        }
                    }
                };
            };
            return; // We handled src assignment async
        }`;

html = html.replace(oldLogic3, newLogic3);

fs.writeFileSync('public/vinyl-player.html', html);
