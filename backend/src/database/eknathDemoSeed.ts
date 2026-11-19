import type { PropertyDetails, ValuationCase } from '../models/types';
import { matchCatalogue } from '../workflow/engine';
import { generateRectangularGrid, EKNATH_GUT193_WORKBOOK_SPANS } from '../workflow/gridGeometry';
import { generateMeasurementForStructure } from '../workflow/measurementGenerate';
import type {
  BuildingStructure,
  CatalogueItemRecord,
  DepreciationDecision,
  MeasurementBlockFact,
  MemberFact,
  OpeningFact,
  RoomFact,
  WallRunFact,
} from '../workflow/types';
import { GUT193_RATE_SCHEDULE_ID, GUT193_YP_TABLE_ID } from './workflowSeedCatalog';

/** Stable demo case — always present after boot so officers can open a clean Eknath walkthrough. */
export const EKNATH_DEMO_CASE_ID = 'case-eknath-gut193-demo';
export const EKNATH_DEMO_CASE_NUMBER = 'CASE-193-EKNATH-DEMO';
export const EKNATH_DEMO_STRUCTURE_ID = 'bldg-eknath-main';

/** Valuation 2026 + construction 2023 → age 3, future life 7 (YP 5.389 / total life YP 7.024). */
const VALUATION_DATE = '2026-01-01';

const RULE_ITEM: Record<string, string> = {
  'eknath.excavation.v1': '1',
  'eknath.soling.v1': '4',
  'eknath.rcc-beam.v1': '21',
  'eknath.tmt-steel.v1': '121',
  'eknath.aac-masonry.v1': '19.1',
  'eknath.rcc-column.v1': '6',
  'eknath.jungle-wood.v1': '68',
  'eknath.ceramic-floor.v1': '112',
  'eknath.ceiling.v1': '98',
  'eknath.external-plaster.v1': '30',
  'eknath.internal-plaster.v1': '29',
  'eknath.wood-frames.v1': '97',
};

export interface EknathDemoCollections {
  cases: ValuationCase[];
  properties: PropertyDetails[];
  buildingStructures: BuildingStructure[];
  rooms: RoomFact[];
  wallRuns: WallRunFact[];
  openings: OpeningFact[];
  members: MemberFact[];
  measurementBlocks: MeasurementBlockFact[];
  catalogueItems: CatalogueItemRecord[];
  depreciationDecisions: DepreciationDecision[];
}

/**
 * Ensures a fully prefilled Gut-193 / Eknath demo case exists across Screens 1–5.
 * Rebuilds on every boot so the walkthrough stays correct even if Postgres was wiped.
 */
export function ensureEknathDemoCase(db: EknathDemoCollections): void {
  const staleIds = new Set(
    db.cases
      .filter((c) => c.id === EKNATH_DEMO_CASE_ID || c.caseNumber === EKNATH_DEMO_CASE_NUMBER)
      .map((c) => c.id)
  );
  const structureIds = new Set(
    db.buildingStructures.filter((s) => staleIds.has(s.caseId)).map((s) => s.id)
  );
  const keep = <T>(rows: T[], pred: (row: T) => boolean) => {
    for (let i = rows.length - 1; i >= 0; i -= 1) {
      if (!pred(rows[i])) rows.splice(i, 1);
    }
  };
  if (staleIds.size) {
    keep(db.cases, (c) => !staleIds.has(c.id));
    keep(db.properties, (p) => !staleIds.has(p.caseId));
    keep(db.buildingStructures, (s) => !staleIds.has(s.caseId));
    keep(db.rooms, (r) => !structureIds.has(r.structureId));
    keep(db.wallRuns, (w) => !structureIds.has(w.structureId));
    keep(db.openings, (o) => !structureIds.has(o.structureId));
    keep(db.members, (m) => !structureIds.has(m.structureId));
    keep(db.measurementBlocks, (b) => !staleIds.has(b.caseId));
    keep(db.depreciationDecisions, (d) => !staleIds.has(d.caseId));
  }

  const now = new Date().toISOString();
  const caseRow: ValuationCase = {
    id: EKNATH_DEMO_CASE_ID,
    caseNumber: EKNATH_DEMO_CASE_NUMBER,
    projectId: 'proj-jigaon-01',
    workflow: 'BUILDING',
    rateScheduleVersionId: GUT193_RATE_SCHEDULE_ID,
    ypTableVersionId: GUT193_YP_TABLE_ID,
    conflictingIdentifierNotes:
      'Demo walkthrough of Gut 193 (Eknath Pandurang Tharkar). Prefills match the workbook spans, openings, members, and YP 7/10.',
    status: 'ESTIMATE_IN_PROGRESS',
    dateOfInspection: VALUATION_DATE,
    valuationDate: VALUATION_DATE,
    preparedBy: 'Executive Engineer (Admin)',
    checkedBy: '',
    approvedBy: '',
    createdBy: 'usr-admin-01',
    createdAt: now,
    updatedAt: now,
  };

  const property: PropertyDetails = {
    id: 'prop-eknath-demo',
    caseId: EKNATH_DEMO_CASE_ID,
    ownerName: 'Eknath Pandurang Tharkar',
    contactNumber: '',
    address: '',
    village: 'Bondgaon',
    taluka: 'Shegaon',
    district: 'Buldhana',
    laCaseNumber: '01/2022-23',
    houseNumber: '',
    surveyNumber: '193',
    submergenceType: '',
    additionalNotes: 'Prefill demo — open Screens 1–6 without retyping workbook facts.',
    updatedAt: now,
  };

  const structure: BuildingStructure = {
    id: EKNATH_DEMO_STRUCTURE_ID,
    caseId: EKNATH_DEMO_CASE_ID,
    name: 'Main house',
    sortOrder: 1,
    participation: 'INCLUDED',
    structureKind: 'MAIN_HOUSE',
    structureTypeText: 'Block masonary+ wooden plank',
    wallMaterialText: 'Siporex / AAC block',
    wallThicknessM: EKNATH_GUT193_WORKBOOK_SPANS.wallThicknessM,
    storeyHeightM: EKNATH_GUT193_WORKBOOK_SPANS.storeyHeightM,
    constructionYear: 2023,
    usefulLifeYears: 10,
    usefulLifeSource: 'TYPED',
    floorFinish: 'Ceramic tile',
    roofFinish: 'Non-teak wood plank ceiling',
    externalFinish: 'Sand-faced plaster',
    internalFinish: 'Cement plaster 6 mm',
    shape: 'RECTANGLE',
    dimensionConvention: 'CLEAR_INTERNAL',
    overallLengthM: 14.5,
    overallBreadthM: 11.65,
    gridColumns: EKNATH_GUT193_WORKBOOK_SPANS.gridColumns,
    gridRows: EKNATH_GUT193_WORKBOOK_SPANS.gridRows,
    spanMode: 'UNEQUAL',
    columnSpansM: [...EKNATH_GUT193_WORKBOOK_SPANS.columnSpansM],
    rowSpansM: [...EKNATH_GUT193_WORKBOOK_SPANS.rowSpansM],
    geometryStatus: 'CONFIRMED',
    geometryConfirmedAt: now,
    openSides: { front: false, rear: false, left: false, right: false },
    attachedToStructureId: null,
    attachedSide: null,
    foundationWidthM: 0.25,
    groundBeamDepthM: 0.3,
    solingDepthM: 0.1,
    evidenceConflictNotes: '',
    planNotes: 'Gut 193 workbook unequal 4×2 clear spans.',
    updatedAt: now,
  };

  const grid = generateRectangularGrid({
    structureId: EKNATH_DEMO_STRUCTURE_ID,
    overallLengthM: structure.overallLengthM!,
    overallBreadthM: structure.overallBreadthM!,
    gridColumns: structure.gridColumns!,
    gridRows: structure.gridRows!,
    spanMode: 'UNEQUAL',
    columnSpansM: structure.columnSpansM!,
    rowSpansM: structure.rowSpansM!,
    wallThicknessM: structure.wallThicknessM!,
  });
  if ('error' in grid) {
    console.warn('Eknath demo grid failed:', grid.error);
    return;
  }

  const rooms: RoomFact[] = grid.rooms.map((room) => ({
    id: room.id,
    structureId: EKNATH_DEMO_STRUCTURE_ID,
    code: room.code,
    lengthM: room.lengthM,
    breadthM: room.breadthM,
    rowIndex: room.rowIndex,
    bayIndex: room.bayIndex,
    enclosure: 'ENCLOSED',
    generated: true,
    boundaryWallIds: room.boundaryWallIds,
  }));

  const wallRuns: WallRunFact[] = grid.walls.map((wall) => ({
    id: wall.id,
    structureId: EKNATH_DEMO_STRUCTURE_ID,
    origin: 'ENGINEER_CONFIRMED',
    kind: wall.kind,
    segmentKind: wall.segmentKind,
    label: wall.label,
    count: 1,
    lengthM: wall.lengthM,
    breadthM: null,
    depthM: null,
    thicknessM: structure.wallThicknessM,
    heightM: structure.storeyHeightM,
    thicknessSource: 'INHERITED',
    heightSource: 'INHERITED',
    sourceRoomIds: wall.sourceRoomIds || [],
    confirmedBy: 'demo-seed',
    confirmedAt: now,
    generated: true,
    axis: wall.axis,
    role: wall.role,
  }));

  const openings: OpeningFact[] = [
    ...Array.from({ length: 8 }, (_, i) => ({
      id: `open-eknath-d${i + 1}`,
      structureId: EKNATH_DEMO_STRUCTURE_ID,
      code: `D${i + 1}`,
      kind: 'DOOR' as const,
      count: 1,
      widthM: 0.85,
      heightM: 1.75,
      hostWallRunId: null,
      roomId: null,
    })),
    ...Array.from({ length: 8 }, (_, i) => ({
      id: `open-eknath-w${i + 1}`,
      structureId: EKNATH_DEMO_STRUCTURE_ID,
      code: `W${i + 1}`,
      kind: 'WINDOW' as const,
      count: 1,
      widthM: 0.6,
      heightM: 0.8,
      hostWallRunId: null,
      roomId: null,
    })),
  ];

  const members: MemberFact[] = [
    {
      id: 'mem-eknath-cols',
      structureId: EKNATH_DEMO_STRUCTURE_ID,
      kind: 'COLUMN',
      roomId: null,
      count: 19,
      lengthM: 0.15,
      breadthM: 0.15,
      depthM: 1.97,
    },
  ];

  const catalogue = db.catalogueItems.filter((item) => item.scheduleVersionId === GUT193_RATE_SCHEDULE_ID);
  const generated = generateMeasurementForStructure({
    structure,
    rooms,
    walls: wallRuns,
    openings,
    members,
    catalogue,
    existingBlocks: [],
    includeGeneric: false,
  });

  const blocks = generated.nextBlocks.map((block) => {
    const itemNumber = RULE_ITEM[block.ruleId];
    const matched = itemNumber ? matchCatalogue(catalogue, itemNumber) : null;
    const rateItemId = matched?.status === 'UNIQUE' ? matched.matches[0].id : undefined;
    return {
      ...block,
      caseId: EKNATH_DEMO_CASE_ID,
      status: 'ACCEPTED' as const,
      engineerNet: block.derivedNet,
      rateItemId,
      rateMatch: rateItemId ? ('UNIQUE' as const) : ('UNMAPPED' as const),
      decidedBy: 'demo-seed',
      decidedAt: now,
    };
  });

  db.cases.push(caseRow);
  db.properties.push(property);
  db.buildingStructures.push(structure);
  db.rooms.push(...rooms);
  db.wallRuns.push(...wallRuns);
  db.openings.push(...openings);
  db.members.push(...members);
  db.measurementBlocks.push(...blocks);
  db.depreciationDecisions.push({
    caseId: EKNATH_DEMO_CASE_ID,
    status: 'ACCEPTED',
    decidedBy: 'demo-seed',
    decidedAt: now,
    reason: 'Demo seed — construction 2023 / useful life 10 → future life 7 (YP 5.389 / 7.024).',
  });

  console.log(
    `📘 Eknath demo case ready: ${EKNATH_DEMO_CASE_NUMBER} (${blocks.length} accepted MS lines; Screen 5 YP future life 7)`
  );
}
