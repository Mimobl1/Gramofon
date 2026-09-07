const fs = require('fs');
let html = fs.readFileSync('public/vinyl-player.html', 'utf-8');

const oldCSS = `.record-stage{position:absolute;inset:0;transform:perspective(1400px) translateX(var(--drop-x,0px)) rotate(var(--drop-rot,0deg)) scale(var(--lift-scale,1));transform-origin:center;transform-style:preserve-3d;backface-visibility:visible;transition:transform 700ms cubic-bezier(0.16, 1, 0.3, 1), opacity 220ms cubic-bezier(0.16, 1, 0.3, 1);z-index:3;opacity:1;will-change:transform}`;
const newCSS = `.record-stage{position:absolute;inset:0;transform:perspective(1400px) translateX(var(--drop-x,0px)) rotate(var(--drop-rot,0deg)) scale(var(--lift-scale,1)) rotateY(var(--flip-rot,0deg));transform-origin:center;transform-style:preserve-3d;backface-visibility:visible;transition:transform 700ms cubic-bezier(0.16, 1, 0.3, 1), opacity 220ms cubic-bezier(0.16, 1, 0.3, 1);z-index:3;opacity:1;will-change:transform}`;

html = html.replace(oldCSS, newCSS);
fs.writeFileSync('public/vinyl-player.html', html);
