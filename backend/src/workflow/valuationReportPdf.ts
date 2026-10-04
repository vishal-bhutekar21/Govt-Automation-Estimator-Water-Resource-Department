import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import type { CalculationSnapshotRecord } from './types';

const ASSETS = path.resolve(__dirname, '../../assets/report');

type AbstractLine = {
  title: string;
  quantity: number;
  unit: string;
  rate: number | null;
  amount: number | null;
  itemNumber: string | null;
  ruleId?: string;
};

type MsBlock = {
  title: string;
  unit: string;
  ruleId: string;
  itemNumber: string | null;
  derivedNet: number | null;
  engineerNet: number | null;
  status: string;
  lines: { label: string; count: number; lengthM: number; breadthM: number; depthOrHeightM: number; sign: number; quantity: number; formulaText: string }[];
};

type SnapshotBody = {
  owner?: string;
  gutNumber?: string;
  village?: string;
  taluka?: string;
  district?: string;
  laCaseNumber?: string;
  abstract?: AbstractLine[];
  measurementSheet?: MsBlock[];
  depreciation?: {
    formula?: string;
    presentCost?: number;
    depreciatedValue?: number | null;
    structures?: {
      name: string;
      presentCost: number;
      depreciatedValue: number | null;
      ageYears?: number | null;
      remainingLifeYears?: number | null;
      ypFuture?: number | null;
      ypTotal?: number | null;
    }[];
  };
  presentCost?: number | null;
  depreciatedValue?: number | null;
  structureTypeText?: string;
  constructionYear?: number | null;
  usefulLifeYears?: number | null;
};

type Fonts = { reg: string; bold: string };

/** Official multi-page valuation PDF matching COVER / FS / DEP / ABSTRACT / MS workbook layout. */
export function writeValuationReportPdf(snapshot: CalculationSnapshotRecord, doc: PDFKit.PDFDocument): void {
  // Built-in Times fonts match the office workbook look and keep text extractable.
  const fonts: Fonts = { reg: 'Times-Roman', bold: 'Times-Bold' };
  const body = (snapshot.body || {}) as SnapshotBody;
  const present = snapshot.presentCost ?? body.presentCost ?? null;
  const depreciated = snapshot.depreciatedValue ?? body.depreciatedValue ?? null;
  const abstract = (body.abstract || []).filter((row) => row.amount != null && !String(row.ruleId || '').startsWith('draft.'));
  const msBlocks = (body.measurementSheet || []).filter((b) => b.status !== 'EXCLUDED' && !b.ruleId.startsWith('draft.'));

  coverPage(doc, fonts, body, depreciated);
  doc.addPage();
  fsPage(doc, fonts, body, depreciated);
  doc.addPage();
  depPage(doc, fonts, body, present, depreciated);
  doc.addPage();
  abstractPage(doc, fonts, body, abstract, present);
  doc.addPage();
  msPage(doc, fonts, body, msBlocks);
}

function drawLogos(doc: PDFKit.PDFDocument) {
  const left = path.join(ASSETS, 'image1.png');
  const right = path.join(ASSETS, 'image2.png');
  if (fs.existsSync(left)) doc.image(left, 40, 28, { width: 64, height: 64 });
  if (fs.existsSync(right)) doc.image(right, 488, 28, { width: 64, height: 64 });
}

function coverPage(doc: PDFKit.PDFDocument, fonts: Fonts, body: SnapshotBody, depreciated: number | null) {
  drawLogos(doc);
  doc.font(fonts.reg).fontSize(10).fillColor('#000000').text('(For Office use Only)', 40, 32, { align: 'right', width: 515 });
  doc.moveDown(4);
  center(doc, fonts.bold, 16, 'Government of Maharashtra');
  center(doc, fonts.bold, 16, 'Water Resources Department');
  center(doc, fonts.bold, 14, 'Vidarbha Irrigation Development Corporation, Nagpur');
  center(doc, fonts.bold, 14, 'Chief Engineer, Water Resources Department, Amravati');
  center(doc, fonts.reg, 13, 'Superintending Engineer, Jigaon Project Irrigation Circle, Shegaon');
  doc.moveDown(1.8);
  center(doc, fonts.bold, 18, 'J I G A O N  P R O J E C T');
  center(doc, fonts.reg, 12, `Tq. ${body.taluka || 'Nandura'}                                                  Dist. ${body.district || 'Buldhana'}`);
  doc.moveDown(2);
  labelRow(doc, fonts, 'Name of Farmer', body.owner || '', 14);
  labelRow(doc, fonts, 'Gat No.', `${body.gutNumber || ''}          L.A. Case No: ${body.laCaseNumber || ''}`, 14);
  labelRow(doc, fonts, 'Amount', `${money(depreciated)} /-`, 14);
  doc.moveDown(2.2);
  doc.font(fonts.reg).fontSize(11).text('Executive Engineer, Jigaon Rehabilitition Division, Khamgaon', { align: 'center' });
  doc.text('Subdivisional Engineer, Jigaon Rehabilitation Sub Div. No.1, Shegaon', { align: 'center' });
}

function fsPage(doc: PDFKit.PDFDocument, fonts: Fonts, body: SnapshotBody, depreciated: number | null) {
  doc.font(fonts.reg).fontSize(10).text('P.W.D.229 E', { align: 'right' });
  doc.moveDown(0.4);
  center(doc, fonts.bold, 16, 'ESTIMATE');
  doc.moveDown(0.6);
  doc.font(fonts.reg).fontSize(11);
  doc.text('DIVISION: JIGAON REHABILITATION DIVISION, KHAMGAON');
  doc.moveDown(0.2);
  pair(doc, fonts, 'FUND HEAD', 'Vidarbha Irrigation Development Corporation , Nagpur.');
  pair(doc, fonts, 'MAJOR HEAD', '4701 Capital Outlay on Major & Medium Irrigation Project.');
  pair(doc, fonts, 'MINOR HEAD', '190-Investment in Public Sectors& other Undertakings.');
  doc.font(fonts.reg).text('(Four) Capital Grants to V.I.D.Corporation.');
  pair(doc, fonts, 'SERVICE HEAD', 'Jigaon Project.');
  pair(doc, fonts, 'DEPARTMENTAL HEAD', 'I- HEAD WORKS');
  doc.font(fonts.reg).text('B-LAND ACQUISITION');
  doc.moveDown(0.5);
  doc.text('Estimate framed in the Office of The Executive Engineer, Jigaon Rehabilitation Division, Khamgaon.');
  doc.moveDown(0.4);
  labelRow(doc, fonts, 'Name of Owner', `${body.owner || ''}          L.A. Case No: ${body.laCaseNumber || ''}`, 11);
  labelRow(doc, fonts, 'Village', body.village || '', 11);
  labelRow(doc, fonts, 'Gut No.', body.gutNumber || '', 11);
  labelRow(doc, fonts, 'Estimated Cost Rs.', `${money(depreciated)} /-`, 11);
  doc.moveDown(0.6);
  doc.font(fonts.bold).text('General Description.');
  doc.font(fonts.reg).text(
    `The section-11 (as per LARRR Act 2013) for the L.A. of Village ${body.village || ''}, Gut No. ${body.gutNumber || ''} has been published. Valuation of the structure is worked out by depreciation method as per PWD handbook.`,
    { align: 'justify', lineGap: 2 }
  );
  doc.moveDown(1.4);
  signatures(doc, fonts);
}

function depPage(
  doc: PDFKit.PDFDocument,
  fonts: Fonts,
  body: SnapshotBody,
  present: number | null,
  depreciated: number | null
) {
  const dep = body.depreciation?.structures?.[0];
  center(doc, fonts.bold, 14, 'JIGAON PROJECT');
  center(doc, fonts.reg, 11, `Tal:- ${body.taluka || 'Nandura'}                                                      Dist:- ${body.district || 'Buldhana'}`);
  doc.font(fonts.bold).fontSize(11).text(`Name of Work:- Valuation of Properties on the Land of Village:${body.village || ''}`);
  doc.moveDown(0.5);
  center(doc, fonts.bold, 14, 'VALUATION BY DEPRECIATION');
  doc.moveDown(0.4);
  labelRow(doc, fonts, 'Name of owner', body.owner || '', 11);
  labelRow(doc, fonts, 'Gut No.', `${body.gutNumber || ''}          LA No. ${body.laCaseNumber || ''}`, 11);
  labelRow(doc, fonts, 'Village', body.village || '', 11);
  doc.moveDown(0.3);
  sectionBar(doc, fonts, 'CONSTRUCTION DETAILS');
  labelRow(doc, fonts, '1) Type of structures', body.structureTypeText || 'Block masonary+ wooden plank', 11);
  labelRow(doc, fonts, '2) Total life of structure', body.usefulLifeYears != null ? String(body.usefulLifeYears) : '', 11);
  labelRow(doc, fonts, '3) Present Estimated cost Rs.', money(present), 11);
  doc.moveDown(0.3);
  sectionBar(doc, fonts, 'DEPRECIATION');
  labelRow(doc, fonts, '1) Year of construction', body.constructionYear != null ? String(body.constructionYear) : '', 11);
  labelRow(doc, fonts, '2) Present life', dep?.ageYears != null ? String(dep.ageYears) : '', 11);
  labelRow(doc, fonts, '3) Future life', dep?.remainingLifeYears != null ? String(dep.remainingLifeYears) : '', 11);
  labelRow(doc, fonts, '4) Y.P. for future life @ 7%', dep?.ypFuture != null ? String(dep.ypFuture) : '', 11);
  labelRow(doc, fonts, '5) Y.P. for Total life @ 7%', dep?.ypTotal != null ? String(dep.ypTotal) : '', 11);
  doc.font(fonts.reg).fontSize(9).text('(Ref PWD hand book Ch.37 vol-II Page No 34 & 35)');
  doc.moveDown(0.4);
  sectionBar(doc, fonts, 'FORMULA');
  doc.font(fonts.reg).fontSize(11).text('Depreciated Value = Present Value × Y.P. for future life / Y.P. for Total life');
  doc.moveDown(0.3);
  doc.text(`= ${money(present)}  ×  ${dep?.ypFuture ?? ''}  /  ${dep?.ypTotal ?? ''}`);
  doc.moveDown(0.2);
  doc.font(fonts.bold).fontSize(13).text(`= Rs: ${money(depreciated)}`);
  doc.moveDown(0.4);
  doc.font(fonts.reg).fontSize(10).text('Salvage: none');
  doc.moveDown(1.0);
  signatures(doc, fonts);
}

function abstractPage(
  doc: PDFKit.PDFDocument,
  fonts: Fonts,
  body: SnapshotBody,
  rows: AbstractLine[],
  present: number | null
) {
  center(doc, fonts.bold, 13, 'JIGAON PROJECT');
  center(doc, fonts.reg, 10, `Tal : ${body.taluka || 'Nandura'}                                                 Dist: ${body.district || 'Buldhana'}`);
  doc.font(fonts.bold).fontSize(10).text(`Name of Work:- Valuation of Properties on the Land of Village:${body.village || ''}`);
  labelRow(doc, fonts, 'Name', body.owner || '', 10);
  labelRow(doc, fonts, 'Gut No', `${body.gutNumber || ''}     L.A. Case No: ${body.laCaseNumber || ''}`, 10);
  labelRow(doc, fonts, 'Village', body.village || '', 10);
  doc.moveDown(0.35);
  center(doc, fonts.bold, 12, 'ABSTRACT SHEET');
  doc.moveDown(0.35);

  const cols = [
    { key: 'sr', title: 'Sr.No', x: 40, w: 28 },
    { key: 'qty', title: 'QTY', x: 68, w: 42 },
    { key: 'desc', title: 'DESCRIPTION OF ITEM', x: 110, w: 210 },
    { key: 'rate', title: 'RATE', x: 320, w: 48 },
    { key: 'unit', title: 'UNIT', x: 368, w: 36 },
    { key: 'ra', title: 'RA Item', x: 404, w: 42 },
    { key: 'amt', title: 'AMOUNT', x: 446, w: 70 },
  ];
  drawTableHeader(doc, fonts, cols, doc.y);

  rows.forEach((row, index) => {
    if (doc.y > 700) {
      doc.addPage();
      center(doc, fonts.bold, 11, 'ABSTRACT SHEET (continued)');
      doc.moveDown(0.3);
      drawTableHeader(doc, fonts, cols, doc.y);
    }
    const values = [
      String(index + 1),
      fmtQty(row.quantity),
      row.title,
      row.rate == null ? '' : String(row.rate),
      row.unit,
      row.itemNumber || '',
      money(row.amount),
    ];
    drawTableRow(doc, fonts, cols, values, doc.y, index % 2 === 1);
  });

  doc.moveDown(0.6);
  doc.font(fonts.bold).fontSize(11);
  doc.text(`Total Amount Rs. ${money(present)}`, 320, doc.y, { width: 196, align: 'right' });
  doc.text(`Say Rs. ${money(present)}`, 320, doc.y + 16, { width: 196, align: 'right' });
  doc.moveDown(2);
  signatures(doc, fonts);
}

function msPage(doc: PDFKit.PDFDocument, fonts: Fonts, body: SnapshotBody, blocks: MsBlock[]) {
  center(doc, fonts.bold, 13, 'JIGAON PROJECT');
  center(doc, fonts.reg, 10, `Tal : ${body.taluka || 'Nandura'}                                                         Dist: ${body.district || 'Buldhana'}`);
  doc.font(fonts.bold).fontSize(10).text(`Name of Work:- Valuation of Properties on the Land of Village:${body.village || ''}`);
  labelRow(doc, fonts, 'Name of Owner', body.owner || '', 10);
  labelRow(doc, fonts, 'Gut No.', body.gutNumber || '', 10);
  labelRow(doc, fonts, 'Village', `${body.village || ''}          LA No. ${body.laCaseNumber || ''}`, 10);
  doc.moveDown(0.3);
  center(doc, fonts.bold, 12, 'MEASUREMENT SHEET');
  doc.moveDown(0.4);

  let serial = 1;
  for (const block of blocks) {
    if (doc.y > 680) {
      doc.addPage();
      center(doc, fonts.bold, 11, 'MEASUREMENT SHEET (continued)');
      doc.moveDown(0.4);
    }
    const net = block.engineerNet ?? block.derivedNet;
    doc.font(fonts.bold).fontSize(10).fillColor('#000000')
      .text(`${serial}.   Item No. ${block.itemNumber || ''}   ${block.title}`);
    doc.font(fonts.reg).fontSize(10).text(`Net Qty: ${fmtQty(net)} ${block.unit}`, { align: 'right' });

    const cols = [
      { key: 'label', title: 'Particular', x: 40, w: 110 },
      { key: 'nos', title: 'Nos', x: 150, w: 36 },
      { key: 'l', title: 'L (m)', x: 186, w: 48 },
      { key: 'b', title: 'B (m)', x: 234, w: 48 },
      { key: 'd', title: 'D/H (m)', x: 282, w: 52 },
      { key: 'qty', title: 'Qty', x: 334, w: 70 },
      { key: 'unit', title: 'Unit', x: 404, w: 50 },
    ];
    drawTableHeader(doc, fonts, cols, doc.y);
    for (const [index, line] of (block.lines || []).entries()) {
      const qty = line.sign < 0 ? -Math.abs(line.quantity) : line.quantity;
      drawTableRow(doc, fonts, cols, [
        line.label,
        String(line.count),
        String(line.lengthM),
        String(line.breadthM),
        String(line.depthOrHeightM),
        fmtQty(qty),
        block.unit,
      ], doc.y, index % 2 === 1);
      if (doc.y > 740) {
        doc.addPage();
        drawTableHeader(doc, fonts, cols, doc.y);
      }
    }
    drawTableRow(doc, fonts, cols, ['Total Qty.', '', '', '', '', fmtQty(net), block.unit], doc.y, false, true);
    doc.moveDown(0.55);
    serial += 1;
  }
}

function drawTableHeader(
  doc: PDFKit.PDFDocument,
  fonts: Fonts,
  cols: { title: string; x: number; w: number }[],
  y: number
) {
  const h = 18;
  doc.save();
  doc.rect(cols[0].x, y, cols.reduce((s, c) => s + c.w, 0), h).fillAndStroke('#E8EEF5', '#000000');
  doc.fillColor('#000000').font(fonts.bold).fontSize(8);
  for (const col of cols) {
    doc.text(col.title, col.x + 2, y + 5, { width: col.w - 4, align: 'center' });
  }
  doc.restore();
  doc.y = y + h;
}

function drawTableRow(
  doc: PDFKit.PDFDocument,
  fonts: Fonts,
  cols: { x: number; w: number }[],
  values: string[],
  y: number,
  shade = false,
  bold = false
) {
  let lines = 1;
  values.forEach((value, i) => {
    const width = Math.max(24, (cols[i]?.w || 40) - 4);
    lines = Math.max(lines, Math.ceil(doc.heightOfString(value || ' ', { width }) / 10));
  });
  const h = Math.max(16, 4 + lines * 11);
  doc.save();
  if (shade) doc.rect(cols[0].x, y, cols.reduce((s, c) => s + c.w, 0), h).fill('#F8FAFC');
  doc.rect(cols[0].x, y, cols.reduce((s, c) => s + c.w, 0), h).stroke('#000000');
  let x = cols[0].x;
  for (let i = 0; i < cols.length; i += 1) {
    if (i > 0) doc.moveTo(cols[i].x, y).lineTo(cols[i].x, y + h).stroke('#000000');
    x = cols[i].x;
  }
  doc.fillColor('#000000').font(bold ? fonts.bold : fonts.reg).fontSize(8);
  values.forEach((value, i) => {
    const col = cols[i];
    if (!col) return;
    const align = i === 2 || i === 0 ? 'left' : 'center';
    doc.text(value, col.x + 2, y + 3, { width: col.w - 4, align });
  });
  doc.restore();
  doc.y = y + h;
  void x;
}

function center(doc: PDFKit.PDFDocument, font: string, size: number, text: string) {
  doc.font(font).fontSize(size).fillColor('#000000').text(text, { align: 'center' });
}

function labelRow(doc: PDFKit.PDFDocument, fonts: Fonts, label: string, value: string, size: number) {
  doc.font(fonts.bold).fontSize(size).fillColor('#000000').text(`${label}  :-  `, { continued: true });
  doc.font(fonts.reg).text(value || '');
}

function pair(doc: PDFKit.PDFDocument, fonts: Fonts, label: string, value: string) {
  doc.font(fonts.reg).fontSize(11).text(`${label.padEnd(22, ' ')}:  ${value}`);
}

function sectionBar(doc: PDFKit.PDFDocument, fonts: Fonts, title: string) {
  const y = doc.y;
  doc.rect(40, y, 515, 18).fillAndStroke('#E8EEF5', '#000000');
  doc.fillColor('#000000').font(fonts.bold).fontSize(11).text(title, 40, y + 4, { width: 515, align: 'center' });
  doc.y = y + 22;
}

function signatures(doc: PDFKit.PDFDocument, fonts: Fonts) {
  const y = doc.y;
  doc.font(fonts.reg).fontSize(10).fillColor('#000000');
  doc.text('(A. R. Rathod)', 60, y);
  doc.text('(S. D. Hase)', 340, y);
  doc.text('Sub Divisional Engineer.', 60, y + 14);
  doc.text('Executive Engineer,', 340, y + 14);
  doc.text('Jigaon Rehab. Sub Div. No. 1', 60, y + 28);
  doc.text('Jigaon Rehabilitation Division', 340, y + 28);
  doc.text('Shegaon', 60, y + 42);
  doc.text('Khamgaon', 340, y + 42);
  doc.y = y + 60;
}

function money(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

function fmtQty(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value);
}
