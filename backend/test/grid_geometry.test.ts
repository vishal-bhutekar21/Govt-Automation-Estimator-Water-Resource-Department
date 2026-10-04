import test from 'node:test';
import assert from 'node:assert/strict';
import { generateRectangularGrid, validateGridLayout } from '../src/workflow/gridGeometry';

test('4 × 2 equal grid makes 8 rooms and 8 primary wall runs', () => {
  const result = generateRectangularGrid({
    structureId: 'bldg-a',
    overallLengthM: 15.35,
    overallBreadthM: 5.8,
    gridColumns: 4,
    gridRows: 2,
    spanMode: 'EQUAL',
  });
  assert.ok(!('error' in result));
  if ('error' in result) return;
  assert.equal(result.summary.roomCount, 8);
  assert.equal(result.summary.outerLong, 2);
  assert.equal(result.summary.outerShort, 2);
  assert.equal(result.summary.internalVertical, 3);
  assert.equal(result.summary.internalHorizontal, 1);
  assert.equal(result.summary.totalWallRuns, 8);
  assert.equal(result.rooms[0].code, 'R1');
  assert.equal(result.rooms[7].code, 'R8');
  assert.equal(result.rooms[0].bayIndex, 0);
  assert.equal(result.rooms[0].rowIndex, 0);
  assert.equal(result.rooms[4].code, 'R5');
  const totalArea = result.rooms.reduce((sum, room) => sum + room.areaM2, 0);
  assert.ok(Math.abs(totalArea - 15.35 * 5.8) < 1e-9);
});

test('1 × 4 has no internal vertical wall and three internal horizontals', () => {
  const result = generateRectangularGrid({
    structureId: 'bldg-b',
    overallLengthM: 5.8,
    overallBreadthM: 15.35,
    gridColumns: 1,
    gridRows: 4,
    spanMode: 'EQUAL',
  });
  assert.ok(!('error' in result));
  if ('error' in result) return;
  assert.equal(result.summary.roomCount, 4);
  assert.equal(result.summary.internalVertical, 0);
  assert.equal(result.summary.internalHorizontal, 3);
});

test('4 × 1 has three internal vertical walls and no internal horizontal', () => {
  const result = generateRectangularGrid({
    structureId: 'bldg-c',
    overallLengthM: 15.35,
    overallBreadthM: 5.8,
    gridColumns: 4,
    gridRows: 1,
    spanMode: 'EQUAL',
  });
  assert.ok(!('error' in result));
  if ('error' in result) return;
  assert.equal(result.summary.roomCount, 4);
  assert.equal(result.summary.internalVertical, 3);
  assert.equal(result.summary.internalHorizontal, 0);
});

test('1 × 1 is outer perimeter only', () => {
  const result = generateRectangularGrid({
    structureId: 'bldg-d',
    overallLengthM: 4,
    overallBreadthM: 3,
    gridColumns: 1,
    gridRows: 1,
    spanMode: 'EQUAL',
  });
  assert.ok(!('error' in result));
  if ('error' in result) return;
  assert.equal(result.summary.roomCount, 1);
  assert.equal(result.summary.internalVertical, 0);
  assert.equal(result.summary.internalHorizontal, 0);
  assert.equal(result.summary.totalWallRuns, 4);
});

test('unequal spans must sum to the overall sides', () => {
  const ok = validateGridLayout({
    overallLengthM: 15.35,
    overallBreadthM: 5.8,
    gridColumns: 4,
    gridRows: 2,
    spanMode: 'UNEQUAL',
    columnSpansM: [3.6, 3.8, 3.6, 4.35],
    rowSpansM: [2.9, 2.9],
  });
  assert.equal(ok.ok, true);

  const bad = validateGridLayout({
    overallLengthM: 15.35,
    overallBreadthM: 5.8,
    gridColumns: 4,
    gridRows: 2,
    spanMode: 'UNEQUAL',
    columnSpansM: [3.6, 3.8, 3.6, 4],
    rowSpansM: [2.9, 2.9],
  });
  assert.equal(bad.ok, false);
});

test('invalid dimensions are rejected', () => {
  assert.equal(validateGridLayout({
    overallLengthM: 0,
    overallBreadthM: 5,
    gridColumns: 2,
    gridRows: 2,
    spanMode: 'EQUAL',
  }).ok, false);
  assert.equal(validateGridLayout({
    overallLengthM: -1,
    overallBreadthM: 5,
    gridColumns: 2,
    gridRows: 2,
    spanMode: 'EQUAL',
  }).ok, false);
  assert.equal(validateGridLayout({
    overallLengthM: Number.NaN,
    overallBreadthM: 5,
    gridColumns: 2,
    gridRows: 2,
    spanMode: 'EQUAL',
  }).ok, false);
  assert.equal(validateGridLayout({
    overallLengthM: 10,
    overallBreadthM: 5,
    gridColumns: 0,
    gridRows: 2,
    spanMode: 'EQUAL',
  }).ok, false);
});

test('regeneration 4 × 2 → 5 × 2 changes room count and vertical walls', () => {
  const first = generateRectangularGrid({
    structureId: 'bldg-e',
    overallLengthM: 15.35,
    overallBreadthM: 5.8,
    gridColumns: 4,
    gridRows: 2,
    spanMode: 'EQUAL',
  });
  const second = generateRectangularGrid({
    structureId: 'bldg-e',
    overallLengthM: 15.35,
    overallBreadthM: 5.8,
    gridColumns: 5,
    gridRows: 2,
    spanMode: 'EQUAL',
  });
  assert.ok(!('error' in first) && !('error' in second));
  if ('error' in first || 'error' in second) return;
  assert.equal(first.summary.roomCount, 8);
  assert.equal(second.summary.roomCount, 10);
  assert.equal(second.summary.internalVertical, 4);
});

test('adjacent rooms share one physical wall id', () => {
  const result = generateRectangularGrid({
    structureId: 'bldg-f',
    overallLengthM: 15.35,
    overallBreadthM: 5.8,
    gridColumns: 4,
    gridRows: 2,
    spanMode: 'EQUAL',
  });
  assert.ok(!('error' in result));
  if ('error' in result) return;
  const r1 = result.rooms.find((room) => room.code === 'R1')!;
  const r2 = result.rooms.find((room) => room.code === 'R2')!;
  const r5 = result.rooms.find((room) => room.code === 'R5')!;
  assert.equal(r1.boundaryWallIds.east, r2.boundaryWallIds.west);
  assert.equal(r1.boundaryWallIds.south, r5.boundaryWallIds.north);
  const shared = result.walls.find((wall) => wall.id === r1.boundaryWallIds.east)!;
  assert.equal(shared.kind, 'SHARED');
  assert.ok(shared.sourceRoomIds.includes(r1.id));
  assert.ok(shared.sourceRoomIds.includes(r2.id));
  assert.equal(result.walls.filter((wall) => wall.id === shared.id).length, 1);
});
