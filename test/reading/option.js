// test/reading/option.js

const READING_OPTIONS = {
    "A-J": ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"],
    "YES-NO": ["YES", "NO", "NOT GIVEN"],
    "TRUE-FALSE": ["TRUE", "FALSE", "NOT GIVEN"]
};

(function injectAdvancedOptionStyles() {
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

    if (!document.getElementById('custom-option-modal')) {
        const modalContainer = document.createElement('div');
        modalContainer.id = 'custom-option-modal';
        modalContainer.className = 'option-modal-overlay';
        modalContainer.innerHTML = `
            <div class="option-modal-card">
                <div class="option-modal-header">
                    <h4 id="option-modal-title">Pilih Opsi</h4>
                    <button class="option-modal-close" onclick="closeOptionModal()">&times;</button>
                </div>
                <div class="option-modal-body" id="option-modal-list"></div>
            </div>
        `;
        document.body.appendChild(modalContainer);
    }
})();

let currentActiveWrapper = null;
let modalTargetMode = 'type';

function generateOptionsHtml(selectedType = "A-J", selectedVal = "") {
    let displayVal = selectedVal ? selectedVal : "-- Pilih --";
    let triggerBtnHtml = `<button type="button" class="mcq-type-trigger" onclick="openTypeModal(this)" data-current-type="${selectedType}">
        <span>${selectedType}</span> 
        <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
    </button>`;
    let valueBtnHtml = `<button type="button" class="mcq-value-trigger" onclick="openValueModal(this)" data-value="${selectedVal}">
        <span class="val-text">${displayVal}</span>
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="#64748b" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
    </button>`;
    return `<div class="advanced-option-wrapper" data-opt-type="${selectedType}">${triggerBtnHtml}${valueBtnHtml}</div>`;
}

function generateCorrectOptionsHtml(selectedType = "A-J", selectedVal = "") {
    let displayVal = selectedVal ? selectedVal : "-- Pilih Kunci --";
    let triggerBtnHtml = `<button type="button" class="mcq-correct-type-trigger" onclick="openTypeModal(this)" data-current-type="${selectedType}">
        <span>${selectedType}</span> 
        <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
    </button>`;
    let valueBtnHtml = `<button type="button" class="mcq-correct-value-trigger" onclick="openValueModal(this)" data-value="${selectedVal}">
        <span class="val-text">${displayVal}</span>
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="#64748b" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
    </button>`;
    return `<div class="advanced-correct-wrapper" data-opt-type="${selectedType}">${triggerBtnHtml}${valueBtnHtml}</div>`;
}

function openTypeModal(btn) {
    currentActiveWrapper = btn.closest('.advanced-option-wrapper') || btn.closest('.advanced-correct-wrapper');
    const currentType = currentActiveWrapper.dataset.optType || "A-J";
    modalTargetMode = 'type';
    document.getElementById('option-modal-title').textContent = "Pilih Format Opsi Soal";
    const types = [
        { id: "A-J", label: "A - J (Multiple Options)" },
        { id: "YES-NO", label: "YES / NO / NOT GIVEN" },
        { id: "TRUE-FALSE", label: "TRUE / FALSE / NOT GIVEN" }
    ];
    const listContainer = document.getElementById('option-modal-list');
    listContainer.innerHTML = types.map(t => `
        <button type="button" class="option-modal-item ${currentType === t.id ? 'selected' : ''}" onclick="selectOptionType('${t.id}')">
            <span>${t.label}</span>
            ${currentType === t.id ? '<svg viewBox="0 0 24 24" width="16" height="16" stroke="#2563eb" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
        </button>
    `).join('');
    document.getElementById('custom-option-modal').classList.add('active');
}

function openValueModal(btn) {
    currentActiveWrapper = btn.closest('.advanced-option-wrapper') || btn.closest('.advanced-correct-wrapper');
    const currentType = currentActiveWrapper.dataset.optType || "A-J";
    const currentValue = btn.dataset.value || "";
    modalTargetMode = 'value';
    document.getElementById('option-modal-title').textContent = `Pilih Jawaban (${currentType})`;
    const items = READING_OPTIONS[currentType] || READING_OPTIONS["A-J"];
    let html = `<button type="button" class="option-modal-item ${currentValue === "" ? 'selected' : ''}" onclick="selectOptionValue('')"><span>-- Reset / Kosongkan --</span></button>`;
    html += items.map(item => `
        <button type="button" class="option-modal-item ${currentValue === item ? 'selected' : ''}" onclick="selectOptionValue('${item}')">
            <span>${item}</span>
            ${currentValue === item ? '<svg viewBox="0 0 24 24" width="16" height="16" stroke="#2563eb" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
        </button>
    `).join('');
    document.getElementById('option-modal-list').innerHTML = html;
    document.getElementById('custom-option-modal').classList.add('active');
}

function closeOptionModal() {
    document.getElementById('custom-option-modal').classList.remove('active');
    currentActiveWrapper = null;
}

function selectOptionType(newType) {
    if (!currentActiveWrapper) return;
    currentActiveWrapper.dataset.optType = newType;
    const triggerSpan = currentActiveWrapper.querySelector('.mcq-type-trigger span') || currentActiveWrapper.querySelector('.mcq-correct-type-trigger span');
    if (triggerSpan) triggerSpan.textContent = newType;
    const valBtn = currentActiveWrapper.querySelector('.mcq-value-trigger') || currentActiveWrapper.querySelector('.mcq-correct-value-trigger');
    if (valBtn) {
        valBtn.dataset.value = "";
        const valSpan = valBtn.querySelector('.val-text');
        if (valSpan) valSpan.textContent = "-- Pilih --";
    }
    closeOptionModal();
    if (typeof saveData === 'function') saveData();
}

function selectOptionValue(val) {
    if (!currentActiveWrapper) return;
    const valBtn = currentActiveWrapper.querySelector('.mcq-value-trigger') || currentActiveWrapper.querySelector('.mcq-correct-value-trigger');
    if (valBtn) {
        valBtn.dataset.value = val;
        const valSpan = valBtn.querySelector('.val-text');
        if (valSpan) valSpan.textContent = val ? val : "-- Pilih --";
    }
    closeOptionModal();
    if (typeof saveData === 'function') saveData();
}

window.addEventListener('click', (e) => {
    const modal = document.getElementById('custom-option-modal');
    if (e.target === modal) closeOptionModal();
});
