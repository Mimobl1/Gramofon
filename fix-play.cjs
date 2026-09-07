const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

const oldMsg = `                if (EMBEDDED && window.parent) {
                    window.parent.postMessage({ type: "archive-select-album", album: selectedPayload }, "*");
                    resetLaunchState();
                    return;
                }`;

const newMsg = `                const safeMsgPayload = { ...selectedPayload };
                delete safeMsgPayload.files;
                delete safeMsgPayload.coverData;
                if (EMBEDDED && window.parent) {
                    window.parent.postMessage({ type: "archive-select-album", album: safeMsgPayload }, "*");
                    resetLaunchState();
                    return;
                }`;

html = html.replace(oldMsg, newMsg);

const oldMsgLaunch = `                    if(EMBEDDED && window.parent){
                        window.parent.postMessage({type:"archive-select-album", album: launchSelectedPayload}, "*");
                        resetLaunchState();
                        return;
                    }`;

const newMsgLaunch = `                    if(EMBEDDED && window.parent){
                        const safeLaunch = { ...launchSelectedPayload };
                        delete safeLaunch.files;
                        delete safeLaunch.coverData;
                        window.parent.postMessage({type:"archive-select-album", album: safeLaunch}, "*");
                        resetLaunchState();
                        return;
                    }`;

html = html.replace(oldMsgLaunch, newMsgLaunch);

fs.writeFileSync('public/archive.html', html);
