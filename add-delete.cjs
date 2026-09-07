const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

const jsCode = `
        const editDeleteBtn = document.getElementById("editDeleteBtn");
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
        }
`;

html = html.replace(
  'editCloseBtn.addEventListener("click", closeEditModal);',
  'editCloseBtn.addEventListener("click", closeEditModal);\n' + jsCode
);

fs.writeFileSync('public/archive.html', html);
