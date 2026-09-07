const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf8');

// Replace CSS
const cssTarget = html.substring(html.indexOf('.feedback-modal {'), html.indexOf('.feedback-snackbar.on {') + 200);
// Let's find the exact end of .feedback-snackbar.on
const cssEnd = html.indexOf('}', html.indexOf('.feedback-snackbar.on {')) + 1;
const cssToRemove = html.substring(html.indexOf('.feedback-modal {'), cssEnd);

const newCss = `
        .bottom-bar {
            width: 100%;
            padding: 40px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            align-items: center;
            position: absolute;
            bottom: 0;
            gap: 16px;
            pointer-events: auto;
        }
        .upload-btn {
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            color: #fff;
            padding: 10px 24px;
            border-radius: 30px;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 2px;
            cursor: pointer;
            transition: background 0.2s, border-color 0.2s;
        }
        .upload-btn:hover {
            background: rgba(255,255,255,0.2);
            border-color: rgba(255,255,255,0.4);
        }
        .genres-pills {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            justify-content: center;
        }
        .genre-pill {
            background: transparent;
            border: 1px solid rgba(255,255,255,0.15);
            color: rgba(255,255,255,0.6);
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .genre-pill.active {
            background: #fff;
            color: #000;
            border-color: #fff;
        }
        .genre-pill:hover:not(.active) {
            background: rgba(255,255,255,0.1);
            color: #fff;
        }
`;
html = html.replace(cssToRemove, newCss.trim());

// Remove HTML
const htmlStart = html.indexOf('<div class="feedback-modal" id="feedbackModal" aria-hidden="true">');
const htmlEnd = html.indexOf('<div id="now-playing-badge">Now Playing</div>');
const htmlToRemove = html.substring(htmlStart, htmlEnd);
html = html.replace(htmlToRemove, '');

// Add HTML for Bottom bar
const uiOverlayEnd = html.indexOf('</div>', html.indexOf('</a>')) + 6; 
// Wait, the uiOverlayEnd is tricky. Let's replace the whole ui-overlay
const newUiOverlay = `<div class="ui-overlay">
        <div class="top-bar">
            <div class="counter-text" id="counter">
                0 Albums
            </div>
            <div class="archive-title">Album Archive</div>
            <a class="top-nav-btn" href="vinyl-player.html" aria-label="Open Player" id="playerNavLink">
                Player
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </a>
        </div>
        <div class="bottom-bar">
            <button class="upload-btn" id="uploadBtn">Upload</button>
            <div class="genres-pills" id="genresContainer">
                <button class="genre-pill active" data-genre="ALL">ALL</button>
                <button class="genre-pill" data-genre="ROCK">ROCK</button>
                <button class="genre-pill" data-genre="BLUES">BLUES</button>
                <button class="genre-pill" data-genre="JAZZ">JAZZ</button>
                <button class="genre-pill" data-genre="POP">POP</button>
                <button class="genre-pill" data-genre="SOUL">SOUL</button>
            </div>
        </div>
    </div>`;
const oldUiOverlayStart = html.indexOf('<div class="ui-overlay">');
const oldUiOverlayEnd = html.indexOf('</div>\n    </div>', oldUiOverlayStart) + 16;
html = html.replace(html.substring(oldUiOverlayStart, oldUiOverlayEnd), newUiOverlay);

// Remove JS vars
html = html.replace(/let feedbackSelectionCount = 0;[\s\S]*?let feedbackSent = false;/g, '');
html = html.replace(/function clearFeedbackTimer\(\) \{[\s\S]*?function onAlbumSelectionForFeedback.*?\{[\s\S]*?\}\n        \}/g, '');
// Wait, regex might fail. Let's do indexOf
fs.writeFileSync('public/archive.html', html);
