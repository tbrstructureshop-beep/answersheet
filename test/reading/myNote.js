// test/reading/myNote.js

class HandwrittenNoteModal {
    constructor() {
        this.lastColor = localStorage.getItem('ielts_note_last_color') || '#f59e0b';
        this.currentTool = 'pen'; // 'pen', 'highlighter', 'eraser', 'text'
        this.toolSizes = this.loadToolSizes();
        this.highlighterOpacity = this.loadHighlighterOpacity();
        this.isDrawing = false;
        this.currentPoints = [];
        this.lastErasePos = null;

        // Multi-page setup & storage
        this.STORAGE_KEY = 'ielts_reading_notebook_pages_v1';
        this.pages = this.loadPagesData();
        this.currentPageIndex = 0;
        this.pageHistory = {}; // { [pageIndex]: { states: [{ drawing, restoredText? }], index: 0 } }
        this.maxHistory = 40;

        this.fonts = [
            { name: 'Caveat (Handwriting)', family: "'Caveat', cursive" },
            { name: 'Patrick Hand (Marker)', family: "'Patrick Hand', cursive" },
            { name: 'System Default', family: "system-ui, sans-serif" }
        ];
        this.currentFontIndex = 0;

        this.initFonts();
        this.initHTML();
        this.initCanvas();
        this.syncSlidersWithTool();
        this.loadCurrentPageContent();
    }

    loadToolSizes() {
        const defaults = { pen: 3, highlighter: 24, eraser: 28 };
        try {
            const saved = JSON.parse(localStorage.getItem('ielts_note_tool_sizes'));
            if (saved && typeof saved === 'object') {
                return { ...defaults, ...saved };
            }
        } catch (e) {}
        return defaults;
    }

    saveToolSizes() {
        localStorage.setItem('ielts_note_tool_sizes', JSON.stringify(this.toolSizes));
    }

    loadHighlighterOpacity() {
        const saved = parseFloat(localStorage.getItem('ielts_note_highlighter_opacity'));
        if (!isNaN(saved) && saved >= 0.1 && saved <= 0.9) return saved;
        return 0.4;
    }

    initFonts() {
        if (!document.getElementById('note-google-fonts')) {
            const fontLink = document.createElement('link');
            fontLink.id = 'note-google-fonts';
            fontLink.rel = 'stylesheet';
            fontLink.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@600&family=Patrick+Hand&display=swap';
            document.head.appendChild(fontLink);
        }
    }

    loadPagesData() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {
            console.error('Failed to load note pages', e);
        }
        return [{ text: '', drawing: null }];
    }

    saveCurrentPageToMemory() {
        const canvas = document.getElementById('note-canvas');
        const textLayer = document.getElementById('note-text-layer');
        if (!canvas || !textLayer) return;

        this.pages[this.currentPageIndex] = {
            text: textLayer.value,
            drawing: canvas.width > 0 && canvas.height > 0 ? canvas.toDataURL() : (this.pages[this.currentPageIndex]?.drawing || null)
        };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.pages));
    }

    initHTML() {
        if (document.getElementById('handwritten-note-modal')) return;

        const opacityPercent = Math.round(this.highlighterOpacity * 100);

        const modalHtml = `
        <div id="handwritten-note-modal" class="note-modal-overlay">
            <div class="note-modal-container">
                <div class="note-modal-header">
                    <div class="note-header-top">
                        <div class="note-header-left">
                            <h3>Handwritten Notebook</h3>
                            <div class="note-page-nav">
                                <button type="button" class="btn-sm btn-outline" onclick="noteModal.changePage(-1)" title="Halaman Sebelumnya">◀</button>
                                <span id="note-page-indicator">Page 1 / 1</span>
                                <button type="button" class="btn-sm btn-outline" onclick="noteModal.changePage(1)" title="Halaman Selanjutnya">▶</button>
                                <button type="button" class="btn-sm btn-success" onclick="noteModal.addNewPage()" title="Tambah Halaman Baru">+ Halaman</button>
                                <button type="button" class="btn-sm btn-danger" onclick="noteModal.deleteCurrentPage()" title="Hapus Halaman Ini">🗑</button>
                            </div>
                        </div>

                        <div class="note-toolbar">
                            <button type="button" class="btn-sm note-tool-btn ${this.currentTool==='pen'?'active':''}" onclick="noteModal.setTool('pen', this)">✏️ Pen</button>
                            <button type="button" class="btn-sm note-tool-btn ${this.currentTool==='highlighter'?'active':''}" onclick="noteModal.setTool('highlighter', this)">🖍️ Stabilo</button>
                            <button type="button" class="btn-sm note-tool-btn ${this.currentTool==='eraser'?'active':''}" onclick="noteModal.setTool('eraser', this)">🧹 Hapus</button>
                            <button type="button" class="btn-sm note-tool-btn ${this.currentTool==='text'?'active':''}" onclick="noteModal.setTool('text', this)">⌨️ Ketik</button>

                            <input type="color" id="note-color-picker" value="${this.lastColor}" onchange="noteModal.changeColor(this.value)" title="Pilih Warna Stabilo / Pen">

                            <button type="button" id="note-undo-btn" class="btn-sm note-action-btn" onclick="noteModal.undo()" title="Undo (Ctrl+Z)" disabled>↩️ Undo</button>
                            <button type="button" id="note-redo-btn" class="btn-sm note-action-btn" onclick="noteModal.redo()" title="Redo (Ctrl+Y)" disabled>↪️ Redo</button>

                            <button type="button" class="btn-sm btn-outline" onclick="noteModal.toggleFontStyle()" title="Ganti Font Tulisan Tangan">Font: Aa</button>
                            <button type="button" class="btn-sm btn-danger" onclick="noteModal.clearCanvas()">Clear</button>
                            <button type="button" class="btn-sm btn-outline" onclick="noteModal.toggleModal()">Tutup</button>
                        </div>
                    </div>

                    <div class="note-sliders-bar">
                        <label class="note-slider-group" for="note-size-slider">
                            <span id="note-size-label">Pen Size:</span>
                            <input type="range" id="note-size-slider" min="1" max="20" value="${this.toolSizes.pen}" oninput="noteModal.changeToolSize(this.value)">
                            <span id="note-size-val" class="note-slider-val">${this.toolSizes.pen}px</span>
                        </label>

                        <label class="note-slider-group" for="note-opacity-slider">
                            <span>Stabilo Opacity:</span>
                            <input type="range" id="note-opacity-slider" min="10" max="90" step="5" value="${opacityPercent}" oninput="noteModal.changeHighlighterOpacity(this.value)">
                            <span id="note-opacity-val" class="note-slider-val">${opacityPercent}%</span>
                        </label>
                    </div>
                </div>

                <div class="note-paper-area" id="note-paper-area">
                    <canvas id="note-canvas"></canvas>
                    <canvas id="note-preview-canvas"></canvas>
                    <textarea id="note-text-layer" class="target-input" placeholder="Tulis atau ketik catatan di sini (didukung on-screen keyboard)..."></textarea>
                </div>
            </div>
        </div>
        `;

        const style = document.createElement('style');
        style.id = 'handwritten-note-styles';
        style.innerHTML = `
            .note-modal-overlay { position: fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.55); z-index:2000; display:none; justify-content:center; align-items:center; padding:15px; }
            .note-modal-container { background:#fff; width:100%; max-width:900px; height:88vh; border-radius:12px; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 12px 30px rgba(0,0,0,0.3); }
            .note-modal-header { padding:10px 15px; background:#f8fafc; border-bottom:1px solid #e2e8f0; display:flex; flex-direction:column; gap:8px; }
            .note-header-top { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; }
            .note-header-left { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
            .note-header-left h3 { font-size:1.1rem; margin:0; font-weight:700; color:#1e293b; }
            .note-page-nav { display:flex; align-items:center; gap:5px; background:#f1f5f9; padding:3px 6px; border-radius:6px; font-size:12px; font-weight:bold; color:#1e293b; }
            .note-toolbar { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
            .note-tool-btn, .note-action-btn { background:#e2e8f0; color:#1e293b; border:1px solid #cbd5e1; }
            .note-tool-btn:hover, .note-action-btn:hover:not(:disabled) { background:#cbd5e1; }
            .note-toolbar button.active { background:#2563eb !important; color:#fff !important; border-color:#2563eb !important; }
            .note-action-btn:disabled { opacity:0.45; cursor:not-allowed; }
            #note-color-picker { width:28px; height:28px; border:1px solid #cbd5e1; cursor:pointer; background:none; border-radius:4px; padding:0; }

            /* Slider Bar */
            .note-sliders-bar { display:flex; align-items:center; flex-wrap:wrap; gap:16px; padding-top:6px; border-top:1px dashed #cbd5e1; font-size:12px; font-weight:600; color:#475569; }
            .note-slider-group { display:inline-flex; align-items:center; gap:8px; }
            .note-slider-group input[type="range"] { width:110px; accent-color:#2563eb; cursor:pointer; }
            .note-slider-group input[type="range"]:disabled { opacity:0.4; cursor:not-allowed; }
            .note-slider-val { min-width:36px; font-variant-numeric:tabular-nums; color:#1e293b; font-weight:700; }

            /* Kertas Bergaris */
            .note-paper-area { position:relative; flex:1; background:#fdfbf7; background-image:linear-gradient(#e2e8f0 1px, transparent 1px); background-size:100% 32px; overflow:hidden; }

            /* Canvas berada di bawah teks agar teks selalu tajam & terbaca walau distabilo */
            #note-canvas { position:absolute; top:0; left:0; width:100%; height:100%; z-index:1; pointer-events:none; }
            #note-preview-canvas { position:absolute; top:0; left:0; width:100%; height:100%; touch-action:none; z-index:2; cursor:crosshair; }

            /* Layer Teks selalu di atas stabilo dengan background transparan */
            #note-text-layer {
                position:absolute; top:0; left:0; width:100%; height:100%; background:transparent; border:none; resize:none;
                padding:15px 20px; font-size:22px; line-height:32px; color:#1e293b; outline:none; z-index:3;
                font-family: 'Caveat', cursive;
            }
            #note-text-layer::placeholder { color:#94a3b8; }

            /* Pointer events control */
            .mode-text #note-preview-canvas { pointer-events: none; }
            .mode-text #note-text-layer { pointer-events: auto; }
            .mode-draw #note-preview-canvas { pointer-events: auto; }
            .mode-draw #note-text-layer { pointer-events: none; user-select: none; }

            /* --- NIGHT MODE SUPPORT --- */
            body.night-mode .note-modal-overlay { background:rgba(0,0,0,0.75); }
            body.night-mode .note-modal-container { background:#1e293b; border:1px solid #334155; color:#f1f5f9; }
            body.night-mode .note-modal-header { background:#0f172a; border-bottom-color:#334155; }
            body.night-mode .note-header-left h3 { color:#f1f5f9; }
            body.night-mode .note-page-nav { background:#1e293b; color:#f1f5f9; border:1px solid #334155; }
            body.night-mode .note-tool-btn,
            body.night-mode .note-action-btn { background:#1e293b; color:#e2e8f0; border-color:#334155; }
            body.night-mode .note-tool-btn:hover,
            body.night-mode .note-action-btn:hover:not(:disabled) { background:#334155; }
            body.night-mode .note-toolbar button.active { background:#3b82f6 !important; color:#ffffff !important; border-color:#3b82f6 !important; }
            body.night-mode #note-color-picker { border-color:#475569; }
            body.night-mode .note-sliders-bar { border-top-color:#334155; color:#94a3b8; }
            body.night-mode .note-slider-group input[type="range"] { accent-color:#3b82f6; }
            body.night-mode .note-slider-val { color:#f1f5f9; }
            body.night-mode .note-paper-area {
                background-color:#131c2e;
                background-image:linear-gradient(rgba(148, 163, 184, 0.16) 1px, transparent 1px);
            }
            body.night-mode #note-text-layer { color:#f1f5f9; }
            body.night-mode #note-text-layer::placeholder { color:#64748b; }
        `;
        document.head.appendChild(style);
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        this.updateInteractionMode();
    }

    initCanvas() {
        const canvas = document.getElementById('note-canvas');
        const previewCanvas = document.getElementById('note-preview-canvas');
        const ctx = canvas.getContext('2d');
        const pCtx = previewCanvas.getContext('2d');

        const resizeCanvas = (preserveData = true) => {
            const rect = canvas.parentElement.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;
            if (canvas.width === rect.width && canvas.height === rect.height) return;

            let tempImg = null;
            if (preserveData && canvas.width > 0 && canvas.height > 0) {
                tempImg = canvas.toDataURL();
            }

            canvas.width = rect.width;
            canvas.height = rect.height;
            previewCanvas.width = rect.width;
            previewCanvas.height = rect.height;

            if (tempImg) {
                const img = new Image();
                img.onload = () => {
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.drawImage(img, 0, 0);
                };
                img.src = tempImg;
            }
        };

        window.addEventListener('resize', () => resizeCanvas(true));
        setTimeout(() => resizeCanvas(false), 200);

        const getPos = (e) => {
            const rect = previewCanvas.getBoundingClientRect();
            const touch = e.touches ? e.touches[0] : (e.changedTouches ? e.changedTouches[0] : null);
            const clientX = touch ? touch.clientX : e.clientX;
            const clientY = touch ? touch.clientY : e.clientY;
            return { x: clientX - rect.left, y: clientY - rect.top };
        };

        const renderSmoothStroke = (targetCtx, points, tool, color, size, opacity) => {
            if (!points || points.length === 0) return;

            targetCtx.save();
            targetCtx.lineCap = 'round';
            targetCtx.lineJoin = 'round';
            targetCtx.lineWidth = size;

            if (tool === 'highlighter') {
                targetCtx.strokeStyle = this.hexToRgba(color, opacity);
                targetCtx.fillStyle = this.hexToRgba(color, opacity);
            } else {
                targetCtx.strokeStyle = color;
                targetCtx.fillStyle = color;
            }

            if (points.length === 1) {
                targetCtx.beginPath();
                targetCtx.arc(points[0].x, points[0].y, size / 2, 0, Math.PI * 2);
                targetCtx.fill();
            } else {
                targetCtx.beginPath();
                targetCtx.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length - 1; i++) {
                    const midX = (points[i].x + points[i + 1].x) / 2;
                    const midY = (points[i].y + points[i + 1].y) / 2;
                    targetCtx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
                }
                const last = points[points.length - 1];
                targetCtx.lineTo(last.x, last.y);
                targetCtx.stroke();
            }
            targetCtx.restore();
        };

        const startDraw = (e) => {
            if (this.currentTool === 'text') return;
            if (e.type === 'mousedown' && e.button !== 0) return;

            this.isDrawing = true;
            const pos = getPos(e);

            if (this.currentTool === 'eraser') {
                this.lastErasePos = pos;
                ctx.save();
                ctx.globalCompositeOperation = 'destination-out';
                ctx.fillStyle = 'rgba(0,0,0,1)';
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, this.toolSizes.eraser / 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else {
                this.currentPoints = [pos];
                pCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
                const size = this.currentTool === 'highlighter' ? this.toolSizes.highlighter : this.toolSizes.pen;
                renderSmoothStroke(pCtx, this.currentPoints, this.currentTool, this.lastColor, size, this.highlighterOpacity);
            }
        };

        const draw = (e) => {
            if (!this.isDrawing || this.currentTool === 'text') return;
            e.preventDefault();
            const pos = getPos(e);

            if (this.currentTool === 'eraser') {
                ctx.save();
                ctx.globalCompositeOperation = 'destination-out';
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.lineWidth = this.toolSizes.eraser;
                ctx.strokeStyle = 'rgba(0,0,0,1)';
                ctx.beginPath();
                ctx.moveTo(this.lastErasePos.x, this.lastErasePos.y);
                ctx.lineTo(pos.x, pos.y);
                ctx.stroke();
                ctx.restore();
                this.lastErasePos = pos;
            } else {
                this.currentPoints.push(pos);
                pCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
                const size = this.currentTool === 'highlighter' ? this.toolSizes.highlighter : this.toolSizes.pen;
                renderSmoothStroke(pCtx, this.currentPoints, this.currentTool, this.lastColor, size, this.highlighterOpacity);
            }
        };

        const stopDraw = () => {
            if (!this.isDrawing) return;
            this.isDrawing = false;

            if (this.currentTool === 'pen' || this.currentTool === 'highlighter') {
                pCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
                const size = this.currentTool === 'highlighter' ? this.toolSizes.highlighter : this.toolSizes.pen;

                ctx.save();
                // Stabilo digambar di belakang tinta pen (destination-over) agar tinta pen & teks tetap terbaca jelas
                ctx.globalCompositeOperation = this.currentTool === 'highlighter' ? 'destination-over' : 'source-over';
                renderSmoothStroke(ctx, this.currentPoints, this.currentTool, this.lastColor, size, this.highlighterOpacity);
                ctx.restore();

                this.currentPoints = [];
            }

            this.lastErasePos = null;
            this.pushHistory();
            this.saveCurrentPageToMemory();
        };

        previewCanvas.addEventListener('mousedown', startDraw);
        window.addEventListener('mousemove', draw);
        window.addEventListener('mouseup', stopDraw);

        previewCanvas.addEventListener('touchstart', startDraw, { passive: false });
        window.addEventListener('touchmove', draw, { passive: false });
        window.addEventListener('touchend', stopDraw);

        // Keyboard shortcuts Undo/Redo saat tidak mengetik di textarea
        document.addEventListener('keydown', (e) => {
            const modal = document.getElementById('handwritten-note-modal');
            if (!modal || modal.style.display !== 'flex') return;
            if (document.activeElement === document.getElementById('note-text-layer')) return;

            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                this.undo();
            } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
                e.preventDefault();
                this.redo();
            }
        });

        const textLayer = document.getElementById('note-text-layer');
        textLayer.addEventListener('input', () => this.saveCurrentPageToMemory());
        textLayer.addEventListener('blur', () => this.saveCurrentPageToMemory());
    }

    // --- UNDO / REDO HISTORY ---
    ensureHistoryInitialized(pageIdx = this.currentPageIndex) {
        if (!this.pageHistory[pageIdx]) {
            const canvas = document.getElementById('note-canvas');
            const initialDrawing = (canvas && canvas.width > 0 && canvas.height > 0)
                ? canvas.toDataURL()
                : (this.pages[pageIdx]?.drawing || null);

            this.pageHistory[pageIdx] = {
                states: [{ drawing: initialDrawing, text: null }],
                index: 0
            };
        }
        this.updateUndoRedoButtons();
    }

    pushHistory(clearedText = null) {
        const canvas = document.getElementById('note-canvas');
        if (!canvas || canvas.width === 0 || canvas.height === 0) return;

        this.ensureHistoryInitialized();
        const hist = this.pageHistory[this.currentPageIndex];

        hist.states = hist.states.slice(0, hist.index + 1);
        hist.states.push({
            drawing: canvas.toDataURL(),
            clearedText: clearedText
        });

        if (hist.states.length > this.maxHistory) {
            hist.states.shift();
        }
        hist.index = hist.states.length - 1;
        this.updateUndoRedoButtons();
    }

    restoreHistoryState(stateObj, restoreClearedText = false) {
        const canvas = document.getElementById('note-canvas');
        const ctx = canvas.getContext('2d');
        const textLayer = document.getElementById('note-text-layer');

        if (restoreClearedText && typeof stateObj.clearedText === 'string') {
            textLayer.value = stateObj.clearedText;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (stateObj.drawing) {
            const img = new Image();
            img.onload = () => {
                ctx.globalCompositeOperation = 'source-over';
                ctx.drawImage(img, 0, 0);
                this.saveCurrentPageToMemory();
            };
            img.src = stateObj.drawing;
        } else {
            this.saveCurrentPageToMemory();
        }
    }

    undo() {
        const hist = this.pageHistory[this.currentPageIndex];
        if (!hist || hist.index <= 0) return;

        const currentEntry = hist.states[hist.index];
        hist.index--;
        const targetState = hist.states[hist.index];

        // Jika langkah yang di-undo adalah Clear, pulihkan teksnya juga
        if (typeof currentEntry.clearedText === 'string') {
            document.getElementById('note-text-layer').value = currentEntry.clearedText;
        }

        this.restoreHistoryState(targetState);
        this.updateUndoRedoButtons();
    }

    redo() {
        const hist = this.pageHistory[this.currentPageIndex];
        if (!hist || hist.index >= hist.states.length - 1) return;

        hist.index++;
        const targetState = hist.states[hist.index];

        // Jika me-redo aksi Clear, kosongkan teks lagi
        if (typeof targetState.clearedText === 'string') {
            document.getElementById('note-text-layer').value = '';
        }

        this.restoreHistoryState(targetState);
        this.updateUndoRedoButtons();
    }

    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('note-undo-btn');
        const redoBtn = document.getElementById('note-redo-btn');
        const hist = this.pageHistory[this.currentPageIndex];

        if (undoBtn) undoBtn.disabled = !hist || hist.index <= 0;
        if (redoBtn) redoBtn.disabled = !hist || hist.index >= hist.states.length - 1;
    }

    // --- SLIDERS & TOOLS ---
    syncSlidersWithTool() {
        const sizeSlider = document.getElementById('note-size-slider');
        const sizeLabel = document.getElementById('note-size-label');
        const sizeVal = document.getElementById('note-size-val');
        if (!sizeSlider || !sizeLabel || !sizeVal) return;

        if (this.currentTool === 'text') {
            sizeLabel.textContent = 'Size:';
            sizeSlider.disabled = true;
            sizeVal.textContent = '--';
            return;
        }

        sizeSlider.disabled = false;
        if (this.currentTool === 'highlighter') {
            sizeLabel.textContent = 'Stabilo Size:';
            sizeSlider.min = 8;
            sizeSlider.max = 60;
            sizeSlider.value = this.toolSizes.highlighter;
            sizeVal.textContent = `${this.toolSizes.highlighter}px`;
        } else if (this.currentTool === 'eraser') {
            sizeLabel.textContent = 'Eraser Size:';
            sizeSlider.min = 8;
            sizeSlider.max = 60;
            sizeSlider.value = this.toolSizes.eraser;
            sizeVal.textContent = `${this.toolSizes.eraser}px`;
        } else {
            sizeLabel.textContent = 'Pen Size:';
            sizeSlider.min = 1;
            sizeSlider.max = 20;
            sizeSlider.value = this.toolSizes.pen;
            sizeVal.textContent = `${this.toolSizes.pen}px`;
        }
    }

    changeToolSize(val) {
        const size = parseInt(val, 10);
        if (isNaN(size) || this.currentTool === 'text') return;

        this.toolSizes[this.currentTool] = size;
        this.saveToolSizes();

        const sizeVal = document.getElementById('note-size-val');
        if (sizeVal) sizeVal.textContent = `${size}px`;
    }

    changeHighlighterOpacity(val) {
        const percent = parseInt(val, 10);
        if (isNaN(percent)) return;

        this.highlighterOpacity = Math.min(0.9, Math.max(0.1, percent / 100));
        localStorage.setItem('ielts_note_highlighter_opacity', this.highlighterOpacity.toString());

        const opacityVal = document.getElementById('note-opacity-val');
        if (opacityVal) opacityVal.textContent = `${percent}%`;
    }

    updateInteractionMode() {
        const area = document.getElementById('note-paper-area');
        if (!area) return;
        if (this.currentTool === 'text') {
            area.classList.remove('mode-draw');
            area.classList.add('mode-text');
        } else {
            area.classList.remove('mode-text');
            area.classList.add('mode-draw');
        }
    }

    setTool(tool, targetBtn = null) {
        this.currentTool = tool;
        document.querySelectorAll('.note-tool-btn').forEach(b => b.classList.remove('active'));
        if (targetBtn) {
            targetBtn.classList.add('active');
        }
        this.updateInteractionMode();
        this.syncSlidersWithTool();

        if (tool === 'text') {
            const textLayer = document.getElementById('note-text-layer');
            textLayer.focus();
            if (typeof showKeyboard === 'function') {
                showKeyboard(textLayer);
            }
        } else {
            if (typeof hideKeyboard === 'function') {
                hideKeyboard();
            }
        }
    }

    toggleFontStyle() {
        this.currentFontIndex = (this.currentFontIndex + 1) % this.fonts.length;
        const selectedFont = this.fonts[this.currentFontIndex];
        const textLayer = document.getElementById('note-text-layer');
        if (textLayer) {
            textLayer.style.fontFamily = selectedFont.family;
        }
    }

    // --- NAVIGASI & MANAJEMEN HALAMAN ---
    loadCurrentPageContent() {
        const page = this.pages[this.currentPageIndex] || { text: '', drawing: null };
        const textLayer = document.getElementById('note-text-layer');
        const canvas = document.getElementById('note-canvas');
        const previewCanvas = document.getElementById('note-preview-canvas');
        if (!textLayer || !canvas) return;

        textLayer.value = page.text || '';

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (previewCanvas) {
            previewCanvas.getContext('2d').clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        }

        if (page.drawing) {
            const img = new Image();
            img.onload = () => {
                ctx.globalCompositeOperation = 'source-over';
                ctx.drawImage(img, 0, 0);
                if (!this.pageHistory[this.currentPageIndex]) {
                    this.ensureHistoryInitialized(this.currentPageIndex);
                }
            };
            img.src = page.drawing;
        } else {
            if (canvas.width > 0 && canvas.height > 0 && !this.pageHistory[this.currentPageIndex]) {
                this.ensureHistoryInitialized(this.currentPageIndex);
            }
        }

        this.updateUndoRedoButtons();
        document.getElementById('note-page-indicator').textContent = `Page ${this.currentPageIndex + 1} / ${this.pages.length}`;
    }

    changePage(dir) {
        this.saveCurrentPageToMemory();
        const targetIndex = this.currentPageIndex + dir;
        if (targetIndex >= 0 && targetIndex < this.pages.length) {
            this.currentPageIndex = targetIndex;
            this.loadCurrentPageContent();
        }
    }

    addNewPage() {
        this.saveCurrentPageToMemory();
        this.pages.push({ text: '', drawing: null });
        this.currentPageIndex = this.pages.length - 1;
        this.loadCurrentPageContent();
    }

    deleteCurrentPage() {
        if (this.pages.length <= 1) {
            this.clearCanvas();
            return;
        }
        if (confirm('Hapus halaman catatan ini?')) {
            this.pages.splice(this.currentPageIndex, 1);

            // Re-index pageHistory
            const updatedHistory = {};
            Object.keys(this.pageHistory).forEach(k => {
                const idx = parseInt(k, 10);
                if (idx < this.currentPageIndex) updatedHistory[idx] = this.pageHistory[idx];
                else if (idx > this.currentPageIndex) updatedHistory[idx - 1] = this.pageHistory[idx];
            });
            this.pageHistory = updatedHistory;

            if (this.currentPageIndex >= this.pages.length) {
                this.currentPageIndex = this.pages.length - 1;
            }
            this.loadCurrentPageContent();
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.pages));
        }
    }

    hexToRgba(hex, alpha) {
        let c = hex.replace('#', '');
        if (c.length === 3) c = c.split('').map(x => x + x).join('');
        const num = parseInt(c, 16);
        return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
    }

    changeColor(color) {
        this.lastColor = color;
        localStorage.setItem('ielts_note_last_color', color);
    }

    clearCanvas() {
        const canvas = document.getElementById('note-canvas');
        const previewCanvas = document.getElementById('note-preview-canvas');
        const textLayer = document.getElementById('note-text-layer');
        const ctx = canvas.getContext('2d');

        this.ensureHistoryInitialized();
        const previousText = textLayer.value;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (previewCanvas) {
            previewCanvas.getContext('2d').clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        }
        textLayer.value = '';

        this.pushHistory(previousText);
        this.saveCurrentPageToMemory();
    }

    toggleModal() {
        const modal = document.getElementById('handwritten-note-modal');
        const isVisible = modal.style.display === 'flex';
        modal.style.display = isVisible ? 'none' : 'flex';

        if (!isVisible) {
            setTimeout(() => {
                const canvas = document.getElementById('note-canvas');
                const previewCanvas = document.getElementById('note-preview-canvas');
                const rect = canvas.parentElement.getBoundingClientRect();
                canvas.width = rect.width;
                canvas.height = rect.height;
                if (previewCanvas) {
                    previewCanvas.width = rect.width;
                    previewCanvas.height = rect.height;
                }
                this.loadCurrentPageContent();
            }, 100);
        } else {
            this.saveCurrentPageToMemory();
            if (typeof hideKeyboard === 'function') {
                hideKeyboard();
            }
        }
    }
}

// Inisialisasi Instance
const noteModal = new HandwrittenNoteModal();
