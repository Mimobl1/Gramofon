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

html = html.replace('    <div class="edit-modal-overlay" id="editModalOverlay">', customConfirmHtml + '    <div class="edit-modal-overlay" id="editModalOverlay">');

fs.writeFileSync('public/archive.html', html);
