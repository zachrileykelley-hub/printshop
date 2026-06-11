// ── PDF Generation ───────────────────────────────────────
const PDFGen = {

  _doc(quote) {
    const { jsPDF } = window.jspdf;
    const doc  = new jsPDF({ unit: 'pt', format: 'letter' });
    const s    = DB.getSettings();
    const W    = doc.internal.pageSize.getWidth();
    const NAVY = [19, 41, 92];   // #13295C
    const BLUE = [48, 111, 180]; // #306FB4
    const GOLD = [255, 173, 31]; // #FFAD1F
    const GRAY = [108, 117, 125];
    const DARK = NAVY;

    // ── Header bar: navy background with gold accent strip ──
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, W, 72, 'F');
    doc.setFillColor(...GOLD);
    doc.rect(0, 68, W, 4, 'F');   // gold accent line under header

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(s.schoolName || 'BPS Print Shop', 36, 30);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 190, 210);
    let addrLine = [];
    if (s.address) addrLine.push(s.address);
    if (s.phone)   addrLine.push(s.phone);
    if (s.email)   addrLine.push(s.email);
    if (addrLine.length) doc.text(addrLine.join('  •  '), 36, 44);

    // QUOTE label right side
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('QUOTE', W - 36, 30, { align: 'right' });

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 190, 210);
    doc.text(`Quote #:  ${quote.quoteNumber}`, W - 36, 44, { align: 'right' });
    doc.text(`Date:     ${Utils.formatDate(quote.createdAt)}`, W - 36, 55, { align: 'right' });
    doc.text(`Status:   ${(quote.status || '').toUpperCase()}`, W - 36, 66, { align: 'right' });

    // ── Customer block ──
    doc.setTextColor(...DARK);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('BILLED TO', 36, 92);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 30, 30);
    let cy = 105;
    doc.text(quote.customerName || '—', 36, cy);
    if (quote.customerOrg) { cy += 13; doc.text(quote.customerOrg, 36, cy); }

    const typeColors = {
      internal:  [25, 135, 84],
      community: [253, 126, 20],
      external:  [111, 66, 193],
    };
    const tColor = typeColors[quote.customerType] || BLUE;
    doc.setFillColor(...tColor);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    const typeLabel = DB.label(quote.customerType);
    const tw = doc.getTextWidth(typeLabel) + 10;
    doc.roundedRect(36, cy + 6, tw, 12, 2, 2, 'F');
    doc.text(typeLabel.toUpperCase(), 41, cy + 14.5);

    // ── Items Table ──
    const ourTotal  = DB.quoteOurTotal(quote);
    const compTotal = DB.quoteCompetitorTotal(quote);
    const savings   = compTotal - ourTotal;

    const compName = (quote.items && quote.items[0] && quote.items[0].competitorName)
      || DB.competitorName();

    const rows = (quote.items || []).map(item => {
      const ot = (+item.quantity || 0) * (+item.unitPrice || 0);
      const ct = (+item.quantity || 0) * (+item.competitorPrice || 0);
      return [
        item.serviceName || item.description || '—',
        String(item.quantity || 0),
        item.unit || '',
        `$${(+item.unitPrice || 0).toFixed(2)}`,
        `$${ot.toFixed(2)}`,
        `$${(+item.competitorPrice || 0).toFixed(2)}`,
        `$${ct.toFixed(2)}`,
        `$${(ct - ot).toFixed(2)}`,
      ];
    });

    doc.autoTable({
      startY: cy + 28,
      head: [[
        'Service / Description', 'Qty', 'Unit',
        'Our Price', 'Our Total',
        `${compName} Price`, `${compName} Total`,
        'You Save',
      ]],
      body: rows,
      foot: [[
        { content: 'TOTALS', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: `$${ourTotal.toFixed(2)}`, styles: { fontStyle: 'bold' } },
        '',
        { content: `$${compTotal.toFixed(2)}`, styles: { fontStyle: 'bold' } },
        { content: `$${savings.toFixed(2)}`, styles: { fontStyle: 'bold', textColor: [25, 135, 84] } },
      ]],
      styles:       { fontSize: 8, cellPadding: 4 },
      headStyles:   { fillColor: NAVY, textColor: [255,255,255], fontStyle: 'bold', fontSize: 7.5 },
      footStyles:   { fillColor: [240,244,248], textColor: NAVY },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { halign: 'right', cellWidth: 30 },
        2: { cellWidth: 55 },
        3: { halign: 'right', cellWidth: 60 },
        4: { halign: 'right', cellWidth: 60 },
        5: { halign: 'right', cellWidth: 70 },
        6: { halign: 'right', cellWidth: 70 },
        7: { halign: 'right', cellWidth: 58, textColor: BLUE },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    let y = doc.lastAutoTable.finalY + 16;

    // ── Savings callout box (BPS gold) ──
    if (savings > 0) {
      doc.setFillColor(...NAVY);
      doc.roundedRect(W - 210, y, 174, 40, 4, 4, 'F');
      doc.setFillColor(...GOLD);
      doc.roundedRect(W - 210, y + 36, 174, 4, 0, 0, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL SAVINGS VS. RETAIL', W - 123, y + 13, { align: 'center' });
      doc.setFontSize(17);
      doc.setTextColor(...GOLD);
      doc.text(`$${savings.toFixed(2)}`, W - 123, y + 31, { align: 'center' });
    }

    // ── Notes ──
    if (quote.notes) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...DARK);
      doc.text('NOTES', 36, y + 12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      const lines = doc.splitTextToSize(quote.notes, W - 220);
      doc.text(lines, 36, y + 24);
      y += 14 + lines.length * 11;
    }

    // ── Footer / Terms ──
    const terms = s.terms || 'Thank you for using our print shop. Payment is due upon receipt.';
    const pageH = doc.internal.pageSize.getHeight();
    doc.setDrawColor(200, 210, 220);
    doc.line(36, pageH - 52, W - 36, pageH - 52);
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.setFont('helvetica', 'normal');
    const termLines = doc.splitTextToSize(terms, W - 72);
    doc.text(termLines, 36, pageH - 40);
    doc.text(`Generated ${Utils.formatDate(new Date().toISOString())}`, W - 36, pageH - 18, { align: 'right' });

    return doc;
  },

  downloadQuote(quote) {
    try {
      const doc = this._doc(quote);
      doc.save(`Quote-${quote.quoteNumber}.pdf`);
    } catch (e) {
      console.error(e);
      Utils.toast('PDF generation failed: ' + e.message, 'error');
    }
  },

  // ── Month-End Report ──────────────────────────────────
  downloadReport(jobs, periodLabel, types) {
    try {
      const { jsPDF } = window.jspdf;
      const doc  = new jsPDF({ unit: 'pt', format: 'letter' });
      const s    = DB.getSettings();
      const W    = doc.internal.pageSize.getWidth();
      const NAVY = [19, 41, 92];
      const BLUE = [48, 111, 180];
      const GOLD = [255, 173, 31];
      const GRAY = [108, 117, 125];
      const DARK = NAVY;
      const GREEN= BLUE;

      // Header: navy + gold strip
      doc.setFillColor(...NAVY);
      doc.rect(0, 0, W, 60, 'F');
      doc.setFillColor(...GOLD);
      doc.rect(0, 56, W, 4, 'F');

      doc.setTextColor(255,255,255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(s.schoolName || 'BPS Print Shop', 36, 24);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GOLD);
      doc.text(`Savings Report — ${periodLabel}`, 36, 42);

      doc.setTextColor(180,190,210);
      doc.setFontSize(7.5);
      doc.text(`Generated ${Utils.formatDate(new Date().toISOString())}`, W - 36, 42, { align: 'right' });

      // Summary stats
      const totalOur  = jobs.reduce((s, q) => s + DB.quoteOurTotal(q), 0);
      const totalComp = jobs.reduce((s, q) => s + DB.quoteCompetitorTotal(q), 0);
      const totalSave = totalComp - totalOur;
      const savePct   = totalComp > 0 ? (totalSave / totalComp * 100) : 0;

      const stats = [
        ['Jobs Completed', String(jobs.length)],
        ['Our Revenue',    `$${totalOur.toFixed(2)}`],
        ['Retail Would Be',`$${totalComp.toFixed(2)}`],
        ['Total Savings',  `$${totalSave.toFixed(2)}`],
        ['Savings %',      `${savePct.toFixed(1)}%`],
      ];

      const boxW = (W - 72 - 16 * 4) / 5;
      let bx = 36;
      stats.forEach(([lbl, val]) => {
        doc.setFillColor(245, 247, 251);
        doc.roundedRect(bx, 72, boxW, 44, 3, 3, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...GRAY);
        doc.text(lbl.toUpperCase(), bx + boxW / 2, 84, { align: 'center' });
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...DARK);
        doc.text(val, bx + boxW / 2, 100, { align: 'center' });
        bx += boxW + 16;
      });

      // Filters line
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRAY);
      doc.text(`Customer types included: ${types.map(t => DB.label(t)).join(', ')}`, 36, 130);

      // Detail table
      const rows = jobs.map(q => {
        const our  = DB.quoteOurTotal(q);
        const comp = DB.quoteCompetitorTotal(q);
        const save = comp - our;
        const pct  = comp > 0 ? (save / comp * 100).toFixed(1) + '%' : '0%';
        return [
          q.quoteNumber,
          Utils.formatDateShort(q.completedAt || q.updatedAt || q.createdAt),
          q.customerName + (q.customerOrg ? ` / ${q.customerOrg}` : ''),
          DB.label(q.customerType),
          `$${our.toFixed(2)}`,
          `$${comp.toFixed(2)}`,
          `$${save.toFixed(2)}`,
          pct,
        ];
      });

      doc.autoTable({
        startY: 140,
        head: [['Quote #','Date','Customer','Type','Our Total','Retail Total','Savings','Savings %']],
        body: rows,
        foot: [[
          { content: 'TOTALS', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
          { content: `$${totalOur.toFixed(2)}`, styles: { fontStyle: 'bold' } },
          { content: `$${totalComp.toFixed(2)}`, styles: { fontStyle: 'bold' } },
          { content: `$${totalSave.toFixed(2)}`, styles: { fontStyle: 'bold', textColor: BLUE } },
          { content: `${savePct.toFixed(1)}%`, styles: { fontStyle: 'bold', textColor: BLUE } },
        ]],
        styles:       { fontSize: 7.5, cellPadding: 3.5 },
        headStyles:   { fillColor: NAVY, textColor: [255,255,255], fontStyle: 'bold' },
        footStyles:   { fillColor: [240,244,248] },
        columnStyles: {
          0: { cellWidth: 75 },
          1: { cellWidth: 55 },
          2: { cellWidth: 'auto' },
          3: { cellWidth: 65 },
          4: { halign: 'right', cellWidth: 60 },
          5: { halign: 'right', cellWidth: 65 },
          6: { halign: 'right', cellWidth: 60, textColor: GREEN },
          7: { halign: 'right', cellWidth: 52, textColor: GREEN },
        },
        alternateRowStyles: { fillColor: [248,250,252] },
      });

      // Savings callout at bottom — BPS navy/gold style
      const finalY = doc.lastAutoTable.finalY + 20;

      doc.setFillColor(...NAVY);
      doc.roundedRect(36, finalY, 200, 50, 4, 4, 'F');
      doc.setFillColor(...GOLD);
      doc.roundedRect(36, finalY + 46, 200, 4, 0, 0, 'F');
      doc.setTextColor(180, 195, 220);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL SAVINGS THIS PERIOD', 136, finalY + 15, { align: 'center' });
      doc.setFontSize(21);
      doc.setTextColor(...GOLD);
      doc.text(`$${totalSave.toFixed(2)}`, 136, finalY + 37, { align: 'center' });

      doc.setFillColor(...BLUE);
      doc.roundedRect(250, finalY, 200, 50, 4, 4, 'F');
      doc.setFillColor(...GOLD);
      doc.roundedRect(250, finalY + 46, 200, 4, 0, 0, 'F');
      doc.setTextColor(200, 220, 240);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text('SAVINGS PERCENTAGE', 350, finalY + 15, { align: 'center' });
      doc.setFontSize(21);
      doc.setTextColor(255, 255, 255);
      doc.text(`${savePct.toFixed(1)}%`, 350, finalY + 37, { align: 'center' });

      const pageH = doc.internal.pageSize.getHeight();
      doc.setDrawColor(200,210,220);
      doc.line(36, pageH - 30, W - 36, pageH - 30);
      doc.setFontSize(7);
      doc.setTextColor(...GRAY);
      doc.setFont('helvetica', 'normal');
      doc.text(s.schoolName || 'BPS Print Shop', 36, pageH - 16);
      doc.text(`Savings Report — ${periodLabel}`, W - 36, pageH - 16, { align: 'right' });

      doc.save(`PrintShop-Report-${periodLabel.replace(/\s/g,'-')}.pdf`);
    } catch (e) {
      console.error(e);
      Utils.toast('Report PDF failed: ' + e.message, 'error');
    }
  },
};
