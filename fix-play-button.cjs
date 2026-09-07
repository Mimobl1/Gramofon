const fs = require('fs');
let html = fs.readFileSync('public/vinyl-player.html', 'utf-8');

const target1 = `        if (!absoluteUrl) {
            a.src = "/music/" + fullPath;
        } else {
            a.src = absoluteUrl;
        }`;

const replacement1 = `        if (!absoluteUrl) {
            a.src = "/music/" + fullPath;
        } else {
            a.src = absoluteUrl;
        }
        
        a.onloadedmetadata=()=>{
          resolve(a.duration);
        };
        a.onerror=()=>{
          resolve(0);
        };`;

// Note: The above is a bit messy because of the async early return. 
// Let's rewrite the duration promise to handle both sync and async paths properly.
