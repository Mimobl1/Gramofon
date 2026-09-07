const fs = require('fs');
let html = fs.readFileSync('public/vinyl-player.html', 'utf-8');

const unlockCode = `
    let audioUnlocked = false;
    function unlockAudio() {
        if(audioUnlocked) return;
        audioUnlocked = true;
        const audios = [deckAudio, vinylNoiseAudio, sleeveSound, startCueAudio, clickSound, powerSound];
        audios.forEach(a => {
            if(a) {
                a.play().then(() => {
                    a.pause();
                }).catch(() => {});
            }
        });
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
    }
    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
`;

html = html.replace('// ----- UI & Interaction -----', unlockCode + '\n    // ----- UI & Interaction -----');

fs.writeFileSync('public/vinyl-player.html', html);
