const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

html = html.replace('if(confirm("Da li ste sigurni da želite da obrišete album: " + item.name + "?")) {', `if(confirm("Da li ste sigurni da želite da obrišete album: " + item.name + "?")) {`);
// Let's replace the whole deleteAlbumBtn logic to use a custom confirm dialog, just in case native confirm is blocked or buggy.
