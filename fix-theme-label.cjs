const fs = require('fs');
let html = fs.readFileSync('public/vinyl-player.html', 'utf-8');

const oldLogic = `        if (isLightTheme) {
            mutedLabel = desaturateAndToneHex(color, 0.25, 0.05) || color;
            vinylLabel.style.opacity = '1';
        } else {
            const norm = normalizeHexColor(color);
            if (norm) {
                const r = parseInt(norm.slice(1,3), 16);
                const g = parseInt(norm.slice(3,5), 16);
                const b = parseInt(norm.slice(5,7), 16);
                const gray = (r + g + b) / 3;
                const d = 0.35; // desaturate by 35%
                const k = 0.05; // darken by 5%
                const nr = Math.round((r * (1 - d) + gray * d) * (1 - k));
                const ng = Math.round((g * (1 - d) + gray * d) * (1 - k));
                const nb = Math.round((b * (1 - d) + gray * d) * (1 - k));
                mutedLabel = \`rgb(\${nr}, \${ng}, \${nb})\`;
            }
            vinylLabel.style.opacity = '0.7';
        }
        vinylLabel.style.background = mutedLabel;`;

const newLogic = `        // Let CSS handle the theme-based opacity and filtering
        vinylLabel.style.background = color;`;

html = html.replace(oldLogic, newLogic);

// Now inject the CSS rules
const cssInjectionPoint = `.vinyl-label:active{cursor:grabbing}`;
const cssRules = `.vinyl-label:active{cursor:grabbing}
    body[data-theme="dark"] .vinyl-label {
      opacity: 0.7 !important;
      filter: brightness(0.6) saturate(0.6) !important;
    }
    body[data-theme="light"] .vinyl-label {
      opacity: 1 !important;
      filter: brightness(1.05) saturate(0.8) !important;
    }`;

html = html.replace(cssInjectionPoint, cssRules);

fs.writeFileSync('public/vinyl-player.html', html);
