/**
 * byPdf.js - IELTS Listening Practice PDF & Audio Engine
 * Features:
 *  - PDF.js Viewer with Touch Pinch-to-Zoom & Ctrl+Wheel Zoom
 *  - Interactive Page Jump ("Page X of Y") & Page/View Reset
 *  - Touch & Mouse Drag Panning
 *  - SweetAlert2 Bookmarks
 *  - Synchronized Audio Controller & Background IndexedDB Persistence
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

    // --- INDEXEDDB CACHE (BACKGROUND) ---
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
            console.warn('IndexedDB save skipped:', e);
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
            return null;
        }
    }

    // Configure PDF.js Worker
    if (window.pdfjsLib && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    async function init() {
        audioElem = document.getElementById('pdf-audio-player');
        setupViewerInteractions();
        setupAudioEvents();
        updateBookmarkBadge();
        await restoreCachedFiles();
    }

    async function restoreCachedFiles() {
        try {
            const cachedPdf = await getFromDB('cached_pdf');
            if (cachedPdf && cachedPdf.buffer) {
                renderPdfBuffer(cachedPdf.buffer, cachedPdf.name, false);
            }

            const cachedAudio = await getFromDB('cached_audio');
            if (cachedAudio && cachedAudio.blob) {
                applyAudioBlob(cachedAudio.blob, cachedAudio.name, false);
            }
        } catch(e) {
            console.warn('Cache restore skipped:', e);
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

    function loadAudioFile(input) {
        const file = input.files && input.files[0];
        if (!file) return;

        applyAudioBlob(file, file.name, true);
        saveToDB('cached_audio', { blob: file, name: file.name }).catch(() => {});
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
                title: 'Audio Loaded',
                text: fileName,
                timer: 1400,
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
        const file = input.files && input.files[0];
        if (!file) return;

        document.getElementById('pdf-viewport-container').style.display = 'block';
        document.getElementById('pdf-toolbar').style.display = 'flex';

        const fileReader = new FileReader();
        fileReader.onload = function() {
            const buffer = this.result;
            renderPdfBuffer(buffer, file.name, true);
            saveToDB('cached_pdf', { buffer: buffer, name: file.name }).catch(() => {});
        };
        fileReader.onerror = function() {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Could not read the selected PDF file.' });
        };
        fileReader.readAsArrayBuffer(file);
    }

    function renderPdfBuffer(arrayBuffer, fileName, notify = false) {
        if (!window.pdfjsLib) {
            return Swal.fire({ icon: 'error', title: 'Error', text: 'PDF.js library is not ready.' });
        }

        const typedarray = new Uint8Array(arrayBuffer);

        pdfjsLib.getDocument({ data: typedarray }).promise.then(pdf => {
            pdfDoc = pdf;
            totalPages = pdf.numPages;
            currentPage = 1;

            const totalPagesElem = document.getElementById('pdf-total-pages');
            if (totalPagesElem) totalPagesElem.textContent = totalPages;

            const pageInput = document.getElementById('pdf-page-input');
            if (pageInput) {
                pageInput.max = totalPages;
                pageInput.value = 1;
            }

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
                    title: 'PDF Loaded',
                    text: fileName,
                    timer: 1400,
                    showConfirmButton: false
                });
            }
        }).catch(err => {
            console.error('PDF parsing error:', err);
            Swal.fire({
                icon: 'error',
                title: 'Unable to Render PDF',
                text: err.message || 'The file could not be parsed as a valid PDF.'
            });
        });
    }

    function renderPage(pageNum) {
        if (!pdfDoc) return;
        isRendering = true;

        const pageInput = document.getElementById('pdf-page-input');
        if (pageInput) pageInput.value = pageNum;

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

            renderTask = page.render({
                canvasContext: ctx,
                transform: transform,
                viewport: viewport
            });

            renderTask.promise.then(() => {
                isRendering = false;
                const zoomVal = document.getElementById('pdf-zoom-val');
                if (zoomVal) zoomVal.textContent = `${Math.round(currentScale * 100)}%`;
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
        goToPage(currentPage + dir);
    }

    function goToPage(pageNum) {
        if (!pdfDoc) return;
        let p = parseInt(pageNum, 10);
        if (isNaN(p)) p = 1;
        p = Math.max(1, Math.min(totalPages, p));
        currentPage = p;
        renderPage(currentPage);
    }

    function zoom(delta) {
        if (!pdfDoc) return;
        const newScale = Math.max(0.5, Math.min(3.5, currentScale + delta));
        if (Math.abs(newScale - currentScale) > 0.01) {
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
            const availableWidth = Math.max(260, (container.clientWidth || window.innerWidth) - padding);
            currentScale = Math.max(0.5, Math.min(3.0, availableWidth / defaultViewport.width));
            renderPage(currentPage);
        });
    }

    function resetView() {
        if (!pdfDoc) return;
        currentPage = 1;
        const viewer = document.getElementById('pdf-viewport-container');
        if (viewer) {
            viewer.scrollLeft = 0;
            viewer.scrollTop = 0;
        }
        fitWidth();
    }

    // --- MOUSE & TOUCH INTERACTIONS ---
    function setupViewerInteractions() {
        const viewer = document.getElementById('pdf-viewport-container');
        if (!viewer) return;

        let isDown = false;
        let startX, startY, scrollLeft, scrollTop;

        viewer.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
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

        // Ctrl + Wheel Zoom
        viewer.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const delta = e.deltaY < 0 ? 0.15 : -0.15;
                zoom(delta);
            }
        }, { passive: false });

        // Touch Single Pan & Two-Finger Pinch
        let touchStartX = 0, touchStartY = 0, touchScrollLeft = 0, touchScrollTop = 0;
        let isPinching = false;
        let initialPinchDist = 0;
        let pinchStartScale = 1.0;
        let currentPinchScale = 1.0;

        viewer.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                isPinching = true;
                initialPinchDist = Math.hypot(
                    e.touches[0].pageX - e.touches[1].pageX,
                    e.touches[0].pageY - e.touches[1].pageY
                );
                pinchStartScale = currentScale;
                currentPinchScale = currentScale;
            } else if (e.touches.length === 1 && !isPinching) {
                touchStartX = e.touches[0].pageX - viewer.offsetLeft;
                touchStartY = e.touches[0].pageY - viewer.offsetTop;
                touchScrollLeft = viewer.scrollLeft;
                touchScrollTop = viewer.scrollTop;
            }
        }, { passive: true });

        viewer.addEventListener('touchmove', (e) => {
            if (isPinching && e.touches.length === 2) {
                if (e.cancelable) e.preventDefault();
                const dist = Math.hypot(
                    e.touches[0].pageX - e.touches[1].pageX,
                    e.touches[0].pageY - e.touches[1].pageY
                );
                if (initialPinchDist > 0) {
                    const factor = dist / initialPinchDist;
                    currentPinchScale = Math.max(0.5, Math.min(3.5, pinchStartScale * factor));
                    const canvas = document.getElementById('pdf-canvas');
                    if (canvas) {
                        canvas.style.transform = `scale(${factor})`;
                        canvas.style.transformOrigin = 'center top';
                    }
                }
            } else if (e.touches.length === 1 && !isPinching) {
                const x = e.touches[0].pageX - viewer.offsetLeft;
                const y = e.touches[0].pageY - viewer.offsetTop;
                viewer.scrollLeft = touchScrollLeft - (x - touchStartX);
                viewer.scrollTop = touchScrollTop - (y - touchStartY);
            }
        }, { passive: false });

        viewer.addEventListener('touchend', (e) => {
            if (isPinching) {
                isPinching = false;
                const canvas = document.getElementById('pdf-canvas');
                if (canvas) canvas.style.transform = '';
                if (Math.abs(currentPinchScale - currentScale) > 0.05) {
                    currentScale = currentPinchScale;
                    renderPage(currentPage);
                }
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
        goToPage(page);
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
        goToPage,
        zoom,
        fitWidth,
        resetView,
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
