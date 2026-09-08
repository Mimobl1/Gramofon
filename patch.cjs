const fs = require('fs');
let code = fs.readFileSync('public/vinyl-player.html', 'utf8');
code = code.replace(
  `        elapsedMs=0;\n        return;\n      }\n      if(type==="play"){\n        // Unlock deckAudio synchronously to prevent NotAllowedError later in timeout\n        try { if (!deckAudio.src) { deckAudio.src = "data:audio/mp3;base64,//MkxAA"; } deckAudio.play().then(()=>deckAudio.pause()).catch(()=>{}); } catch(_) {}\n        \n        if(playing || playT) return;`,
  `        elapsedMs=0;\n        setTimer(getSideDuration());\n        setTonearmAngle(ARM_REST_ANGLE, true);\n        return;\n      }\n      if(type==="play"){\n        if(playing || playT) return;`
);
fs.writeFileSync('public/vinyl-player.html', code);
