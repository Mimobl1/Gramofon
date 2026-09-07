const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const fs = require('fs');
const html = fs.readFileSync('public/archive.html', 'utf-8');

const mockHtml = `
<html>
<body>
<div id="editDeleteBtn"></div>
<script>
let lastIndex = 0;
let collection = [{folder: 'test'}];
let originalCollection = [{folder: 'test'}];
const localStorage = {
  getItem: () => '{}',
  setItem: (k,v) => console.log('set', k, v)
};
const closeEditModal = () => console.log('closed');

const editDeleteBtn = document.getElementById("editDeleteBtn");
if(editDeleteBtn) {
    editDeleteBtn.addEventListener("click", () => {
        if (lastIndex >= 0 && lastIndex < collection.length) {
            if(true) { // mocked confirm
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

editDeleteBtn.click();
console.log(collection, originalCollection);
</script>
</body>
</html>
`;
const dom = new JSDOM(mockHtml, { runScripts: "dangerously" });
