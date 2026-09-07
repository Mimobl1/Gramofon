const fs = require('fs');
let html = fs.readFileSync('public/vinyl-player.html', 'utf-8');

html = html.replace('loadSideDurationsFromMetadata().catch(()=>{});', 'loadSideDurationsFromMetadata().catch(e => console.error("loadSideDurationsFromMetadata error", e));');

fs.writeFileSync('public/vinyl-player.html', html);
