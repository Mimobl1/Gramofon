const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

const oldHeader = `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <h2 style="margin: 0;">Uredi Album</h2>
                <div id="editAlbumColorSwatch" style="width: 28px; height: 28px; border-radius: 50%; border: 2px solid #555; cursor: pointer; transition: transform 0.2s; box-sizing: border-box; flex-shrink: 0;" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'" title="Izaberi boju ploče"></div>
            </div>`;

const newHeader = `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <h2 style="margin: 0;">Uredi Album</h2>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div id="editAlbumColorSwatch" style="width: 28px; height: 28px; border-radius: 50%; border: 2px solid #555; cursor: pointer; transition: transform 0.2s; box-sizing: border-box; flex-shrink: 0;" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'" title="Izaberi boju ploče"></div>
                    <button class="edit-modal-btn" id="editDeleteBtn" style="background: transparent; color: #ff6b6b; border: none; padding: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.2s, opacity 0.2s; opacity: 0.7;" onmouseover="this.style.opacity='1'; this.style.transform='scale(1.1)'" onmouseout="this.style.opacity='0.7'; this.style.transform='scale(1)'" title="Obriši Album">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </div>
            </div>`;

html = html.replace(oldHeader, newHeader);

const oldFooter = `<div class="edit-modal-actions" style="margin-top: 24px; border-top: 1px solid #333; padding-top: 16px;">
                <button class="edit-modal-btn" id="editDeleteBtn" style="width: 100%; background: rgba(220, 53, 69, 0.15); color: #ff6b6b; border: 1px solid rgba(220, 53, 69, 0.4); padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='rgba(220, 53, 69, 0.3)'" onmouseout="this.style.background='rgba(220, 53, 69, 0.15)'">Obriši Album</button>
                <button class="edit-modal-btn save" id="editCloseBtn" style="display: none;">Zatvori</button>
            </div>`;

const newFooter = `<div class="edit-modal-actions" style="display: none; margin-top: 24px; border-top: 1px solid #333; padding-top: 16px;">
                <button class="edit-modal-btn save" id="editCloseBtn" style="display: none;">Zatvori</button>
            </div>`;

html = html.replace(oldFooter, newFooter);

fs.writeFileSync('public/archive.html', html);
