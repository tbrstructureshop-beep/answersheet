// test/reading/option.js

const READING_OPTIONS = {
    "A-J": ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"],
    "YES-NO": ["YES", "NO", "NOT GIVEN"],
    "TRUE-FALSE": ["TRUE", "FALSE", "NOT GIVEN"]
};

// Injeksi Styling Profesional khusus untuk Styled Root Option Dropdown
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
        .advanced-option-wrapper:focus-within {
            border-color: #2563eb;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
        }
        .mcq-type-select, .mcq-correct-type-select {
            background: #f8fafc !important;
            color: #475569 !important;
            font-weight: 600 !important;
            font-size: 12px !important;
            border: none !important;
            border-right: 1px solid #e2e8f0 !important;
            padding: 8px 10px !important;
            outline: none !important;
            cursor: pointer;
            transition: background 0.2s;
        }
        .mcq-type-select:hover, .mcq-correct-type-select:hover {
            background: #f1f5f9 !important;
            color: #1e293b !important;
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
    `;
    document.head.appendChild(style);
})();

function generateOptionsHtml(selectedType = "A-J", selectedVal = "") {
    let types = ["A-J", "YES-NO", "TRUE-FALSE"];
    let typeSelectHtml = `<select class="mcq-type-select" onchange="changeReadingOptionType(this)" title="Pilih Format Opsi">` +
        types.map(t => `<option value="${t}" ${selectedType === t ? 'selected' : ''}>${t}</option>`).join('') +
        `</select>`;

    let items = READING_OPTIONS[selectedType] || READING_OPTIONS["A-J"];
    let optionsHtml = `<option value="">-- Pilih --</option>` + 
        items.map(item => `<option value="${item}" ${selectedVal === item ? 'selected' : ''}>${item}</option>`).join('');
    
    let dropdownHtml = `<select class="mcq-select" onchange="saveData()">${optionsHtml}</select>`;

    return `<div class="advanced-option-wrapper" data-opt-type="${selectedType}">${typeSelectHtml}${dropdownHtml}</div>`;
}

function changeReadingOptionType(selectElem) {
    const wrapper = selectElem.closest('.advanced-option-wrapper') || selectElem.closest('.advanced-correct-wrapper');
    const newType = selectElem.value;
    wrapper.dataset.optType = newType;
    
    const targetSelect = wrapper.querySelector('.mcq-select') || wrapper.querySelector('.mcq-correct-select');
    const items = READING_OPTIONS[newType] || READING_OPTIONS["A-J"];
    
    targetSelect.innerHTML = `<option value="">-- Pilih --</option>` + 
        items.map(item => `<option value="${item}">${item}</option>`).join('');
    
    saveData();
}
