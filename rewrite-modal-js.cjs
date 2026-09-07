const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

// The block to replace for modal opening:
const oldModalOpenRegex = /const customCoverToggle = document\.getElementById\("editAlbumCustomCoverToggle"\);[\s\S]*?customCoverBtn\.style\.display = "block";\s*\}/;

const newModalOpen = `const customCoverToggle = document.getElementById("editAlbumCustomCoverToggle");
                const customCoverPreviewContainer = document.getElementById("editAlbumCustomCoverPreviewContainer");
                const customCoverPreview = document.getElementById("editAlbumCustomCoverPreview");
                const customCoverBtn = document.getElementById("editAlbumCustomCoverBtn");
                
                if (item.customCover) {
                    customCoverPreviewContainer.style.display = "block";
                    customCoverPreview.src = item.customCover;
                    customCoverBtn.style.display = "none";
                } else {
                    customCoverPreviewContainer.style.display = "none";
                    customCoverPreview.src = "";
                    customCoverBtn.style.display = "block";
                }
                customCoverToggle.checked = item.useCustomCover !== false;`;

html = html.replace(oldModalOpenRegex, newModalOpen);


// The block to replace for modal events:
const oldEventsRegex = /customCoverToggle\.addEventListener\("change", \(e\) => \{[\s\S]*?e\.target\.value = ""; \/\/ Reset input\s*\}\);/;

const newEvents = `const customCoverPreviewContainer = document.getElementById("editAlbumCustomCoverPreviewContainer");
        
        customCoverToggle.addEventListener("change", (e) => {
            if (lastIndex >= 0 && lastIndex < collection.length) {
                const item = collection[lastIndex];
                item.useCustomCover = e.target.checked;
                syncColorToPreview(); 
                autoSaveEdits();
            }
        });
        
        customCoverBtn.addEventListener("click", () => {
            customCoverInput.click();
        });
        
        customCoverRemoveBtn.addEventListener("click", () => {
            if (lastIndex >= 0 && lastIndex < collection.length) {
                const item = collection[lastIndex];
                item.customCover = "";
                item.useCustomCover = true;
                customCoverToggle.checked = true;
                customCoverPreview.src = "";
                customCoverPreviewContainer.style.display = "none";
                customCoverBtn.style.display = "block";
                syncColorToPreview(); // sync back to generated cover
                autoSaveEdits();
            }
        });
        
        customCoverInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    canvas.width = 512;
                    canvas.height = 512;
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0, 512, 512);
                    
                    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
                    customCoverPreview.src = dataUrl;
                    customCoverPreviewContainer.style.display = "block";
                    customCoverBtn.style.display = "none";
                    
                    if (lastIndex >= 0 && lastIndex < collection.length) {
                        const item = collection[lastIndex];
                        item.customCover = dataUrl;
                        item.useCustomCover = true;
                        customCoverToggle.checked = true;
                        syncColorToPreview();
                        autoSaveEdits();
                    }
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
            e.target.value = "";
        });`;

html = html.replace(oldEventsRegex, newEvents);

fs.writeFileSync('public/archive.html', html);
