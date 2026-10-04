import assert from 'node:assert';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import {
  EKNATH_GUT193_WORKBOOK_SPANS,
  generateRectangularGrid,
  generateSimpleRectanglePlan,
} from '../src/workflow/gridGeometry';

process.env.NODE_ENV = 'test';

test('Eknath workbook-aligned unequal spans generate 8 rooms and thick shared walls', () => {
  const result = generateRectangularGrid({
    structureId: 'bldg-eknath',
    overallLengthM: EKNATH_GUT193_WORKBOOK_SPANS.columnSpansM.reduce((a, b) => a + b, 0),
    overallBreadthM: EKNATH_GUT193_WORKBOOK_SPANS.rowSpansM.reduce((a, b) => a + b, 0),
    gridColumns: 4,
    gridRows: 2,
    spanMode: 'UNEQUAL',
    columnSpansM: EKNATH_GUT193_WORKBOOK_SPANS.columnSpansM,
    rowSpansM: EKNATH_GUT193_WORKBOOK_SPANS.rowSpansM,
    wallThicknessM: EKNATH_GUT193_WORKBOOK_SPANS.wallThicknessM,
  });
  assert.ok(!('error' in result));
  if ('error' in result) return;
  // Row-major labeling: R1..R4 top row (breadth 5.9), R5..R8 bottom (breadth 5.75).
  // Workbook sheet order pairs rooms differently; spans and topology are the source facts.
  assert.equal(result.summary.roomCount, 8);
  assert.deepEqual(result.columnSpansM, [3.6, 3.6, 3.5, 3.8]);
  assert.deepEqual(result.rowSpansM, [5.9, 5.75]);
  assert.equal(result.rooms[0].code, 'R1');
  assert.equal(result.rooms[0].lengthM, 3.6);
  assert.equal(result.rooms[0].breadthM, 5.9);
  assert.equal(result.rooms[0].rowIndex, 0);
  assert.equal(result.rooms[0].bayIndex, 0);
  assert.equal(result.rooms[3].code, 'R4');
  assert.equal(result.rooms[3].lengthM, 3.8);
  assert.equal(result.rooms[3].breadthM, 5.9);
  assert.equal(result.rooms[4].code, 'R5');
  assert.equal(result.rooms[4].lengthM, 3.6);
  assert.equal(result.rooms[4].breadthM, 5.75);
  assert.equal(result.rooms[7].code, 'R8');
  assert.equal(result.rooms[7].lengthM, 3.8);
  assert.equal(result.rooms[7].breadthM, 5.75);
  assert.equal(result.walls[0].thicknessM, 0.15);
  assert.equal(result.walls[0].segmentKind, 'OUTER');
  const shared = result.walls.find((wall) => wall.kind === 'SHARED')!;
  assert.equal(shared.thicknessM, 0.15);
  assert.equal(result.rooms[0].boundaryWallIds.east, result.rooms[1].boundaryWallIds.west);
  assert.equal(result.summary.internalVertical, 3);
  assert.equal(result.summary.internalHorizontal, 1);
});

test('GI shed simple plan has no rooms and honors open sides', () => {
  const result = generateSimpleRectanglePlan({
    structureId: 'bldg-shed',
    overallLengthM: 6,
    overallBreadthM: 3,
    wallThicknessM: 0.15,
    openSides: { front: true, rear: false, left: false, right: false },
  });
  assert.ok(!('error' in result));
  if ('error' in result) return;
  assert.equal(result.walls.length, 3);
  assert.ok(!result.walls.some((wall) => wall.role === 'FRONT'));
});

test('plan creation API keeps multi-structure independence and wall zones', async () => {
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
      caseNumber: `PLAN-${Date.now()}`,
      ownerName: 'Plan Phase Owner',
      village: 'Bondgaon',
      surveyNumber: '193',
      dateOfInspection: '2026-10-04',
      valuationDate: '2026-10-04',
    }),
  }).then((res) => res.json());
  const caseId = created.case.id;

  const house = await fetch(`${base}/workflow/cases/${caseId}/structures`, {
    method: 'POST', headers, body: JSON.stringify({ name: 'Main house', structureKind: 'MAIN_HOUSE' }),
  }).then((res) => res.json());
  const shed = await fetch(`${base}/workflow/cases/${caseId}/structures`, {
    method: 'POST', headers, body: JSON.stringify({ name: 'Tin / GI shed', structureKind: 'GI_SHED' }),
  }).then((res) => res.json());
  const openShed = await fetch(`${base}/workflow/cases/${caseId}/structures`, {
    method: 'POST', headers, body: JSON.stringify({ name: 'Open shed', structureKind: 'OPEN_SHED' }),
  }).then((res) => res.json());
  const porch = await fetch(`${base}/workflow/cases/${caseId}/structures`, {
    method: 'POST', headers, body: JSON.stringify({ name: 'Porch / Veranda', structureKind: 'PORCH' }),
  }).then((res) => res.json());

  assert.equal(house.structure.structureKind, 'MAIN_HOUSE');
  assert.equal(shed.structure.structureKind, 'GI_SHED');
  assert.equal(openShed.structure.structureKind, 'OPEN_SHED');
  assert.equal(porch.structure.structureKind, 'PORCH');

  await fetch(`${base}/workflow/structures/${house.structure.id}`, {
    method: 'PUT', headers, body: JSON.stringify({ wallThicknessM: 0.15, storeyHeightM: 1.97 }),
  });

  const layout = await fetch(`${base}/workflow/structures/${house.structure.id}/structure-layout`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      overallLengthM: 14.5,
      overallBreadthM: 11.65,
      gridColumns: 4,
      gridRows: 2,
      spanMode: 'UNEQUAL',
      columnSpansM: [3.6, 3.6, 3.5, 3.8],
      rowSpansM: [5.9, 5.75],
      confirm: true,
    }),
  }).then((res) => res.json());
  assert.equal(layout.summary.roomCount, 8);

  const roomId = layout.rooms[1].id;
  await fetch(`${base}/workflow/rooms/${roomId}`, {
    method: 'PATCH', headers, body: JSON.stringify({ enclosure: 'OPEN' }),
  });

  const wallId = layout.wallRuns.find((wall: { kind: string }) => wall.kind === 'SHARED').id;
  const zoned = await fetch(`${base}/workflow/wall-runs/${wallId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      segmentKind: 'LOW_WALL',
      heightM: 2.1,
      verticalZones: [{ kind: 'MASONRY', heightM: 1 }, { kind: 'MESH', heightM: 1.1 }],
    }),
  }).then((res) => res.json());
  assert.equal(zoned.wallRun.heightSource, 'OVERRIDE');
  assert.equal(zoned.wallRun.verticalZones.length, 2);

  await fetch(`${base}/workflow/structures/${shed.structure.id}/simple-plan`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      overallLengthM: 6,
      overallBreadthM: 3,
      storeyHeightM: 2.4,
      wallThicknessM: 0.15,
      openSides: { front: true, rear: false, left: false, right: false },
      confirm: true,
    }),
  });

  await fetch(`${base}/workflow/structures/${openShed.structure.id}/simple-plan`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      overallLengthM: 4,
      overallBreadthM: 3,
      storeyHeightM: 2.2,
      openSides: { front: true, rear: true, left: true, right: true },
      confirm: false,
    }),
  });

  await fetch(`${base}/workflow/structures/${porch.structure.id}/simple-plan`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      overallLengthM: 3,
      overallBreadthM: 2,
      storeyHeightM: 2.2,
      attachedToStructureId: house.structure.id,
      attachedSide: 'FRONT',
      confirm: true,
    }),
  });

  const reloaded = await fetch(`${base}/workflow/cases/${caseId}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((res) => res.json());

  const houseRooms = reloaded.rooms.filter((room: { structureId: string }) => room.structureId === house.structure.id);
  const shedRooms = reloaded.rooms.filter((room: { structureId: string }) => room.structureId === shed.structure.id);
  const openRooms = reloaded.rooms.filter((room: { structureId: string }) => room.structureId === openShed.structure.id);
  assert.equal(houseRooms.length, 8);
  assert.equal(shedRooms.length, 0);
  assert.equal(openRooms.length, 0);
  assert.equal(houseRooms.find((room: { code: string }) => room.code === 'R2').enclosure, 'OPEN');
  assert.equal(reloaded.structures.find((item: { id: string }) => item.id === porch.structure.id).attachedToStructureId, house.structure.id);
  assert.equal(reloaded.structures.find((item: { id: string }) => item.id === shed.structure.id).overallLengthM, 6);

  await fetch(`${base}/workflow/structures/${house.structure.id}`, {
    method: 'PUT', headers, body: JSON.stringify({ wallThicknessM: 0.23 }),
  });
  const after = await fetch(`${base}/workflow/cases/${caseId}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((res) => res.json());
  const inherited = after.wallRuns.find((wall: { id: string; thicknessSource?: string }) => wall.id !== wallId && wall.structureId === house.structure.id && (wall.thicknessSource || 'INHERITED') === 'INHERITED');
  assert.ok(inherited);
  assert.equal(inherited.thicknessM, 0.23);
  const overridden = after.wallRuns.find((wall: { id: string }) => wall.id === wallId);
  assert.equal(overridden.heightM, 2.1);

  // Confirmed plan resists silent regen
  const blocked = await fetch(`${base}/workflow/structures/${house.structure.id}/structure-layout`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      overallLengthM: 15,
      overallBreadthM: 12,
      gridColumns: 5,
      gridRows: 2,
      spanMode: 'EQUAL',
      confirm: false,
    }),
  });
  assert.equal(blocked.status, 409);

  const regen = await fetch(`${base}/workflow/structures/${house.structure.id}/structure-layout`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      overallLengthM: 15,
      overallBreadthM: 12,
      gridColumns: 5,
      gridRows: 2,
      spanMode: 'EQUAL',
      acknowledgeRegenerate: true,
      confirm: true,
    }),
  }).then((res) => res.json());
  assert.equal(regen.summary.roomCount, 10);

  const removed = await fetch(`${base}/workflow/structures/${shed.structure.id}`, {
    method: 'DELETE',
    headers,
  }).then(async (res) => ({ status: res.status, body: await res.json() }));
  assert.equal(removed.status, 200);
  const afterRemove = await fetch(`${base}/workflow/cases/${caseId}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((res) => res.json());
  assert.equal(afterRemove.structures.some((item: { id: string }) => item.id === shed.structure.id), false);
  assert.equal(afterRemove.structures.some((item: { id: string }) => item.id === house.structure.id), true);
  assert.equal(afterRemove.wallRuns.some((wall: { structureId: string }) => wall.structureId === shed.structure.id), false);

  server.close();
});
