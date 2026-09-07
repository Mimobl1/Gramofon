const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

html = html.replace(
/const texture = generateCoverTexture\(collection\[lastIndex\], 1024\);\s*const isCustom = item\.customCover && item\.useCustomCover !== false;/g,
`const item = collection[lastIndex];
                        const texture = generateCoverTexture(item, 1024);
                        const isCustom = item.customCover && item.useCustomCover !== false;`
);

fs.writeFileSync('public/archive.html', html);
