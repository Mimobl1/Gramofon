const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

const touchJs = `
                    let touchEl = null;
                    div.addEventListener('touchstart', function(e) {
                        touchEl = this;
                        this.classList.add('dragging');
                        this.style.opacity = '0.4';
                    }, {passive: true});
                    
                    div.addEventListener('touchmove', function(e) {
                        if (!touchEl) return;
                        e.preventDefault();
                        const touch = e.touches[0];
                        const target = document.elementFromPoint(touch.clientX, touch.clientY);
                        const item = target ? target.closest('.reorder-item') : null;
                        if (item && item !== touchEl) {
                            const rect = item.getBoundingClientRect();
                            const offset = touch.clientY - rect.top - (rect.height / 2);
                            if (offset > 0) {
                                item.parentNode.insertBefore(touchEl, item.nextSibling);
                            } else {
                                item.parentNode.insertBefore(touchEl, item);
                            }
                        }
                    }, {passive: false});
                    
                    div.addEventListener('touchend', function(e) {
                        if (touchEl) {
                            touchEl.style.opacity = '1';
                            touchEl.classList.remove('dragging');
                            touchEl = null;
                        }
                    });
                    div.addEventListener('touchcancel', function(e) {
                        if (touchEl) {
                            touchEl.style.opacity = '1';
                            touchEl.classList.remove('dragging');
                            touchEl = null;
                        }
                    });
`;

html = html.replace("div.addEventListener('dragend', handleDragEnd);", "div.addEventListener('dragend', handleDragEnd);\n" + touchJs);

fs.writeFileSync('public/archive.html', html);
