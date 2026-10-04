import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import { EKNATH_GUT193_WORKBOOK_SPANS } from '../src/workflow/gridGeometry';

process.env.NODE_ENV = 'test';

const LINES = [
  { itemNumber: '1', title: 'Excavation', quantity: 10.33, rate: 202.85, unit: 'cum', amount: 2095 },
  { itemNumber: '4', title: 'Soling', quantity: 2.58, rate: 2130.4, unit: 'cum', amount: 5496 },
  { itemNumber: '21', title: 'RCC ground beam', quantity: 7.75, rate: 12639.7, unit: 'cum', amount: 97958 },
  { itemNumber: '121', title: 'TMT FE-500', quantity: 4.29, rate: 7514.2, unit: 'qtl', amount: 32236 },
  { itemNumber: '19.1', title: 'AAC block masonry', quantity: 28.37, rate: 7152.1, unit: 'cum', amount: 202905 },
  { itemNumber: '6', title: 'RCC columns', quantity: 0.84, rate: 7578, unit: 'cum', amount: 6366 },
  { itemNumber: '68', title: 'Jungle wood', quantity: 5.14, rate: 56662.35, unit: 'cum', amount: 291244 },
  { itemNumber: '112', title: 'Ceramic tiles', quantity: 168.93, rate: 507.1, unit: 'sqm', amount: 85664 },
  { itemNumber: '98', title: 'Wood plank ceiling', quantity: 184.53, rate: 1166, unit: 'sqm', amount: 215162 },
  { itemNumber: '30', title: 'External plaster', quantity: 107.76, rate: 637.25, unit: 'sqm', amount: 68670 },
  { itemNumber: '29', title: 'Internal plaster', quantity: 95.27, rate: 201.4, unit: 'sqm', amount: 19187 },
  { itemNumber: '97', title: 'Jungle-wood frames', quantity: 15.74, rate: 2976.7, unit: 'sqm', amount: 46853 },
];

function decodePdfText(raw: string): string {
  return [...raw.matchAll(/<([0-9A-Fa-f]+)>/g)].map((match) => {
    const hex = match[1];
    let text = '';
    for (let index = 0; index < hex.length; index += 2) {
      text += String.fromCharCode(parseInt(hex.slice(index, index + 2), 16));
    }
    return text;
  }).join('');
}

test('generate → accept → calculate → PDF matches workbook COVER/FS/DEP/ABSTRACT/MS totals', async () => {
  const { default: app } = await import('../src/index.ts');
  const { db } = await import('../src/database/db.ts');
  const { signToken } = await import('../src/middleware/auth.ts');
  const admin = db.users.find((user) => user.role === 'ADMIN');
  assert.ok(admin);
  const token = signToken(admin);
  const server = app.listen(0);
  await once(server, 'listening');
  const port = (server.address() as AddressInfo).port;
  const base = `http://127.0.0.1:${port}/api/v1`;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const call = async (method: string, path: string, body?: unknown) => {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: body ? headers : { Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    const json = text ? JSON.parse(text) : {};
    if (!response.ok) throw new Error(`${method} ${path} ${response.status} ${json.message || text}`);
    return json;
  };

  try {
    const rates = await call('POST', '/workflow/rate-schedules/import', {
      name: 'Gut 193 rate extract (generate path)',
      authority: 'Workbook RA sheet',
      versionLabel: `CASE-193-GEN-${Date.now()}`,
      sourceDocument: 'evidance docs/Copy of 193 eknath pandurang tharkar (1).xlsx',
      items: LINES.map((line) => ({
        itemNumber: line.itemNumber,
        description: line.title,
        unit: line.unit,
        rate: line.rate,
        sourceRow: line.itemNumber,
        reference: 'SOURCE_REPLAY',
      })),
    });

    const yp = await call('POST', '/workflow/yp-tables/import', {
      name: 'Workbook YP rows used by gut 193 generate',
      citation: 'PWD handbook Ch. 37, Vol. II, pp. 34-35, as cited on the depreciation sheet',
      rows: [
        { year: 7, factor: 5.389 },
        { year: 10, factor: 7.024 },
        { year: 93, factor: null },
      ],
    });

    const created = await call('POST', '/cases', {
      projectId: 'proj-jigaon-01',
      caseNumber: `GUT-193-GEN-${Date.now()}`,
      ownerName: 'Eknath pandurang tharkar',
      surveyNumber: '193',
      village: 'Bondgaon',
      taluka: 'Shegaon',
      district: 'Buldhana',
      laCaseNumber: '01/2022-23',
      valuationDate: '2026-01-01',
      dateOfInspection: '2026-01-01',
    });
    const caseId = created.case.id as string;

    await call('PUT', `/workflow/cases/${caseId}/identity`, {
      ownerName: 'Eknath pandurang tharkar',
      surveyNumber: '193',
      village: 'Bondgaon',
      taluka: 'Shegaon',
      district: 'Buldhana',
      laCaseNumber: '01/2022-23',
      conflictingIdentifierNotes: 'Cover sheet also shows LA 03/2021-22 and Bhon/Sangrampur. Not resolved.',
      rateScheduleVersionId: rates.schedule.id,
      ypTableVersionId: yp.table.id,
    });

    const house = await call('POST', `/workflow/cases/${caseId}/structures`, {
      name: 'Main house',
      structureKind: 'MAIN_HOUSE',
    });
    const structureId = house.structure.id as string;

    await call('PUT', `/workflow/structures/${structureId}`, {
      wallMaterialText: 'siporex',
      wallThicknessM: 0.15,
      storeyHeightM: 1.97,
      foundationWidthM: 0.25,
      groundBeamDepthM: 0.30,
      solingDepthM: 0.10,
      floorFinish: 'ceramic',
      roofFinish: 'wood plank',
      constructionYear: 2023,
      usefulLifeYears: 10,
    });

    await call('PUT', `/workflow/structures/${structureId}/structure-layout`, {
      overallLengthM: 14.5,
      overallBreadthM: 11.65,
      gridColumns: 4,
      gridRows: 2,
      spanMode: 'UNEQUAL',
      columnSpansM: EKNATH_GUT193_WORKBOOK_SPANS.columnSpansM,
      rowSpansM: EKNATH_GUT193_WORKBOOK_SPANS.rowSpansM,
      confirm: true,
    });

    const openings = [
      ...Array.from({ length: 8 }, (_, i) => ({
        code: `D${i + 1}`, kind: 'DOOR', count: 1, widthM: 0.85, heightM: 1.75, hostWallRunId: null,
      })),
      ...Array.from({ length: 8 }, (_, i) => ({
        code: `W${i + 1}`, kind: 'WINDOW', count: 1, widthM: 0.60, heightM: 0.80, hostWallRunId: null,
      })),
    ];
    await call('PUT', `/workflow/structures/${structureId}/openings`, { openings });
    await call('PUT', `/workflow/structures/${structureId}/members`, {
      members: [{ kind: 'COLUMN', count: 19, lengthM: 0.15, breadthM: 0.15, depthM: 1.97, roomId: null }],
    });

    const generated = await call('POST', `/workflow/structures/${structureId}/generate-measurement`, {});
    assert.ok(generated.created + generated.updated >= 12, `expected 12 eknath lines, got ${generated.created}+${generated.updated}`);

    const accepted = await call('POST', `/workflow/cases/${caseId}/accept-draft-blocks`, { structureId });
    assert.equal(accepted.accepted, 12, `expected 12 accepted with unique rates, got ${accepted.accepted}; skipped ${accepted.skippedUnmapped}`);

    const draft = await call('POST', `/workflow/cases/${caseId}/calculate`);
    assert.equal(draft.snapshot.presentCost, 1073836);
    assert.equal(draft.snapshot.depreciatedValue, 823876);

    const abstract = (draft.snapshot.body as { abstract: { itemNumber: string; quantity: number; amount: number | null }[] }).abstract;
    assert.equal(abstract.length, 12);
    for (const line of LINES) {
      const found = abstract.find((row) => row.itemNumber === line.itemNumber);
      assert.ok(found, line.itemNumber);
      assert.equal(found.quantity, line.quantity);
      assert.equal(found.amount, line.amount);
    }

    const ms = (draft.snapshot.body as { measurementSheet: unknown[] }).measurementSheet;
    assert.ok(ms.length >= 12);

    await call('POST', `/workflow/cases/${caseId}/depreciation/accept`);
    const ready = await call('POST', `/workflow/cases/${caseId}/calculate`);
    assert.equal(ready.snapshot.presentCost, 1073836);
    assert.equal(ready.snapshot.depreciatedValue, 823876);
    assert.deepEqual(ready.snapshot.blockers, []);

    const blocked = await fetch(`${base}/workflow/snapshots/${ready.snapshot.id}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(blocked.status, 409, 'Draft snapshot must not download as finalized PDF');

    const finalized = await call('POST', `/workflow/snapshots/${ready.snapshot.id}/finalize`, {});
    assert.equal(finalized.snapshot.status, 'FINALIZED');

    const pdf = await fetch(`${base}/workflow/snapshots/${finalized.snapshot.id}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(pdf.status, 200);
    const pdfText = decodePdfText(Buffer.from(await pdf.arrayBuffer()).toString('latin1'));
    assert.ok(pdfText.includes('J I G A O N') || pdfText.includes('JIGAON'), 'PDF missing COVER / project title');
    assert.ok(pdfText.includes('ABSTRACT'), 'PDF missing ABSTRACT section');
    assert.ok(pdfText.includes('MEASUREMENT'), 'PDF missing MS section');
    assert.ok(pdfText.includes('1073836'), 'PDF missing present cost');
    assert.ok(pdfText.includes('823876'), 'PDF missing depreciated value');
    assert.ok(pdfText.includes('Depreciated Value') || pdfText.includes('VALUATION BY DEPRECIATION'), 'PDF missing depreciation block');

    const xlsx = await fetch(`${base}/workflow/snapshots/${finalized.snapshot.id}/xls`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(xlsx.status, 200);
    const bytes = Buffer.from(await xlsx.arrayBuffer());
    assert.ok(bytes[0] === 0x50 && bytes[1] === 0x4b, 'Excel export must be .xlsx (ZIP)');
    assert.ok(bytes.byteLength > 5000, 'Workbook too small');
  } finally {
    server.close();
  }
});
