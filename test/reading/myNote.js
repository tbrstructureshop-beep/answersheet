// test/reading/myNote.js

class HandwrittenNoteModal {
    constructor() {
        this.lastColor = localStorage.getItem('ielts_note_last_color') || '#f59e0b'; // Default kuning stabilo
        this.isEraser = false;
        this.isDrawing = false;
        this.currentTool = 'pen'; // 'pen', 'highlighter', 'eraser', 'text'
        this.brushSize = 3;
        this.initHTML();
        this.initCanvas();
    }

    initHTML() {
        if (document.getElementById('handwritten-note-modal')) return;

        const modalHtml = `
        <div id="handwritten-note-modal" class="note-modal-overlay">
            <div class="note-modal-container">
                <div class="note-modal-header">
                    <h3>Classic Lined Notepad</h3>
                    <div class="note-toolbar">
                        <button class="btn-sm ${this.currentTool==='pen'?'active':''}" onclick="noteModal.setTool('pen')">Pen</button>
                        <button class="btn-sm ${this.currentTool==='highlighter'?'active':''}" onclick="noteModal.setTool('highlighter')">Stabilo</button>
                        <button class="btn-sm ${this.currentTool==='eraser'?'active':''}" onclick="noteModal.setTool('eraser')">Coret/Hapus</button>
                        <input type="color" id="note-color-picker" value="${this.lastColor}" onchange="noteModal.changeColor(this.value)" title="Pilih Warna">
                        <button class="btn-sm btn-danger" onclick="noteModal.clearCanvas()">Reset</button>
                        <button class="btn-sm btn-outline" onclick="noteModal.toggleModal()">Tutup</button>
                    </div>
                </div>
                <div class="note-paper-area" id="note-paper-area">
                    <canvas id="note-canvas"></canvas>
                    <textarea id="note-text-layer" placeholder="Atau ketik catatanmu di sini..."></textarea>
                </div>
            </div>
        </div>
        `;

        const style = document.createElement('style');
        style.innerHTML = `
            .note-modal-overlay { position: fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:2000; display:none; justify-content:center; align-items:center; padding:15px; }
            .note-modal-container { background:#fff; width:100%; max-width:700px; height:85vh; border-radius:12px; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 10px 25px rgba(0,0,0,0.2); }
            .note-modal-header { padding:10px 15px; background:#f8fafc; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; }
            .note-toolbar { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
            .note-toolbar button.active { background:#0f172a; color:#fff; }
            #note-color-picker { width:30px; height:30px; border:none; cursor:pointer; background:none; }
            .note-paper-area { position:relative; flex:1; background: #fdfbf7; background-image: linear-gradient(#e5e7eb 1px, transparent 1px); background-size: 100% 28px; overflow:hidden; cursor:crosshair; }
            #note-canvas { position:absolute; top:0; left:0; width:100%; height:100%; touch-action:none; }
            #note-text-layer { position:absolute; top:0; left:0; width:100%; height:100%; background:transparent; border:none; resize:none; padding:10px 15px; font-size:16px; line-height:28px; font-family:inherit; color:#1e293b; outline:none; z-index:2; }
        `;
        document.head.appendChild(style);
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    initCanvas() {
        const canvas = document.getElementById('note-canvas');
        const ctx = canvas.getContext('2d');
        
        const resize = () => {
            const rect = canvas.parentElement.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
        };
        window.addEventListener('resize', resize);
        setTimeout(resize, 200);

        const getPos = (e) => {
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return { x: clientX - rect.left, y: clientY - rect.top };
        };

        const startDraw = (e) => {
            this.isDrawing = true;
            const pos = getPos(e);
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
        };

        const draw = (e) => {
            if (!this.isDrawing) return;
            e.preventDefault();
            const pos = getPos(e);
            
            ctx.lineWidth = this.currentTool === 'highlighter' ? 20 : (this.currentTool === 'eraser' ? 25 : 3);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            if (this.currentTool === 'eraser') {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.strokeStyle = 'rgba(0,0,0,1)';
            } else {
                ctx.globalCompositeOperation = 'source-over';
                ctx.strokeStyle = this.currentTool === 'highlighter' ? this.hexToRgba(this.lastColor, 0.4) : this.lastColor;
            }

            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
        };

        const stopDraw = () => {
            this.isDrawing = false;
        };

        canvas.addEventListener('mousedown', startDraw);
        canvas.addEventListener('mousemove', draw);
        window.addEventListener('mouseup', stopDraw);

        canvas.addEventListener('touchstart', startDraw, {passive: false});
        canvas.addEventListener('touchmove', draw, {passive: false});
        window.addEventListener('touchend', stopDraw);
    }

    hexToRgba(hex, alpha) {
        let c = hex.replace('#','');
        if(c.length===3) c = c.split('').map(x => x+x).join('');
        const num = parseInt(c, 16);
        return `rgba(${(num>>16)&255}, ${(num>>8)&255}, ${num&255}, ${alpha})`;
    }

    setTool(tool) {
        this.currentTool = tool;
        document.querySelectorAll('.note-toolbar button').forEach(b => b.classList.remove('active'));
        event.target.classList.add('active');
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
    }

    toggleModal() {
        const modal = document.getElementById('handwritten-note-modal');
        const isVisible = modal.style.display === 'flex';
        modal.style.display = isVisible ? 'none' : 'flex';
        if(!isVisible) {
            setTimeout(() => {
                const canvas = document.getElementById('note-canvas');
                const rect = canvas.parentElement.getBoundingClientRect();
                if(canvas.width !== rect.width || canvas.height !== rect.height) {
                    canvas.width = rect.width;
                    canvas.height = rect.height;
                }
            }, 100);
        }
    }
}

const noteModal = new HandwrittenNoteModal();
