const fs = require('fs');
let html = fs.readFileSync('public/vinyl-player.html', 'utf-8');

html = html.replace(`                        const req = indexedDB.open("VinylCollectionDB", 1);
                        req.onsuccess = () => res(req.result);
                        req.onerror = () => rej(req.error);`, `                        const req = indexedDB.open("VinylCollectionDB", 1);
                        req.onupgradeneeded = (e) => {
                            const db = e.target.result;
                            if (!db.objectStoreNames.contains("albums")) {
                                db.createObjectStore("albums", { keyPath: "id" });
                            }
                        };
                        req.onsuccess = () => res(req.result);
                        req.onerror = () => rej(req.error);`);

fs.writeFileSync('public/vinyl-player.html', html);
