const fs = require('fs');
let html = fs.readFileSync('public/vinyl-player.html', 'utf-8');

html = html.replace('try { await deckAudio.play(); console.log("deckAudio is playing!"); } catch(e) { console.error("deckAudio play failed", e); }', 
`try { 
  const p = deckAudio.play();
  if (p !== undefined) {
    p.then(() => console.log("deckAudio is playing!")).catch(e => console.error("deckAudio play failed", e));
  }
} catch(e) { 
  console.error("deckAudio play failed sync", e); 
}`);

fs.writeFileSync('public/vinyl-player.html', html);
