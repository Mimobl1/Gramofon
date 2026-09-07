const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

const switchCss = `
        /* Custom Switch */
        .switch { position: relative; display: inline-block; width: 36px; height: 20px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #444; transition: .4s; border-radius: 20px; }
        .slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
        input:checked + .slider { background-color: #28a745; }
        input:checked + .slider:before { transform: translateX(16px); }
`;

html = html.replace('    </style>', switchCss + '\n    </style>');

const modalAdditions = `            </label>
            <div style="margin-top: 8px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-size: 13px; font-weight: bold; color: #ddd;">Prilagođena slika omota</span>
                    <label class="switch">
                        <input type="checkbox" id="editAlbumCustomCoverToggle">
                        <span class="slider"></span>
                    </label>
                </div>
                <div id="editAlbumCustomCoverContainer" style="display: none;">
                    <input type="file" id="editAlbumCustomCoverInput" accept="image/*" style="display: none;">
                    <button id="editAlbumCustomCoverBtn" type="button" style="width: 100%; background: #222; border: 1px dashed #555; padding: 12px; border-radius: 8px; color: #aaa; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.borderColor='#888'; this.style.color='#ccc'" onmouseout="this.style.borderColor='#555'; this.style.color='#aaa'">Odaberi sliku...</button>
                    <div style="position: relative;">
                        <img id="editAlbumCustomCoverPreview" style="width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 8px; margin-top: 8px; display: none; border: 1px solid #333;">
                        <button id="editAlbumCustomCoverRemoveBtn" style="display: none; position: absolute; top: 16px; right: 8px; background: rgba(0,0,0,0.6); color: white; border: none; border-radius: 50%; width: 28px; height: 28px; cursor: pointer; font-weight: bold; font-size: 12px;" title="Ukloni sliku">✕</button>
                    </div>
                </div>
            </div>`;

html = html.replace('            </label>\n            <div class="edit-modal-actions"', modalAdditions + '\n            <div class="edit-modal-actions"');

fs.writeFileSync('public/archive.html', html);
