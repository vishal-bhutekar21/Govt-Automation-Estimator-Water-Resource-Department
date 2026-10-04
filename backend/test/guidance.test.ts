import assert from 'node:assert';
import test from 'node:test';
import { analyzeStructure, itemChoiceReadiness, searchCatalogue } from '../src/workflow/guidance';
import { VALIDATED_RULES, sourceReplay } from '../src/workflow/engine';
import { BuildingStructure, CatalogueItemRecord, RoomFact } from '../src/workflow/types';

function structure(partial: Partial<BuildingStructure> = {}): BuildingStructure {
  return {
    id: 'house',
    caseId: 'c1',
    name: 'Main house',
    sortOrder: 1,
    participation: 'INCLUDED',
    structureTypeText: 'House',
    wallMaterialText: 'Siporex',
    wallThicknessM: 0.15,
    storeyHeightM: 1.97,
    constructionYear: 2023,
    usefulLifeYears: 10,
    usefulLifeSource: 'TYPED',
    floorFinish: 'Ceramic tile',
    roofFinish: 'Wood plank',
    externalFinish: '',
    internalFinish: '',
    updatedAt: '2026-10-04',
    ...partial,
  };
}

const rooms: RoomFact[] = [
  { id: 'r1', structureId: 'house', code: 'R1', lengthM: 3.6, breadthM: 5.9, rowIndex: null, bayIndex: null, enclosure: 'ENCLOSED' },
  { id: 'r2', structureId: 'house', code: 'R2', lengthM: 3.6, breadthM: 5.75, rowIndex: null, bayIndex: null, enclosure: 'ENCLOSED' },
];

test('complete rooms show a derived floor area and do not become an automatic line', () => {
  const guidance = analyzeStructure({ structure: structure(), rooms, walls: [], openings: [], members: [] });
  const floor = guidance.rules.find((rule) => rule.ruleId === 'draft.floor-finish.v1');
  assert.ok(floor);
  assert.strictEqual(floor.readiness, 'DRAFT_RULE');
  assert.ok((floor.derivedQuantity || 0) > 40);
  assert.strictEqual(VALIDATED_RULES.length, 0);
  assert.ok(guidance.derived.some((row) => row.label === 'Total floor area'));
});

test('masonry stays missing until a wall is confirmed, then stays a draft', () => {
  const missing = analyzeStructure({ structure: structure(), rooms, walls: [], openings: [], members: [] });
  const before = missing.rules.find((rule) => rule.ruleId === 'draft.wall-masonry.v1');
  assert.strictEqual(before?.readiness, 'MISSING_DATA');
  assert.strictEqual(before?.facts.find((fact) => fact.id === 'confirmed-walls')?.present, false);
  assert.strictEqual(before?.facts.find((fact) => fact.id === 'thickness')?.present, true);
  assert.strictEqual(before?.goTo, 'walls');

  const readyFacts = analyzeStructure({
    structure: structure(),
    rooms,
    walls: [{ id: 'w1', structureId: 'house', origin: 'ENGINEER_CONFIRMED', kind: 'EXTERNAL', label: 'Front', count: 1, lengthM: 12, breadthM: 0.15, depthM: null, sourceRoomIds: [] }],
    openings: [],
    members: [],
  });
  const after = readyFacts.rules.find((rule) => rule.ruleId === 'draft.wall-masonry.v1');
  assert.strictEqual(after?.readiness, 'DRAFT_RULE');
  assert.ok((after?.derivedQuantity || 0) > 0);
});

test('existing openings are reused and are not asked for again', () => {
  const guidance = analyzeStructure({
    structure: structure(),
    rooms,
    walls: [{ id: 'w1', structureId: 'house', origin: 'MANUAL', kind: 'EXTERNAL', label: 'Front', count: 1, lengthM: 12, breadthM: null, depthM: null, sourceRoomIds: [] }],
    openings: [{ id: 'd1', structureId: 'house', code: 'Doors', kind: 'DOOR', count: 8, widthM: 0.85, heightM: 1.75, hostWallRunId: null }],
    members: [],
  });
  const openingRule = guidance.rules.find((rule) => rule.ruleId === 'draft.opening-area.v1');
  assert.strictEqual(openingRule?.readiness, 'DRAFT_RULE');
  assert.ok((openingRule?.derivedQuantity || 0) > 0);
  const wall = guidance.rules.find((rule) => rule.ruleId === 'draft.wall-masonry.v1');
  assert.strictEqual(wall?.readiness, 'DRAFT_RULE');
  assert.ok((wall?.derivedQuantity || 0) > 0);
  assert.ok(wall?.facts.every((fact) => fact.present));
});

test('catalogue search returns descriptions and does not choose between duplicates', () => {
  const items: CatalogueItemRecord[] = [
    { id: 'a', scheduleVersionId: 's', itemNumber: '19.1', description: 'AAC Block Masonry', unit: 'cum', rate: 7152.1, sourceRow: '1', reference: '' },
    { id: 'b', scheduleVersionId: 's', itemNumber: '19.2', description: 'AAC Block Masonry in superstructure', unit: 'cum', rate: 7200, sourceRow: '2', reference: '' },
    { id: 'c', scheduleVersionId: 's', itemNumber: '121', description: 'TMT FE-500', unit: 'qtl', rate: 7514.2, sourceRow: '3', reference: '' },
    { id: 'd', scheduleVersionId: 's', itemNumber: '121', description: 'TMT FE-500 duplicate row', unit: 'qtl', rate: 7600, sourceRow: '4', reference: '' },
  ];
  const aac = searchCatalogue(items, 'AAC');
  assert.deepStrictEqual(aac.results.map((item) => item.id), ['a', 'b']);
  assert.deepStrictEqual(aac.ambiguousItemNumbers, []);
  const steel = searchCatalogue(items, 'TMT');
  assert.deepStrictEqual(steel.ambiguousItemNumbers, ['121']);
  assert.strictEqual(itemChoiceReadiness({ pinned: true, item: items[2], sameNumberCount: 2 }).readiness, 'AMBIGUOUS');
  assert.strictEqual(itemChoiceReadiness({ pinned: true, item: items[0], sameNumberCount: 1 }).readiness, 'MANUAL');
});

test('a draft rule is never ready for automatic use', () => {
  const guidance = analyzeStructure({
    structure: structure(),
    rooms,
    walls: [],
    openings: [{ id: 'd1', structureId: 'house', code: 'D1', kind: 'DOOR', count: 8, widthM: 0.85, heightM: 1.75, hostWallRunId: null }],
    members: [{ id: 'c1', structureId: 'house', kind: 'COLUMN', roomId: null, count: 19, lengthM: 0.15, breadthM: 0.15, depthM: 1.97 }],
  });
  assert.ok(guidance.rules.every((rule) => rule.readiness !== 'READY'));
  assert.strictEqual(guidance.rules.find((rule) => rule.ruleId === 'draft.opening-area.v1')?.readiness, 'DRAFT_RULE');
  assert.strictEqual(guidance.rules.find((rule) => rule.ruleId === 'draft.rcc-columns.v1')?.readiness, 'DRAFT_RULE');
});

test('a shed does not inherit the house facts', () => {
  const shed = analyzeStructure({
    structure: structure({ id: 'shed', name: 'Tin shed', wallMaterialText: '', wallThicknessM: null, storeyHeightM: null }),
    rooms: rooms,
    walls: [],
    openings: [],
    members: [],
  });
  assert.strictEqual(shed.rules.find((rule) => rule.ruleId === 'draft.floor-finish.v1')?.readiness, 'NOT_APPLICABLE');
  assert.strictEqual(shed.derived.length, 0);
});

test('gut 193 source replay is unchanged', () => {
  const replay = sourceReplay();
  assert.strictEqual(replay.presentCost, 1073836);
  assert.strictEqual(replay.depreciatedValue, 823876);
});
