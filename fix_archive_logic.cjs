const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf8');

// 1. Fix ReferenceError for onAlbumSelectionForFeedback
html = html.replace('onAlbumSelectionForFeedback(selectedPayload || collection[idx] || null);', '');

// 2. Add Upload Logic
const uploadLogic = `
            document.getElementById("folderUpload")?.addEventListener("change", (e) => {
                const files = Array.from(e.target.files);
                if (!files.length) return;
                
                const pathParts = files[0].webkitRelativePath.split('/');
                const albumName = pathParts.length > 1 ? pathParts[0] : "Uploaded Album";
                
                const audioFiles = files.filter(f => f.type.startsWith('audio/') || f.name.toLowerCase().endsWith('.mp3'));
                const imageFiles = files.filter(f => f.type.startsWith('image/'));
                
                if(!audioFiles.length) {
                    alert("No audio files found in the selected folder.");
                    return;
                }
                
                const coverFile = imageFiles.find(f => f.name.toLowerCase().includes('cover') || f.name.toLowerCase().includes('front')) || imageFiles[0];
                const coverUrl = coverFile ? URL.createObjectURL(coverFile) : "";
                
                const albumId = Date.now().toString();
                if(window.parent) {
                    window.parent.__localUploadedFiles = window.parent.__localUploadedFiles || {};
                    window.parent.__localUploadedFiles[albumId] = audioFiles;
                }
                
                const album = {
                    name: albumName,
                    author: "Local Upload",
                    color: "#f0f0f0",
                    folder: "LOCAL://" + albumId,
                    cover: coverUrl,
                    tracks: audioFiles.map(f => f.name).sort()
                };
                
                originalCollection.unshift(album); 
                filterCollection(); 
                
                if (window.parent && EMBEDDED) {
                    setTimeout(() => {
                        targetScroll = 0;
                        currentScroll = 0;
                        setTimeout(() => {
                             startLaunchToPlayer(0, "vinyl-player.html");
                        }, 500);
                    }, 50);
                }
            });
`;

html = html.replace(/document\.getElementById\("uploadBtn"\)\?\.addEventListener\("click", \(\) => \{\s*alert\("Upload functionality will be implemented soon!"\);\s*\}\);/, uploadLogic);

fs.writeFileSync('public/archive.html', html);
