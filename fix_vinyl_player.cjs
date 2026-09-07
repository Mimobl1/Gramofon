const fs = require('fs');
let html = fs.readFileSync('public/vinyl-player.html', 'utf8');

const setDeckSourceLogic = `
    const setDeckSourceByIndex=(idx)=>{
      const trackName = albumTracks[idx];
      if(!trackName) return;
      
      let fullPath = trackName;
      if (currentAlbumFolder && !trackName.startsWith(currentAlbumFolder)) {
          fullPath = currentAlbumFolder + "/" + trackName;
      }
      
      let absoluteUrl = "";
      if (currentAlbumFolder && currentAlbumFolder.startsWith("LOCAL://")) {
          const albumId = currentAlbumFolder.replace("LOCAL://", "");
          const localFiles = (window.parent && window.parent.__localUploadedFiles) ? window.parent.__localUploadedFiles[albumId] : null;
          if (localFiles) {
              const file = localFiles.find(f => f.name === trackName);
              if (file) {
                  absoluteUrl = URL.createObjectURL(file);
              }
          }
      }
      
      if (!absoluteUrl) {
          absoluteUrl = new URL(encodeURI(fullPath), window.location.href).href;
      }
      
      if(deckAudio.src !== absoluteUrl){
        console.log("Setting deck source to:", absoluteUrl);
        deckAudio.src = absoluteUrl;
      }
    };
`;

html = html.replace(/const setDeckSourceByIndex=\(idx\)=>\{[\s\S]*?deckAudio\.src = absoluteUrl;\n      \}\n    \};/, setDeckSourceLogic);

const readDurationLogic = `
      const readDuration=(src)=>new Promise((resolve)=>{
        const a=new Audio();
        a.preload="metadata";
        let absoluteUrl = "";
        
        if (currentAlbumFolder && currentAlbumFolder.startsWith("LOCAL://")) {
            const albumId = currentAlbumFolder.replace("LOCAL://", "");
            const localFiles = (window.parent && window.parent.__localUploadedFiles) ? window.parent.__localUploadedFiles[albumId] : null;
            if (localFiles) {
                const file = localFiles.find(f => f.name === src);
                if (file) {
                    absoluteUrl = URL.createObjectURL(file);
                }
            }
        }
        
        if (!absoluteUrl) {
            let fullPath = src;
            if (currentAlbumFolder && !src.startsWith(currentAlbumFolder)) {
                fullPath = currentAlbumFolder + "/" + src;
            }
            absoluteUrl = encodeURI(fullPath);
        }
        
        a.src=absoluteUrl;
        const done=(value)=>resolve(Number.isFinite(value)&&value>0?value:180);
        a.addEventListener("loadedmetadata",()=>done(a.duration),{once:true});
        a.addEventListener("error",()=>done(180),{once:true});
        setTimeout(()=>done(180),2500);
      });
`;

html = html.replace(/const readDuration=\(src\)=>new Promise\(\(resolve\)=>\{[\s\S]*?setTimeout\(\(\)=>done\(180\),2500\);\n      \}\);/, readDurationLogic);

fs.writeFileSync('public/vinyl-player.html', html);
