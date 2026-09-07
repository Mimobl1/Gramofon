const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf8');

// Replace newCss inserted earlier
const cssOldStart = html.indexOf('.bottom-bar {');
const cssOldEnd = html.indexOf('</style>', cssOldStart);
const oldCss = html.substring(cssOldStart, cssOldEnd);

const newCss = `.left-sidebar {
            position: absolute;
            left: 40px;
            top: 50%;
            transform: translateY(-50%);
            display: flex;
            flex-direction: column;
            gap: 12px;
            pointer-events: auto;
            align-items: center;
        }
        .bottom-bar {
            position: absolute;
            bottom: 40px;
            left: 50%;
            transform: translateX(-50%);
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
            width: 100%;
            text-align: center;
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
html = html.replace(oldCss, newCss + '\n    ');

const uiOverlayOld = html.substring(html.indexOf('<div class="ui-overlay">'), html.indexOf('</div>\n    </div>', html.indexOf('<div class="ui-overlay">')) + 16);

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
        <div class="left-sidebar" id="genresContainer">
            <button class="genre-pill active" data-genre="ALL">ALL</button>
            <button class="genre-pill" data-genre="ROCK">ROCK</button>
            <button class="genre-pill" data-genre="BLUES">BLUES</button>
            <button class="genre-pill" data-genre="JAZZ">JAZZ</button>
            <button class="genre-pill" data-genre="POP">POP</button>
            <button class="genre-pill" data-genre="SOUL">SOUL</button>
        </div>
        <div class="bottom-bar">
            <label for="folderUpload" class="upload-btn" id="uploadBtn">Upload</label>
            <input type="file" id="folderUpload" webkitdirectory directory multiple style="display: none;" />
        </div>
    </div>`;
html = html.replace(uiOverlayOld, newUiOverlay);
fs.writeFileSync('public/archive.html', html);
