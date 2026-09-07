const fs = require('fs');
let html = fs.readFileSync('public/vinyl-player.html', 'utf-8');

const oldReadDur = `                    if (album && album.files) {
                        const file = album.files.find(f => f.name === src);
                        if (file) {
                            const blob = new Blob([file.data], { type: file.type || "audio/mpeg" });
                            absoluteUrl = URL.createObjectURL(blob);
                        }
                    }`;

const newReadDur = `                    if (album && album.files) {
                        const file = album.files.find(f => f.name === src);
                        console.log("readDuration finding file", src, !!file);
                        if (file) {
                            const blob = new Blob([file.data], { type: file.type || "audio/mpeg" });
                            absoluteUrl = URL.createObjectURL(blob);
                            console.log("Created blob url:", absoluteUrl);
                        }
                    }`;

html = html.replace(oldReadDur, newReadDur);

fs.writeFileSync('public/vinyl-player.html', html);
