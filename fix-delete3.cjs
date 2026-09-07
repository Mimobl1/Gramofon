const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

html = html.replace(`            deleteAlbumBtn.addEventListener('click', () => {
                if (lastIndex >= 0 && lastIndex < collection.length) {
                    const customConfirmOverlay = document.getElementById("customConfirmOverlay");
                    if (customConfirmOverlay) customConfirmOverlay.classList.add("active");
                }
            });`, `            deleteAlbumBtn.addEventListener('click', () => {
                let targetIdx = lastIndex === -1 ? Math.round(currentScroll / scrollSensitivity) : lastIndex;
                if (targetIdx >= 0 && targetIdx < collection.length) {
                    lastIndex = targetIdx; // set it so confirmOkBtn uses the right one
                    const customConfirmOverlay = document.getElementById("customConfirmOverlay");
                    if (customConfirmOverlay) customConfirmOverlay.classList.add("active");
                }
            });`);

fs.writeFileSync('public/archive.html', html);
