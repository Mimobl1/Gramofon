const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

const target1 = `const PLAYING_INDEX_KEY = "archive_playing_index_v1";`;
const replace1 = `const PLAYING_UID_KEY = "archive_playing_uid_v1";`;
html = html.replace(target1, replace1);

const target2 = `                    playingIndex = idx;
                    try { localStorage.setItem(PLAYING_INDEX_KEY, String(idx)); } catch(_) {}`;
const replace2 = `                    playingIndex = idx;
                    try { localStorage.setItem(PLAYING_UID_KEY, collection[idx]._uid); } catch(_) {}`;
html = html.replace(target2, replace2);

const target3 = `            try {
                const saved = Number(localStorage.getItem(PLAYING_INDEX_KEY));
                if (Number.isFinite(saved) && saved >= 0 && saved < totalMeshes) playingIndex = saved;
            } catch(_) {}`;
const replace3 = `            try {
                const savedUid = localStorage.getItem(PLAYING_UID_KEY);
                if (savedUid) {
                    const idx = collection.findIndex(a => a._uid === savedUid);
                    if (idx >= 0) playingIndex = idx;
                }
            } catch(_) {}`;
html = html.replace(target3, replace3);

const target4 = `        function filterCollection() {
            if (activeGenre === "ALL") {
                collection = [...originalCollection];
            } else {
                collection = originalCollection.filter(item => 
                    (item.genre && item.genre.toUpperCase() === activeGenre) || item.name.includes(activeGenre) || item.author.includes(activeGenre) || item.folder.toUpperCase().includes(activeGenre)
                );
            }
            totalMeshes = collection.length;
            maxScroll = Math.max(0, (totalMeshes - 1) * scrollSensitivity);
            
            if (scene) {
                rebuildMeshes();
            }
        }`;
const replace4 = `        function filterCollection() {
            if (activeGenre === "ALL") {
                collection = [...originalCollection];
            } else {
                collection = originalCollection.filter(item => 
                    (item.genre && item.genre.toUpperCase() === activeGenre) || item.name.includes(activeGenre) || item.author.includes(activeGenre) || item.folder.toUpperCase().includes(activeGenre)
                );
            }
            totalMeshes = collection.length;
            maxScroll = Math.max(0, (totalMeshes - 1) * scrollSensitivity);
            
            try {
                const savedUid = localStorage.getItem(PLAYING_UID_KEY);
                if (savedUid) {
                    playingIndex = collection.findIndex(a => a._uid === savedUid);
                }
            } catch(_) {}

            if (scene) {
                rebuildMeshes();
            }
        }`;
html = html.replace(target4, replace4);

// Fix Goal 5: Edit button text
html = html.replace('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; display: inline-block; vertical-align: middle;"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>EDIT', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; display: inline-block; vertical-align: middle;"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>EDIT ALBUM');

fs.writeFileSync('public/archive.html', html);
