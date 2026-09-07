const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

const injection = `
                editAlbumColorSwatch.style.backgroundColor = initColor;
                updateCustomCp(initColor);
                
                const customCoverToggle = document.getElementById("editAlbumCustomCoverToggle");
                const customCoverContainer = document.getElementById("editAlbumCustomCoverContainer");
                const customCoverPreview = document.getElementById("editAlbumCustomCoverPreview");
                const customCoverRemoveBtn = document.getElementById("editAlbumCustomCoverRemoveBtn");
                const customCoverBtn = document.getElementById("editAlbumCustomCoverBtn");
                
                if (item.customCover) {
                    customCoverToggle.checked = true;
                    customCoverContainer.style.display = "block";
                    customCoverPreview.src = item.customCover;
                    customCoverPreview.style.display = "block";
                    customCoverRemoveBtn.style.display = "block";
                    customCoverBtn.style.display = "none";
                } else {
                    customCoverToggle.checked = false;
                    customCoverContainer.style.display = "none";
                    customCoverPreview.src = "";
                    customCoverPreview.style.display = "none";
                    customCoverRemoveBtn.style.display = "none";
                    customCoverBtn.style.display = "block";
                }
`;

html = html.replace(
    '                editAlbumColorSwatch.style.backgroundColor = initColor;\n                updateCustomCp(initColor);',
    injection
);

fs.writeFileSync('public/archive.html', html);
