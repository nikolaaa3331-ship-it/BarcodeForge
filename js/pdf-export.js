/**
 * pdf-export.js — PDF generation via jsPDF
 * Exports the barcode (SVG or canvas) centered on an A4 page,
 * with the raw data string below and an optional label beneath that.
 */

const PdfExport = (() => {

  const { jsPDF } = window.jspdf;

  // Convert an SVG element to a PNG data-URL via an offscreen canvas
  function svgToPngDataUrl(svgEl) {
    return new Promise((resolve, reject) => {
      const serializer = new XMLSerializer();
      const svgStr     = serializer.serializeToString(svgEl);
      const blob       = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const url        = URL.createObjectURL(blob);
      const img        = new Image();

      img.onload = () => {
        const canvas  = document.createElement('canvas');
        canvas.width  = img.width  || svgEl.getBoundingClientRect().width  || 400;
        canvas.height = img.height || svgEl.getBoundingClientRect().height || 150;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/png'));
      };

      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG render failed')); };
      img.src = url;
    });
  }

  async function exportPdf({ type, value, label, svgEl, qrEl }) {
    const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();   // 210 mm
    const pageH = doc.internal.pageSize.getHeight();  // 297 mm

    // ── Barcode image ──
    let imgData, imgW, imgH;

    if (type === 'QR') {
      const qrCanvas = qrEl.querySelector('canvas');
      if (!qrCanvas) throw new Error('QR canvas not found');
      imgData = qrCanvas.toDataURL('image/png');
      imgW    = 70;   // mm
      imgH    = 70;
    } else {
      imgData = await svgToPngDataUrl(svgEl);
      // Scale to fit nicely: target width 120 mm, preserve aspect ratio
      const ratio = svgEl.getBoundingClientRect().height / (svgEl.getBoundingClientRect().width || 1);
      imgW = 120;
      imgH = Math.round(imgW * ratio) || 40;
    }

    const imgX = (pageW - imgW) / 2;
    const imgY = (pageH - imgH) / 2 - 20; // slightly above center

    doc.addImage(imgData, 'PNG', imgX, imgY, imgW, imgH);

    // ── Data string ──
    doc.setFont('courier', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    doc.text(value, pageW / 2, imgY + imgH + 8, { align: 'center', maxWidth: pageW - 40 });

    // ── Optional label ──
    if (label && label.trim()) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(20, 20, 20);
      doc.text(label.trim(), pageW / 2, imgY + imgH + 18, { align: 'center', maxWidth: pageW - 40 });
    }

    // ── Footer watermark ──
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text('Създадено от Генератор на баркодове', pageW / 2, pageH - 8, { align: 'center' });

    const filename = `barcode-${type}-${Date.now()}.pdf`;
    doc.save(filename);
  }

  return { exportPdf };
})();
