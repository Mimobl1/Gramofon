const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

html = html.replace(
  '            <h2>Uredi Album</h2>',
  '            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">\n                <h2 style="margin: 0;">Uredi Album</h2>\n                <div id="editAlbumColorSwatch" style="width: 28px; height: 28px; border-radius: 50%; border: 2px solid #555; cursor: pointer; transition: transform 0.2s; box-sizing: border-box; flex-shrink: 0;" onmouseover="this.style.transform=\'scale(1.15)\'" onmouseout="this.style.transform=\'scale(1)\'" title="Izaberi boju ploče"></div>\n            </div>\n            <input type="hidden" id="editAlbumColor" value="#1a1a1a">'
);

const colorFieldStart = html.indexOf('            <div class="edit-modal-field">\n                Boja (Hex)');
const colorFieldEnd = html.indexOf('            <div class="edit-modal-actions" style="display: none;">');
if(colorFieldStart !== -1 && colorFieldEnd !== -1) {
    html = html.substring(0, colorFieldStart) + html.substring(colorFieldEnd);
}

html = html.replace(
  '            <div class="edit-modal-actions" style="display: none;">\n                <button class="edit-modal-btn save" id="editCloseBtn" style="width: 100%; display: none;">Zatvori</button>\n            </div>',
  '            <div class="edit-modal-actions" style="margin-top: 24px; border-top: 1px solid #333; padding-top: 16px;">\n                <button class="edit-modal-btn" id="editDeleteBtn" style="width: 100%; background: rgba(220, 53, 69, 0.15); color: #ff6b6b; border: 1px solid rgba(220, 53, 69, 0.4); padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background=\'rgba(220, 53, 69, 0.3)\'" onmouseout="this.style.background=\'rgba(220, 53, 69, 0.15)\'">Obriši Album</button>\n                <button class="edit-modal-btn save" id="editCloseBtn" style="display: none;">Zatvori</button>\n            </div>'
);

fs.writeFileSync('public/archive.html', html);
