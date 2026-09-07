const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

const injection = `
        editCloseBtn.addEventListener("click", closeEditModal);
        
        const customCoverToggle = document.getElementById("editAlbumCustomCoverToggle");
        const customCoverContainer = document.getElementById("editAlbumCustomCoverContainer");
        const customCoverInput = document.getElementById("editAlbumCustomCoverInput");
        const customCoverBtn = document.getElementById("editAlbumCustomCoverBtn");
        const customCoverPreview = document.getElementById("editAlbumCustomCoverPreview");
        const customCoverRemoveBtn = document.getElementById("editAlbumCustomCoverRemoveBtn");
        
        customCoverToggle.addEventListener("change", (e) => {
            if (e.target.checked) {
                customCoverContainer.style.display = "block";
            } else {
                customCoverContainer.style.display = "none";
                if (lastIndex >= 0 && lastIndex < collection.length) {
                    const item = collection[lastIndex];
                    if (item.customCover) {
                        item.customCover = "";
                        customCoverPreview.src = "";
                        customCoverPreview.style.display = "none";
                        customCoverRemoveBtn.style.display = "none";
                        customCoverBtn.style.display = "block";
                        syncColorToPreview(); // sync back to generated cover
                        autoSaveEdits();
                    }
                }
            }
        });
        
        customCoverBtn.addEventListener("click", () => {
            customCoverInput.click();
        });
        
        customCoverRemoveBtn.addEventListener("click", () => {
            if (lastIndex >= 0 && lastIndex < collection.length) {
                const item = collection[lastIndex];
                item.customCover = "";
                customCoverPreview.src = "";
                customCoverPreview.style.display = "none";
                customCoverRemoveBtn.style.display = "none";
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
                    // Downscale image to 512x512
                    const canvas = document.createElement("canvas");
                    canvas.width = 512;
                    canvas.height = 512;
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0, 512, 512);
                    
                    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
                    customCoverPreview.src = dataUrl;
                    customCoverPreview.style.display = "block";
                    customCoverRemoveBtn.style.display = "block";
                    customCoverBtn.style.display = "none";
                    
                    if (lastIndex >= 0 && lastIndex < collection.length) {
                        const item = collection[lastIndex];
                        item.customCover = dataUrl;
                        syncColorToPreview();
                        autoSaveEdits();
                    }
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
            e.target.value = ""; // Reset input
        });
`;

html = html.replace('        editCloseBtn.addEventListener("click", closeEditModal);', injection);

fs.writeFileSync('public/archive.html', html);
