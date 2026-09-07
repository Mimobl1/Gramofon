const fs = require('fs');

// 1. Update archive.html
let archiveHtml = fs.readFileSync('public/archive.html', 'utf-8');

archiveHtml = archiveHtml.replace(
    /metalness: isCustom \? 1\.0 : 0\.65/g,
    'metalness: isCustom ? 0.75 : 0.65'
);

archiveHtml = archiveHtml.replace(
    /roughness: isCustom \? 0\.2 : 0\.5/g,
    'roughness: isCustom ? 0.25 : 0.5'
);

fs.writeFileSync('public/archive.html', archiveHtml);

// 2. Update vinyl-player.html
let playerHtml = fs.readFileSync('public/vinyl-player.html', 'utf-8');

playerHtml = playerHtml.replace(/--vin-noise-opacity:\.42;/g, '--vin-noise-opacity:.55;');

const oldLabelLogic = `const isLightTheme = document.body?.dataset?.theme === "light";
        const mutedLabel = desaturateAndToneHex(color, 0.0, isLightTheme ? 0.08 : 0.04) || color;
        vinylLabel.style.background = mutedLabel;`;

const newLabelLogic = `const isLightTheme = document.body?.dataset?.theme === "light";
        let mutedLabel = color;
        if (isLightTheme) {
            mutedLabel = desaturateAndToneHex(color, 0.0, 0.08) || color;
        } else {
            const norm = normalizeHexColor(color);
            if (norm) {
                const r = parseInt(norm.slice(1,3), 16);
                const g = parseInt(norm.slice(3,5), 16);
                const b = parseInt(norm.slice(5,7), 16);
                const gray = (r + g + b) / 3;
                const d = 0.3; // desaturate by 30%
                const k = 0.25; // darken by 25%
                const nr = Math.round((r * (1 - d) + gray * d) * (1 - k));
                const ng = Math.round((g * (1 - d) + gray * d) * (1 - k));
                const nb = Math.round((b * (1 - d) + gray * d) * (1 - k));
                mutedLabel = \`rgb(\${nr}, \${ng}, \${nb})\`;
            }
        }
        vinylLabel.style.background = mutedLabel;`;

playerHtml = playerHtml.replace(oldLabelLogic, newLabelLogic);

fs.writeFileSync('public/vinyl-player.html', playerHtml);
