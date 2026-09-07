const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

const oldStyle = 'style="display:none; position:fixed; bottom:20px; left:20px; background:rgba(0,0,0,0.8); padding:10px 20px; border-radius:8px; color:#00ff00; z-index:9999; font-weight:bold; font-family:monospace; border:1px solid #333; box-shadow:0 4px 12px rgba(0,0,0,0.5);"';
const newStyle = 'style="display:none; position:fixed; bottom:20px; left:20px; background:rgba(10,10,10,0.85); backdrop-filter:blur(10px); padding:12px 24px; border-radius:12px; color:#e5e5e5; z-index:9999; font-weight:500; font-family:\'Roboto\', sans-serif; border:1px solid rgba(255,255,255,0.1); box-shadow:0 8px 24px rgba(0,0,0,0.5); font-size:14px; letter-spacing:1px; text-transform:uppercase;"';

html = html.replace(oldStyle, newStyle);

fs.writeFileSync('public/archive.html', html);
