// test/reading/option.js

const READING_OPTIONS = {
    "A-J": ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"],
    "YES-NO": ["YES", "NO", "NOT GIVEN"],
    "TRUE-FALSE": ["TRUE", "FALSE", "NOT GIVEN"]
};

// Injeksi Styling Profesional & Modal Pop-up khusus untuk Option Selector
(function injectAdvancedOptionStyles() {
    if (document.getElementById('advanced-option-pro-style')) return;
    const style = document.createElement('style');
    style.id = 'advanced-option-pro-style';
    style.innerHTML = `
        .advanced-option-wrapper {
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
        .advanced-option-wrapper:hover {
            border-color: #94a3b8;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }
        
        /* Tombol Pemicu Modal Pop-up (Pengganti Select Plain Bawaan) */
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

        .mcq-select, .mcq-correct-select {
            background: #ffffff !important;
            color: #0f172a !important;
            font-weight: 600 !important;
            font-size: 14px !important;
            border: none !important;
            padding: 8px 12px !important;
            outline: none !important;
            flex: 1;
            cursor: pointer;
        }

        /* --- STYLING MODAL POP-UP CUSTOM --- */
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
        .option-modal-body { padding: 12px; display: flex; flex-direction: column; gap: 6px; }
        .option-modal-item {
            padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;
            font-weight: 600; font-size: 14px; color: #334155; cursor: pointer; transition: all 0.2s;
            text-align: left; display: flex; justify-content: space-between; align-items: center;
        }
        .option-modal-item:hover { background: #eff6ff; border-color: #bfdbfe; color: #2563eb; transform: translateY(-1px); }
        .option-modal-item.selected { background: #dbeafe; border-color: #3b82f6; color: #1d4ed8; }
    `;
    document.head.appendChild(style);

    // Injeksi elemen HTML modal ke dalam body jika belum ada
    if (!document.getElementById('custom-option-modal')) {
        const modalContainer = document.createElement('div');
        modalContainer.id = 'custom-option-modal';
        modalContainer.className = 'option-modal-overlay';
        modalContainer.innerHTML = `
            <div class="option-modal-card">
                <div class="option-modal-header">
                    <h4>Pilih Format Opsi Soal</h4>
                    <button class="option-modal-close" onclick="closeOptionModal()">&times;</button>
                </div>
                <div class="option-modal-body" id="option-modal-list">
                    <!-- Dinamis Diisi via JS -->
                </div>
            </div>
        `;
        document.body.appendChild(modalContainer);
    }
})();

let currentActiveWrapper = null;

function generateOptionsHtml(selectedType = "A-J", selectedVal = "") {
    let items = READING_OPTIONS[selectedType] || READING_OPTIONS["A-J"];
    let optionsHtml = `<option value="">-- Pilih --</option>` + 
        items.map(item => `<option value="${item}" ${selectedVal === item ? 'selected' : ''}>${item}</option>`).join('');
    
    let dropdownHtml = `<select class="mcq-select" onchange="saveData()">${optionsHtml}</select>`;
    
    // Tombol pemicu modal pop-up dengan gaya pro (menggantikan <select> tipe plain)
    let triggerBtnHtml = `<button type="button" class="mcq-type-trigger" onclick="openOptionModal(this)" data-current-type="${selectedType}">
        <span>${selectedType}</span> 
        <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
    </button>`;

    return `<div class="advanced-option-wrapper" data-opt-type="${selectedType}">${triggerBtnHtml}${dropdownHtml}</div>`;
}

// Fungsi Membuka Modal Pop-up Custom
function openOptionModal(btn) {
    currentActiveWrapper = btn.closest('.advanced-option-wrapper') || btn.closest('.advanced-correct-wrapper');
    const currentType = currentActiveWrapper.dataset.optType || "A-J";
    
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

function closeOptionModal() {
    document.getElementById('custom-option-modal').classList.remove('active');
    currentActiveWrapper = null;
}

// Fungsi saat tipe opsi dipilih dari dalam modal pop-up
function selectOptionType(newType) {
    if (!currentActiveWrapper) return;
    
    currentActiveWrapper.dataset.optType = newType;
    
    // Update teks pada tombol trigger di baris soal
    const triggerSpan = currentActiveWrapper.querySelector('.mcq-type-trigger span') || currentActiveWrapper.querySelector('.mcq-correct-type-trigger span');
    if (triggerSpan) triggerSpan.textContent = newType;
    
    const triggerBtn = currentActiveWrapper.querySelector('.mcq-type-trigger') || currentActiveWrapper.querySelector('.mcq-correct-type-trigger');
    if (triggerBtn) triggerBtn.dataset.currentType = newType;

    // Update isi dropdown pilihan jawaban sesuai tipe baru
    const targetSelect = currentActiveWrapper.querySelector('.mcq-select') || currentActiveWrapper.querySelector('.mcq-correct-select');
    const items = READING_OPTIONS[newType] || READING_OPTIONS["A-J"];
    
    targetSelect.innerHTML = `<option value="">-- Pilih --</option>` + 
        items.map(item => `<option value="${item}">${item}</option>`).join('');

    closeOptionModal();
    saveData();
}

// Listener global untuk menutup modal jika klik area luar card
window.addEventListener('click', (e) => {
    const modal = document.getElementById('custom-option-modal');
    if (e.target === modal) {
        closeOptionModal();
    }
});

// Handler untuk kompatibilitas jika dipanggil dari tempat lain
function changeReadingOptionType(selectElem) {
    // Fungsi cadangan jika dibutuhkan
}
