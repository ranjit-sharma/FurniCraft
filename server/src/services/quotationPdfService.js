import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';
import { inr } from './pdfTheme.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.resolve(__dirname, '../assets');
const LOGO = path.join(ASSETS, 'furnicraft-logo.png');
const FONT_REGULAR = path.join(ASSETS, 'fonts/NotoSans-Regular.ttf');
const FONT_BOLD = path.join(ASSETS, 'fonts/NotoSans-Bold.ttf');

const COLOR = {
  navy: '#0F172A',
  text: '#1E293B',
  muted: '#64748B',
  faint: '#94A3B8',
  line: '#E2E8F0',
  cardBg: '#F8FAFC',
  orange: '#C2410C', // Deep warm amber/orange
  orangeBg: '#FFF7ED', // Light orange background for Grand Total
  orangeBorder: '#FDBA74',
  white: '#FFFFFF',
};

const PAGE = {
  width: 595.28,
  height: 841.89,
  margin: 40,
};
const CONTENT_W = PAGE.width - PAGE.margin * 2; // 515.28 pt
const FOOTER_Y = PAGE.height - 32;
const PAGE_BOTTOM_LIMIT = FOOTER_Y - 24;

const text = (doc, str, x, y, { size = 9, font = 'Regular', color = COLOR.text, ...opts } = {}) => {
  doc.font(font).fontSize(size).fillColor(color).text(String(str ?? ''), x, y, opts);
};

/**
 * Generates an approved FurniCraft A4 Portrait Quotation PDF buffer.
 */
export const generateQuotationPdfBuffer = async (quotation) => {
  const doc = new PDFDocument({
    size: 'A4',
    margin: PAGE.margin,
    bufferPages: true,
  });

  doc.registerFont('Regular', FONT_REGULAR);
  doc.registerFont('Bold', FONT_BOLD);
  doc.font('Regular');

  const pdfPromise = new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  // Top Header (Page 1)
  const drawMainHeader = () => {
    const x = PAGE.margin;
    const y = PAGE.margin;

    // Left: Logo & Company Wordmark
    if (fs.existsSync(LOGO)) {
      doc.image(LOGO, x, y, { fit: [42, 42] });
    }
    text(doc, 'FurniCraft', x + 50, y + 3, { size: 17, font: 'Bold', color: COLOR.navy });
    text(doc, 'Furniture workforce & site management', x + 50, y + 24, {
      size: 8,
      color: COLOR.muted,
    });

    // Right: Document Title & Identifiers
    const rightW = 240;
    const rx = PAGE.width - PAGE.margin - rightW;
    text(doc, 'QUOTATION', rx, y + 2, {
      size: 17,
      font: 'Bold',
      color: COLOR.navy,
      width: rightW,
      align: 'right',
      characterSpacing: 0.5,
    });
    text(doc, quotation.quotationNumber, rx, y + 24, {
      size: 9.5,
      font: 'Bold',
      color: COLOR.orange,
      width: rightW,
      align: 'right',
    });
    text(doc, `Date: ${quotation.formattedDate || 'N/A'}`, rx, y + 37, {
      size: 8.5,
      color: COLOR.muted,
      width: rightW,
      align: 'right',
    });

    // Orange Horizontal Divider
    const ruleY = y + 54;
    doc.rect(x, ruleY, CONTENT_W, 2.5).fill(COLOR.orange);

    return ruleY + 14;
  };

  // Running Header for Page 2+
  const drawRunningHeader = () => {
    const x = PAGE.margin;
    const y = PAGE.margin;
    text(doc, 'FurniCraft', x, y, { size: 10, font: 'Bold', color: COLOR.navy });
    text(
      doc,
      `Quotation ${quotation.quotationNumber}  ·  ${quotation.customer?.name || ''}`,
      x + 80,
      y + 1,
      { size: 8, color: COLOR.muted, width: CONTENT_W - 80, align: 'right' }
    );
    doc.rect(x, y + 16, CONTENT_W, 1).fill(COLOR.line);
    return y + 28;
  };

  // 3 Information Cards in exact order: 1. Thekedar, 2. Customer, 3. Project
  const drawInfoCards = (startY) => {
    const cards = [
      {
        tag: 'FIRST — THEKEDAR',
        label: 'THEKEDAR',
        title: quotation.thekedar?.businessName || 'Authorized Contractor',
        detail1: quotation.thekedar?.phone ? `Phone: ${quotation.thekedar.phone}` : 'Site Contractor',
        detail2: `Code: ${quotation.thekedarCode}`,
      },
      {
        tag: 'SECOND — CUSTOMER',
        label: 'CUSTOMER',
        title: quotation.customer?.name || 'Customer',
        detail1: quotation.customer?.phone ? `Phone: ${quotation.customer.phone}` : '',
        detail2: quotation.customer?.address || '',
      },
      {
        tag: 'THIRD — PROJECT',
        label: 'PROJECT',
        title: quotation.project?.name || 'Furniture Work',
        detail1: `Items: ${quotation.items?.length || 0} Listed`,
        detail2: `Status: ${quotation.status || 'DRAFT'}`,
      },
    ];

    const gap = 10;
    const cardW = (CONTENT_W - gap * 2) / 3;
    const cardH = 68;

    cards.forEach((c, idx) => {
      const cx = PAGE.margin + idx * (cardW + gap);
      // Card container
      doc
        .roundedRect(cx, startY, cardW, cardH, 6)
        .fillAndStroke(COLOR.cardBg, COLOR.line);

      // Section Tag / Header
      text(doc, c.label, cx + 10, startY + 8, {
        size: 7,
        font: 'Bold',
        color: COLOR.orange,
        characterSpacing: 0.5,
      });

      // Primary Title
      text(doc, c.title, cx + 10, startY + 20, {
        size: 9.5,
        font: 'Bold',
        color: COLOR.navy,
        width: cardW - 20,
        height: 14,
        ellipsis: true,
      });

      // Detail 1
      if (c.detail1) {
        text(doc, c.detail1, cx + 10, startY + 36, {
          size: 7.5,
          color: COLOR.muted,
          width: cardW - 20,
          height: 12,
          ellipsis: true,
        });
      }

      // Detail 2
      if (c.detail2) {
        text(doc, c.detail2, cx + 10, startY + 49, {
          size: 7.5,
          color: COLOR.text,
          width: cardW - 20,
          height: 14,
          ellipsis: true,
        });
      }
    });

    return startY + cardH + 16;
  };

  // Table Column Definitions
  const columns = [
    { key: 'idx', header: '#', width: 28, align: 'center' },
    { key: 'particular', header: 'PARTICULAR', width: 227, align: 'left' },
    { key: 'quantity', header: 'QTY', width: 50, align: 'right' },
    { key: 'unit', header: 'UNIT', width: 65, align: 'center' },
    { key: 'rate', header: 'RATE', width: 70, align: 'right' },
    { key: 'total', header: 'TOTAL', width: 75, align: 'right' },
  ];

  const drawTableHeader = (y) => {
    doc.rect(PAGE.margin, y, CONTENT_W, 22).fill(COLOR.navy);
    let curX = PAGE.margin;
    columns.forEach((col) => {
      text(doc, col.header, curX + 4, y + 6.5, {
        size: 7.5,
        font: 'Bold',
        color: COLOR.white,
        width: col.width - 8,
        align: col.align,
        characterSpacing: 0.4,
      });
      curX += col.width;
    });
    return y + 22;
  };

  // Draw Header & Info Cards on first page
  let currentY = drawMainHeader();
  currentY = drawInfoCards(currentY);

  // Draw Items Table
  currentY = drawTableHeader(currentY);

  const items = quotation.items || [];
  items.forEach((item, index) => {
    // Measure row height based on particular description length
    const desc = item.particular || '';
    const descHeight = doc.heightOfString(desc, {
      width: columns[1].width - 8,
      size: 8,
      font: 'Regular',
    });
    const rowHeight = Math.max(22, Math.ceil(descHeight + 10));

    // Page break check: if row doesn't fit on current page, create new page
    if (currentY + rowHeight > PAGE_BOTTOM_LIMIT) {
      doc.addPage();
      currentY = drawRunningHeader();
      currentY = drawTableHeader(currentY);
    }

    // Zebra striping
    if (index % 2 === 1) {
      doc.rect(PAGE.margin, currentY, CONTENT_W, rowHeight).fill(COLOR.cardBg);
    }

    // Print columns
    let colX = PAGE.margin;

    // # index
    text(doc, String(index + 1), colX + 4, currentY + 6, {
      size: 8,
      font: 'Regular',
      color: COLOR.muted,
      width: columns[0].width - 8,
      align: columns[0].align,
    });
    colX += columns[0].width;

    // Particular Description (supports multi-line wrap cleanly)
    text(doc, desc, colX + 4, currentY + 6, {
      size: 8,
      font: 'Regular',
      color: COLOR.navy,
      width: columns[1].width - 8,
      align: columns[1].align,
    });
    colX += columns[1].width;

    // Qty
    text(doc, Number(item.quantity).toLocaleString('en-IN'), colX + 4, currentY + 6, {
      size: 8,
      font: 'Regular',
      color: COLOR.text,
      width: columns[2].width - 8,
      align: columns[2].align,
    });
    colX += columns[2].width;

    // Unit
    text(doc, item.unit, colX + 4, currentY + 6, {
      size: 7.5,
      font: 'Bold',
      color: COLOR.muted,
      width: columns[3].width - 8,
      align: columns[3].align,
    });
    colX += columns[3].width;

    // Rate
    text(doc, inr(item.rate), colX + 4, currentY + 6, {
      size: 8,
      font: 'Regular',
      color: COLOR.text,
      width: columns[4].width - 8,
      align: columns[4].align,
    });
    colX += columns[4].width;

    // Total (bold)
    text(doc, inr(item.total), colX + 4, currentY + 6, {
      size: 8.5,
      font: 'Bold',
      color: COLOR.navy,
      width: columns[5].width - 8,
      align: columns[5].align,
    });

    // Row bottom separator line
    doc.rect(PAGE.margin, currentY + rowHeight - 0.5, CONTENT_W, 0.5).fill(COLOR.line);
    currentY += rowHeight;
  });

  // Check if Grand Total + Terms & Conditions + Signature fit on current page
  // Grand total block: ~44pt, terms & sig: ~120pt -> total ~170pt
  if (currentY + 165 > PAGE_BOTTOM_LIMIT) {
    doc.addPage();
    currentY = drawRunningHeader();
  } else {
    currentY += 8;
  }

  // Grand Total Box (ONLY ONE financial value displayed; light orange background, bold orange typography)
  const grandTotalH = 42;
  doc
    .roundedRect(PAGE.margin, currentY, CONTENT_W, grandTotalH, 6)
    .fillAndStroke(COLOR.orangeBg, COLOR.orangeBorder);

  text(doc, 'GRAND TOTAL', PAGE.margin + 16, currentY + 14, {
    size: 11,
    font: 'Bold',
    color: COLOR.orange,
    characterSpacing: 0.5,
  });

  const formattedGrandTotal = inr(quotation.grandTotal);
  text(doc, formattedGrandTotal, PAGE.margin + CONTENT_W - 240, currentY + 11, {
    size: 16,
    font: 'Bold',
    color: COLOR.orange,
    width: 224,
    align: 'right',
  });

  currentY += grandTotalH + 16;

  // Bottom Section: Terms & Conditions (Left) and Authorized Signature (Right)
  const termsW = 310;
  const sigW = CONTENT_W - termsW - 16;
  const bottomSectionY = currentY;

  // Left: Terms & Conditions
  text(doc, 'Terms & Conditions', PAGE.margin, bottomSectionY, {
    size: 9,
    font: 'Bold',
    color: COLOR.orange,
  });

  const terms =
    Array.isArray(quotation.termsAndConditions) && quotation.termsAndConditions.length === 5
      ? quotation.termsAndConditions
      : [
          'All work will be done as per the agreed design, size, and details.',
          'Materials, colours, and fittings will be used as agreed with the customer.',
          'Any extra work or changes will cost extra.',
          'Extra charges will be discussed with the customer before starting the work.',
          'Payments must be made as agreed between the customer and the contractor.',
        ];

  let termY = bottomSectionY + 14;
  terms.forEach((termText, tIdx) => {
    text(doc, `${tIdx + 1}.`, PAGE.margin, termY, {
      size: 7,
      font: 'Bold',
      color: COLOR.muted,
      width: 14,
    });
    text(doc, termText, PAGE.margin + 14, termY, {
      size: 7,
      font: 'Regular',
      color: COLOR.text,
      width: termsW - 14,
    });
    termY += 13.5;
  });

  // Right: Digitally Signed Box (No external signature required)
  const sigX = PAGE.margin + termsW + 16;
  const sigH = 80;

  doc
    .roundedRect(sigX, bottomSectionY, sigW, sigH, 6)
    .fillAndStroke(COLOR.cardBg, COLOR.line);

  const businessName =
    quotation.thekedar?.businessName || quotation.thekedar?.name || 'Contractor';
  text(doc, `For ${businessName}`, sigX + 8, bottomSectionY + 8, {
    size: 8,
    font: 'Bold',
    color: COLOR.navy,
    width: sigW - 16,
    align: 'center',
    ellipsis: true,
  });

  // Digital Signature Seal / Badge
  const sealY = bottomSectionY + 22;
  doc
    .roundedRect(sigX + 10, sealY, sigW - 20, 26, 4)
    .fillAndStroke('#F0FDF4', '#86EFAC');

  text(doc, '✓ DIGITALLY SIGNED', sigX + 10, sealY + 4, {
    size: 7.5,
    font: 'Bold',
    color: '#15803D',
    width: sigW - 20,
    align: 'center',
    characterSpacing: 0.3,
  });

  text(doc, `Date: ${quotation.formattedDate}`, sigX + 10, sealY + 15, {
    size: 6.5,
    font: 'Regular',
    color: '#166534',
    width: sigW - 20,
    align: 'center',
  });

  text(doc, 'Authorized Digital Signature', sigX + 6, bottomSectionY + 55, {
    size: 6.5,
    font: 'Bold',
    color: '#15803D',
    width: sigW - 12,
    align: 'center',
  });

  text(doc, 'No physical signature required.', sigX + 6, bottomSectionY + 66, {
    size: 5.5,
    font: 'Regular',
    color: COLOR.muted,
    width: sigW - 12,
    align: 'center',
  });

  // Draw Page Numbers and Footers across all buffered pages
  const range = doc.bufferedPageRange();
  for (let p = 0; p < range.count; p++) {
    doc.switchToPage(range.start + p);
    doc.page.margins.bottom = 0;

    // Bottom hairline separator
    doc.rect(PAGE.margin, FOOTER_Y - 8, CONTENT_W, 0.5).fill(COLOR.line);

    // Left stamp
    text(
      doc,
      `FurniCraft Quotation  ·  ${quotation.quotationNumber}  ·  Generated ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}`,
      PAGE.margin,
      FOOTER_Y,
      { size: 7, color: COLOR.faint, width: CONTENT_W - 100 }
    );

    // Right Page X of Y
    text(
      doc,
      `Page ${p + 1} of ${range.count}`,
      PAGE.margin + CONTENT_W - 90,
      FOOTER_Y,
      { size: 7, font: 'Bold', color: COLOR.muted, width: 90, align: 'right' }
    );
  }

  doc.end();
  return pdfPromise;
};
