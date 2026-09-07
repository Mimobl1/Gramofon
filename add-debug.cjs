const fs = require('fs');
let html = fs.readFileSync('public/vinyl-player.html', 'utf-8');

const debugCode = `
    <div id="debugLog" style="position:fixed; top:10px; left:10px; right:10px; height:200px; background:rgba(0,0,0,0.8); color:red; z-index:99999; overflow-y:scroll; font-family:monospace; font-size:12px; display:none; pointer-events:none;"></div>
    <script>
      const debugLog = document.getElementById('debugLog');
      function logError(...args) {
          debugLog.style.display = 'block';
          debugLog.innerHTML += '<div>' + args.map(a => typeof a === "object" ? JSON.stringify(a) : a).join(' ') + '</div>';
      }
      window.addEventListener('error', e => logError(e.message, e.filename, e.lineno));
      window.addEventListener('unhandledrejection', e => logError(e.reason));
      const oldError = console.error;
      console.error = function(...args) { logError(...args); oldError.apply(console, args); };
    </script>
`;

html = html.replace('<body>', '<body>' + debugCode);

fs.writeFileSync('public/vinyl-player.html', html);
