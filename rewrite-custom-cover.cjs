const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

// 1. HTML Replace
const oldHtmlStart = '<div style="margin-top: 8px; margin-bottom: 12px;">';
const oldHtmlEnd = '</div>\n            </div>';
// We'll use regex to replace the whole block

const newHtml = `<div style="margin-top: 8px; margin-bottom: 12px; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px; border: 1px solid #333;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 13px; font-weight: bold; color: #ddd;">Slika omota</span>
                        
                        <input type="file" id="editAlbumCustomCoverInput" accept="image/*" style="display: none;">
                        <div id="editAlbumCustomCoverPreviewContainer" style="display: none; position: relative; width: 36px; height: 36px;">
                            <img id="editAlbumCustomCoverPreview" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px; border: 1px solid #555;">
                            <button id="editAlbumCustomCoverRemoveBtn" type="button" style="position: absolute; top: -6px; right: -6px; background: #ff4444; color: white; border: none; border-radius: 50%; width: 16px; height: 16px; cursor: pointer; font-weight: bold; font-size: 10px; padding: 0; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.5);" title="Ukloni sliku">✕</button>
                        </div>
                        <button id="editAlbumCustomCoverBtn" type="button" style="background: #222; border: 1px dashed #555; height: 36px; padding: 0 12px; border-radius: 6px; color: #aaa; cursor: pointer; transition: all 0.2s; font-size: 12px;" onmouseover="this.style.borderColor='#888'; this.style.color='#ccc'" onmouseout="this.style.borderColor='#555'; this.style.color='#aaa'">Odaberi...</button>
                    </div>

                    <label class="switch" title="Prikaži sliku na omotu">
                        <input type="checkbox" id="editAlbumCustomCoverToggle">
                        <span class="slider"></span>
                    </label>
                </div>
            </div>`;

html = html.replace(/<div style="margin-top: 8px; margin-bottom: 12px;">\s*<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">[\s\S]*?<\/div>\s*<\/div>/, newHtml);

// 2. applyCollectionData
html = html.replace(
    'customCover: folderOverrides.customCover || item.customCover || ""',
    'customCover: folderOverrides.customCover || item.customCover || "",\n                    useCustomCover: folderOverrides.useCustomCover !== undefined ? folderOverrides.useCustomCover : (item.useCustomCover !== undefined ? item.useCustomCover : true)'
);

// 3. generateCoverTexture
html = html.replace(
    'if (item.customCover) {',
    'if (item.customCover && item.useCustomCover !== false) {'
);

// 4. autoSaveEdits
html = html.replace(
    'overrides[folderKey].customCover = item.customCover || "";',
    'overrides[folderKey].customCover = item.customCover || "";\n                overrides[folderKey].useCustomCover = item.useCustomCover !== false;'
);

fs.writeFileSync('public/archive.html', html);
