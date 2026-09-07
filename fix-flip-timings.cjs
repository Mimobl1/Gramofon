const fs = require('fs');
let html = fs.readFileSync('public/vinyl-player.html', 'utf-8');

html = html.replace('const LIFT_DOWN_MS=500;', 'const LIFT_DOWN_MS=850;');
html = html.replace(
'          recordStage.style.transition = `transform ${LIFT_UP_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;',
'          recordStage.style.transition = `transform ${LIFT_UP_MS}ms ease-in`;'
);
html = html.replace(
'          recordStage.style.transition = `transform ${FLIP_IN_MS}ms ease-in`; // ease-in',
'          recordStage.style.transition = `transform ${FLIP_IN_MS}ms linear`;'
);
html = html.replace(
'          recordStage.style.transition = `transform ${FLIP_OUT_MS}ms ease-out`; // ease-out',
'          recordStage.style.transition = `transform ${FLIP_OUT_MS}ms linear`;'
);

fs.writeFileSync('public/vinyl-player.html', html);
