/**
 * byPdf.js - IELTS Listening Practice PDF & Audio Engine with Offline Auto-Persistence
 * Features: IndexedDB File Cache, PDF.js Viewer (Zoom, Touch/Mouse Pan, Bookmarks), Audio Sync
 */

const ByPdf = (function() {
    let pdfDoc = null;
    let currentPage = 1;
    let totalPages = 0;
    let currentScale = 1.0;
    let renderTask = null;
    let isRendering = false;
    let audioElem = null;
    const BOOKMARK_STORAGE_KEY = 'ielts_listening_pdf_bookmarks';
    const DB_NAME = 'IeltsListeningStorage';
    const DB_VERSION = 1;
    const STORE_NAME = 'media_files';

    // SVG Icon Constants
    const ICON_PLAY = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
    const ICON_PAUSE = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
    const ICON_BOOKMARK = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`;

    // --- INDEXEDDB HELPER ---
    function openDB() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async function saveToDB(key, data) {
        try {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                tx.objectStore(STORE_NAME).put(data, key);
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => reject(tx.error);
            });
        } catch(e) {
            console.error('IndexedDB Save Error:', e);
        }
    }

    async function getFromDB(key) {
        try {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const req = tx.objectStore(STORE_NAME).get(key);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        } catch(e) {
            console.error('IndexedDB Read Error:', e);
            return null;
        }
    }

    async function removeFromDB(key) {
        try {
            const db = await openDB();
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).delete(key);
        } catch(e) {}
    }

    // PDF.js Worker
    if (window.pdfjsLib) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    async function init() {
        audioElem = document.getElementById('pdf-audio-player');
        setupViewerPanning();
        setupAudioEvents();
        updateBookmarkBadge();
        await restoreCachedFiles();
    }

    // Restore cached PDF and Audio when browser reopens
    async function restoreCachedFiles() {
        const cachedPdf = await getFromDB('cached_pdf');
        if (cachedPdf && cachedPdf.buffer) {
            renderPdfBuffer(cachedPdf.buffer, cachedPdf.name, false);
        }

        const cachedAudio = await getFromDB('cached_audio');
        if (cachedAudio && cachedAudio.blob) {
            applyAudioBlob(cachedAudio.blob, cachedAudio.name, false);
        }
    }

    // --- AUDIO CONTROLLER ---
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
            if (playBtn) playBtn.innerHTML = `${ICON_PAUSE} Pause`;
        });

        audioElem.addEventListener('pause', () => {
            if (playBtn) playBtn.innerHTML = `${ICON_PLAY} Play`;
        });

        audioElem.addEventListener('ended', () => {
            if (playBtn) playBtn.innerHTML = `${ICON_PLAY} Play`;
        });

        if (progress) {
            progress.addEventListener('input', (e) => {
                if (!audioElem.duration) return;
                audioElem.currentTime = (e.target.value / 100) * audioElem.duration;
            });
        }
    }

    async function loadAudioFile(input) {
        const file = input.files[0];
        if (!file) return;
        await saveToDB('cached_audio', { blob: file, name: file.name });
        applyAudioBlob(file, file.name, true);
    }

    function applyAudioBlob(blob, fileName, notify = false) {
        if (!audioElem) audioElem = document.getElementById('pdf-audio-player');
        if (audioElem.src) URL.revokeObjectURL(audioElem.src);
        audioElem.src = URL.createObjectURL(blob);

        document.getElementById('pdf-audio-bar').style.display = 'flex';
        const label = document.getElementById('pdf-audio-status-name');
        if (label) {
            label.textContent = fileName;
            label.style.display = 'inline-block';
        }

        if (notify) {
            Swal.fire({
                icon: 'success',
                title: 'Audio Saved Locally',
                text: `${fileName} will remain available on next visit.`,
                timer: 1500,
                showConfirmButton: false
            });
        }
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
        if (audioElem && !isNaN(audioElem.currentTime)) {
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
        fileReader.onload = async function() {
            const buffer = this.result;
            await saveToDB('cached_pdf', { buffer: buffer, name: file.name });
            renderPdfBuffer(buffer, file.name, true);
        };
        fileReader.readAsArrayBuffer(file);
    }

    function renderPdfBuffer(arrayBuffer, fileName, notify = false) {
        if (!window.pdfjsLib) {
            return Swal.fire({ icon: 'error', title: 'Error', text: 'PDF.js library is not ready.' });
        }

        const typedarray = new Uint8Array(arrayBuffer);
        pdfjsLib.getDocument(typedarray).promise.then(pdf => {
            pdfDoc = pdf;
            totalPages = pdf.numPages;
            currentPage = 1;
            document.getElementById('pdf-total-pages').textContent = totalPages;
            document.getElementById('pdf-viewport-container').style.display = 'block';
            document.getElementById('pdf-toolbar').style.display = 'flex';

            const status = document.getElementById('pdf-doc-status-name');
            if (status) {
                status.textContent = fileName;
                status.style.display = 'inline-block';
            }

            fitWidth();

            if (notify) {
                Swal.fire({
                    icon: 'success',
                    title: 'PDF Saved Locally',
                    text: `${fileName} will be remembered automatically.`,
                    timer: 1500,
                    showConfirmButton: false
                });
            }
        }).catch(err => {
            console.error('PDF Load Error:', err);
        });
    }

    function renderPage(pageNum) {
        if (!pdfDoc) return;
        isRendering = true;
        document.getElementById('pdf-current-page').textContent = pageNum;

        pdfDoc.getPage(pageNum).then(page => {
            const canvas = document.getElementById('pdf-canvas');
            const ctx = canvas.getContext('2d');
            const viewport = page.getViewport({ scale: currentScale });

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
            const padding = window.innerWidth < 600 ? 16 : 30;
            const availableWidth = (container.clientWidth || window.innerWidth) - padding;
            currentScale = Math.max(0.6, Math.min(2.5, availableWidth / defaultViewport.width));
            renderPage(currentPage);
        });
    }

    // --- PANNING / DRAG SYSTEM ---
    function setupViewerPanning() {
        const viewer = document.getElementById('pdf-viewport-container');
        if (!viewer) return;

        let isDown = false;
        let startX, startY, scrollLeft, scrollTop;

        viewer.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            isDown = true;
            viewer.classList.add('grabbing');
            startX = e.pageX - viewer.offsetLeft;
            startY = e.pageY - viewer.offsetTop;
            scrollLeft = viewer.scrollLeft;
            scrollTop = viewer.scrollTop;
        });

        viewer.addEventListener('mouseleave', () => { isDown = false; viewer.classList.remove('grabbing'); });
        viewer.addEventListener('mouseup', () => { isDown = false; viewer.classList.remove('grabbing'); });
        viewer.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - viewer.offsetLeft;
            const y = e.pageY - viewer.offsetTop;
            viewer.scrollLeft = scrollLeft - (x - startX);
            viewer.scrollTop = scrollTop - (y - startY);
        });

        // Touch Pan
        let touchStartX, touchStartY, touchScrollLeft, touchScrollTop;
        viewer.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                touchStartX = e.touches[0].pageX - viewer.offsetLeft;
                touchStartY = e.touches[0].pageY - viewer.offsetTop;
                touchScrollLeft = viewer.scrollLeft;
                touchScrollTop = viewer.scrollTop;
            }
        }, { passive: true });

        viewer.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1) {
                const x = e.touches[0].pageX - viewer.offsetLeft;
                const y = e.touches[0].pageY - viewer.offsetTop;
                viewer.scrollLeft = touchScrollLeft - (x - touchStartX);
                viewer.scrollTop = touchScrollTop - (y - touchStartY);
            }
        }, { passive: true });
    }

    // --- BOOKMARKS ---
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
        btn.innerHTML = `${ICON_BOOKMARK} Bookmarks (${list.length})`;
    }

    function addBookmark() {
        if (!pdfDoc) {
            return Swal.fire({ icon: 'warning', title: 'PDF Not Loaded', text: 'Please load a PDF document first.' });
        }

        Swal.fire({
            title: `Bookmark Page ${currentPage}`,
            input: 'text',
            inputLabel: 'Description / Section Title:',
            inputValue: `Section on Page ${currentPage}`,
            showCancelButton: true,
            confirmButtonText: 'Save',
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
                Swal.fire({ icon: 'success', title: 'Bookmark Saved', timer: 1200, showConfirmButton: false });
            }
        });
    }

    function showBookmarksModal() {
        const list = getBookmarks();
        if (list.length === 0) {
            return Swal.fire({
                icon: 'info',
                title: 'No Bookmarks Yet',
                text: 'Use the Bookmark button to save important question pages.'
            });
        }

        const itemsHtml = list.map((bm) => `
            <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 8px; text-align: left;">
                <div style="cursor: pointer; flex: 1;" onclick="ByPdf.jumpToBookmark(${bm.page})">
                    <div style="font-weight: 700; color: #2563eb; font-size: 0.95rem;">Page ${bm.page} &ndash; ${bm.label}</div>
                    <div style="font-size: 0.75rem; color: #94a3b8;">Recorded at ${bm.created}</div>
                </div>
                <button type="button" onclick="ByPdf.removeBookmark(${bm.id})" style="background: none; border: none; color: #ef4444; font-size: 1.1rem; cursor: pointer; padding: 4px 8px;">✕</button>
            </div>
        `).join('');

        Swal.fire({
            title: 'PDF Bookmarks',
            html: `<div style="max-height: 280px; overflow-y: auto; margin-top: 10px;">${itemsHtml}</div>`,
            showConfirmButton: false,
            showCloseButton: true,
            width: 400
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
