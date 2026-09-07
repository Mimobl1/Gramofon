const fs = require('fs');
let html = fs.readFileSync('public/vinyl-player.html', 'utf-8');

html = html.replace('const stopDeckTrack=()=>{', 'const stopDeckTrack=async()=>{');
html = html.replace('setDeckSourceByIndex(currentTrackIndex);\n    };', 'await setDeckSourceByIndex(currentTrackIndex);\n    };'); // in stopDeckTrack

html = html.replace('const seekTrackByOffset=(offsetMs)=>{', 'const seekTrackByOffset=async(offsetMs)=>{');
html = html.replace('setDeckSourceByIndex(currentTrackIndex);\n          try { deckAudio.currentTime', 'await setDeckSourceByIndex(currentTrackIndex);\n          try { deckAudio.currentTime');

html = html.replace('const syncTrackFromElapsed=()=>{', 'const syncTrackFromElapsed=async()=>{');
html = html.replace('setDeckSourceByIndex(currentTrackIndex);\n        syncTrackFromElapsed();', 'await setDeckSourceByIndex(currentTrackIndex);\n        await syncTrackFromElapsed();'); // in onmouseup (line 1847)
html = html.replace('setDeckSourceByIndex(currentTrackIndex);\n        speed = 0;', 'await setDeckSourceByIndex(currentTrackIndex);\n        speed = 0;'); // in flip btn

html = html.replace('const loadArchiveSelection = (selected, fromQuery=false) => {', 'const loadArchiveSelection = async (selected, fromQuery=false) => {');
html = html.replace('setDeckSourceByIndex(currentTrackIndex);\n        loadSideDurationsFromMetadata()', 'await setDeckSourceByIndex(currentTrackIndex);\n        loadSideDurationsFromMetadata()');

html = html.replace('setDeckSourceByIndex(currentTrackIndex);\n      syncDisplay();', 'await setDeckSourceByIndex(currentTrackIndex);\n      syncDisplay();'); // in loadArchiveSelection

fs.writeFileSync('public/vinyl-player.html', html);
