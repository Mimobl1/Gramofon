const fs = require('fs');
let html = fs.readFileSync('public/vinyl-player.html', 'utf-8');

const oldReadDuration = `      const readDuration=(src)=>new Promise((resolve)=>{
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
                            const blob = new Blob([file.data], { type: file.type || "audio/mpeg" });
                            absoluteUrl = URL.createObjectURL(blob);
                            a.src = absoluteUrl;
                        }
                    }
                };
            };
            return; // We handled src assignment async
        }
        
        if (!absoluteUrl) {
            let fullPath = src;
            if (currentAlbumFolder && !src.startsWith(currentAlbumFolder)) {
                fullPath = currentAlbumFolder + "/" + src;
            }
            absoluteUrl = encodeURI(fullPath);
        }
        
        a.src=absoluteUrl;
        const done=(value)=>resolve(Number.isFinite(value)&&value>0?value:180);
        a.addEventListener("loadedmetadata",()=>done(a.duration),{once:true});
        a.addEventListener("error",()=>done(180),{once:true});
        setTimeout(()=>done(180),2500);
      });`;

const newReadDuration = `      const readDuration=async(src)=>{
        return new Promise(async(resolve)=>{
            const a=new Audio();
            a.preload="metadata";
            let absoluteUrl = "";
            
            if (currentAlbumFolder && currentAlbumFolder.startsWith("LOCAL://")) {
                const albumId = currentAlbumFolder.replace("LOCAL://", "");
                try {
                    const db = await new Promise((res, rej) => {
                        const req = indexedDB.open("VinylCollectionDB", 1);
                        req.onsuccess = () => res(req.result);
                        req.onerror = () => rej(req.error);
                    });
                    const tx = db.transaction("albums", "readonly");
                    const store = tx.objectStore("albums");
                    const album = await new Promise((res) => {
                        const req = store.get(albumId);
                        req.onsuccess = () => res(req.result);
                        req.onerror = () => res(null);
                    });
                    if (album && album.files) {
                        const file = album.files.find(f => f.name === src);
                        if (file) {
                            const blob = new Blob([file.data], { type: file.type || "audio/mpeg" });
                            absoluteUrl = URL.createObjectURL(blob);
                        }
                    }
                } catch(e) {}
            }
            
            if (!absoluteUrl) {
                let fullPath = src;
                if (currentAlbumFolder && !src.startsWith(currentAlbumFolder)) {
                    fullPath = currentAlbumFolder + "/" + src;
                }
                absoluteUrl = encodeURI(fullPath);
            }
            
            a.src=absoluteUrl;
            const done=(value)=>resolve(Number.isFinite(value)&&value>0?value:180);
            a.addEventListener("loadedmetadata",()=>done(a.duration),{once:true});
            a.addEventListener("error",()=>done(180),{once:true});
            setTimeout(()=>done(180),2500);
        });
      };`;

html = html.replace(oldReadDuration, newReadDuration);
fs.writeFileSync('public/vinyl-player.html', html);
