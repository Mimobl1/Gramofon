const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf8');

// Remove feedback CSS
html = html.replace(/[\s\S]*?\.feedback-modal \{[\s\S]*?\.feedback-snackbar\.on \{[\s\S]*?\}/, (match) => {
    // wait, safer regex
    return match;
});
