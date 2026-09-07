const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

html = html.replace('function rebuildMeshes() {', `function syncPlayingIndex() {
            try {
                const savedUid = localStorage.getItem(PLAYING_UID_KEY);
                if (savedUid) {
                    const idx = collection.findIndex(a => a._uid === savedUid);
                    playingIndex = idx >= 0 ? idx : -1;
                }
            } catch(_) {}
        }
        function rebuildMeshes() {
            syncPlayingIndex();`);

fs.writeFileSync('public/archive.html', html);
