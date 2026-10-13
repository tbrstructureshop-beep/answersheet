/**
 * byPdf.js - IELTS Listening Practice PDF & Audio Engine
 * Fitur: PDF.js Viewer (Zoom, Pan Drag, Bookmark) + Audio Player terintegrasi Time Mark
 */

const ByPdf = (function() {
    let pdfDoc = null;
    let currentPage = 1;
    let totalPages = 0;
    let currentScale = 1.2;
    let renderTask = null;
    let isRendering = false;
    let audioElem = null;
    const BOOKMARK_STORAGE_KEY = 'ielts_listening_pdf_bookmarks';

    // Inisialisasi library worker PDF.js
    if (window.pdfjsLib) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    function init() {
        audioElem = document.getElementById('pdf-audio-player');
        setupViewerPanning();
        setupAudioEvents();
        updateBookmarkBadge();
    }

    // --- AUDIO CONTROLLER & TIME SYNC ---
    function setupAudioEvents() {
        if (!audioElem) return;
        const progress = document.getElementById('pdf-audio-progress');
        const timeDisplay = document.getElementById('pdf-audio-time');
        const playBtn = document.getElementById('pdf-btn-play');

        audioElem.addEventListener('timeupdate', () => {
            if (!audioElem.duration) return;
            const pct = (audioElem.currentTime / audioElem.duration) * 100;
            if (progress) progress.value = pct;
            if (timeDisplay) {
                timeDisplay.textContent = `${formatTime(audioElem.currentTime)} / ${formatTime(audioElem.duration)}`;
            }
        });

        audioElem.addEventListener('play', () => {
            if (playBtn) playBtn.innerHTML = '⏸ Pause';
        });

        audioElem.addEventListener('pause', () => {
            if (playBtn) playBtn.innerHTML = '▶ Play';
        });

        audioElem.addEventListener('ended', () => {
            if (playBtn) playBtn.innerHTML = '▶ Play';
        });

        if (progress) {
            progress.addEventListener('input', (e) => {
                if (!audioElem.duration) return;
                audioElem.currentTime = (e.target.value / 100) * audioElem.duration;
            });
        }
    }

    function loadAudioFile(input) {
        const file = input.files[0];
        if (!file) return;
        if (!audioElem) audioElem = document.getElementById('pdf-audio-player');
        audioElem.src = URL.createObjectURL(file);
        audioElem.play().catch(() => {});
        document.getElementById('pdf-audio-bar').style.display = 'flex';
        Swal.fire({
            icon: 'success',
            title: 'Audio Loaded!',
            text: file.name,
            timer: 1500,
            showConfirmButton: false
        });
    }

    function togglePlay() {
        if (!audioElem || !audioElem.src) return;
        if (audioElem.paused) audioElem.play();
        else audioElem.pause();
    }

    function seekRelative(seconds) {
        if (!audioElem || !audioElem.src) return;
        audioElem.currentTime = Math.max(0, Math.min(audioElem.duration || 0, audioElem.currentTime + seconds));
    }

    function setSpeed(rate) {
        if (audioElem) audioElem.playbackRate = parseFloat(rate);
    }

    function getAudioTime() {
        if (audioElem && !audioElem.paused && !isNaN(audioElem.currentTime)) {
            return audioElem.currentTime;
        }
        if (audioElem && audioElem.src && !isNaN(audioElem.currentTime)) {
            return audioElem.currentTime;
        }
        return null;
    }

    function seekAudio(seconds) {
        if (audioElem && audioElem.src) {
            audioElem.currentTime = seconds;
            audioElem.play();
            return true;
        }
        return false;
    }

    function formatTime(seconds) {
        if (isNaN(seconds)) return '00:00';
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    // --- PDF CONTROLLER ---
    function loadPdfFile(input) {
        const file = input.files[0];
        if (!file) return;

        const fileReader = new FileReader();
        fileReader.onload = function() {
            const typedarray = new Uint8Array(this.result);
            if (!window.pdfjsLib) {
                return Swal.fire({ icon: 'error', title: 'Error', text: 'PDF.js library not loaded yet.' });
            }

            pdfjsLib.getDocument(typedarray).promise.then(pdf => {
                pdfDoc = pdf;
                totalPages = pdf.numPages;
                currentPage = 1;
                document.getElementById('pdf-total-pages').textContent = totalPages;
                document.getElementById('pdf-viewport-container').style.display = 'block';
                document.getElementById('pdf-toolbar').style.display = 'flex';
                renderPage(currentPage);
            }).catch(err => {
                Swal.fire({ icon: 'error', title: 'Failed to load PDF', text: err.message });
            });
        };
        fileReader.readAsArrayBuffer(file);
    }

    function renderPage(pageNum) {
        if (!pdfDoc) return;
        isRendering = true;
        document.getElementById('pdf-current-page').textContent = pageNum;

        pdfDoc.getPage(pageNum).then(page => {
            const canvas = document.getElementById('pdf-canvas');
            const ctx = canvas.getContext('2d');
            const viewport = page.getViewport({ scale: currentScale });

            // Resolusi tajam untuk Retina / High DPI Display
            const outputScale = window.devicePixelRatio || 1;
            canvas.width = Math.floor(viewport.width * outputScale);
            canvas.height = Math.floor(viewport.height * outputScale);
            canvas.style.width = Math.floor(viewport.width) + "px";
            canvas.style.height = Math.floor(viewport.height) + "px";

            const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

            if (renderTask) {
                renderTask.cancel();
            }

            const renderContext = {
                canvasContext: ctx,
                transform: transform,
                viewport: viewport
            };

            renderTask = page.render(renderContext);
            renderTask.promise.then(() => {
                isRendering = false;
                document.getElementById('pdf-zoom-val').textContent = `${Math.round(currentScale * 100)}%`;
            }).catch(err => {
                if (err.name !== 'RenderingCancelledException') {
                    console.error('Render error:', err);
                }
                isRendering = false;
            });
        });
    }

    function changePage(dir) {
        if (!pdfDoc) return;
        const targetPage = currentPage + dir;
        if (targetPage >= 1 && targetPage <= totalPages) {
            currentPage = targetPage;
            renderPage(currentPage);
        }
    }

    function zoom(delta) {
        if (!pdfDoc) return;
        const newScale = Math.max(0.6, Math.min(3.0, currentScale + delta));
        if (newScale !== currentScale) {
            currentScale = newScale;
            renderPage(currentPage);
        }
    }

    function fitWidth() {
        if (!pdfDoc) return;
        const container = document.getElementById('pdf-viewport-container');
        pdfDoc.getPage(currentPage).then(page => {
            const defaultViewport = page.getViewport({ scale: 1.0 });
            const availableWidth = container.clientWidth - 30;
            currentScale = Math.max(0.6, Math.min(3.0, availableWidth / defaultViewport.width));
            renderPage(currentPage);
        });
    }

    // --- PANNING / DRAG SYSTEM (GESER PDF DENGAN MOUSE & TOUCH) ---
    function setupViewerPanning() {
        const viewer = document.getElementById('pdf-viewport-container');
        if (!viewer) return;

        let isDown = false;
        let startX, startY, scrollLeft, scrollTop;

        // Mouse Drag to Pan
        viewer.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            isDown = true;
            viewer.classList.add('grabbing');
            startX = e.pageX - viewer.offsetLeft;
            startY = e.pageY - viewer.offsetTop;
            scrollLeft = viewer.scrollLeft;
            scrollTop = viewer.scrollTop;
        });

        viewer.addEventListener('mouseleave', () => {
            isDown = false;
            viewer.classList.remove('grabbing');
        });

        viewer.addEventListener('mouseup', () => {
            isDown = false;
            viewer.classList.remove('grabbing');
        });

        viewer.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - viewer.offsetLeft;
            const y = e.pageY - viewer.offsetTop;
            viewer.scrollLeft = scrollLeft - (x - startX);
            viewer.scrollTop = scrollTop - (y - startY);
        });
    }

    // --- BOOKMARK SYSTEM DENGAN SWEETALERT2 ---
    function getBookmarks() {
        try {
            return JSON.parse(localStorage.getItem(BOOKMARK_STORAGE_KEY)) || [];
        } catch(e) {
            return [];
        }
    }

    function updateBookmarkBadge() {
        const btn = document.getElementById('pdf-btn-view-bm');
        if (!btn) return;
        const list = getBookmarks();
        btn.innerHTML = `📑 Bookmarks (${list.length})`;
    }

    function addBookmark() {
        if (!pdfDoc) {
            return Swal.fire({ icon: 'warning', title: 'Belum ada PDF', text: 'Silakan load file PDF terlebih dahulu.' });
        }

        Swal.fire({
            title: `Bookmark Halaman ${currentPage}`,
            input: 'text',
            inputLabel: 'Beri Catatan / Nama Bagian:',
            inputValue: `Part on Page ${currentPage}`,
            showCancelButton: true,
            confirmButtonText: 'Simpan',
            confirmButtonColor: '#2563eb'
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                const list = getBookmarks();
                list.push({
                    id: Date.now(),
                    page: currentPage,
                    label: result.value.trim(),
                    created: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                });
                localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(list));
                updateBookmarkBadge();
                Swal.fire({ icon: 'success', title: 'Tersimpan!', timer: 1200, showConfirmButton: false });
            }
        });
    }

    function showBookmarksModal() {
        const list = getBookmarks();
        if (list.length === 0) {
            return Swal.fire({
                icon: 'info',
                title: 'Belum Ada Bookmark',
                text: 'Gunakan tombol ⭐ Bookmark untuk menandai halaman soal penting.'
            });
        }

        const itemsHtml = list.map((bm, index) => `
            <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 8px; text-align: left;">
                <div style="cursor: pointer; flex: 1;" onclick="ByPdf.jumpToBookmark(${bm.page})">
                    <div style="font-weight: 700; color: #2563eb; font-size: 0.95rem;">Hal. ${bm.page} - ${bm.label}</div>
                    <div style="font-size: 0.75rem; color: #94a3b8;">Disimpan jam ${bm.created}</div>
                </div>
                <button type="button" onclick="ByPdf.removeBookmark(${bm.id})" style="background: none; border: none; color: #ef4444; font-size: 1.1rem; cursor: pointer; padding: 4px 8px;">✕</button>
            </div>
        `).join('');

        Swal.fire({
            title: 'Daftar Bookmark PDF',
            html: `
                <div style="max-height: 280px; overflow-y: auto; margin-top: 10px;">
                    ${itemsHtml}
                </div>
            `,
            showConfirmButton: false,
            showCloseButton: true,
            width: 420
        });
    }

    function jumpToBookmark(page) {
        if (!pdfDoc) return;
        currentPage = page;
        renderPage(currentPage);
        Swal.close();
    }

    function removeBookmark(id) {
        let list = getBookmarks();
        list = list.filter(bm => bm.id !== id);
        localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(list));
        updateBookmarkBadge();
        showBookmarksModal();
    }

    return {
        init,
        loadPdfFile,
        loadAudioFile,
        changePage,
        zoom,
        fitWidth,
        togglePlay,
        seekRelative,
        setSpeed,
        getAudioTime,
        seekAudio,
        addBookmark,
        showBookmarksModal,
        jumpToBookmark,
        removeBookmark
    };
})();

window.ByPdf = ByPdf;
