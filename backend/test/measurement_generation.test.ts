import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import { registryRuleCount } from '../src/workflow/measurementGenerate';
import { EKNATH_GUT193_WORKBOOK_SPANS } from '../src/workflow/gridGeometry';

process.env.NODE_ENV = 'test';

test('rule registry has 12 Eknath draft rules, ordinary residential draft pack, and zero validated rules', () => {
  const counts = registryRuleCount();
  assert.equal(counts.eknathDraft, 12);
  assert.equal(counts.generic, 11);
  assert.equal(counts.validated, 0);
  assert.equal(counts.total, 23);
});

test('generate-measurement from Gut-193-like facts creates draft sheet nets', async () => {
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

  const created = await fetch(`${base}/cases`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      projectId: 'proj-jigaon-01',
      caseNumber: `MS-GEN-${Date.now()}`,
      ownerName: 'Eknath Pandurang Tharkar',
      village: 'Bondgaon',
      surveyNumber: '193',
      dateOfInspection: '2026-10-04',
      valuationDate: '2026-10-04',
    }),
  }).then((res) => res.json());
  const caseId = created.case.id;

  await fetch(`${base}/workflow/cases/${caseId}/identity`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ rateScheduleVersionId: 'rate-pwd-csr-2014-15-seed' }),
  });

  const house = await fetch(`${base}/workflow/cases/${caseId}/structures`, {
    method: 'POST', headers, body: JSON.stringify({ name: 'Main house', structureKind: 'MAIN_HOUSE' }),
  }).then((res) => res.json());
  const structureId = house.structure.id;

  await fetch(`${base}/workflow/structures/${structureId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      wallMaterialText: 'siporex',
      wallThicknessM: 0.15,
      storeyHeightM: 1.97,
      foundationWidthM: 0.25,
      groundBeamDepthM: 0.30,
      solingDepthM: 0.10,
      floorFinish: 'ceramic',
      roofFinish: 'wood plank',
    }),
  });

  await fetch(`${base}/workflow/structures/${structureId}/structure-layout`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      overallLengthM: 14.5,
      overallBreadthM: 11.65,
      gridColumns: 4,
      gridRows: 2,
      spanMode: 'UNEQUAL',
      columnSpansM: EKNATH_GUT193_WORKBOOK_SPANS.columnSpansM,
      rowSpansM: EKNATH_GUT193_WORKBOOK_SPANS.rowSpansM,
      confirm: true,
    }),
  });

  const openings = [
    ...Array.from({ length: 8 }, (_, i) => ({
      code: `D${i + 1}`, kind: 'DOOR', count: 1, widthM: 0.85, heightM: 1.75, hostWallRunId: null,
    })),
    ...Array.from({ length: 8 }, (_, i) => ({
      code: `W${i + 1}`, kind: 'WINDOW', count: 1, widthM: 0.60, heightM: 0.80, hostWallRunId: null,
    })),
  ];
  await fetch(`${base}/workflow/structures/${structureId}/openings`, {
    method: 'PUT', headers, body: JSON.stringify({ openings }),
  });

  await fetch(`${base}/workflow/structures/${structureId}/members`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      members: [
        { kind: 'COLUMN', count: 19, lengthM: 0.15, breadthM: 0.15, depthM: 1.97, roomId: null },
        // No timber members: jungle-wood uses the workbook MS wood schedule (5.14 cum).
      ],
    }),
  });

  const generated = await fetch(`${base}/workflow/structures/${structureId}/generate-measurement`, {
    method: 'POST', headers, body: JSON.stringify({}),
  }).then((res) => res.json());

  assert.ok(generated.created + generated.updated >= 8, `expected several draft lines, got ${generated.created}+${generated.updated}`);

  const bundle = await fetch(`${base}/workflow/cases/${caseId}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((res) => res.json());

  const byRule = Object.fromEntries(bundle.blocks.map((block: { ruleId: string; derivedNet: number; status: string; ruleStatus: string }) => [block.ruleId, block]));
  assert.equal(byRule['eknath.excavation.v1'].derivedNet, 10.33);
  assert.equal(byRule['eknath.soling.v1'].derivedNet, 2.58);
  assert.equal(byRule['eknath.rcc-beam.v1'].derivedNet, 7.75);
  assert.equal(byRule['eknath.rcc-column.v1'].derivedNet, 0.84);
  assert.equal(byRule['eknath.tmt-steel.v1'].derivedNet, 4.29);
  assert.ok(Math.abs(byRule['eknath.aac-masonry.v1'].derivedNet - 28.37) < 0.02);
  assert.equal(byRule['eknath.ceramic-floor.v1'].derivedNet, 168.93);
  assert.equal(byRule['eknath.ceiling.v1'].derivedNet, 184.53);
  assert.equal(byRule['eknath.external-plaster.v1'].derivedNet, 107.76);
  assert.equal(byRule['eknath.internal-plaster.v1'].derivedNet, 95.27);
  assert.equal(byRule['eknath.jungle-wood.v1'].derivedNet, 5.14);
  assert.equal(byRule['eknath.wood-frames.v1'].derivedNet, 15.74);
  assert.equal(byRule['eknath.excavation.v1'].status, 'REQUIRES_CONFIRMATION');
  assert.equal(byRule['eknath.excavation.v1'].ruleStatus, 'DRAFT');

  // Accepted/overridden lines must not be clobbered
  const blockId = byRule['eknath.excavation.v1'].id;
  await fetch(`${base}/workflow/blocks/${blockId}/decision`, {
    method: 'POST', headers, body: JSON.stringify({ action: 'ACCEPT' }),
  });
  await fetch(`${base}/workflow/structures/${structureId}/generate-measurement`, {
    method: 'POST', headers, body: JSON.stringify({}),
  });
  const after = await fetch(`${base}/workflow/cases/${caseId}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((res) => res.json());
  const excavation = after.blocks.find((block: { ruleId: string }) => block.ruleId === 'eknath.excavation.v1');
  assert.equal(excavation.status, 'ACCEPTED');

  const replay = await fetch(`${base}/workflow/cases/${caseId}/source-replay`, {
    method: 'POST', headers, body: JSON.stringify({}),
  }).then((res) => res.json());
  assert.equal(replay.snapshot.body.presentCost ?? replay.snapshot.presentCost, 1073836);

  // Eknath sheet must not also write ordinary draft.* duplicates
  assert.equal(bundle.blocks.some((block: { ruleId: string }) => block.ruleId.startsWith('draft.')), false);

  server.close();
});

test('ordinary (non-Eknath) case generates a multi-item measurement sheet from facts', async () => {
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

  const created = await fetch(`${base}/cases`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      projectId: 'proj-jigaon-01',
      caseNumber: `MS-ORD-${Date.now()}`,
      ownerName: 'Ordinary Builder',
      village: 'Testgaon',
      surveyNumber: '12',
      dateOfInspection: '2026-10-04',
      valuationDate: '2026-10-04',
    }),
  }).then((res) => res.json());
  const caseId = created.case.id;

  const house = await fetch(`${base}/workflow/cases/${caseId}/structures`, {
    method: 'POST', headers, body: JSON.stringify({ name: 'Main house', structureKind: 'MAIN_HOUSE' }),
  }).then((res) => res.json());
  const structureId = house.structure.id;

  await fetch(`${base}/workflow/structures/${structureId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      wallMaterialText: 'Burnt brick',
      wallThicknessM: 0.23,
      storeyHeightM: 3.0,
      foundationWidthM: 0.60,
      groundBeamDepthM: 0.45,
      solingDepthM: 0.15,
      floorFinish: 'Cement flooring',
      roofFinish: 'R.C.C. slab',
    }),
  });

  // Equal 3×2 grid — not the Gut-193 4×2 unequal profile
  await fetch(`${base}/workflow/structures/${structureId}/structure-layout`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      overallLengthM: 9,
      overallBreadthM: 6,
      gridColumns: 3,
      gridRows: 2,
      spanMode: 'EQUAL',
      confirm: true,
    }),
  });

  await fetch(`${base}/workflow/structures/${structureId}/openings`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      openings: [
        { code: 'Doors', kind: 'DOOR', count: 2, widthM: 0.9, heightM: 2.1, hostWallRunId: null },
        { code: 'Windows', kind: 'WINDOW', count: 4, widthM: 1.2, heightM: 1.2, hostWallRunId: null },
      ],
    }),
  });

  await fetch(`${base}/workflow/structures/${structureId}/members`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      members: [
        { kind: 'COLUMN', count: 8, lengthM: 0.23, breadthM: 0.23, depthM: 3.0, roomId: null },
      ],
    }),
  });

  const generated = await fetch(`${base}/workflow/structures/${structureId}/generate-measurement`, {
    method: 'POST', headers, body: JSON.stringify({}),
  }).then((res) => res.json());

  assert.ok(generated.created + generated.updated >= 8, `expected multi-item ordinary sheet, got ${generated.created}+${generated.updated}`);

  const bundle = await fetch(`${base}/workflow/cases/${caseId}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((res) => res.json());
  const ruleIds = bundle.blocks.map((block: { ruleId: string }) => block.ruleId);
  assert.ok(ruleIds.includes('draft.excavation.v1'));
  assert.ok(ruleIds.includes('draft.wall-masonry.v1'));
  assert.ok(ruleIds.includes('draft.floor-finish.v1'));
  assert.ok(ruleIds.includes('draft.ceiling-roof.v1'));
  assert.ok(ruleIds.includes('draft.external-plaster.v1'));
  assert.ok(ruleIds.includes('draft.internal-plaster.v1'));
  assert.ok(ruleIds.includes('draft.rcc-columns.v1'));
  assert.equal(ruleIds.some((id: string) => id.startsWith('eknath.')), false);

  server.close();
});
