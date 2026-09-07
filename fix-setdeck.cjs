const fs = require('fs');
let html = fs.readFileSync('public/vinyl-player.html', 'utf-8');

const oldSet = `      if (currentAlbumFolder && currentAlbumFolder.startsWith("LOCAL://")) {
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
                  const blob = new Blob([file.data], { type: file.type || "audio/mpeg" });
                  absoluteUrl = URL.createObjectURL(blob);
              }
          }
      }`;

const newSet = `      if (currentAlbumFolder && currentAlbumFolder.startsWith("LOCAL://")) {
          try {
              const albumId = currentAlbumFolder.replace("LOCAL://", "");
              const db = await new Promise((resolve, reject) => {
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
                      const blob = new Blob([file.data], { type: file.type || "audio/mpeg" });
                      absoluteUrl = URL.createObjectURL(blob);
                  }
              }
          } catch(err) {
              console.error("IndexedDB error:", err);
          }
      }`;

html = html.replace(oldSet, newSet);
fs.writeFileSync('public/vinyl-player.html', html);
