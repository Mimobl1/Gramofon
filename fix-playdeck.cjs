const fs = require('fs');
let html = fs.readFileSync('public/vinyl-player.html', 'utf-8');

html = html.replace('const playDeckTrack=async()=>{\n      ensureTrackIndexInCurrentSide();\n      setDeckSourceByIndex(currentTrackIndex);\n      try { await deckAudio.play(); } catch(_) {}', 'const playDeckTrack=async()=>{\n      ensureTrackIndexInCurrentSide();\n      await setDeckSourceByIndex(currentTrackIndex);\n      try { await deckAudio.play(); } catch(_) {}');

fs.writeFileSync('public/vinyl-player.html', html);
