import assert from 'node:assert';
import test from 'node:test';
import { db } from '../src/database/db';
import {
  DRAFT_RULES,
  VALIDATED_RULES,
  applicabilityFor,
  applyDecision,
  buildDraftBlock,
  depreciateStructures,
  emptyStructureBlockers,
  markBlocksForReview,
  matchCatalogue,
  proposeWallRuns,
  sourceReplay,
} from '../src/workflow/engine';
import { BuildingStructure, MeasurementBlockFact, RoomFact } from '../src/workflow/types';

function structure(partial: Partial<BuildingStructure> = {}): BuildingStructure {
  return {
    id: 's1',
    caseId: 'c1',
    name: 'Main house',
    sortOrder: 1,
    participation: 'INCLUDED',
    structureTypeText: 'House',
    wallMaterialText: 'Siporex',
    wallThicknessM: 0.15,
    storeyHeightM: 3,
    constructionYear: 2020,
    usefulLifeYears: 20,
    usefulLifeSource: 'TYPED',
    floorFinish: '',
    roofFinish: '',
    externalFinish: '',
    internalFinish: '',
    updatedAt: '2026-10-04',
    ...partial,
  };
}

test('source replay reproduces the workbook totals and is not a validated rule', () => {
  const replay = sourceReplay();
  assert.strictEqual(replay.label, 'SOURCE_REPLAY');
  assert.strictEqual(replay.presentCost, 1073836);
  assert.strictEqual(replay.depreciatedValue, 823876);
  assert.strictEqual(replay.lines.length, 12);
  assert.strictEqual(replay.lines[4].itemNumber, '19.1');
  for (const line of replay.lines) {
    assert.strictEqual(line.amount, line.storedAmount);
  }
  assert.strictEqual(VALIDATED_RULES.length, 0);
  assert.ok(DRAFT_RULES.every((rule) => rule.id.startsWith('draft.')));
});

test('legacy case 165 remains readable and is not a building workflow', () => {
  db.init();
  const legacy = db.cases.find((item) => item.id === 'case-jigaon-165');
  assert.ok(legacy);
  assert.notStrictEqual(legacy?.workflow, 'BUILDING');
  const finalValuation = db.finalValuations.find((item) => item.caseId === 'case-jigaon-165');
  assert.ok(finalValuation);
  assert.ok((finalValuation?.finalValuationAmount || 0) > 200000);
});

test('candidate walls are not invented without placement and are not quantities', () => {
  const rooms: RoomFact[] = [
    { id: 'r1', structureId: 's1', code: 'R1', lengthM: 3, breadthM: 4, rowIndex: null, bayIndex: null, enclosure: 'ENCLOSED' },
  ];
  const unplaced = proposeWallRuns('s1', rooms, 0.15, (prefix) => prefix);
  assert.strictEqual(unplaced.runs.length, 0);

  const placed = proposeWallRuns('s1', [
    { ...rooms[0], rowIndex: 0, bayIndex: 0 },
    { id: 'r2', structureId: 's1', code: 'R2', lengthM: 3, breadthM: 4, rowIndex: 0, bayIndex: 1, enclosure: 'ENCLOSED' },
  ], 0.15, (() => {
    let n = 0;
    return () => `w${n++}`;
  })());
  assert.ok(placed.runs.length > 0);
  assert.ok(placed.runs.every((run) => run.origin === 'CANDIDATE'));

  const draft = buildDraftBlock({
    ruleId: 'draft.confirmed-wall-volume.v1',
    structure: structure(),
    rooms: [],
    walls: placed.runs,
    openings: [],
    members: [],
    blockId: 'b1',
    caseId: 'c1',
  });
  assert.ok('error' in draft);
});

test('ambiguous item numbers select nothing and item 19.1 stays text', () => {
  const items = [
    { id: 'a', scheduleVersionId: 'v', itemNumber: '19.1', description: 'AAC', unit: 'cum', rate: 1, sourceRow: '1', reference: '' },
    { id: 'b', scheduleVersionId: 'v', itemNumber: '121', description: 'TMT', unit: 'qtl', rate: 2, sourceRow: '2', reference: '' },
    { id: 'c', scheduleVersionId: 'v', itemNumber: '121', description: 'TMT other', unit: 'qtl', rate: 3, sourceRow: '3', reference: '' },
  ];
  assert.strictEqual(matchCatalogue(items, '19.1').status, 'UNIQUE');
  assert.strictEqual(matchCatalogue(items, '121').status, 'AMBIGUOUS');
  assert.strictEqual(matchCatalogue(items, '121').matches.length, 2);
  assert.strictEqual(matchCatalogue(items, '999').status, 'NONE');
});

test('missing Year’s Purchase factor blocks and does not invent a life', () => {
  const table = { id: 't', name: 't', citation: '', legacy: false, rows: [{ year: 7, factor: 5.389 }, { year: 93, factor: null }] };
  const blocked = depreciateStructures({
    valuationDate: '2026-01-01',
    table,
    structures: [{ structureId: 's', name: 'Shed', constructionYear: 2020, usefulLifeYears: 93, presentCost: 1000 }],
  });
  assert.strictEqual(blocked.blocked, true);
  assert.strictEqual(blocked.depreciatedValue, null);

  const noLife = depreciateStructures({
    valuationDate: '2026-01-01',
    table,
    structures: [{ structureId: 's', name: 'House', constructionYear: 2019, usefulLifeYears: null, presentCost: 1000 }],
  });
  assert.match(noLife.reasons.join(' '), /not assumed/);
});

test('an override survives an upstream change as requires review', () => {
  const block: MeasurementBlockFact = {
    id: 'b',
    structureId: 's1',
    caseId: 'c1',
    title: 'Wall',
    unit: 'cum',
    ruleId: 'draft.confirmed-wall-volume.v1',
    ruleStatus: 'DRAFT',
    status: 'REQUIRES_CONFIRMATION',
    formulaText: 'count × length × thickness × height',
    sourceFactIds: [],
    evidenceIds: [],
    derivedNet: 1.5,
    engineerNet: null,
    rateMatch: 'UNMAPPED',
    lines: [],
  };
  const overridden = applyDecision(block, 'OVERRIDE', { id: 'u', name: 'Engineer' }, 'Site check', 1.8);
  assert.ok(!('error' in overridden));
  if ('error' in overridden) return;
  assert.strictEqual(overridden.block.engineerNet, 1.8);
  assert.strictEqual(overridden.block.derivedNet, 1.5);
  const reviewed = markBlocksForReview([overridden.block], 's1')[0];
  assert.strictEqual(reviewed.status, 'REQUIRES_REVIEW');
  assert.strictEqual(reviewed.engineerNet, 1.8);
});

test('an empty shed is not given the house quantities', () => {
  const reasons = emptyStructureBlockers(
    [structure({ id: 'house', name: 'House' }), structure({ id: 'shed', name: 'Tin shed', wallMaterialText: '', structureTypeText: '' })],
    [{
      id: 'b',
      structureId: 'house',
      caseId: 'c',
      title: 'Floor',
      unit: 'sqm',
      ruleId: 'manual',
      ruleStatus: 'DRAFT',
      status: 'ACCEPTED',
      formulaText: '',
      sourceFactIds: [],
      evidenceIds: [],
      derivedNet: 10,
      engineerNet: 10,
      rateMatch: 'UNIQUE',
      lines: [],
    }]
  );
  assert.match(reasons.join(' '), /Tin shed/);
});

test('applicability does not mark draft rules as automatic', () => {
  const rows = applicabilityFor({
    structure: structure(),
    rooms: [],
    confirmedWalls: [],
    openings: [],
  });
  assert.ok(rows.every((row) => row.state !== 'AUTO' && row.state !== 'APPLICABLE'));
});
