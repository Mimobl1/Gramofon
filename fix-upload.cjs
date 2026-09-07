const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

// 1. Remove RESET button, Add DELETE button instead
const oldSidebar = `<button class="genre-pill" id="resetAlbumsBtn" style="color: #ff6b6b; border-color: rgba(220, 53, 69, 0.4);">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; display: inline-block; vertical-align: middle;"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>RESET
            </button>`;
const newSidebar = `<button class="genre-pill" id="deleteAlbumBtn" style="color: #ff6b6b; border-color: rgba(220, 53, 69, 0.4);">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; display: inline-block; vertical-align: middle;"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>DELETE
            </button>`;
html = html.replace(oldSidebar, newSidebar);

// 2. Remove delete button from Edit modal header
const oldHeader = `<div style="display: flex; align-items: center; gap: 12px;">
                    <div id="editAlbumColorSwatch" style="width: 28px; height: 28px; border-radius: 50%; border: 2px solid #555; cursor: pointer; transition: transform 0.2s; box-sizing: border-box; flex-shrink: 0;" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'" title="Izaberi boju ploče"></div>
                    <button class="edit-modal-btn" id="editDeleteBtn" style="background: transparent; color: #ff6b6b; border: none; padding: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.2s, opacity 0.2s; opacity: 0.7;" onmouseover="this.style.opacity='1'; this.style.transform='scale(1.1)'" onmouseout="this.style.opacity='0.7'; this.style.transform='scale(1)'" title="Obriši Album">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </div>`;
const newHeader = `<div style="display: flex; align-items: center; gap: 12px;">
                    <div id="editAlbumColorSwatch" style="width: 28px; height: 28px; border-radius: 50%; border: 2px solid #555; cursor: pointer; transition: transform 0.2s; box-sizing: border-box; flex-shrink: 0;" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'" title="Izaberi boju ploče"></div>
                </div>`;
html = html.replace(oldHeader, newHeader);

// Add Progress indicator element
const progressHTML = `<div id="uploadProgress" style="display:none; position:fixed; bottom:20px; left:20px; background:rgba(0,0,0,0.8); padding:10px 20px; border-radius:8px; color:#00ff00; z-index:9999; font-weight:bold; font-family:monospace; border:1px solid #333; box-shadow:0 4px 12px rgba(0,0,0,0.5);">Uploading... 0%</div>`;
html = html.replace('</body>', progressHTML + '\n</body>');


fs.writeFileSync('public/archive.html', html);
