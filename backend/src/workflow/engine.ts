import { createHash } from 'crypto';
import Decimal from 'decimal.js';
import {
  ApplicabilityRow,
  BuildingStructure,
  CatalogueItemRecord,
  MeasurementBlockFact,
  MeasurementLineFact,
  OpeningFact,
  RoomFact,
  WallRunFact,
  YpTableVersionRecord,
} from './types';

Decimal.set({ precision: 30, rounding: Decimal.ROUND_HALF_UP });

export function roundHalfUp(value: Decimal.Value, places: number): Decimal {
  return new Decimal(value).toDecimalPlaces(places, Decimal.ROUND_HALF_UP);
}

export function product(count: number, length: number, breadth: number, depth: number): Decimal {
  return new Decimal(count).mul(length).mul(breadth).mul(depth);
}

/** No validated production rules are registered. Draft suggestions stay draft. */
export const VALIDATED_RULES: { id: string }[] = [];

export const DRAFT_RULES: { id: string; title: string; needs: string }[] = [
  {
    id: 'draft.room-floor.v1',
    title: 'Floor area from each room length × breadth',
    needs: 'Room length and breadth',
  },
  {
    id: 'draft.confirmed-wall-volume.v1',
    title: 'Volume of confirmed wall runs × thickness × height, minus opening volumes',
    needs: 'Confirmed wall runs, wall thickness, storey height',
  },
  {
    id: 'draft.opening-area.v1',
    title: 'Opening area from width × height × count',
    needs: 'Opening count, width, and height',
  },
  {
    id: 'draft.member-volume.v1',
    title: 'Member volume from count × length × breadth × depth',
    needs: 'Member count and three sizes. A count of zero is kept. A missing count is not treated as zero.',
  },
];

export function proposeWallRuns(
  structureId: string,
  rooms: RoomFact[],
  thicknessM: number | null,
  idFor: (prefix: string) => string
): { runs: WallRunFact[]; note: string } {
  const placed = rooms.filter((r) => r.rowIndex !== null && r.bayIndex !== null && r.lengthM && r.breadthM);
  if (placed.length === 0) {
    return {
      runs: [],
      note: 'Rooms have no placement. The list stays a list. No wall layout was invented.',
    };
  }

  const runs: WallRunFact[] = [];
  const key = (row: number, bay: number) => `${row}:${bay}`;
  const byCell = new Map(placed.map((r) => [key(r.rowIndex as number, r.bayIndex as number), r]));

  for (const room of placed) {
    const row = room.rowIndex as number;
    const bay = room.bayIndex as number;
    const right = byCell.get(key(row, bay + 1));
    const above = byCell.get(key(row + 1, bay));
    if (right) {
      runs.push(sharedRun(structureId, idFor, room, right, Math.min(room.breadthM as number, right.breadthM as number), thicknessM, 'shared wall between bays'));
    } else {
      runs.push(externalRun(structureId, idFor, room, room.breadthM as number, thicknessM, 'external side'));
    }
    if (!byCell.get(key(row, bay - 1))) {
      runs.push(externalRun(structureId, idFor, room, room.breadthM as number, thicknessM, 'external side'));
    }
    if (above) {
      runs.push(sharedRun(structureId, idFor, room, above, Math.min(room.lengthM as number, above.lengthM as number), thicknessM, 'shared wall between rows'));
    } else {
      runs.push(externalRun(structureId, idFor, room, room.lengthM as number, thicknessM, 'external end'));
    }
    if (!byCell.get(key(row - 1, bay))) {
      runs.push(externalRun(structureId, idFor, room, room.lengthM as number, thicknessM, 'external end'));
    }
  }

  return {
    runs,
    note: 'These wall runs are candidates. They are not quantities until an engineer confirms them.',
  };
}

function sharedRun(
  structureId: string,
  idFor: (prefix: string) => string,
  a: RoomFact,
  b: RoomFact,
  lengthM: number,
  thicknessM: number | null,
  label: string
): WallRunFact {
  return {
    id: idFor('wall'),
    structureId,
    origin: 'CANDIDATE',
    kind: 'SHARED',
    label: `${label}: ${a.code}–${b.code}`,
    count: 1,
    lengthM,
    breadthM: thicknessM,
    depthM: null,
    sourceRoomIds: [a.id, b.id],
  };
}

function externalRun(
  structureId: string,
  idFor: (prefix: string) => string,
  room: RoomFact,
  lengthM: number,
  thicknessM: number | null,
  label: string
): WallRunFact {
  return {
    id: idFor('wall'),
    structureId,
    origin: 'CANDIDATE',
    kind: 'EXTERNAL',
    label: `${label}: ${room.code}`,
    count: 1,
    lengthM,
    breadthM: thicknessM,
    depthM: null,
    sourceRoomIds: [room.id],
  };
}

export function applicabilityFor(input: {
  structure: BuildingStructure;
  rooms: RoomFact[];
  confirmedWalls: WallRunFact[];
  openings: OpeningFact[];
}): ApplicabilityRow[] {
  const rows: ApplicabilityRow[] = DRAFT_RULES.map((rule) => ({
    ruleId: rule.id,
    ruleStatus: 'DRAFT' as const,
    title: rule.title,
    state: 'REQUIRES_CONFIRMATION' as const,
    reason: `Draft suggestion only. ${rule.needs}. Not a validated government rule.`,
  }));

  if (!input.structure.wallMaterialText.trim()) {
    rows.push({
      ruleId: 'fact.wall-material',
      ruleStatus: 'DRAFT',
      title: 'Wall material',
      state: 'REQUIRES_CONFIRMATION',
      reason: 'Wall material is blank. No masonry item was selected.',
    });
  }
  if (input.confirmedWalls.length === 0) {
    const wallRow = rows.find((r) => r.ruleId === 'draft.confirmed-wall-volume.v1');
    if (wallRow) {
      wallRow.reason = 'No confirmed wall runs. Candidate geometry is not a quantity.';
    }
  }
  if (input.rooms.length === 0) {
    const floor = rows.find((r) => r.ruleId === 'draft.room-floor.v1');
    if (floor) floor.state = 'NOT_APPLICABLE';
    if (floor) floor.reason = 'This structure has no rooms. Nothing was copied from another structure.';
  }
  if (input.openings.length === 0) {
    const opening = rows.find((r) => r.ruleId === 'draft.opening-area.v1');
    if (opening) opening.reason = 'No openings entered. None were assumed.';
  }
  return rows;
}

export function buildDraftBlock(input: {
  ruleId: string;
  structure: BuildingStructure;
  rooms: RoomFact[];
  walls: WallRunFact[];
  openings: OpeningFact[];
  members: { id: string; count: number | null; lengthM: number | null; breadthM: number | null; depthM: number | null; kind: string }[];
  blockId: string;
  caseId: string;
}): { block: MeasurementBlockFact } | { error: string } {
  if (VALIDATED_RULES.length !== 0) {
    return { error: 'Validated rule registry is expected to be empty in this release.' };
  }
  if (!DRAFT_RULES.some((r) => r.id === input.ruleId)) {
    return { error: 'Unknown suggestion. Quantities are not invented for an unnamed rule.' };
  }

  if (input.ruleId === 'draft.room-floor.v1') {
    const lines: MeasurementLineFact[] = [];
    for (const room of input.rooms) {
      if (room.lengthM === null || room.breadthM === null) {
        return { error: `Room ${room.code} is missing a length or a breadth.` };
      }
      const qty = roundHalfUp(new Decimal(room.lengthM).mul(room.breadthM), 4).toNumber();
      lines.push({
        id: `${input.blockId}-${room.id}`,
        blockId: input.blockId,
        label: `${room.code}${room.enclosure === 'OPEN' ? ' (marked open — confirm)' : ''}`,
        count: 1,
        lengthM: room.lengthM,
        breadthM: room.breadthM,
        depthOrHeightM: 1,
        formulaText: 'length × breadth',
        sourceFactIds: [room.id],
        sign: 1,
        quantity: qty,
      });
    }
    if (lines.length === 0) return { error: 'No rooms to measure.' };
    return { block: sumBlock(input, 'Floor area', 'sqm', lines) };
  }

  if (input.ruleId === 'draft.confirmed-wall-volume.v1') {
    const confirmed = input.walls.filter((w) => w.origin === 'ENGINEER_CONFIRMED' || w.origin === 'MANUAL');
    if (confirmed.length === 0) return { error: 'Confirm a wall run before measuring wall volume. Candidates are not used.' };
    if (input.structure.wallThicknessM === null || input.structure.storeyHeightM === null) {
      return { error: 'Wall thickness and storey height are required. No default was applied.' };
    }
    const lines: MeasurementLineFact[] = [];
    for (const wall of confirmed) {
      const qty = product(wall.count, wall.lengthM, input.structure.wallThicknessM, input.structure.storeyHeightM);
      lines.push({
        id: `${input.blockId}-${wall.id}`,
        blockId: input.blockId,
        label: wall.label,
        count: wall.count,
        lengthM: wall.lengthM,
        breadthM: input.structure.wallThicknessM,
        depthOrHeightM: input.structure.storeyHeightM,
        formulaText: 'count × length × thickness × height',
        sourceFactIds: [wall.id],
        sign: 1,
        quantity: roundHalfUp(qty, 6).toNumber(),
      });
    }
    for (const opening of input.openings) {
      if (opening.count === null || opening.widthM === null || opening.heightM === null) {
        return { error: `Opening ${opening.code} is missing a count, width, or height.` };
      }
      const qty = product(opening.count, opening.widthM, opening.heightM, input.structure.wallThicknessM);
      lines.push({
        id: `${input.blockId}-ded-${opening.id}`,
        blockId: input.blockId,
        label: `Deduction ${opening.code}`,
        count: opening.count,
        lengthM: opening.widthM,
        breadthM: opening.heightM,
        depthOrHeightM: input.structure.wallThicknessM,
        formulaText: 'count × width × height × thickness',
        sourceFactIds: [opening.id],
        sign: -1,
        quantity: roundHalfUp(qty, 6).toNumber(),
      });
    }
    return { block: sumBlock(input, 'Confirmed wall volume', 'cum', lines) };
  }

  if (input.ruleId === 'draft.opening-area.v1') {
    const lines: MeasurementLineFact[] = [];
    for (const opening of input.openings) {
      if (opening.count === null || opening.widthM === null || opening.heightM === null) {
        return { error: `Opening ${opening.code} is missing a count, width, or height.` };
      }
      const qty = roundHalfUp(new Decimal(opening.count).mul(opening.widthM).mul(opening.heightM), 4).toNumber();
      lines.push({
        id: `${input.blockId}-${opening.id}`,
        blockId: input.blockId,
        label: opening.code,
        count: opening.count,
        lengthM: opening.widthM,
        breadthM: opening.heightM,
        depthOrHeightM: 1,
        formulaText: 'count × width × height',
        sourceFactIds: [opening.id],
        sign: 1,
        quantity: qty,
      });
    }
    if (lines.length === 0) return { error: 'No openings to measure.' };
    return { block: sumBlock(input, 'Opening area', 'sqm', lines) };
  }

  const lines: MeasurementLineFact[] = [];
  for (const member of input.members) {
    if (member.count === null || member.lengthM === null || member.breadthM === null || member.depthM === null) {
      return { error: `${member.kind} is missing a count or a size. A blank count was not treated as zero.` };
    }
    const qty = product(member.count, member.lengthM, member.breadthM, member.depthM);
    lines.push({
      id: `${input.blockId}-${member.id}`,
      blockId: input.blockId,
      label: member.kind,
      count: member.count,
      lengthM: member.lengthM,
      breadthM: member.breadthM,
      depthOrHeightM: member.depthM,
      formulaText: 'count × length × breadth × depth',
      sourceFactIds: [member.id],
      sign: 1,
      quantity: roundHalfUp(qty, 6).toNumber(),
    });
  }
  if (lines.length === 0) return { error: 'No members to measure.' };
  return { block: sumBlock(input, 'Member volume', 'cum', lines) };
}

function sumBlock(
  input: { ruleId: string; blockId: string; caseId: string; structure: BuildingStructure },
  title: string,
  unit: string,
  lines: MeasurementLineFact[]
): MeasurementBlockFact {
  let net = new Decimal(0);
  for (const line of lines) {
    net = line.sign === -1 ? net.minus(line.quantity) : net.plus(line.quantity);
  }
  const derived = roundHalfUp(net, 4).toNumber();
  return {
    id: input.blockId,
    structureId: input.structure.id,
    caseId: input.caseId,
    title,
    unit,
    ruleId: input.ruleId,
    ruleStatus: 'DRAFT',
    status: 'REQUIRES_CONFIRMATION',
    formulaText: lines.map((l) => `${l.sign === -1 ? '−' : '+'}${l.formulaText}`).join('; '),
    sourceFactIds: lines.flatMap((l) => l.sourceFactIds),
    evidenceIds: [],
    derivedNet: derived,
    engineerNet: null,
    rateMatch: 'UNMAPPED',
    lines,
  };
}

export function markBlocksForReview(blocks: MeasurementBlockFact[], structureId: string): MeasurementBlockFact[] {
  return blocks.map((block) => {
    if (block.structureId !== structureId) return block;
    if (block.status === 'ACCEPTED' || block.status === 'OVERRIDDEN' || block.status === 'MANUAL') {
      return { ...block, status: 'REQUIRES_REVIEW' };
    }
    return block;
  });
}

export function applyDecision(
  block: MeasurementBlockFact,
  action: 'ACCEPT' | 'OVERRIDE' | 'EXCLUDE' | 'RESET',
  actor: { id: string; name: string },
  reason?: string,
  overrideNet?: number
): { block: MeasurementBlockFact } | { error: string } {
  const now = new Date().toISOString();
  if (action === 'ACCEPT') {
    if (block.derivedNet === null) return { error: 'There is no derived quantity to accept.' };
    return {
      block: {
        ...block,
        status: 'ACCEPTED',
        engineerNet: block.derivedNet,
        decidedBy: actor.name,
        decidedAt: now,
      },
    };
  }
  if (action === 'OVERRIDE') {
    if (!reason || !reason.trim()) return { error: 'An override needs a reason.' };
    if (overrideNet === undefined || Number.isNaN(Number(overrideNet))) return { error: 'An override needs a quantity.' };
    return {
      block: {
        ...block,
        status: 'OVERRIDDEN',
        engineerNet: Number(overrideNet),
        overrideReason: reason.trim(),
        decidedBy: actor.name,
        decidedAt: now,
      },
    };
  }
  if (action === 'EXCLUDE') {
    if (!reason || !reason.trim()) return { error: 'Excluding a line needs a reason.' };
    return {
      block: {
        ...block,
        status: 'EXCLUDED',
        overrideReason: reason.trim(),
        decidedBy: actor.name,
        decidedAt: now,
      },
    };
  }
  return {
    block: {
      ...block,
      status: 'REQUIRES_CONFIRMATION',
      engineerNet: null,
      overrideReason: undefined,
      decidedBy: actor.name,
      decidedAt: now,
    },
  };
}

export function matchCatalogue(
  items: CatalogueItemRecord[],
  itemNumber: string
): { status: 'UNIQUE' | 'AMBIGUOUS' | 'NONE'; matches: CatalogueItemRecord[] } {
  const wanted = itemNumber.trim();
  const matches = items.filter((item) => item.itemNumber === wanted);
  if (matches.length === 1) return { status: 'UNIQUE', matches };
  if (matches.length > 1) return { status: 'AMBIGUOUS', matches };
  return { status: 'NONE', matches: [] };
}

export function lookupYp(table: YpTableVersionRecord, year: number): number | null {
  const row = table.rows.find((r) => r.year === year);
  if (!row || row.factor === null || row.factor === undefined) return null;
  return row.factor;
}

export interface StructureDepreciationInput {
  structureId: string;
  name: string;
  constructionYear: number | null;
  usefulLifeYears: number | null;
  presentCost: number;
}

export function depreciateStructures(input: {
  valuationDate: string;
  table: YpTableVersionRecord | null;
  structures: StructureDepreciationInput[];
}): {
  blocked: boolean;
  reasons: string[];
  presentCost: number;
  depreciatedValue: number | null;
  formula: string;
  parts: { structureId: string; presentLife: number; futureLife: number; ypFuture: number; ypTotal: number; depreciated: number }[];
} {
  const reasons: string[] = [];
  if (!input.valuationDate) reasons.push('Valuation date is missing.');
  const valuationYear = Number(String(input.valuationDate).slice(0, 4));
  if (!Number.isInteger(valuationYear)) reasons.push('Valuation date does not contain a year.');
  if (!input.table) reasons.push('No Year’s Purchase table is pinned. The legacy table was not selected automatically.');

  let presentCost = new Decimal(0);
  const parts: { structureId: string; presentLife: number; futureLife: number; ypFuture: number; ypTotal: number; depreciated: number }[] = [];

  for (const structure of input.structures) {
    presentCost = presentCost.plus(structure.presentCost);
    if (structure.constructionYear === null) {
      reasons.push(`${structure.name}: construction year is missing.`);
      continue;
    }
    if (structure.usefulLifeYears === null) {
      reasons.push(`${structure.name}: useful life was not entered. 10 years and 45 years were not assumed.`);
      continue;
    }
    if (!input.table || !Number.isInteger(valuationYear)) continue;
    const presentLife = valuationYear - structure.constructionYear;
    const futureLife = structure.usefulLifeYears - presentLife;
    if (presentLife < 0) reasons.push(`${structure.name}: valuation year is before the construction year.`);
    if (futureLife < 0) reasons.push(`${structure.name}: future life is negative.`);
    const ypFuture = lookupYp(input.table, futureLife);
    const ypTotal = lookupYp(input.table, structure.usefulLifeYears);
    if (ypFuture === null) reasons.push(`${structure.name}: Year’s Purchase factor for future life ${futureLife} is missing. Calculation is blocked.`);
    if (ypTotal === null) reasons.push(`${structure.name}: Year’s Purchase factor for useful life ${structure.usefulLifeYears} is missing. Calculation is blocked.`);
    if (ypFuture === null || ypTotal === null || presentLife < 0 || futureLife < 0) continue;
    const depreciated = roundHalfUp(new Decimal(structure.presentCost).mul(ypFuture).div(ypTotal), 0).toNumber();
    parts.push({ structureId: structure.structureId, presentLife, futureLife, ypFuture, ypTotal, depreciated });
  }

  const blocked = reasons.length > 0 || parts.length !== input.structures.length;
  const depreciatedValue = blocked
    ? null
    : parts.reduce((sum, part) => sum + part.depreciated, 0);
  return {
    blocked,
    reasons,
    presentCost: roundHalfUp(presentCost, 2).toNumber(),
    depreciatedValue,
    formula: 'ROUND(present cost × YP(future life) / YP(useful life), 0) per structure, using the pinned table only',
    parts,
  };
}

export function acceptedNet(block: MeasurementBlockFact): number | null {
  if (block.status === 'EXCLUDED') return null;
  if (block.status === 'ACCEPTED' || block.status === 'OVERRIDDEN' || block.status === 'MANUAL') {
    return block.engineerNet;
  }
  return null;
}

export function abstractAmount(quantity: number, rate: number): number {
  return roundHalfUp(new Decimal(quantity).mul(rate), 0).toNumber();
}

export function hashBody(body: unknown): string {
  return createHash('sha256').update(JSON.stringify(body)).digest('hex');
}

export interface ReplayLine {
  serial: number;
  itemNumber: string;
  description: string;
  quantity: string;
  rate: string;
  unit: string;
  storedAmount: number;
}

/** SOURCE-DERIVED from the gut-193 workbook. Not a production rule. */
export const REPLAY_LINES: ReplayLine[] = [
  { serial: 1, itemNumber: '1', description: 'Excavation', quantity: '10.33', rate: '202.85', unit: 'cum', storedAmount: 2095 },
  { serial: 2, itemNumber: '4', description: 'Soling', quantity: '2.58', rate: '2130.40', unit: 'cum', storedAmount: 5496 },
  { serial: 3, itemNumber: '21', description: 'RCC M-20 beams', quantity: '7.75', rate: '12639.70', unit: 'cum', storedAmount: 97958 },
  { serial: 4, itemNumber: '121', description: 'TMT FE-500', quantity: '4.29', rate: '7514.20', unit: 'qtl', storedAmount: 32236 },
  { serial: 5, itemNumber: '19.1', description: 'AAC block masonry', quantity: '28.37', rate: '7152.10', unit: 'cum', storedAmount: 202905 },
  { serial: 6, itemNumber: '6', description: 'RCC item 6 used under a column heading', quantity: '0.84', rate: '7578', unit: 'cum', storedAmount: 6366 },
  { serial: 7, itemNumber: '68', description: 'Jungle wood', quantity: '5.14', rate: '56662.35', unit: 'cum', storedAmount: 291244 },
  { serial: 8, itemNumber: '112', description: 'Ceramic tiles', quantity: '168.93', rate: '507.10', unit: 'sqm', storedAmount: 85664 },
  { serial: 9, itemNumber: '98', description: 'Wood plank ceiling', quantity: '184.53', rate: '1166', unit: 'sqm', storedAmount: 215162 },
  { serial: 10, itemNumber: '30', description: 'External plaster', quantity: '107.76', rate: '637.25', unit: 'sqm', storedAmount: 68670 },
  { serial: 11, itemNumber: '29', description: 'Internal plaster', quantity: '95.27', rate: '201.40', unit: 'sqm', storedAmount: 19187 },
  { serial: 12, itemNumber: '97', description: 'Jungle-wood frames', quantity: '15.74', rate: '2976.70', unit: 'sqm', storedAmount: 46853 },
];

export function sourceReplay(): {
  label: 'SOURCE_REPLAY';
  lines: (ReplayLine & { amount: number })[];
  presentCost: number;
  depreciatedValue: number;
  formula: string;
  conflicts: string[];
} {
  const lines = REPLAY_LINES.map((line) => ({
    ...line,
    amount: roundHalfUp(new Decimal(line.quantity).mul(line.rate), 0).toNumber(),
  }));
  const presentCost = lines.reduce((sum, line) => sum + line.amount, 0);
  const depreciatedValue = roundHalfUp(new Decimal(presentCost).mul('5.389').div('7.024'), 0).toNumber();
  return {
    label: 'SOURCE_REPLAY',
    lines,
    presentCost,
    depreciatedValue,
    formula: 'SOURCE_REPLAY ROUND(1073836 × 5.389 / 7.024, 0). Workbook literal year 2026 is not a production rule.',
    conflicts: [
      'LA number 01/2022-23 on the measurement sheet and 03/2021-22 on the cover are both stored. Neither was chosen.',
      'Bondgaon/Shegaon and Bhon/Sangrampur are both stored. Neither was chosen.',
      'Field booklet page 1 and page 3 disagree on R7/R8 width and room height. The replay follows the workbook cells, not a drawing parse.',
      'Ceiling deduction and internal-plaster room range are workbook defects preserved only inside this replay.',
    ],
  };
}

export function emptyStructureBlockers(structures: BuildingStructure[], blocks: MeasurementBlockFact[]): string[] {
  const reasons: string[] = [];
  for (const structure of structures) {
    if (structure.participation === 'EXCLUDED') {
      if (!structure.exclusionReason) reasons.push(`${structure.name} is excluded without a reason.`);
      continue;
    }
    const own = blocks.filter((b) => b.structureId === structure.id && b.status !== 'EXCLUDED');
    const ready = own.some((b) => acceptedNet(b) !== null);
    const hasFacts = Boolean(structure.wallMaterialText.trim() || structure.structureTypeText.trim());
    if (!hasFacts && !ready) {
      reasons.push(`${structure.name}: facts are missing (INPUT_REQUIRED). The house bill was not copied onto this structure.`);
    }
    if (own.some((b) => b.status === 'REQUIRES_REVIEW' || b.status === 'AMBIGUOUS' || b.status === 'REQUIRES_CONFIRMATION')) {
      reasons.push(`${structure.name}: a measurement line still needs review.`);
    }
    if (own.some((b) => (b.status === 'ACCEPTED' || b.status === 'OVERRIDDEN' || b.status === 'MANUAL') && b.rateMatch !== 'UNIQUE' && b.rateMatch !== 'MANUAL')) {
      reasons.push(`${structure.name}: an accepted line has no unique rate.`);
    }
  }
  return reasons;
}
