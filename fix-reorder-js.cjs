const fs = require('fs');
let html = fs.readFileSync('public/archive.html', 'utf-8');

const reorderJs = `
        const reorderModalOverlay = document.getElementById("reorderModalOverlay");
        const openReorderBtn = document.getElementById("openReorderBtn");
        const reorderCancelBtn = document.getElementById("reorderCancelBtn");
        const reorderSaveBtn = document.getElementById("reorderSaveBtn");
        const reorderList = document.getElementById("reorderList");
        
        let dragSrcEl = null;

        function handleDragStart(e) {
            this.style.opacity = '0.4';
            dragSrcEl = this;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', this.innerHTML);
            this.classList.add('dragging');
        }

        function handleDragOver(e) {
            if (e.preventDefault) e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            return false;
        }

        function handleDragEnter(e) {
            this.classList.add('drag-over');
        }

        function handleDragLeave(e) {
            this.classList.remove('drag-over');
        }

        function handleDrop(e) {
            if (e.stopPropagation) e.stopPropagation();
            if (dragSrcEl !== this) {
                // swap the dom elements
                const list = Array.from(reorderList.children);
                const fromIdx = list.indexOf(dragSrcEl);
                const toIdx = list.indexOf(this);
                
                if (fromIdx < toIdx) {
                    this.parentNode.insertBefore(dragSrcEl, this.nextSibling);
                } else {
                    this.parentNode.insertBefore(dragSrcEl, this);
                }
            }
            return false;
        }

        function handleDragEnd(e) {
            this.style.opacity = '1';
            this.classList.remove('dragging');
            const items = reorderList.querySelectorAll('.reorder-item');
            items.forEach(item => item.classList.remove('drag-over'));
        }

        if (openReorderBtn) {
            openReorderBtn.addEventListener("click", () => {
                const editModalOverlay = document.getElementById("editModalOverlay");
                if (editModalOverlay) editModalOverlay.classList.remove("active");
                
                reorderList.innerHTML = "";
                // Use originalCollection because we want to reorder the master list
                originalCollection.forEach(item => {
                    const div = document.createElement("div");
                    div.className = "reorder-item";
                    div.setAttribute("draggable", "true");
                    div.dataset.uid = item._uid;
                    div.innerHTML = \`<div style="font-weight: bold; font-size: 14px; pointer-events: none;">\${item.name}</div><div style="font-size: 12px; color: #888; pointer-events: none;">\${item.author}</div>\`;
                    
                    div.addEventListener('dragstart', handleDragStart);
                    div.addEventListener('dragenter', handleDragEnter);
                    div.addEventListener('dragover', handleDragOver);
                    div.addEventListener('dragleave', handleDragLeave);
                    div.addEventListener('drop', handleDrop);
                    div.addEventListener('dragend', handleDragEnd);
                    
                    reorderList.appendChild(div);
                });
                
                reorderModalOverlay.classList.add("active");
            });
        }
        
        if (reorderCancelBtn) {
            reorderCancelBtn.addEventListener("click", () => {
                reorderModalOverlay.classList.remove("active");
                const editModalOverlay = document.getElementById("editModalOverlay");
                if (editModalOverlay) editModalOverlay.classList.add("active");
            });
        }
        
        if (reorderSaveBtn) {
            reorderSaveBtn.addEventListener("click", () => {
                const newOrder = Array.from(reorderList.children).map(child => child.dataset.uid);
                localStorage.setItem('vinyl_album_order_v1', JSON.stringify(newOrder));
                
                // Re-sort originalCollection
                originalCollection.sort((a, b) => {
                    const idxA = newOrder.indexOf(a._uid);
                    const idxB = newOrder.indexOf(b._uid);
                    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                    if (idxA !== -1) return -1;
                    if (idxB !== -1) return 1;
                    return 0;
                });
                
                reorderModalOverlay.classList.remove("active");
                
                // Clear meshes and rebuild
                groups.forEach(g => { if(g) scene.remove(g); });
                groups = [];
                filterCollection();
                
                const editModalOverlay = document.getElementById("editModalOverlay");
                if (editModalOverlay) editModalOverlay.classList.add("active");
            });
        }
`;

html = html.replace('        window.addEventListener("pagehide", () => {', reorderJs + '\n        window.addEventListener("pagehide", () => {');

fs.writeFileSync('public/archive.html', html);
