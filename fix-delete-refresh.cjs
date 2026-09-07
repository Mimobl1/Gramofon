const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

const oldLogic = `                    // Remove from collections
                    collection.splice(lastIndex, 1);
                    const origIndex = originalCollection.findIndex(x => x._uid === folderKey);
                    if(origIndex !== -1) originalCollection.splice(origIndex, 1);
                    
                    closeEditModal();
                    
                    groups.forEach(g => { if(g) scene.remove(g); });
                    groups = [];
                    filterCollection();
                    
                    lastIndex = -1;
                    if(playingIndex === lastIndex) {
                       playingIndex = -1;
                       localStorage.removeItem(PLAYING_UID_KEY);
                    }`;

const newLogic = `                    // Remove from collections
                    collection.splice(lastIndex, 1);
                    const origIndex = originalCollection.findIndex(x => x._uid === folderKey);
                    if(origIndex !== -1) originalCollection.splice(origIndex, 1);
                    
                    closeEditModal();
                    
                    groups.forEach(g => { if(g) scene.remove(g); });
                    groups = [];
                    filterCollection(); // This calls rebuildMeshes inside!
                    
                    if(playingIndex === lastIndex) {
                       playingIndex = -1;
                       localStorage.removeItem(PLAYING_UID_KEY);
                    }
                    lastIndex = -1;`;

html = html.replace(oldLogic, newLogic);

fs.writeFileSync('public/archive.html', html);
