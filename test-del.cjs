const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const fs = require('fs');

const html = fs.readFileSync('public/archive.html', 'utf-8');
const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable" });
const window = dom.window;

window.onload = () => {
    try {
        const item = window.collection ? window.collection[0] : null;
        console.log("Collection length before:", window.collection?.length);
        if (item) {
            window.lastIndex = 0;
            const btn = window.document.getElementById('editDeleteBtn');
            window.confirm = () => true; // mock confirm
            btn.click();
            console.log("Collection length after:", window.collection?.length);
            const overrides = JSON.parse(window.localStorage.getItem('vinyl_album_overrides_v1') || '{}');
            console.log("Overrides:", overrides);
        }
    } catch(e) {
        console.error(e);
    }
};
