const fs = require('fs');
let html = fs.readFileSync('public/vinyl-player.html', 'utf-8');

html = html.replace('try { await deckAudio.play(); } catch(_) {}', 'try { await deckAudio.play(); console.log("deckAudio is playing!"); } catch(e) { console.error("deckAudio play failed", e); }');

fs.writeFileSync('public/vinyl-player.html', html);
