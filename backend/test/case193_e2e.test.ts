import assert from 'node:assert';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test from 'node:test';

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

const ROOMS = [
  ['R1', 3.6, 5.9],
  ['R2', 3.6, 5.75],
  ['R3', 3.6, 5.9],
  ['R4', 3.6, 5.75],
  ['R5', 3.5, 5.9],
  ['R6', 3.5, 5.75],
  ['R7', 3.8, 5.9],
  ['R8', 3.8, 5.75],
];

test('gut 193 end to end matches the workbook valuation', async () => {
  const { default: app } = await import('../src/index.ts');
  const { db } = await import('../src/database/db.ts');
  const { signToken } = await import('../src/middleware/auth.ts');
  const admin = db.users.find((user) => user.role === 'ADMIN');
  assert.ok(admin);
  const token = signToken({ id: admin.id, email: admin.email, role: admin.role });

  const server = app.listen(0);
  await once(server, 'listening');
  const port = (server.address() as AddressInfo).port;
  const base = `http://127.0.0.1:${port}`;

  const call = async (method: string, path: string, body?: unknown) => {
    const response = await fetch(base + path, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    const json = text ? JSON.parse(text) : {};
    if (!response.ok) {
      throw new Error(`${method} ${path} ${response.status} ${json.message || text}`);
    }
    return json;
  };

  try {
    const rates = await call('POST', '/api/v1/workflow/rate-schedules/import', {
      name: 'Gut 193 rate extract',
      authority: 'Workbook RA sheet, schedule not tagged',
      versionLabel: 'CASE-193-RA-EXTRACT',
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
    assert.strictEqual(rates.duplicateItemNumbers.length, 0);

    const yp = await call('POST', '/api/v1/workflow/yp-tables/import', {
      name: 'Workbook YP rows used by gut 193',
      citation: 'PWD handbook Ch. 37, Vol. II, pp. 34-35, as cited on the depreciation sheet',
      rows: [
        { year: 7, factor: 5.389 },
        { year: 10, factor: 7.024 },
        { year: 93, factor: null },
      ],
    });

    const created = await call('POST', '/api/v1/cases', {
      projectId: 'proj-jigaon-01',
      caseNumber: `GUT-193-E2E-${Date.now()}`,
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
    assert.strictEqual(created.case.workflow, 'BUILDING');

    await call('PUT', `/api/v1/workflow/cases/${caseId}/identity`, {
      ownerName: 'Eknath pandurang tharkar',
      surveyNumber: '193',
      village: 'Bondgaon',
      taluka: 'Shegaon',
      district: 'Buldhana',
      laCaseNumber: '01/2022-23',
      valuationDate: '2026-01-01',
      conflictingIdentifierNotes: 'Cover sheet also shows LA 03/2021-22 and Bhon/Sangrampur. Not resolved.',
      rateScheduleVersionId: rates.schedule.id,
      ypTableVersionId: yp.table.id,
    });

    const added = await call('POST', `/api/v1/workflow/cases/${caseId}/structures`, { name: 'Main house' });
    const structureId = added.structure.id as string;
    await call('PUT', `/api/v1/workflow/structures/${structureId}`, {
      structureTypeText: 'Block masonary+ wooden plank',
      wallMaterialText: 'Siporex / AAC block',
      wallThicknessM: 0.15,
      storeyHeightM: 1.97,
      constructionYear: 2023,
      usefulLifeYears: 10,
      floorFinish: 'Ceramic tile',
      roofFinish: 'Non-teak wood plank ceiling',
      externalFinish: 'Sand-faced plaster',
      internalFinish: 'Cement plaster 6 mm',
    });

    await call('PUT', `/api/v1/workflow/structures/${structureId}/rooms`, {
      rooms: ROOMS.map(([code, lengthM, breadthM], index) => ({
        code,
        lengthM,
        breadthM,
        rowIndex: index < 4 ? 0 : 1,
        bayIndex: index % 4,
        enclosure: 'ENCLOSED',
      })),
    });

    const candidates = await call('POST', `/api/v1/workflow/structures/${structureId}/geometry/candidates`);
    assert.ok(candidates.wallRuns.length > 0);
    assert.ok(candidates.wallRuns.every((wall: { origin: string }) => wall.origin === 'CANDIDATE'));

    for (const line of LINES) {
      const manual = await call('POST', `/api/v1/workflow/structures/${structureId}/manual-block`, {
        title: line.title,
        quantity: line.quantity,
        unit: line.unit,
        reason: 'Quantity taken from the completed measurement sheet for gut 193.',
      });
      const matched = await call('POST', `/api/v1/workflow/blocks/${manual.block.id}/rate`, {
        itemNumber: line.itemNumber,
      });
      assert.strictEqual(matched.match, 'UNIQUE', line.itemNumber);
    }

    const draft = await call('POST', `/api/v1/workflow/cases/${caseId}/calculate`);
    assert.strictEqual(draft.snapshot.presentCost, 1073836);
    assert.strictEqual(draft.snapshot.depreciatedValue, 823876);
    assert.ok(draft.snapshot.blockers.some((item: string) => item.includes('accept')));

    await call('POST', `/api/v1/workflow/cases/${caseId}/depreciation/accept`);
    const ready = await call('POST', `/api/v1/workflow/cases/${caseId}/calculate`);
    assert.strictEqual(ready.snapshot.presentCost, 1073836);
    assert.strictEqual(ready.snapshot.depreciatedValue, 823876);
    assert.deepStrictEqual(ready.snapshot.blockers, []);

    const abstract = (ready.snapshot.body as { abstract: { itemNumber: string; amount: number; quantity: number }[] }).abstract;
    assert.strictEqual(abstract.length, 12);
    for (const line of LINES) {
      const found = abstract.find((row) => row.itemNumber === line.itemNumber);
      assert.ok(found, line.itemNumber);
      assert.strictEqual(found.quantity, line.quantity);
      assert.strictEqual(found.amount, line.amount);
    }

    const before = await call('GET', `/api/v1/workflow/snapshots/${ready.snapshot.id}`);
    const after = await call('GET', `/api/v1/workflow/snapshots/${ready.snapshot.id}`);
    assert.strictEqual(before.snapshot.contentHash, after.snapshot.contentHash);
    assert.strictEqual(after.snapshot.status, 'DRAFT');

    const finalized = await call('POST', `/api/v1/workflow/snapshots/${ready.snapshot.id}/finalize`, {});
    assert.strictEqual(finalized.snapshot.status, 'FINALIZED');
    assert.strictEqual(finalized.snapshot.presentCost, 1073836);
    assert.strictEqual(finalized.snapshot.depreciatedValue, 823876);

    await assert.rejects(
      () => call('POST', `/api/v1/workflow/snapshots/${ready.snapshot.id}/finalize`, {}),
      /already finalized/
    );

    const replay = await call('POST', `/api/v1/workflow/cases/${caseId}/source-replay`);
    assert.strictEqual(replay.snapshot.label, 'SOURCE_REPLAY');
    assert.strictEqual(replay.snapshot.presentCost, 1073836);
    assert.strictEqual(replay.snapshot.depreciatedValue, 823876);

    const pdf = await fetch(base + `/api/v1/workflow/snapshots/${finalized.snapshot.id}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const pdfRaw = Buffer.from(await pdf.arrayBuffer()).toString('latin1');
    const pdfText = decodePdfText(pdfRaw);
    assert.strictEqual(pdf.status, 200);
    assert.ok(pdfText.includes('1073836'), 'PDF is missing the present cost');
    assert.ok(pdfText.includes('823876'), 'PDF is missing the depreciated value');
    assert.ok(pdfText.includes('Salvage: none'), 'PDF is missing the salvage line');

    const xls = await fetch(base + `/api/v1/workflow/snapshots/${finalized.snapshot.id}/xls`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const xlsText = await xls.text();
    assert.strictEqual(xls.status, 200);
    assert.ok(xlsText.includes('1073836'));
    assert.ok(xlsText.includes('823876'));
    assert.ok(xlsText.includes('Salvage: none'));
  } finally {
    server.close();
  }
});
