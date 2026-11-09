import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';

/**
 * Shared look for every FurniCraft PDF: Noto Sans (prints ₹), white page, slim brand header,
 * soft info cards, light zebra tables, highlighted totals and "Page x of y" footers.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.resolve(__dirname, '../assets');
const LOGO = path.join(ASSETS, 'furnicraft-logo.png');
const FONT_REGULAR = path.join(ASSETS, 'fonts/NotoSans-Regular.ttf');
const FONT_BOLD = path.join(ASSETS, 'fonts/NotoSans-Bold.ttf');

export const C = {
  ink: '#0F172A',
  body: '#334155',
  muted: '#64748B',
  faint: '#94A3B8',
  line: '#E2E8F0',
  soft: '#F8FAFC',
  brand: '#B45309',
  brandSoft: '#FFFBEB',
  good: '#047857',
  goodSoft: '#ECFDF5',
  bad: '#B91C1C',
  badSoft: '#FEF2F2',
};

export const PAGE = { margin: 40, width: 595.28, height: 841.89 };
export const CONTENT_W = PAGE.width - PAGE.margin * 2;
const FOOTER_Y = PAGE.height - 34;
export const BOTTOM_LIMIT = FOOTER_Y - 18;

export const inr = (n, { decimals = 0 } = {}) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

/** A4 portrait document that resolves to a Buffer when `doc.end()` is called. */
export const createPdf = () => {
  const doc = new PDFDocument({ size: 'A4', margin: PAGE.margin, bufferPages: true });
  doc.registerFont('Regular', FONT_REGULAR);
  doc.registerFont('Bold', FONT_BOLD);
  doc.font('Regular');
  const done = new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  return { doc, done };
};

export const text = (doc, str, x, y, { size = 9, font = 'Regular', color = C.body, ...opts } = {}) => {
  // PDFKit only truncates with "…" when it knows the box height; give single-line ellipsis text one line.
  const box = opts.ellipsis && !opts.height ? { height: size * 1.35 } : {};
  doc.font(font).fontSize(size).fillColor(color).text(String(str ?? ''), x, y, { lineBreak: false, ...box, ...opts });
};

/** Logo + wordmark on the left, document title and number on the right, amber rule underneath. Returns next y. */
export const drawHeader = (doc, { title, subtitle, docNo }) => {
  const x = PAGE.margin;
  const y = PAGE.margin;
  if (fs.existsSync(LOGO)) doc.image(LOGO, x, y, { fit: [40, 40] });
  text(doc, 'FurniCraft', x + 48, y + 4, { size: 16, font: 'Bold', color: C.ink });
  text(doc, 'Furniture workforce & site management', x + 48, y + 24, { size: 7.5, color: C.muted });

  const rightW = 240;
  const rx = PAGE.width - PAGE.margin - rightW;
  text(doc, title, rx, y + 2, { size: 15, font: 'Bold', color: C.ink, width: rightW, align: 'right' });
  if (subtitle) text(doc, subtitle, rx, y + 22, { size: 8.5, color: C.muted, width: rightW, align: 'right' });
  if (docNo) text(doc, docNo, rx, y + 34, { size: 8, font: 'Bold', color: C.brand, width: rightW, align: 'right' });

  const ruleY = y + 52;
  doc.rect(x, ruleY, CONTENT_W, 2).fill(C.brand);
  return ruleY + 16;
};

/** Compact header for page 2+ of long documents. */
export const drawRunningHeader = (doc, label) => {
  text(doc, 'FurniCraft', PAGE.margin, PAGE.margin, { size: 10, font: 'Bold', color: C.ink });
  text(doc, label, PAGE.margin + 70, PAGE.margin + 1.5, { size: 8.5, color: C.muted, width: CONTENT_W - 70, align: 'right' });
  doc.rect(PAGE.margin, PAGE.margin + 16, CONTENT_W, 1).fill(C.line);
  return PAGE.margin + 28;
};

/** Row of soft cards: [{ label, value, sub }]. Returns next y. */
export const drawInfoCards = (doc, y, cards, { height = 54 } = {}) => {
  const gap = 10;
  const w = (CONTENT_W - gap * (cards.length - 1)) / cards.length;
  cards.forEach((card, i) => {
    const x = PAGE.margin + i * (w + gap);
    doc.roundedRect(x, y, w, height, 6).fill(card.fill || C.soft);
    text(doc, card.label.toUpperCase(), x + 10, y + 9, { size: 6.8, font: 'Bold', color: card.labelColor || C.muted, width: w - 20, characterSpacing: 0.4 });
    text(doc, card.value, x + 10, y + 21, { size: card.valueSize || 12, font: 'Bold', color: card.valueColor || C.ink, width: w - 20, ellipsis: true });
    if (card.sub) text(doc, card.sub, x + 10, y + 38, { size: 7.5, color: C.muted, width: w - 20, ellipsis: true });
  });
  return y + height + 14;
};

/**
 * Table with a muted header row and light zebra stripes; adds pages as needed.
 * columns: [{ header, width, align, color?(row), font?(row) }], rows: arrays of strings.
 */
export const drawTable = (doc, y, { columns, rows, rowHeight = 20, onNewPage, rowMeta = [] }) => {
  const x0 = PAGE.margin;
  const header = (top) => {
    doc.rect(x0, top, CONTENT_W, 22).fill(C.ink);
    let x = x0;
    columns.forEach((col) => {
      text(doc, col.header.toUpperCase(), x + 6, top + 7.5, { size: 6.8, font: 'Bold', color: '#FFFFFF', width: col.width - 12, align: col.align || 'left', characterSpacing: 0.3 });
      x += col.width;
    });
    return top + 22;
  };

  let cy = header(y);
  rows.forEach((row, idx) => {
    if (cy + rowHeight > BOTTOM_LIMIT) {
      doc.addPage();
      cy = header(onNewPage ? onNewPage() : PAGE.margin);
    }
    if (idx % 2 === 1) doc.rect(x0, cy, CONTENT_W, rowHeight).fill(C.soft);
    let x = x0;
    columns.forEach((col, c) => {
      const meta = rowMeta[idx] || {};
      text(doc, row[c], x + 6, cy + (rowHeight - 9) / 2, {
        size: 8,
        font: col.bold || meta.bold ? 'Bold' : 'Regular',
        color: (col.color && col.color(row, meta)) || C.body,
        width: col.width - 12,
        align: col.align || 'left',
        ellipsis: true,
      });
      x += col.width;
    });
    doc.rect(x0, cy + rowHeight - 0.5, CONTENT_W, 0.5).fill(C.line);
    cy += rowHeight;
  });
  return cy;
};

/** Big highlighted total line, e.g. "Net paid ₹4,300". Returns next y. */
export const drawTotal = (doc, y, { label, value, note, fill = C.goodSoft, color = C.good }) => {
  const h = note ? 52 : 40;
  doc.roundedRect(PAGE.margin, y, CONTENT_W, h, 8).fill(fill);
  text(doc, label, PAGE.margin + 14, y + 12, { size: 10, font: 'Bold', color });
  if (note) text(doc, note, PAGE.margin + 14, y + 28, { size: 7.5, color: C.muted, width: CONTENT_W - 200 });
  text(doc, value, PAGE.margin + CONTENT_W - 214, y + (h - 20) / 2, { size: 18, font: 'Bold', color, width: 200, align: 'right' });
  return y + h + 14;
};

/**
 * Draws the standard FurniCraft Thekedar Digital Signature block.
 * Matches approved format across all application PDFs:
 * - Thekedar Name (Bold, Navy)
 * - Date: DD MMM YYYY (Muted)
 * - [ DIGITALLY SIGNED ] (Light green badge with green border)
 * - Authorized Digital Signature (Green bold)
 * - No physical signature required. (Muted)
 */
export const drawThekedarDigitalSignature = (
  doc,
  x,
  y,
  w = 180,
  h = 80,
  { name = 'Contractor', date = new Date() } = {}
) => {
  doc.roundedRect(x, y, w, h, 6).fillAndStroke(C.soft, C.line);

  const thekedarName = name || 'Authorized Contractor';
  const dateStr =
    typeof date === 'string'
      ? date.startsWith('Date:')
        ? date
        : `Date: ${date}`
      : `Date: ${new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }).format(new Date(date))}`;

  // 1. Thekedar Name (No "For")
  text(doc, thekedarName, x + 8, y + 8, {
    size: 8.5,
    font: 'Bold',
    color: C.ink,
    width: w - 16,
    align: 'center',
    ellipsis: true,
  });

  // 2. Date
  text(doc, dateStr, x + 8, y + 22, {
    size: 7,
    font: 'Regular',
    color: C.muted,
    width: w - 16,
    align: 'center',
  });

  // 3. Digital Signature Badge (No unicode checkmark to avoid □ glyph missing in PDF font)
  const sealY = y + 34;
  doc
    .roundedRect(x + 10, sealY, w - 20, 22, 4)
    .fillAndStroke('#F0FDF4', '#86EFAC');

  text(doc, 'DIGITALLY SIGNED', x + 10, sealY + 6, {
    size: 7.5,
    font: 'Bold',
    color: '#15803D',
    width: w - 20,
    align: 'center',
    characterSpacing: 0.5,
  });

  // 4. Authorized Digital Signature
  text(doc, 'Authorized Digital Signature', x + 6, y + 60, {
    size: 6.5,
    font: 'Bold',
    color: '#15803D',
    width: w - 12,
    align: 'center',
  });

  // 5. No physical signature required.
  text(doc, 'No physical signature required.', x + 6, y + 70, {
    size: 5.5,
    font: 'Regular',
    color: C.muted,
    width: w - 12,
    align: 'center',
  });

  return y + h;
};

/** Two signature boxes side by side: Thekedar Digital Signature on left, Receiver on right. */
export const drawSignatures = (doc, y, left, right) => {
  const w = (CONTENT_W - 12) / 2;
  const h = 80;

  // Left: Standard Thekedar Digital Signature
  drawThekedarDigitalSignature(doc, PAGE.margin, y, w, h, {
    name: left.name || 'Authorized Contractor',
    date: left.date || new Date(),
  });

  // Right: Receiver signature box
  const rx = PAGE.margin + w + 12;
  doc.roundedRect(rx, y, w, h, 6).lineWidth(0.8).strokeColor(C.line).stroke();
  text(doc, right.label || 'RECEIVED BY', rx + 10, y + 9, { size: 7, font: 'Bold', color: C.muted, width: w - 20 });
  doc.moveTo(rx + 10, y + 54).lineTo(rx + w - 10, y + 54).lineWidth(0.6).strokeColor(C.faint).stroke();
  text(doc, right.name, rx + 10, y + 60, { size: 8.5, font: 'Bold', color: C.ink, width: w - 20, ellipsis: true });

  return y + h + 14;
};

/** "Page x of y" + generation stamp on every page (call just before doc.end()). */
export const drawFooters = (doc, note) => {
  const range = doc.bufferedPageRange();
  const stamp = `Generated ${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`;
  for (let p = 0; p < range.count; p++) {
    doc.switchToPage(range.start + p);
    doc.page.margins.bottom = 0; // footer sits below the content area; stops PDFKit adding a blank page
    doc.rect(PAGE.margin, FOOTER_Y - 8, CONTENT_W, 0.5).fill(C.line);
    text(doc, `${note}  ·  ${stamp}`, PAGE.margin, FOOTER_Y, { size: 7, color: C.faint, width: CONTENT_W - 80 });
    text(doc, `Page ${p + 1} of ${range.count}`, PAGE.margin + CONTENT_W - 80, FOOTER_Y, { size: 7, color: C.faint, width: 80, align: 'right' });
  }
};
