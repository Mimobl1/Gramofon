const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf8');

const docReadyStart = html.indexOf('document.addEventListener("DOMContentLoaded", async () => {');
const jsStart = html.indexOf('document.getElementById("feedbackCancelBtn")', docReadyStart);
const jsEnd = html.indexOf('// Verify collection source before app init so archive is ready immediately.');

if(jsStart !== -1 && jsEnd !== -1) {
    html = html.substring(0, jsStart) + html.substring(jsEnd);
}

// Remove remaining feedback logic variables
html = html.replace(/let feedbackSelectionCount = 0;[\s\S]*?let feedbackSent = false;/g, '');
html = html.replace(/function clearFeedbackTimer[\s\S]*?function ensureArchiveFontsReady/g, 'function ensureArchiveFontsReady');
// Remove onAlbumSelectionForFeedback calls
html = html.replace(/onAlbumSelectionForFeedback\(selected\);/g, '');

fs.writeFileSync('public/archive.html', html);
