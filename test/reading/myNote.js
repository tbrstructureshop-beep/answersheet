// test/reading/myNote.js

class HandwrittenNoteModal {
    constructor() {
        this.lastColor = localStorage.getItem('ielts_note_last_color') || '#f59e0b'; // Default kuning stabilo
        this.currentTool = 'pen'; // 'pen', 'highlighter', 'eraser', 'text'
        this.brushSize = 3;
        this.isDrawing = false;
        
        // Multi-page setup & storage
        this.STORAGE_KEY = 'ielts_reading_notebook_pages_v1';
        this.pages = this.loadPagesData();
        this.currentPageIndex = 0;
        this.fonts = [
            { name: 'Caveat (Handwriting)', family: "'Caveat', cursive" },
            { name: 'Patrick Hand (Marker)', family: "'Patrick Hand', cursive" },
            { name: 'System Default', family: "system-ui, sans-serif" }
        ];
        this.currentFontIndex = 0;

        this.initFonts();
        this.initHTML();
        this.initCanvas();
        this.loadCurrentPageContent();
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
            drawing: canvas.toDataURL()
        };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.pages));
    }

    initHTML() {
        if (document.getElementById('handwritten-note-modal')) return;

        const modalHtml = `
        <div id="handwritten-note-modal" class="note-modal-overlay">
            <div class="note-modal-container">
                <div class="note-modal-header">
                    <div class="note-header-left">
                        <h3>Handwritten Notebook</h3>
                        <!-- Navigasi Halaman -->
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
                        
                        <button type="button" class="btn-sm btn-outline" onclick="noteModal.toggleFontStyle()" title="Ganti Font Tulisan Tangan">Font: Aa</button>
                        <button type="button" class="btn-sm btn-danger" onclick="noteModal.clearCanvas()">Clear</button>
                        <button type="button" class="btn-sm btn-outline" onclick="noteModal.toggleModal()">Tutup</button>
                    </div>
                </div>

                <div class="note-paper-area" id="note-paper-area">
                    <!-- Layer teks di bawah garis coretan, bisa diketik pakai keyboard fisik / custom on-screen keyboard -->
                    <textarea id="note-text-layer" class="target-input" placeholder="Tulis atau ketik catatan di sini (didukung on-screen keyboard)..."></textarea>
                    <!-- Canvas transparan ditaruh tepat di atas teks agar stabilo bisa menyorot teks -->
                    <canvas id="note-canvas"></canvas>
                </div>
            </div>
        </div>
        `;

        const style = document.createElement('style');
        style.innerHTML = `
            .note-modal-overlay { position: fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.55); z-index:2000; display:none; justify-content:center; align-items:center; padding:15px; }
            .note-modal-container { background:#fff; width:100%; max-width:850px; height:88vh; border-radius:12px; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 12px 30px rgba(0,0,0,0.3); }
            .note-modal-header { padding:10px 15px; background:#f8fafc; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; }
            .note-header-left { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
            .note-header-left h3 { font-size:1.1rem; margin:0; font-weight:700; color:#1e293b; }
            .note-page-nav { display:flex; align-items:center; gap:5px; background:#f1f5f9; padding:3px 6px; border-radius:6px; font-size:12px; font-weight:bold; }
            .note-toolbar { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
            .note-toolbar button.active { background:#0f172a !important; color:#fff !important; }
            #note-color-picker { width:28px; height:28px; border:none; cursor:pointer; background:none; border-radius:4px; padding:0; }
            
            /* Kertas Bergaris */
            .note-paper-area { position:relative; flex:1; background:#fdfbf7; background-image:linear-gradient(#e2e8f0 1px, transparent 1px); background-size:100% 32px; overflow:hidden; }
            
            /* Layer Teks */
            #note-text-layer {
                position:absolute; top:0; left:0; width:100%; height:100%; background:transparent; border:none; resize:none;
                padding:15px 20px; font-size:22px; line-height:32px; color:#1e293b; outline:none; z-index:1;
                font-family: 'Caveat', cursive;
            }
            
            /* Layer Canvas (Menggambar & Stabilo tepat di atas teks) */
            #note-canvas { position:absolute; top:0; left:0; width:100%; height:100%; touch-action:none; z-index:3; cursor:crosshair; }
            
            /* Pointer events control */
            .mode-text #note-canvas { pointer-events: none; }
            .mode-draw #note-canvas { pointer-events: auto; }
        `;
        document.head.appendChild(style);
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Update mode interaksi awal
        this.updateInteractionMode();
    }

    initCanvas() {
        const canvas = document.getElementById('note-canvas');
        const ctx = canvas.getContext('2d');
        
        const resizeCanvas = (preserveData = true) => {
            const rect = canvas.parentElement.getBoundingClientRect();
            if (canvas.width === rect.width && canvas.height === rect.height) return;

            let tempImg = null;
            if (preserveData && canvas.width > 0 && canvas.height > 0) {
                tempImg = canvas.toDataURL();
            }

            canvas.width = rect.width;
            canvas.height = rect.height;

            if (tempImg) {
                const img = new Image();
                img.onload = () => ctx.drawImage(img, 0, 0);
                img.src = tempImg;
            }
        };

        window.addEventListener('resize', () => resizeCanvas(true));
        setTimeout(() => resizeCanvas(false), 200);

        const getPos = (e) => {
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return { x: clientX - rect.left, y: clientY - rect.top };
        };

        const startDraw = (e) => {
            if (this.currentTool === 'text') return;
            this.isDrawing = true;
            const pos = getPos(e);
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
        };

        const draw = (e) => {
            if (!this.isDrawing || this.currentTool === 'text') return;
            e.preventDefault();
            const pos = getPos(e);

            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            if (this.currentTool === 'highlighter') {
                // Stabilo: Tebal & transparan dengan blend multiply agar teks di bawahnya tetap terbaca jelas
                ctx.lineWidth = 26;
                ctx.globalCompositeOperation = 'multiply';
                ctx.strokeStyle = this.hexToRgba(this.lastColor, 0.45);
            } else if (this.currentTool === 'eraser') {
                // Penghapus coretan canvas
                ctx.lineWidth = 28;
                ctx.globalCompositeOperation = 'destination-out';
                ctx.strokeStyle = 'rgba(0,0,0,1)';
            } else {
                // Pen biasa
                ctx.lineWidth = 3;
                ctx.globalCompositeOperation = 'source-over';
                ctx.strokeStyle = this.lastColor;
            }

            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
        };

        const stopDraw = () => {
            if (this.isDrawing) {
                this.isDrawing = false;
                this.saveCurrentPageToMemory();
            }
        };

        canvas.addEventListener('mousedown', startDraw);
        canvas.addEventListener('mousemove', draw);
        window.addEventListener('mouseup', stopDraw);

        canvas.addEventListener('touchstart', startDraw, { passive: false });
        canvas.addEventListener('touchmove', draw, { passive: false });
        window.addEventListener('touchend', stopDraw);

        // Simpan otomatis saat textarea diketik
        const textLayer = document.getElementById('note-text-layer');
        textLayer.addEventListener('input', () => this.saveCurrentPageToMemory());
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

        // Jika mode text dipilih, fokuskan ke textarea untuk memicu custom virtual keyboard
        if (tool === 'text') {
            const textLayer = document.getElementById('note-text-layer');
            textLayer.focus();
            if (typeof showKeyboard === 'function') {
                showKeyboard(textLayer);
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
        if (!textLayer || !canvas) return;

        textLayer.value = page.text || '';
        
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (page.drawing) {
            const img = new Image();
            img.onload = () => ctx.drawImage(img, 0, 0);
            img.src = page.drawing;
        }

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
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        document.getElementById('note-text-layer').value = '';
        this.saveCurrentPageToMemory();
    }

    toggleModal() {
        const modal = document.getElementById('handwritten-note-modal');
        const isVisible = modal.style.display === 'flex';
        modal.style.display = isVisible ? 'none' : 'flex';

        if (!isVisible) {
            setTimeout(() => {
                const canvas = document.getElementById('note-canvas');
                const rect = canvas.parentElement.getBoundingClientRect();
                canvas.width = rect.width;
                canvas.height = rect.height;
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
