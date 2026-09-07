const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

html = html.replace(
    'ctx.fillStyle = desaturateAndDarken(item.color || "", 0.5, 0.38);',
    'ctx.fillStyle = desaturateAndDarken(item.color || "", 0.0, 0.45);'
);

fs.writeFileSync('public/archive.html', html);
