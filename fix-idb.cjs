const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

html = html.replace(
`            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains("albums")) {
                    db.createObjectStore("albums", { keyPath: "id" });
                }
            };`,
`            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains("albums")) {
                    db.createObjectStore("albums", { keyPath: "id" });
                }
                if (!db.objectStoreNames.contains("covers")) {
                    db.createObjectStore("covers", { keyPath: "id" });
                }
            };`);

// Add loading logic for covers
html = html.replace('// Load custom albums on startup', 
`// Load covers from IndexedDB
        dbPromise.then(db => {
            const tx = db.transaction("covers", "readonly");
            const store = tx.objectStore("covers");
            const req = store.getAll();
            req.onsuccess = () => {
                const covers = req.result || [];
                covers.forEach(c => {
                    const item = originalCollection.find(x => x._uid === c.id);
                    if (item) {
                        item.customCover = c.coverData;
                        item.useCustomCover = true;
                    }
                });
                if(covers.length > 0) {
                    groups.forEach(g => { if(g) scene.remove(g); });
                    groups = [];
                    filterCollection();
                }
            };
        });
        
        // Load custom albums on startup`);
fs.writeFileSync('public/archive.html', html);
