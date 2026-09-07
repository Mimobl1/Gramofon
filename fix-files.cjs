const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

html = html.replace(`                        const safeLaunch = { ...launchSelectedPayload };
                        delete safeLaunch.files;
                        delete safeLaunch.coverData;`, 
`                        const safeLaunch = { ...launchSelectedPayload };
                        // Note: do not delete 'files' if it's already an array of basic objects without ArrayBuffers
                        // but if files contains ArrayBuffers, we MUST delete them.
                        // Wait, we need files list for length calculation and track names!
                        // Let's strip ArrayBuffers instead of deleting the whole array!
                        if (safeLaunch.files) {
                            safeLaunch.files = safeLaunch.files.map(f => ({
                                name: f.name,
                                size: f.size,
                                type: f.type,
                                // Omit 'data' which is the ArrayBuffer
                            }));
                        }
                        delete safeLaunch.coverData;`);

fs.writeFileSync('public/archive.html', html);
