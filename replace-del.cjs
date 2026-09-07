const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

const customConfirmHtml = `
    <!-- Custom Confirm Modal -->
    <div class="edit-modal-overlay" id="customConfirmOverlay" style="z-index: 3000;">
        <div class="edit-modal" style="text-align: center; max-width: 300px;">
            <h2 style="margin-top: 0; color: #ff6b6b; font-size: 18px;">Potvrda Brisanja</h2>
            <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin-bottom: 24px;">Da li ste sigurni da želite da obrišete ovaj album? Ovo se ne može opozvati.</p>
            <div style="display: flex; gap: 12px; justify-content: center;">
                <button class="edit-modal-btn" id="confirmCancelBtn" style="flex: 1; background: transparent; border: 1px solid #555;">Odustani</button>
                <button class="edit-modal-btn" id="confirmOkBtn" style="flex: 1; background: #ff6b6b; color: #fff; border: none; font-weight: bold;">Obriši</button>
            </div>
        </div>
    </div>
`;

// Insert the HTML just before the scripts
html = html.replace('    <script type="importmap">', customConfirmHtml + '\n    <script type="importmap">');

// Now replace the delete button logic to use this custom modal
const oldDeleteLogic = `        const editDeleteBtn = document.getElementById("editDeleteBtn");
        if(editDeleteBtn) {
            editDeleteBtn.addEventListener("click", () => {
                if (lastIndex >= 0 && lastIndex < collection.length) {
                    if(confirm("Da li ste sigurni da želite da obrišete ovaj album? Ovo se ne može opozvati.")) {
                        const item = collection[lastIndex];
                        const folderKey = item.folder || item.name;
                        
                        // Remove from overrides
                        const overrides = JSON.parse(localStorage.getItem('vinyl_album_overrides_v1') || '{}');
                        overrides[folderKey] = { ...overrides[folderKey], deleted: true };
                        localStorage.setItem('vinyl_album_overrides_v1', JSON.stringify(overrides));
                        
                        // Remove from collections
                        collection.splice(lastIndex, 1);
                        const origIndex = originalCollection.findIndex(x => (x.folder || x.name) === folderKey);
                        if(origIndex !== -1) originalCollection.splice(origIndex, 1);
                        
                        closeEditModal();
                    }
                }
            });
        }`;

const newDeleteLogic = `        const editDeleteBtn = document.getElementById("editDeleteBtn");
        const customConfirmOverlay = document.getElementById("customConfirmOverlay");
        const confirmCancelBtn = document.getElementById("confirmCancelBtn");
        const confirmOkBtn = document.getElementById("confirmOkBtn");

        if(editDeleteBtn) {
            editDeleteBtn.addEventListener("click", () => {
                if (lastIndex >= 0 && lastIndex < collection.length) {
                    customConfirmOverlay.classList.add("active");
                }
            });
        }
        
        if (confirmCancelBtn && confirmOkBtn) {
            confirmCancelBtn.addEventListener("click", () => {
                customConfirmOverlay.classList.remove("active");
            });
            confirmOkBtn.addEventListener("click", () => {
                customConfirmOverlay.classList.remove("active");
                if (lastIndex >= 0 && lastIndex < collection.length) {
                    const item = collection[lastIndex];
                    const folderKey = item.folder || item.name;
                    
                    // Remove from overrides
                    const overrides = JSON.parse(localStorage.getItem('vinyl_album_overrides_v1') || '{}');
                    overrides[folderKey] = { ...overrides[folderKey], deleted: true };
                    localStorage.setItem('vinyl_album_overrides_v1', JSON.stringify(overrides));
                    
                    // Remove from collections
                    collection.splice(lastIndex, 1);
                    const origIndex = originalCollection.findIndex(x => (x.folder || x.name) === folderKey);
                    if(origIndex !== -1) originalCollection.splice(origIndex, 1);
                    
                    closeEditModal();
                }
            });
        }`;

html = html.replace(oldDeleteLogic, newDeleteLogic);

fs.writeFileSync('public/archive.html', html);
