import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import type { CalculationSnapshotRecord, CatalogueItemRecord, YpTableVersionRecord } from './types';

const TEMPLATE = path.resolve(__dirname, '../../../evidance docs/Copy of 193 eknath pandurang tharkar (1).xlsx');

export type WorkbookExportContext = {
  catalogueItems: CatalogueItemRecord[];
  ypTable: YpTableVersionRecord | null;
  structureTypeText?: string;
  constructionYear?: number | null;
  usefulLifeYears?: number | null;
  valuationYear?: number | null;
};

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
  lines: {
    label: string;
    count: number;
    lengthM: number;
    breadthM: number;
    depthOrHeightM: number;
    sign: number;
    quantity: number;
    formulaText: string;
  }[];
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
};

const TIMES = { name: 'Times New Roman', family: 1 as const, size: 12, color: { argb: 'FF000000' } };
const TIMES_BOLD = { ...TIMES, bold: true };
const THIN = { style: 'thin' as const, color: { argb: 'FF000000' } };
const BOX = { top: THIN, left: THIN, bottom: THIN, right: THIN };

/**
 * Clone the office Gut-193 workbook template and fill identity / DEP facts / MS / ABSTRACT
 * so logos, merges, fonts, RA, YP and sheet arrangement stay intact.
 */
export async function buildValuationWorkbook(
  snapshot: CalculationSnapshotRecord,
  ctx: WorkbookExportContext
): Promise<Buffer> {
  if (!fs.existsSync(TEMPLATE)) {
    throw new Error(`Office workbook template not found at ${TEMPLATE}`);
  }

  const body = (snapshot.body || {}) as SnapshotBody;
  const present = Number(snapshot.presentCost ?? body.presentCost ?? 0);
  const depreciated = Number(snapshot.depreciatedValue ?? body.depreciatedValue ?? 0);
  const abstract = (body.abstract || []).filter((row) => row.amount != null && !String(row.ruleId || '').startsWith('draft.'));
  const msBlocks = (body.measurementSheet || []).filter(
    (block) => block.status !== 'EXCLUDED' && !block.ruleId.startsWith('draft.')
  );
  const dep = body.depreciation?.structures?.[0];
  const owner = body.owner || '';
  const gut = String(body.gutNumber || '');
  const village = body.village || '';
  const la = body.laCaseNumber || '';
  const taluka = body.taluka || 'Nandura';
  const district = body.district || 'Buldhana';
  const life = ctx.usefulLifeYears ?? 10;
  const yearBuilt = ctx.constructionYear ?? null;
  const age = dep?.ageYears ?? (ctx.valuationYear && yearBuilt != null ? ctx.valuationYear - yearBuilt : null);
  const future = dep?.remainingLifeYears ?? (life != null && age != null ? life - age : null);
  const ypFuture = dep?.ypFuture ?? null;
  const ypTotal = dep?.ypTotal ?? null;
  const structureType = ctx.structureTypeText || 'Block masonary+ wooden plank';

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(TEMPLATE);
  wb.creator = 'Estimation Platform';
  wb.modified = new Date();

  fillCover(wb.getWorksheet('COVER')!, { owner, gut, la, depreciated, taluka, district });
  fillFs(wb.getWorksheet('FS')!, { owner, gut, village, la, depreciated });
  fillDep(wb.getWorksheet('DEP')!, {
    owner, gut, village, la, structureType, life, yearBuilt, age, future, present, depreciated, ypFuture, ypTotal,
  });
  fillAbstract(wb.getWorksheet('ABSTRACT')!, {
    owner, gut, village, la, taluka, district, abstract, present, catalogue: ctx.catalogueItems,
  });
  fillMs(wb.getWorksheet('MS')!, {
    owner, gut, village, la, taluka, district, msBlocks, catalogue: ctx.catalogueItems,
  });
  // Keep template RA / YP (full office schedule + YP table). Overlay YP factors if a pinned table is richer.
  if (ctx.ypTable?.rows?.length) fillYp(wb.getWorksheet('YP')!, ctx.ypTable);

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function fillCover(
  ws: ExcelJS.Worksheet,
  p: { owner: string; gut: string; la: string; depreciated: number; taluka: string; district: string }
) {
  ws.getCell('A20').value = `Tq. ${p.taluka}                                                  Dist. ${p.district}`;
  ws.getCell('A22').value = '';
  setText(ws.getCell('D24'), p.owner, TIMES_BOLD);
  setText(ws.getCell('D25'), p.gut, TIMES_BOLD);
  setText(ws.getCell('F25'), p.la ? `L.A. Case No: ${p.la}` : '', TIMES_BOLD);
  const amount = ws.getCell('D26');
  amount.value = p.depreciated;
  amount.numFmt = '#,##0';
  amount.font = TIMES_BOLD;
  ws.getCell('E26').value = '/-';
}

function fillFs(
  ws: ExcelJS.Worksheet,
  p: { owner: string; gut: string; village: string; la: string; depreciated: number }
) {
  setText(ws.getCell('C13'), p.owner, TIMES);
  setText(ws.getCell('G13'), p.la ? `L.A. Case No: ${p.la}` : '', TIMES);
  setText(ws.getCell('C14'), p.village, TIMES);
  setText(ws.getCell('C15'), p.gut, TIMES);
  const cost = ws.getCell('G15');
  cost.value = p.depreciated;
  cost.numFmt = '#,##0';
  cost.font = TIMES;
  ws.getCell('A26').value =
    `The section-11 (as per LARRR Act 2013) for the L.A. of Village ${p.village || '—'}, Gut No. ${p.gut || '—'} has been published. Valuation of the structure is worked out by depreciation method as per PWD handbook.`;
}

function fillDep(
  ws: ExcelJS.Worksheet,
  p: {
    owner: string; gut: string; village: string; la: string; structureType: string;
    life: number | null; yearBuilt: number | null; age: number | null; future: number | null;
    present: number; depreciated: number; ypFuture: number | null; ypTotal: number | null;
  }
) {
  setText(ws.getCell('A3'), `Name of Work:- Valuation of Properties on the Land of Village:${p.village || '—'}`, TIMES_BOLD);
  setText(ws.getCell('C5'), p.owner, TIMES_BOLD);
  setText(ws.getCell('C6'), p.gut, TIMES_BOLD);
  setText(ws.getCell('F6'), 'LA No.', TIMES_BOLD);
  setText(ws.getCell('G6'), p.la, TIMES_BOLD);
  setText(ws.getCell('C7'), p.village, TIMES);
  setText(ws.getCell('C9'), p.structureType, TIMES);
  ws.getCell('C10').value = p.life;
  ws.getCell('C10').font = TIMES;
  // Present cost — keep live link when possible, also store computed result
  ws.getCell('D11').value = { formula: 'ABSTRACT!G25', result: p.present };
  ws.getCell('D11').font = TIMES;
  ws.getCell('D11').numFmt = '#,##0';
  ws.getCell('D13').value = p.yearBuilt;
  ws.getCell('D13').font = TIMES;
  if (p.yearBuilt != null) {
    ws.getCell('D14').value = { formula: `${p.yearBuilt ? 'YEAR(TODAY())' : '0'}-D13`, result: p.age ?? undefined };
  }
  // Prefer explicit computed ages for stable offline open
  ws.getCell('D14').value = p.age;
  ws.getCell('D15').value = p.future;
  ws.getCell('D16').value = p.ypFuture;
  ws.getCell('D17').value = p.ypTotal;
  for (const addr of ['D14', 'D15', 'D16', 'D17']) ws.getCell(addr).font = TIMES;
  ws.getCell('D22').value = p.present;
  ws.getCell('D22').numFmt = '#,##0';
  ws.getCell('F22').value = p.ypFuture;
  ws.getCell('F23').value = p.ypTotal;
  ws.getCell('D24').value = {
    formula: 'ROUND(D22*F22/F23,0)',
    result: p.depreciated,
  };
  ws.getCell('D24').font = { ...TIMES_BOLD, size: 12 };
  ws.getCell('D24').numFmt = '#,##0';
}

function fillAbstract(
  ws: ExcelJS.Worksheet,
  p: {
    owner: string; gut: string; village: string; la: string; taluka: string; district: string;
    abstract: AbstractLine[]; present: number; catalogue: CatalogueItemRecord[];
  }
) {
  setText(ws.getCell('A2'), `Tal : ${p.taluka}                                                 Dist: ${p.district}`, TIMES);
  setText(ws.getCell('A3'), `Name of Work:- Valuation of Properties on the Land of Village:${p.village || '—'}`, TIMES_BOLD);
  setText(ws.getCell('C4'), p.owner, TIMES_BOLD);
  setText(ws.getCell('C5'), p.gut, TIMES_BOLD);
  setText(ws.getCell('D5'), p.la ? `L.A. Case No: ${p.la}` : '', TIMES);
  setText(ws.getCell('C6'), p.village, TIMES);

  // Clear old item rows (template has 12) then rewrite with office table style
  unmergeFromRow(ws, 11);
  for (let r = 11; r <= 23; r += 1) {
    for (let c = 1; c <= 7; c += 1) {
      const cell = ws.getCell(r, c);
      cell.value = null;
      cell.border = {} as ExcelJS.Borders;
      cell.font = TIMES;
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    }
  }

  p.abstract.forEach((row, index) => {
    const r = 11 + index;
    const desc = catalogueDescription(p.catalogue, row.itemNumber) || row.title;
    ws.getCell(r, 1).value = index + 1;
    ws.getCell(r, 1).font = TIMES_BOLD;
    ws.getCell(r, 2).value = row.quantity;
    ws.getCell(r, 2).numFmt = '0.00';
    ws.getCell(r, 3).value = desc;
    ws.getCell(r, 3).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    ws.getCell(r, 4).value = row.rate;
    ws.getCell(r, 5).value = row.unit;
    const itemNum = row.itemNumber == null ? '' : Number.isNaN(Number(row.itemNumber)) ? row.itemNumber : Number(row.itemNumber);
    ws.getCell(r, 6).value = itemNum;
    ws.getCell(r, 7).value = {
      formula: `ROUND(D${r}*B${r},0)`,
      result: row.amount ?? undefined,
    };
    ws.getCell(r, 7).numFmt = '#,##0';
    for (let c = 1; c <= 7; c += 1) {
      ws.getCell(r, c).border = BOX;
      if (c !== 1) ws.getCell(r, c).font = TIMES;
    }
  });

  const last = 10 + Math.max(p.abstract.length, 1);
  const totalRow = Math.max(24, last + 1);
  // Template totals at 24/25 — rewrite those cells with values linked to written rows
  ws.getCell('D24').value = 'Total Amount Rs.';
  ws.getCell('D24').font = TIMES_BOLD;
  ws.getCell('G24').value = {
    formula: p.abstract.length ? `SUM(G11:G${10 + p.abstract.length})` : '0',
    result: p.present,
  };
  ws.getCell('G24').font = TIMES_BOLD;
  ws.getCell('G24').numFmt = '#,##0';
  ws.getCell('D25').value = 'Say Rs.';
  ws.getCell('D25').font = TIMES_BOLD;
  ws.getCell('G25').value = p.present;
  ws.getCell('G25').font = TIMES_BOLD;
  ws.getCell('G25').numFmt = '#,##0';
  void totalRow;
}

function fillMs(
  ws: ExcelJS.Worksheet,
  p: {
    owner: string; gut: string; village: string; la: string; taluka: string; district: string;
    msBlocks: MsBlock[]; catalogue: CatalogueItemRecord[];
  }
) {
  setText(ws.getCell('A2'), `Tal : ${p.taluka}                                                         Dist: ${p.district}`, TIMES);
  setText(ws.getCell('A3'), `Name of Work:- Valuation of Properties on the Land of Village:${p.village || '—'}`, TIMES_BOLD);
  setText(ws.getCell('D4'), p.owner, TIMES_BOLD);
  setText(ws.getCell('D5'), p.gut, TIMES_BOLD);
  setText(ws.getCell('D6'), p.village, TIMES_BOLD);
  setText(ws.getCell('L6'), p.la, TIMES_BOLD);

  // Clear measurement body; keep title block rows 1–8
  unmergeFromRow(ws, 9);
  const maxClear = Math.max(ws.rowCount, 200);
  for (let r = 9; r <= maxClear; r += 1) {
    for (let c = 1; c <= 20; c += 1) {
      const cell = ws.getCell(r, c);
      cell.value = null;
      cell.border = {} as ExcelJS.Borders;
    }
  }

  let row = 9;
  let serial = 1;
  for (const block of p.msBlocks) {
    const itemNo = block.itemNumber || '';
    const desc = catalogueDescription(p.catalogue, itemNo) || block.title;
    const net = block.engineerNet ?? block.derivedNet ?? 0;
    const headerRow = row;

    // Serial + item + description + net (column N) — ABSTRACT VLOOKUP shape
    setText(ws.getCell(row, 2), serial, TIMES_BOLD);
    ws.getCell(row, 2).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell(row, 3).value = itemNo === '' ? '' : Number.isNaN(Number(itemNo)) ? itemNo : Number(itemNo);
    ws.getCell(row, 3).font = TIMES_BOLD;
    ws.getCell(row, 3).alignment = { horizontal: 'center', vertical: 'middle' };
    setText(ws.getCell(row, 4), desc, TIMES);
    ws.mergeCells(row, 4, row, 13);
    ws.getCell(row, 14).value = net;
    ws.getCell(row, 14).numFmt = '0.00';
    ws.getCell(row, 14).font = TIMES_BOLD;
    row += 1;

    setText(ws.getCell(row, 4), sectionHeading(block.title), TIMES_BOLD);
    ws.mergeCells(row, 4, row, 13);
    row += 1;

    // Column headers Nos × L × B × D/H
    const hdr = row;
    setText(ws.getCell(hdr, 4), 'Nos', TIMES_BOLD);
    setText(ws.getCell(hdr, 5), 'x', TIMES_BOLD);
    setText(ws.getCell(hdr, 6), 'L (m)', TIMES_BOLD);
    setText(ws.getCell(hdr, 7), 'x', TIMES_BOLD);
    setText(ws.getCell(hdr, 8), 'B (m)', TIMES_BOLD);
    setText(ws.getCell(hdr, 9), 'x', TIMES_BOLD);
    setText(ws.getCell(hdr, 10), 'D/H (m)', TIMES_BOLD);
    setText(ws.getCell(hdr, 11), '=', TIMES_BOLD);
    setText(ws.getCell(hdr, 12), 'Qty', TIMES_BOLD);
    setText(ws.getCell(hdr, 13), 'Unit', TIMES_BOLD);
    for (let c = 4; c <= 13; c += 1) {
      ws.getCell(hdr, c).alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getCell(hdr, c).border = BOX;
    }
    row += 1;

    const firstDetail = row;
    for (const line of block.lines || []) {
      setText(ws.getCell(row, 1), line.label, TIMES);
      ws.getCell(row, 4).value = line.count;
      setText(ws.getCell(row, 5), 'x', TIMES);
      ws.getCell(row, 6).value = line.lengthM;
      setText(ws.getCell(row, 7), 'x', TIMES);
      ws.getCell(row, 8).value = line.breadthM;
      setText(ws.getCell(row, 9), 'x', TIMES);
      ws.getCell(row, 10).value = line.depthOrHeightM;
      setText(ws.getCell(row, 11), '=', TIMES);
      const signed = line.sign < 0 ? -Math.abs(line.quantity) : line.quantity;
      ws.getCell(row, 12).value = {
        formula: `${line.sign < 0 ? '-' : ''}D${row}*F${row}*H${row}*J${row}`,
        result: signed,
      };
      ws.getCell(row, 12).numFmt = '0.000';
      setText(ws.getCell(row, 13), block.unit, TIMES);
      for (const c of [4, 6, 8, 10, 12]) {
        ws.getCell(row, c).font = TIMES;
        ws.getCell(row, c).alignment = { horizontal: 'center', vertical: 'middle' };
      }
      row += 1;
    }
    const lastDetail = row - 1;
    setText(ws.getCell(row, 10), 'Total Qty.', TIMES_BOLD);
    ws.getCell(row, 12).value = lastDetail >= firstDetail
      ? { formula: `SUM(L${firstDetail}:L${lastDetail})`, result: net }
      : net;
    ws.getCell(row, 12).numFmt = '0.00';
    ws.getCell(row, 12).font = TIMES_BOLD;
    setText(ws.getCell(row, 13), block.unit, TIMES);
    ws.getCell(headerRow, 14).value = { formula: `L${row}`, result: net };
    ws.getCell(headerRow, 14).numFmt = '0.00';
    row += 2;
    serial += 1;
  }
}

function fillYp(ws: ExcelJS.Worksheet, table: YpTableVersionRecord) {
  ws.getCell('A1').value = 'Y.P VALUES';
  table.rows.forEach((row, index) => {
    ws.getCell(index + 2, 1).value = row.year;
    ws.getCell(index + 2, 2).value = row.factor;
  });
}

function sectionHeading(title: string): string {
  const t = title.trim();
  if (/excavation/i.test(t)) return 'EXCAVATION';
  if (/soling/i.test(t)) return 'SOLING';
  if (/beam|lintel/i.test(t)) return 'RCC GROUND BEAM';
  if (/tmt|steel/i.test(t)) return 'STEEL';
  if (/aac|masonry|block/i.test(t)) return 'SUPERSTRUCTURE MASONRY - BLOCK WALL';
  if (/column/i.test(t)) return 'RCC COLUMNS';
  if (/jungle wood$|woodwork|timber/i.test(t) && !/frame/i.test(t)) return 'WOODWORK';
  if (/ceramic|floor/i.test(t)) return 'FLOORING';
  if (/ceiling|plank|roof/i.test(t)) return 'ROOFING';
  if (/external|sand.?faced/i.test(t)) return 'EXTERNAL PLASTER';
  if (/internal|cement plaster/i.test(t)) return 'INTERNAL PLASTER';
  if (/frame/i.test(t)) return 'WOOD FRAMES';
  return t.toUpperCase();
}

function catalogueDescription(items: CatalogueItemRecord[], itemNumber: string | null): string | null {
  if (!itemNumber) return null;
  const wanted = String(itemNumber).trim();
  const hit = items.find((item) => String(item.itemNumber).trim() === wanted);
  return hit?.description || null;
}

function setText(cell: ExcelJS.Cell, value: string | number, font: Partial<ExcelJS.Font>) {
  cell.value = value;
  cell.font = font as ExcelJS.Font;
}

function unmergeFromRow(ws: ExcelJS.Worksheet, fromRow: number) {
  const merges = [...((ws as unknown as { model?: { merges?: string[] } }).model?.merges || [])];
  for (const range of merges) {
    const start = range.split(':')[0] || '';
    const row = Number(start.replace(/^[A-Z]+/i, ''));
    if (Number.isFinite(row) && row >= fromRow) {
      try {
        ws.unMergeCells(range);
      } catch {
        // ignore already-unmerged ranges
      }
    }
  }
}
