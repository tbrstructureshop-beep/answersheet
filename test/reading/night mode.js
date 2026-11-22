(function () {
    const NIGHT_MODE_KEY = 'ielts_reading_night_mode';

    const ICON_MOON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
    const ICON_SUN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;

    const nightModeCSS = `
        .btn-night { background: #334155; color: #f8fafc; }
        .btn-night:hover { background: #1e293b; }

        @media screen {
            body.night-mode {
                --primary: #3b82f6;
                --primary-hover: #60a5fa;
                --bg-color: #0f172a;
                --card-bg: #1e293b;
                --border: #334155;
                --text-main: #f1f5f9;
                --text-muted: #94a3b8;
                --correct-bg: rgba(22, 163, 74, 0.22);
                --incorrect-bg: rgba(220, 38, 38, 0.22);
            }

            body.night-mode .btn-night {
                background: #f59e0b;
                color: #0f172a;
            }
            body.night-mode .btn-night:hover {
                background: #fbbf24;
            }

            body.night-mode .sticky-zone {
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
            }
            @media (min-width: 992px) {
                body.night-mode .sticky-zone {
                    box-shadow: 4px 0 6px -1px rgba(0, 0, 0, 0.4);
                }
                body.night-mode #custom-keyboard {
                    border-left-color: #334155;
                }
            }

            /* Inputs & Text */
            body.night-mode input[type="text"],
            body.night-mode input[type="file"],
            body.night-mode .section-title,
            body.night-mode .answer-input,
            body.night-mode .mcq-desc,
            body.night-mode .mcq-correct-desc {
                color: var(--text-main);
            }
            body.night-mode .media-setup input[type="text"],
            body.night-mode .media-setup input[type="file"] {
                background-color: #0f172a;
                border-color: var(--border);
                color: var(--text-main);
            }
            body.night-mode input::placeholder {
                color: #64748b;
            }
            body.night-mode .reason-input {
                background-color: #0f172a;
                color: var(--text-main);
                border-color: #475569;
            }
            body.night-mode .input-active {
                background-color: rgba(59, 130, 246, 0.2) !important;
                border-bottom-color: #60a5fa !important;
            }

            /* Workspace Cards & Badges */
            body.night-mode .time-marks-area {
                background-color: #0f172a;
                border-color: var(--border);
            }
            body.night-mode .time-badge {
                background-color: rgba(59, 130, 246, 0.2);
                color: #93c5fd;
                border-color: rgba(59, 130, 246, 0.4);
            }
            body.night-mode .time-badge:hover {
                background-color: rgba(59, 130, 246, 0.35);
            }
            body.night-mode .answer-row {
                background-color: #0f172a;
                border-color: var(--border);
            }
            body.night-mode .answer-row[data-correct="true"] {
                background-color: var(--correct-bg);
                border-color: #15803d;
            }
            body.night-mode .answer-row[data-correct="false"] {
                background-color: var(--incorrect-bg);
                border-color: #b91c1c;
            }

            /* Buttons */
            body.night-mode .btn-outline {
                color: #60a5fa;
                border-color: #3b82f6;
            }
            body.night-mode .btn-outline:hover {
                background-color: rgba(59, 130, 246, 0.15);
            }
            body.night-mode .btn-danger {
                color: #f87171;
                border-color: #ef4444;
            }
            body.night-mode .btn-danger:hover {
                background-color: rgba(239, 68, 68, 0.15);
            }
            body.night-mode .btn-icon {
                color: var(--text-main);
                border-color: #475569;
            }
            body.night-mode .btn-icon.check:hover {
                background-color: rgba(34, 197, 94, 0.2);
                border-color: #22c55e;
                color: #4ade80;
            }
            body.night-mode .btn-icon.cross:hover {
                background-color: rgba(239, 68, 68, 0.2);
                border-color: #ef4444;
                color: #f87171;
            }
            body.night-mode button:disabled {
                opacity: 0.45;
                cursor: not-allowed;
            }

            /* Custom Virtual Keyboard */
            body.night-mode #custom-keyboard {
                background: #0f172a;
                border-top: 1px solid #334155;
                box-shadow: 0 -4px 15px rgba(0, 0, 0, 0.5);
            }
            body.night-mode .kb-key {
                background: #1e293b;
                color: #f1f5f9;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
            }
            body.night-mode .kb-key:active {
                background: #334155;
            }
            body.night-mode .kb-key.wide {
                background: #334155;
                color: #e2e8f0;
            }
            body.night-mode .kb-key.done {
                background: var(--primary);
                color: #ffffff;
            }
            body.night-mode .kb-key.proper {
                background: #059669;
                color: #ffffff;
            }

            /* SweetAlert2 & Option Modal */
            body.night-mode .swal2-popup {
                background: #1e293b !important;
                color: #f1f5f9 !important;
                border: 1px solid #334155;
            }
            body.night-mode .swal2-title,
            body.night-mode .swal2-html-container {
                color: #f1f5f9 !important;
            }
            body.night-mode .swal2-close {
                color: #94a3b8 !important;
            }
            body.night-mode .swal2-close:hover {
                color: #f1f5f9 !important;
            }
            body.night-mode .swal-opt-btn {
                background: #0f172a;
                border-color: #334155;
                color: #f1f5f9;
            }
            body.night-mode .swal-opt-btn:hover {
                background: rgba(59, 130, 246, 0.2);
                border-color: #3b82f6;
                color: #60a5fa;
            }
            body.night-mode .swal-opt-btn.clear {
                border-color: #b91c1c;
                color: #f87171;
            }
            body.night-mode .swal-opt-btn.clear:hover {
                background: rgba(239, 68, 68, 0.2);
            }

            /* Scrollbars */
            body.night-mode .main-scroll-area::-webkit-scrollbar,
            body.night-mode .sticky-zone::-webkit-scrollbar {
                width: 8px;
            }
            body.night-mode .main-scroll-area::-webkit-scrollbar-track,
            body.night-mode .sticky-zone::-webkit-scrollbar-track {
                background: #0f172a;
            }
            body.night-mode .main-scroll-area::-webkit-scrollbar-thumb,
            body.night-mode .sticky-zone::-webkit-scrollbar-thumb {
                background: #334155;
                border-radius: 4px;
            }
        }
    `;

    function injectNightModeStyles() {
        if (document.getElementById('night-mode-styles')) return;
        const style = document.createElement('style');
        style.id = 'night-mode-styles';
        style.textContent = nightModeCSS;
        document.head.appendChild(style);
    }

    function updateNightModeButton(isNight) {
        const btn = document.getElementById('btn-night-mode');
        if (!btn) return;
        btn.innerHTML = isNight ? `${ICON_SUN} Day` : `${ICON_MOON} Night`;
        btn.title = isNight ? 'Switch to Day Mode' : 'Switch to Night Mode';
    }

    function applyNightMode(isNight) {
        document.body.classList.toggle('night-mode', isNight);
        updateNightModeButton(isNight);
    }

    window.toggleNightMode = function () {
        const isNight = !document.body.classList.contains('night-mode');
        applyNightMode(isNight);
        localStorage.setItem(NIGHT_MODE_KEY, isNight ? 'true' : 'false');
    };

    function initNightMode() {
        injectNightModeStyles();
        const saved = localStorage.getItem(NIGHT_MODE_KEY) === 'true';
        applyNightMode(saved);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNightMode);
    } else {
        initNightMode();
    }
})();
