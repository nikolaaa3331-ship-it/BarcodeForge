/**
 * app.js — UI controller
 * Manages the 3-step flow: choose type → enter data → export PDF.
 */

(() => {
  // ── State ──────────────────────────────────────────────────
  let selectedType = null;  // 'EAN13' | 'CODE128' | 'QR' | 'UPCA'
  let currentValue = '';
  let barcodeReady = false;

  // ── DOM refs ───────────────────────────────────────────────
  const steps = {
    s1: document.getElementById('step-1'),
    s2: document.getElementById('step-2'),
    s3: document.getElementById('step-3'),
  };

  const indicators = {
    i1: document.getElementById('step-indicator-1'),
    i2: document.getElementById('step-indicator-2'),
    i3: document.getElementById('step-indicator-3'),
  };

  const typeCards   = document.querySelectorAll('.type-card');
  const errorMsg    = document.getElementById('error-msg');
  const exportError = document.getElementById('export-error');
  const nextBtn     = document.getElementById('next-btn');
  const backBtn     = document.getElementById('back-btn');
  const backBtn2    = document.getElementById('back-btn-2');
  const exportBtn   = document.getElementById('export-btn');
  const resetBtn    = document.getElementById('reset-btn');
  const labelInput  = document.getElementById('label-input');
  const previewArea = document.getElementById('preview-area');

  // Step-2 barcode els
  const barcodeSvg = document.getElementById('barcode-svg');
  const barcodeQrEl  = document.getElementById('barcode-qr');
  const barcodeOut = document.getElementById('barcode-output');
  const barcodePh  = document.getElementById('barcode-placeholder');

  // Step-3 export els
  const exportSvg  = document.getElementById('export-barcode-svg');
  const exportQrEl = document.getElementById('export-barcode-qr');
  const exportData = document.getElementById('export-data-text');
  const exportLbl  = document.getElementById('export-label-text');

  // ── Step navigation ────────────────────────────────────────

  function showStep(n) {
    Object.values(steps).forEach(s => s.classList.add('hidden'));
    Object.values(indicators).forEach(i => { i.classList.remove('active', 'done'); });

    steps[`s${n}`].classList.remove('hidden');

    for (let i = 1; i < n; i++)  indicators[`i${i}`].classList.add('done');
    indicators[`i${n}`].classList.add('active');
  }

  // ── Step 1: type selection ─────────────────────────────────

  typeCards.forEach(card => {
    card.addEventListener('click', () => {
      selectedType = card.dataset.type;
      typeCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      goToStep2();
    });
  });

  function goToStep2() {
    // Hide all field groups, show the relevant one
    document.querySelectorAll('.field-group[id^="field-"]')
      .forEach(el => el.classList.add('hidden'));

    const fieldEl = document.getElementById(`field-${selectedType}`);
    if (fieldEl) fieldEl.classList.remove('hidden');

    // Clear previous state
    clearInput();
    hideError(errorMsg);
    showStep(2);
  }

  // ── Input helpers ──────────────────────────────────────────

  function getInputEl() {
    const id = selectedType === 'QR' ? 'input-QR' : `input-${selectedType}`;
    return document.getElementById(id);
  }

  function clearInput() {
    ['EAN13', 'CODE128', 'QR', 'UPCA'].forEach(t => {
      const el = document.getElementById(`input-${t}`);
      if (el) { el.value = ''; el.classList.remove('invalid'); }
    });
    barcodeOut.classList.add('hidden');
    barcodePh.classList.remove('hidden');
    previewArea.classList.remove('has-barcode');
    barcodeReady = false;
    nextBtn.disabled = true;
    currentValue = '';
  }

  function showError(el, msg) {
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  function hideError(el) {
    el.textContent = '';
    el.classList.add('hidden');
  }

  // ── Live preview ───────────────────────────────────────────

  // Attach input listeners to all inputs once DOM is ready
  ['EAN13', 'CODE128', 'QR', 'UPCA'].forEach(type => {
    const el = document.getElementById(`input-${type}`);
    if (!el) return;
    el.addEventListener('input', () => {
      if (selectedType !== type) return;
      onInputChange(el.value);
    });
  });

  let debounceTimer = null;

  function onInputChange(value) {
    currentValue = value;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => renderPreview(value), 120);
  }

  async function renderPreview(value) {
    hideError(errorMsg);
    getInputEl()?.classList.remove('invalid');

    const err = Generator.validate(selectedType, value);
    if (err) {
      if (value.length > 0) {
        showError(errorMsg, err);
        getInputEl()?.classList.add('invalid');
      }
      barcodeOut.classList.add('hidden');
      barcodePh.classList.remove('hidden');
      previewArea.classList.remove('has-barcode');
      barcodeReady = false;
      nextBtn.disabled = true;
      return;
    }

    try {
      await Generator.render({
        type: selectedType,
        value,
        svgEl:    barcodeSvg,
        qrEl: barcodeQrEl,
      });
      barcodeOut.classList.remove('hidden');
      barcodePh.classList.add('hidden');
      previewArea.classList.add('has-barcode');
      barcodeReady = true;
      nextBtn.disabled = false;
    } catch (e) {
      showError(errorMsg, 'Неуспешно генериране на баркод. Проверете въведените данни.');
      barcodeReady = false;
      nextBtn.disabled = true;
    }
  }

  // ── Step 2 → 3 ────────────────────────────────────────────

  nextBtn.addEventListener('click', async () => {
    if (!barcodeReady) return;
    await goToStep3();
  });

  async function goToStep3() {
    hideError(exportError);
    labelInput.value = '';
    exportData.textContent = currentValue;
    exportLbl.textContent  = '';

    // Render a fresh copy in the export preview
    try {
      await Generator.render({
        type: selectedType,
        value: currentValue,
        svgEl:    exportSvg,
        qrEl: exportQrEl,
        opts: { size: 220 },
      });
    } catch (_) { /* non-fatal */ }

    showStep(3);
  }

  // Live label preview in step 3
  labelInput.addEventListener('input', () => {
    exportLbl.textContent = labelInput.value;
  });

  // ── Back buttons ───────────────────────────────────────────

  backBtn.addEventListener('click', () => showStep(1));

  backBtn2.addEventListener('click', () => showStep(2));

  // ── Export ────────────────────────────────────────────────

  exportBtn.addEventListener('click', async () => {
    exportBtn.disabled = true;
    exportBtn.textContent = 'Генериране…';
    hideError(exportError);

    try {
      await PdfExport.exportPdf({
        type:     selectedType,
        value:    currentValue,
        label:    labelInput.value,
        svgEl:    exportSvg,
        qrEl: exportQrEl,
      });
    } catch (e) {
      showError(exportError, 'Грешка при експортиране в PDF: ' + e.message);
    } finally {
      exportBtn.disabled = false;
      exportBtn.textContent = '⬇ Изтегли PDF';
    }
  });

  // ── Reset ─────────────────────────────────────────────────

  resetBtn.addEventListener('click', () => {
    selectedType = null;
    currentValue = '';
    barcodeReady = false;
    typeCards.forEach(c => c.classList.remove('selected'));
    clearInput();
    showStep(1);
  });

  // ── Init ──────────────────────────────────────────────────

  showStep(1);
})();
