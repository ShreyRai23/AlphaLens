import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Exports the report DOM element as a clean, branded multi-page PDF.
 * Uses html2canvas `onclone` to fix glassmorphism/shadow tinting in the clone
 * WITHOUT ever touching the live UI.
 */
export async function exportReportPDF(element, companyName = 'Report') {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    // Use the true page background so the report looks right
    backgroundColor: '#F2F0FA',
    logging: false,
    // Capture full scrollable height — not just what fits in the viewport
    height: element.scrollHeight,

    // Ignore the fixed Navbar — it overlaps the capture area and bleeds a tint
    ignoreElements: (el) => el.classList && el.classList.contains('navbar'),

    // ── onclone: runs on the HTML clone before rendering ────────────────────
    // The live UI is NEVER touched. All changes are isolated to the clone.
    onclone: (_doc, clonedEl) => {
      // ── ROOT CAUSE: page-enter animation restarts at opacity:0 in the clone ──
      // html2canvas clones the DOM and all CSS animations restart from frame 0.
      // The report-main has class "page-enter" with:
      //   @keyframes pageEnter { from { opacity:0 } to { opacity:1 } }
      // So the clone is captured at opacity≈0, making the lavender bg bleed
      // through as the pervasive purple tint.
      //
      // Fix: Kill ALL animations/transitions in the clone, then force full opacity.
      const s = _doc.createElement('style');
      s.textContent = `
        /* 1. Kill every animation & transition — page-enter starts at opacity:0
              which is the root cause of the purple tint (clone restarts animation) */
        *, *::before, *::after {
          animation:           none !important;
          animation-duration:  0s   !important;
          animation-delay:     0s   !important;
          transition:          none !important;
          transition-duration: 0s   !important;
        }

        /* 2. Force the page-enter element to its final visible state */
        .page-enter {
          opacity:   1   !important;
          transform: none !important;
        }

        /* 3. Remove glassmorphism — html2canvas can't render backdrop-filter */
        * {
          backdrop-filter:         none !important;
          -webkit-backdrop-filter: none !important;
        }

        /* 4. Replace purple rgba box-shadows with neutral grey
              — but NOT on SVGs/charts (would create visible square boxes) */
        :not(svg):not(svg *) {
          box-shadow: 0 1px 3px rgba(0,0,0,0.06) !important;
        }
        svg, svg * {
          box-shadow: none !important;
          filter:     none !important;
        }

        /* 5. Cards: keep border but don't force-white background.
              Inline colored backgrounds (score cards) have higher specificity
              and will correctly show their soft colors. */
        .card {
          border: 1px solid #E8E6F5 !important;
          opacity: 1 !important;
        }

        /* 6. Verdict bands — use the CORRECT colours from Report.css
              verdict-pass uses --coral-soft (#FFE8E5), NOT --pass-soft (#FEE2E2) */
        .verdict-invest { background: #DCFCE7 !important; border-color: #86EFAC !important; }
        .verdict-pass   { background: #FFE8E5 !important; border-color: #FFCCC6 !important; }

        /* 7. Soft-colour metric/score cards — explicit hex overrides for inline vars */
        [style*="blue-soft"]   { background: #DBEAFE !important; }
        [style*="purple-soft"] { background: #EDE9FE !important; }
        [style*="mint-soft"]   { background: #D1FAE5 !important; }
        [style*="amber-soft"]  { background: #FEF3C7 !important; }
        [style*="coral-soft"]  { background: #FFE8E5 !important; }
        [style*="pink-soft"]   { background: #FCE7F3 !important; }
        [style*="invest-soft"] { background: #DCFCE7 !important; }
        [style*="primary-soft"]{ background: #EDE9FF !important; }

        /* 8. Pills — add explicit borders so they're visible even when the
              card background is a similar colour to the pill background */
        .pill {
          border-radius: 999px !important;
          display: inline-flex !important;
          padding: 4px 12px !important;
        }
        .pill-invest  { background: #DCFCE7 !important; color: #16A34A !important; border: 1.5px solid #86EFAC !important; }
        .pill-pass    { background: #FEE2E2 !important; color: #DC2626 !important; border: 1.5px solid #FCA5A5 !important; }
        .pill-high    { background: #FEE2E2 !important; color: #DC2626 !important; border: 1.5px solid #FCA5A5 !important; }
        .pill-medium  { background: #FEF3C7 !important; color: #B45309 !important; border: 1.5px solid #FDE68A !important; }
        .pill-low     { background: #D1FAE5 !important; color: #059669 !important; border: 1.5px solid #6EE7B7 !important; }
        .pill-primary { background: #EDE9FF !important; color: #4A2FA0 !important; border: 1.5px solid #C4B5FD !important; }
        .pill-coral   { background: #FFE8E5 !important; color: #FF7B69 !important; border: 1.5px solid #FFB5A8 !important; }
        .pill-blue    { background: #DBEAFE !important; color: #2563EB !important; border: 1.5px solid #93C5FD !important; }
        .pill-purple  { background: #EDE9FE !important; color: #7C3AED !important; border: 1.5px solid #C4B5FD !important; }

        /* 9. Recharts & SVG backgrounds — transparent to avoid white squares */
        .recharts-wrapper,
        .recharts-surface,
        .recharts-wrapper svg {
          background: transparent !important;
        }
        .recharts-cartesian-grid-horizontal line,
        .recharts-cartesian-grid-vertical line {
          stroke: #E8E6F5 !important;
        }

        /* 10. Hide footer buttons (they overlap the raw JSON section) */
        .report-actions { display: none !important; }
      `;
      _doc.head.appendChild(s);


      // ── Also set opacity/transform directly on the cloned element ───────────
      // Belt-and-suspenders: inline styles beat stylesheet rules
      clonedEl.style.opacity   = '1';
      clonedEl.style.transform = 'none';
      clonedEl.style.animation = 'none';

      // ── Resolve inline var() references to hex ───────────────────────────────
      // html2canvas sometimes fails to evaluate CSS custom properties in inline styles
      const VAR_MAP = {
        'var(--blue-soft)':    '#DBEAFE',
        'var(--purple-soft)':  '#EDE9FE',
        'var(--mint-soft)':    '#D1FAE5',
        'var(--amber-soft)':   '#FEF3C7',
        'var(--coral-soft)':   '#FFE8E5',
        'var(--pink-soft)':    '#FCE7F3',
        'var(--invest-soft)':  '#DCFCE7',
        'var(--primary-soft)': '#EDE9FF',
        'var(--surface)':      '#FFFFFF',
        'var(--bg)':           '#F2F0FA',
        'var(--invest)':       '#16A34A',
        'var(--coral)':        '#FF7B69',
        'var(--blue)':         '#3B82F6',
        'var(--purple)':       '#8B5CF6',
        'var(--mint)':         '#10B981',
        'var(--amber)':        '#F59E0B',
      };

      clonedEl.querySelectorAll('[style]').forEach(el => {
        let attr = el.getAttribute('style') || '';
        Object.entries(VAR_MAP).forEach(([varName, hex]) => {
          attr = attr.replaceAll(varName, hex);
        });
        el.setAttribute('style', attr);
      });
    },
  });

  // ── PDF geometry ────────────────────────────────────────────────────────────
  const pdf      = new jsPDF('p', 'mm', 'a4');
  const pageW    = pdf.internal.pageSize.getWidth();    // 210 mm
  const pageH    = pdf.internal.pageSize.getHeight();   // 297 mm
  const margin   = 10;
  const headerH  = 16;
  const footerH  = 10;
  const contentW = pageW - margin * 2;
  const ratio    = contentW / canvas.width;             // mm per canvas-px
  const fullImgH = canvas.height * ratio;
  const usableH  = pageH - headerH - footerH - margin;

  const addHeader = (p, name) => {
    p.setFillColor(45, 27, 105);
    p.rect(0, 0, pageW, headerH, 'F');
    p.setTextColor(255, 255, 255);
    p.setFontSize(9);
    p.setFont('helvetica', 'bold');
    p.text('AlphaLens  ·  AI Investment Research', margin, 11);
    p.text(name, pageW - margin, 11, { align: 'right' });
  };

  const addFooter = (p, num) => {
    p.setFontSize(7.5);
    p.setTextColor(160, 160, 160);
    p.text('Generated by AlphaLens AI  ·  For informational purposes only.', margin, pageH - 3);
    p.text(`Page ${num}`, pageW - margin, pageH - 3, { align: 'right' });
  };

  // ── Canvas-slicing: each page gets its own freshly cropped canvas ───────────
  const totalPages = Math.ceil(fullImgH / usableH);

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) pdf.addPage();
    addHeader(pdf, companyName);

    const startPx  = Math.round((page * usableH) / ratio);
    const sliceHPx = Math.min(Math.round(usableH / ratio), canvas.height - startPx);
    if (sliceHPx <= 0) break;

    const slice = document.createElement('canvas');
    slice.width  = canvas.width;
    slice.height = sliceHPx;

    const ctx = slice.getContext('2d');
    ctx.fillStyle = '#F2F0FA';
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(canvas, 0, startPx, canvas.width, sliceHPx, 0, 0, canvas.width, sliceHPx);

    pdf.addImage(slice.toDataURL('image/png'), 'PNG', margin, headerH + margin / 2, contentW, sliceHPx * ratio);
    addFooter(pdf, page + 1);

    if (page >= 20) break;
  }

  pdf.save(`AlphaLens_${companyName.replace(/\s+/g, '_')}_Report.pdf`);
}



