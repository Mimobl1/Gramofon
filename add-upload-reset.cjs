const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

const targetSidebarHTML = `<div class="right-sidebar">
            <button class="genre-pill" id="editAlbumBtn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; display: inline-block; vertical-align: middle;"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>EDIT
            </button>
        </div>`;

const newSidebarHTML = `<div class="right-sidebar" style="display: flex; flex-direction: column; gap: 8px;">
            <button class="genre-pill" id="editAlbumBtn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; display: inline-block; vertical-align: middle;"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>EDIT
            </button>
            <input type="file" id="uploadAlbumInput" webkitdirectory directory multiple style="display: none;">
            <button class="genre-pill" id="uploadAlbumBtn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; display: inline-block; vertical-align: middle;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>UPLOAD
            </button>
            <button class="genre-pill" id="resetAlbumsBtn" style="color: #ff6b6b; border-color: rgba(220, 53, 69, 0.4);">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; display: inline-block; vertical-align: middle;"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>RESET
            </button>
        </div>`;

html = html.replace(targetSidebarHTML, newSidebarHTML);


const targetJS = `const editAlbumBtn = document.getElementById("editAlbumBtn");`;
const newJS = `const resetAlbumsBtn = document.getElementById('resetAlbumsBtn');
        if (resetAlbumsBtn) {
            resetAlbumsBtn.addEventListener('click', () => {
                if(confirm("Da li ste sigurni da želite da obrišete sve izmene i vratite albume na defaultno stanje?")) {
                    localStorage.removeItem('vinyl_album_overrides_v1');
                    location.reload();
                }
            });
        }

        const uploadAlbumBtn = document.getElementById('uploadAlbumBtn');
        const uploadAlbumInput = document.getElementById('uploadAlbumInput');
        if (uploadAlbumBtn && uploadAlbumInput) {
            uploadAlbumBtn.addEventListener('click', () => {
                uploadAlbumInput.click();
            });

            uploadAlbumInput.addEventListener('change', (e) => {
                const files = Array.from(e.target.files);
                if (!files.length) return;

                const audioFiles = files.filter(f => f.type.startsWith('audio/') || f.name.match(/\\.(mp3|wav|flac|m4a|ogg)$/i));
                const imageFile = files.find(f => f.type.startsWith('image/') || f.name.match(/\\.(jpg|jpeg|png)$/i));

                if (!audioFiles.length) {
                    alert("Nisu pronađeni audio fajlovi u selektovanom folderu.");
                    return;
                }

                const albumId = "custom_" + Date.now();
                window.__localUploadedFiles = window.__localUploadedFiles || {};
                window.__localUploadedFiles[albumId] = audioFiles;

                let customCoverUrl = "";
                if (imageFile) {
                    customCoverUrl = URL.createObjectURL(imageFile);
                }

                const folderName = files[0].webkitRelativePath ? files[0].webkitRelativePath.split('/')[0] : "Novi Album";

                const newItem = {
                    name: folderName.toUpperCase(),
                    author: "UPLOADED ALBUM",
                    color: "#1a1a1a",
                    folder: "LOCAL://" + albumId,
                    cover: customCoverUrl,
                    tracks: audioFiles.map(f => f.name).sort(),
                    customCover: customCoverUrl,
                    useCustomCover: !!customCoverUrl,
                    _uid: "LOCAL://" + albumId
                };

                collection.unshift(newItem);
                originalCollection.unshift(newItem);
                
                // Remove all existing groups from scene
                groups.forEach(g => {
                    if (g) scene.remove(g);
                });
                
                createRecordMeshes();
                filterCollection();
                
                uploadAlbumInput.value = "";
            });
        }

        const editAlbumBtn = document.getElementById("editAlbumBtn");`;

html = html.replace(targetJS, newJS);

fs.writeFileSync('public/archive.html', html);

