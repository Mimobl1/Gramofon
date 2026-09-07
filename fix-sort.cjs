const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

const oldApply = `            originalCollection = normalized.map((item, idx) => {
                const folderKey = item._uid;
                const folderOverrides = overrides[folderKey] || {};
                if (folderOverrides.deleted) return null;
                return {
                    ...item,
                    color: folderOverrides.color || uniqueAlbumColorByIndex(idx),
                    name: folderOverrides.name || item.name,
                    author: folderOverrides.author || item.author,
                    genre: folderOverrides.genre || item.genre || "",
                    year: folderOverrides.year || item.year || "",
                    customCover: folderOverrides.customCover || item.customCover || "",
                    useCustomCover: folderOverrides.useCustomCover !== undefined ? folderOverrides.useCustomCover : (item.useCustomCover !== undefined ? item.useCustomCover : true)
                };
            }).filter(Boolean);
            filterCollection();`;

const newApply = `            originalCollection = normalized.map((item, idx) => {
                const folderKey = item._uid;
                const folderOverrides = overrides[folderKey] || {};
                if (folderOverrides.deleted) return null;
                return {
                    ...item,
                    color: folderOverrides.color || uniqueAlbumColorByIndex(idx),
                    name: folderOverrides.name || item.name,
                    author: folderOverrides.author || item.author,
                    genre: folderOverrides.genre || item.genre || "",
                    year: folderOverrides.year || item.year || "",
                    customCover: folderOverrides.customCover || item.customCover || "",
                    useCustomCover: folderOverrides.useCustomCover !== undefined ? folderOverrides.useCustomCover : (item.useCustomCover !== undefined ? item.useCustomCover : true)
                };
            }).filter(Boolean);
            
            try {
                const savedOrder = JSON.parse(localStorage.getItem('vinyl_album_order_v1'));
                if (savedOrder && Array.isArray(savedOrder)) {
                    originalCollection.sort((a, b) => {
                        const idxA = savedOrder.indexOf(a._uid);
                        const idxB = savedOrder.indexOf(b._uid);
                        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                        if (idxA !== -1) return -1; // a comes first
                        if (idxB !== -1) return 1;  // b comes first
                        return 0; 
                    });
                }
            } catch(e) {}
            
            filterCollection();`;

html = html.replace(oldApply, newApply);
fs.writeFileSync('public/archive.html', html);
