/**
 * generator.js — barcode rendering helpers
 * Wraps JsBarcode (1D) and QRCode (QR) behind a unified API.
 */

const Generator = (() => {

  // ── Validation ──────────────────────────────────────────────

  function luhn10(digits) {
    /* Standard modulo-10 check for EAN / UPC check digits */
    const arr = digits.split('').map(Number);
    const check = arr.pop();
    const sum = arr
      .reverse()
      .reduce((acc, d, i) => acc + (i % 2 === 0 ? d * 3 : d), 0);
    return (10 - (sum % 10)) % 10 === check;
  }

  const validators = {
    EAN13(val) {
      if (!/^\d{13}$/.test(val))  return 'EAN-13 трябва да съдържа точно 13 цифри.';
      if (!luhn10(val))            return 'Невалидна контролна цифра на EAN-13.';
      return null;
    },
    UPCA(val) {
      if (!/^\d{12}$/.test(val))  return 'UPC-A трябва да съдържа точно 12 цифри.';
      if (!luhn10(val))            return 'Невалидна контролна цифра на UPC-A.';
      return null;
    },
    CODE128(val) {
      if (!val || val.length === 0)        return 'Моля, въведете данни.';
      if (val.length > 80)                 return 'Данните за Code 128 трябва да са ≤ 80 знака.';
      if (/[^\x00-\x7F]/.test(val))       return 'Code 128 поддържа само ASCII знаци.';
      return null;
    },
    QR(val) {
      if (!val || val.trim().length === 0) return 'Моля, въведете текст или URL.';
      if (val.length > 2900)               return 'Съдържанието на QR кода трябва да е ≤ 2 900 знака.';
      return null;
    },
  };

  function validate(type, value) {
    return validators[type] ? validators[type](value) : 'Непознат тип баркод.';
  }

  // ── Rendering ───────────────────────────────────────────────

  const JSBARCODE_FORMATS = {
    EAN13:   'EAN13',
    UPCA:    'UPC',
    CODE128: 'CODE128',
  };

  function renderJsBarcode(svgEl, type, value, opts = {}) {
    const format = JSBARCODE_FORMATS[type];
    JsBarcode(svgEl, value, {
      format,
      width:       opts.width    ?? 2,
      height:      opts.height   ?? 80,
      displayValue: opts.displayValue ?? true,
      margin:      opts.margin   ?? 10,
      fontSize:    opts.fontSize ?? 14,
      background:  opts.background ?? '#ffffff',
      lineColor:   opts.lineColor  ?? '#000000',
    });
  }

  function renderQR(divEl, value, size = 200) {
    divEl.innerHTML = '';
    new QRCode(divEl, {
      text: value,
      width: size,
      height: size,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M,
    });
    // qrcodejs renders synchronously into a canvas inside the div
    return Promise.resolve();
  }

  // ── Public API ──────────────────────────────────────────────

  async function render({ type, value, svgEl, qrEl, opts }) {
    if (type === 'QR') {
      svgEl.style.display  = 'none';
      qrEl.style.display   = 'block';
      await renderQR(qrEl, value, opts?.size ?? 200);
    } else {
      qrEl.style.display   = 'none';
      svgEl.style.display  = 'block';
      renderJsBarcode(svgEl, type, value, opts);
    }
  }

  return { validate, render };
})();
