// test/reading/option.js - Stable Modular Object Pattern

const READING_OPTIONS = {
    "A-J": ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"],
    "YES-NO": ["YES", "NO", "NOT GIVEN"],
    "TRUE-FALSE": ["TRUE", "FALSE", "NOT GIVEN"]
};

class ReadingOptionManager {
    constructor() {
        this.currentActiveWrapper = null;
        this.initStyles();
        this.initModalDOM();
    }

    initStyles() {
        if (document.getElementById('advanced-option-pro-style')) return;
        const style = document.createElement('style');
        style.id = 'advanced-option-pro-style';
        style.innerHTML = `
            .advanced-option-wrapper, .advanced-correct-wrapper {
                display: inline-flex;
                align-items: center;
                background: #ffffff;
                border: 1px solid #cbd5e1;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
                transition: all 0.2s ease;
                flex: 1;
            }
            .advanced-option-wrapper:hover, .advanced-correct-wrapper:hover {
                border-color: #94a3b8;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            }
            .mcq-type-trigger, .mcq-correct-type-trigger {
                background: #f8fafc !important;
                color: #334155 !important;
                font-weight: 700 !important;
                font-size: 11px !important;
                border: none !important;
                border-right: 1px solid #e2e8f0 !important;
                padding: 8px 10px !important;
                outline: none !important;
                cursor: pointer;
                transition: background 0.2s;
                display: inline-flex;
                align-items: center;
                gap: 4px;
                white-space: nowrap;
            }
            .mcq-type-trigger:hover, .mcq-correct-type-trigger:hover {
                background: #e2e8f0 !important;
                color: #0f172a !important;
            }
            .mcq-value-trigger, .mcq-correct-value-trigger {
                background: #ffffff !important;
                color: #0f172a !important;
                font-weight: 600 !important;
                font-size: 14px !important;
                border: none !important;
                padding: 8px 12px !important;
                outline: none !important;
                flex: 1;
                cursor: pointer;
                text-align: left;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .mcq-value-trigger:hover, .mcq-correct-value-trigger:hover {
                background: #f8f9fa;
            }
            .option-modal-overlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px);
                z-index: 3000; display: none; justify-content: center; align-items: center;
                animation: fadeInModal 0.2s ease-out forwards;
            }
            .option-modal-overlay.active { display: flex; }
            @keyframes fadeInModal {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
            }
            .option-modal-card {
                background: #ffffff; width: 90%; max-width: 380px; border-radius: 16px;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                overflow: hidden; display: flex; flex-direction: column; border: 1px solid #e2e8f0;
                max-height: 80vh;
            }
            .option-modal-header {
                padding: 16px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;
                display: flex; justify-content: space-between; align-items: center;
            }
            .option-modal-header h4 { font-size: 1rem; font-weight: 700; color: #1e293b; margin: 0; }
            .option-modal-close {
                background: transparent; border: none; color: #64748b; font-size: 18px; cursor: pointer;
                padding: 4px; border-radius: 4px; display: flex; align-items: center; justify-content: center;
            }
            .option-modal-close:hover { background: #e2e8f0; color: #0f172a; }
            .option-modal-body { padding: 12px; display: flex; flex-direction: column; gap: 6px; overflow-y: auto; }
            .option-modal-item {
                padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;
                font-weight: 600; font-size: 14px; color: #334155; cursor: pointer; transition: all 0.2s;
                text-align: left; display: flex; justify-content: space-between; align-items: center;
            }
            .option-modal-item:hover { background: #eff6ff; border-color: #bfdbfe; color: #2563eb; transform: translateY(-1px); }
            .option-modal-item.selected { background: #dbeafe; border-color: #3b82f6; color: #1d4ed8; }
        `;
        document.head.appendChild(style);
    }

    initModalDOM() {
        if (document.getElementById('custom-option-modal')) return;
        const modalContainer = document.createElement('div');
        modalContainer.id = 'custom-option-modal';
        modalContainer.className = 'option-modal-overlay';
        modalContainer.innerHTML = `
            <div class="option-modal-card">
                <div class="option-modal-header">
                    <h4 id="option-modal-title">Pilih Opsi</h4>
                    <button type="button" class="option-modal-close" id="modal-close-btn">&times;</button>
                </div>
                <div class="option-modal-body" id="option-modal-list"></div>
            </div>
        `;
        document.body.appendChild(modalContainer);

        // Event listener aman tanpa inline onclick string murni
        document.getElementById('modal-close-btn').addEventListener('click', () => this.closeModal());
        modalContainer.addEventListener('click', (e) => {
            if (e.target === modalContainer) this.closeModal();
        });
    }

    openTypeModal(btn) {
        this.currentActiveWrapper = btn.closest('.advanced-option-wrapper') || btn.closest('.advanced-correct-wrapper');
        if (!this.currentActiveWrapper) return;
        const currentType = this.currentActiveWrapper.dataset.optType || "A-J";
        
        document.getElementById('option-modal-title').textContent = "Pilih Format Opsi Soal";
        const types = [
            { id: "A-J", label: "A - J (Multiple Options)" },
            { id: "YES-NO", label: "YES / NO / NOT GIVEN" },
            { id: "TRUE-FALSE", label: "TRUE / FALSE / NOT GIVEN" }
        ];

        const listContainer = document.getElementById('option-modal-list');
        listContainer.innerHTML = types.map(t => `
            <button type="button" class="option-modal-item ${currentType === t.id ? 'selected' : ''}" data-type-id="${t.id}">
                <span>${t.label}</span>
                ${currentType === t.id ? '<svg viewBox="0 0 24 24" width="16" height="16" stroke="#2563eb" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
            </button>
        `).join('');

        // Bind click handler dynamic
        listContainer.querySelectorAll('.option-modal-item').forEach(el => {
            el.addEventListener('click', () => this.selectType(el.dataset.typeId));
        });

        document.getElementById('custom-option-modal').classList.add('active');
    }

    openValueModal(btn) {
        this.currentActiveWrapper = btn.closest('.advanced-option-wrapper') || btn.closest('.advanced-correct-wrapper');
        if (!this.currentActiveWrapper) return;
        const currentType = this.currentActiveWrapper.dataset.optType || "A-J";
        const currentValue = btn.dataset.value || "";
        
        document.getElementById('option-modal-title').textContent = `Pilih Jawaban (${currentType})`;
        const items = READING_OPTIONS[currentType] || READING_OPTIONS["A-J"];
        
        let html = `<button type="button" class="option-modal-item ${currentValue === "" ? 'selected' : ''}" data-val=""><span>-- Reset / Kosongkan --</span></button>`;
        html += items.map(item => `
            <button type="button" class="option-modal-item ${currentValue === item ? 'selected' : ''}" data-val="${item}">
                <span>${item}</span>
                ${currentValue === item ? '<svg viewBox="0 0 24 24" width="16" height="16" stroke="#2563eb" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
            </button>
        `).join('');

        const listContainer = document.getElementById('option-modal-list');
        listContainer.innerHTML = html;

        listContainer.querySelectorAll('.option-modal-item').forEach(el => {
            el.addEventListener('click', () => this.selectValue(el.dataset.val));
        });

        document.getElementById('custom-option-modal').classList.add('active');
    }

    closeModal() {
        document.getElementById('custom-option-modal').classList.remove('active');
        this.currentActiveWrapper = null;
    }

    selectType(newType) {
        if (!this.currentActiveWrapper) return;
        this.currentActiveWrapper.dataset.optType = newType;
        
        const triggerSpan = this.currentActiveWrapper.querySelector('.mcq-type-trigger span') || this.currentActiveWrapper.querySelector('.mcq-correct-type-trigger span');
        if (triggerSpan) triggerSpan.textContent = newType;
        
        const valBtn = this.currentActiveWrapper.querySelector('.mcq-value-trigger') || this.currentActiveWrapper.querySelector('.mcq-correct-value-trigger');
        if (valBtn) {
            valBtn.dataset.value = "";
            const valSpan = valBtn.querySelector('.val-text');
            if (valSpan) valSpan.textContent = "-- Pilih --";
        }

        this.closeModal();
        if (typeof window.saveData === 'function') window.saveData();
    }

    selectValue(val) {
        if (!this.currentActiveWrapper) return;
        const valBtn = this.currentActiveWrapper.querySelector('.mcq-value-trigger') || this.currentActiveWrapper.querySelector('.mcq-correct-value-trigger');
        if (valBtn) {
            valBtn.dataset.value = val;
            const valSpan = valBtn.querySelector('.val-text');
            if (valSpan) valSpan.textContent = val ? val : "-- Pilih --";
        }

        this.closeModal();
        if (typeof window.saveData === 'function') window.saveData();
    }

    renderOptionsHtml(selectedType = "A-J", selectedVal = "") {
        let displayVal = selectedVal ? selectedVal : "-- Pilih --";
        return `
            <div class="advanced-option-wrapper" data-opt-type="${selectedType}">
                <button type="button" class="mcq-type-trigger" onclick="optionManager.openTypeModal(this)">
                    <span>${selectedType}</span> 
                    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
                <button type="button" class="mcq-value-trigger" onclick="optionManager.openValueModal(this)" data-value="${selectedVal}">
                    <span class="val-text">${displayVal}</span>
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="#64748b" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
            </div>
        `;
    }

    renderCorrectOptionsHtml(selectedType = "A-J", selectedVal = "") {
        let displayVal = selectedVal ? selectedVal : "-- Pilih Kunci --";
        return `
            <div class="advanced-correct-wrapper" data-opt-type="${selectedType}">
                <button type="button" class="mcq-correct-type-trigger" onclick="optionManager.openTypeModal(this)">
                    <span>${selectedType}</span> 
                    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
                <button type="button" class="mcq-correct-value-trigger" onclick="optionManager.openValueModal(this)" data-value="${selectedVal}">
                    <span class="val-text">${displayVal}</span>
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="#64748b" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
            </div>
        `;
    }
}

// Inisialisasi Instance Global agar mirip seperti myNote
window.optionManager = new ReadingOptionManager();

// Helper global supaya fungsi lama tetap kompatibel tanpa error
function generateOptionsHtml(type, val) { return window.optionManager.renderOptionsHtml(type, val); }
function generateCorrectOptionsHtml(type, val) { return window.optionManager.renderCorrectOptionsHtml(type, val); }
function closeOptionModal() { window.optionManager.closeModal(); }
