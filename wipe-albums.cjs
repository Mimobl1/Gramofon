const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

// Also inject a small piece of JS to clear indexedDB and localStorage on load just once for this turn to reset to defaults.
const scriptTag = `<script>
    // Reset script to wipe defaults requested by user
    if(!localStorage.getItem('wiped_defaults_v1')){
        localStorage.removeItem('vinyl_album_overrides_v1');
        indexedDB.deleteDatabase("VinylCollectionDB");
        localStorage.setItem('wiped_defaults_v1', 'true');
        location.reload();
    }
</script>
</body>`;
html = html.replace('</body>', scriptTag);

fs.writeFileSync('public/archive.html', html);
