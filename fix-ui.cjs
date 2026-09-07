const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

// Remove editDeleteBtn from edit modal
const oldEditDelete = `<button class="edit-modal-btn" id="editDeleteBtn" style="background: rgba(220, 53, 69, 0.1); border: 1px solid rgba(220, 53, 69, 0.3); color: #ff6b6b; margin-top: auto;">Delete Album</button>`;
html = html.replace(oldEditDelete, '');

// The delete logic from confirmOkBtn is perfectly suited for the top delete button!
// I'll make sure the confirmOkBtn is linked properly.

fs.writeFileSync('public/archive.html', html);
