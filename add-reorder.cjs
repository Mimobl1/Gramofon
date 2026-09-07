const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

const reorderHtml = `
    <!-- Reorder Modal -->
    <div class="edit-modal-overlay" id="reorderModalOverlay" style="z-index: 2500;">
        <div class="edit-modal" style="max-height: 80vh; max-width: 450px; display: flex; flex-direction: column;">
            <h2 style="margin-top: 0; margin-bottom: 16px;">Reorder Albums</h2>
            <div id="reorderList" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding-right: 8px; margin-bottom: 16px;">
                <!-- items go here -->
            </div>
            <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button class="edit-modal-btn cancel" id="reorderCancelBtn">Cancel</button>
                <button class="edit-modal-btn save" id="reorderSaveBtn">Save Order</button>
            </div>
        </div>
    </div>
    <style>
        .reorder-item {
            background: #222;
            border: 1px solid #333;
            padding: 12px 16px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: grab;
            user-select: none;
            transition: background 0.2s, transform 0.1s;
        }
        .reorder-item:active {
            cursor: grabbing;
        }
        .reorder-item.dragging {
            opacity: 0.5;
            background: #333;
        }
        .reorder-item.drag-over {
            border-top: 2px solid #fff;
        }
    </style>
`;

html = html.replace('<!-- Custom Confirm Modal -->', reorderHtml + '\n    <!-- Custom Confirm Modal -->');

// Add "Reorder" button to edit modal header
const oldEditHeader = `<h2 style="margin: 0;">Uredi Album</h2>`;
const newEditHeader = `<div style="display: flex; align-items: center; gap: 12px;"><h2 style="margin: 0;">Uredi Album</h2><button class="edit-modal-btn" id="openReorderBtn" style="background: rgba(255,255,255,0.1); border: none; font-size: 11px; padding: 4px 8px;">Reorder</button></div>`;
html = html.replace(oldEditHeader, newEditHeader);

fs.writeFileSync('public/archive.html', html);
