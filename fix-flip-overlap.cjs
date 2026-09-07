const fs = require('fs');
let html = fs.readFileSync('public/vinyl-player.html', 'utf-8');

html = html.replace(
'        await sleep(LIFT_UP_MS);',
'        await sleep(LIFT_UP_MS - 120);'
);

html = html.replace(
'        await sleep(FLIP_OUT_MS);',
'        await sleep(FLIP_OUT_MS - 120);'
);

fs.writeFileSync('public/vinyl-player.html', html);
