import Decimal from 'decimal.js';
import type { BuildingStructure, MemberFact, OpeningFact, RoomFact, WallRunFact } from './types';
import { roundHalfUp } from './engine';

/** Source-profile helpers for Gut 193 workbook-style outer adjustments. Not a universal PWD rule. */
export const EKNATH_SOURCE_PROFILE = 'EKNATH_GUT193_DRAFT';

export interface DerivedFactBundle {
  profileId: string | null;
  roomAreas: { roomId: string; code: string; areaM2: number; enclosure: string; lengthM: number; breadthM: number }[];
  floorAreaSumM2: number;
  confirmedWalls: WallRunFact[];
  /** Sum of confirmed/manual wall run lengths × count. Used for ordinary (non-Eknath) trench / plaster. */
  confirmedWallLengthM: number;
  effectiveThicknessM: number | null;
  effectiveHeightM: number | null;
  excavationDepthM: number | null;
  foundationWidthM: number | null;
  solingDepthM: number | null;
  groundBeamDepthM: number | null;
  /** Workbook-style outer long clear-to-centre adjusted length when profile applies. */
  foundationLongLengthM: number | null;
  foundationShortLengthAM: number | null;
  foundationShortLengthBM: number | null;
  masonryLongLengthM: number | null;
  overallOuterBreadthM: number | null;
  openingAreaM2: number;
  openingVolumeM3: number;
  columnVolumeM3: number;
  timberVolumeM3: number;
  steelFactorKgPerCum: number | null;
  notes: string[];
}

export function buildDerivedFacts(input: {
  structure: BuildingStructure;
  rooms: RoomFact[];
  walls: WallRunFact[];
  openings: OpeningFact[];
  members: MemberFact[];
}): DerivedFactBundle {
  const structure = input.structure;
  const notes: string[] = [];
  const thickness = structure.wallThicknessM;
  const height = structure.storeyHeightM;
  const foundationWidthM = structure.foundationWidthM;
  const solingDepthM = structure.solingDepthM;
  const groundBeamDepthM = structure.groundBeamDepthM;
  const excavationDepthM =
    groundBeamDepthM !== null && groundBeamDepthM !== undefined && solingDepthM !== null && solingDepthM !== undefined
      ? roundHalfUp(new Decimal(groundBeamDepthM).plus(solingDepthM), 4).toNumber()
      : null;

  const roomAreas = input.rooms
    .filter((room) => room.lengthM !== null && room.breadthM !== null)
    .map((room) => ({
      roomId: room.id,
      code: room.code,
      areaM2: roundHalfUp(new Decimal(room.lengthM!).mul(room.breadthM!), 4).toNumber(),
      enclosure: room.enclosure,
      lengthM: room.lengthM!,
      breadthM: room.breadthM!,
    }));
  const floorAreaSumM2 = roundHalfUp(
    roomAreas.reduce((sum, room) => sum.plus(room.areaM2), new Decimal(0)),
    4
  ).toNumber();

  const confirmedWalls = input.walls.filter((wall) => wall.origin === 'ENGINEER_CONFIRMED' || wall.origin === 'MANUAL');
  const confirmedWallLengthM = roundHalfUp(
    confirmedWalls.reduce((sum, wall) => sum.plus(new Decimal(wall.count || 1).mul(wall.lengthM)), new Decimal(0)),
    4
  ).toNumber();

  const completeOpenings = input.openings.filter(
    (opening) => opening.count !== null && opening.widthM !== null && opening.heightM !== null
  );
  let openingArea = new Decimal(0);
  let openingVolume = new Decimal(0);
  for (const opening of completeOpenings) {
    const area = new Decimal(opening.count!).mul(opening.widthM!).mul(opening.heightM!);
    openingArea = openingArea.plus(area);
    if (thickness !== null) openingVolume = openingVolume.plus(area.mul(thickness));
  }

  const columns = input.members.filter((member) => member.kind === 'COLUMN');
  const timber = input.members.filter((member) =>
    member.kind === 'POST' || member.kind === 'RAFTER_X' || member.kind === 'RAFTER_Y' || member.kind === 'PAULI' || member.kind === 'BALLI'
  );
  const columnVolumeM3 = sumMemberVolume(columns);
  const timberVolumeM3 = sumMemberVolume(timber);

  const profileId = detectEknathSourceProfile(structure, input.rooms) ? EKNATH_SOURCE_PROFILE : null;
  let foundationLongLengthM: number | null = null;
  let foundationShortLengthAM: number | null = null;
  let foundationShortLengthBM: number | null = null;
  let masonryLongLengthM: number | null = null;
  let overallOuterBreadthM: number | null = null;

  if (profileId && thickness !== null && structure.columnSpansM?.length && structure.rowSpansM?.length) {
    const colSum = structure.columnSpansM.reduce((sum, span) => sum + span, 0);
    const rowSum = structure.rowSpansM.reduce((sum, span) => sum + span, 0);
    const C = structure.gridColumns || structure.columnSpansM.length;
    const R = structure.gridRows || structure.rowSpansM.length;
    // Workbook long-wall: sum(clear cols) + thickness×(C+1) + 0.1
    foundationLongLengthM = roundHalfUp(new Decimal(colSum).plus(new Decimal(thickness).mul(C + 1)).plus(0.1), 4).toNumber();
    masonryLongLengthM = roundHalfUp(new Decimal(colSum).plus(new Decimal(thickness).mul(C + 1)), 4).toNumber();
    foundationShortLengthAM = roundHalfUp(new Decimal(structure.rowSpansM[0]).minus(0.1), 4).toNumber();
    foundationShortLengthBM = structure.rowSpansM[1] !== undefined
      ? roundHalfUp(new Decimal(structure.rowSpansM[1]).minus(0.1), 4).toNumber()
      : null;
    overallOuterBreadthM = roundHalfUp(new Decimal(rowSum).plus(new Decimal(thickness).mul(R + 1)), 4).toNumber();
    notes.push('EKNATH_GUT193_DRAFT outer length adjustments applied from workbook pattern. Not a universal government formula.');
  }

  if (!profileId && confirmedWallLengthM > 0) {
    notes.push('Ordinary structure: trench / plaster lengths use confirmed wall runs. Not the Gut-193 workbook length schedule.');
  }

  return {
    profileId,
    roomAreas,
    floorAreaSumM2,
    confirmedWalls,
    confirmedWallLengthM,
    effectiveThicknessM: thickness,
    effectiveHeightM: height,
    excavationDepthM,
    foundationWidthM: foundationWidthM ?? null,
    solingDepthM: solingDepthM ?? null,
    groundBeamDepthM: groundBeamDepthM ?? null,
    foundationLongLengthM,
    foundationShortLengthAM,
    foundationShortLengthBM,
    masonryLongLengthM,
    overallOuterBreadthM,
    openingAreaM2: roundHalfUp(openingArea, 4).toNumber(),
    openingVolumeM3: roundHalfUp(openingVolume, 6).toNumber(),
    columnVolumeM3,
    timberVolumeM3,
    steelFactorKgPerCum: profileId ? 50 : null,
    notes,
  };
}

export function detectEknathSourceProfile(structure: BuildingStructure, rooms: RoomFact[]): boolean {
  if (structure.geometryStatus !== 'CONFIRMED') return false;
  if ((structure.gridColumns || 0) !== 4 || (structure.gridRows || 0) !== 2) return false;
  if (structure.spanMode !== 'UNEQUAL') return false;
  if (!structure.columnSpansM || structure.columnSpansM.length !== 4) return false;
  if (!structure.rowSpansM || structure.rowSpansM.length !== 2) return false;
  if (rooms.length < 8) return false;
  if (structure.wallThicknessM === null || structure.storeyHeightM === null) return false;
  return true;
}

function sumMemberVolume(members: MemberFact[]): number {
  let total = new Decimal(0);
  for (const member of members) {
    if (member.count === null || member.lengthM === null || member.breadthM === null || member.depthM === null) continue;
    total = total.plus(new Decimal(member.count).mul(member.lengthM).mul(member.breadthM).mul(member.depthM));
  }
  return roundHalfUp(total, 6).toNumber();
}

export function product(...values: number[]): Decimal {
  return values.reduce((acc, value) => acc.mul(value), new Decimal(1));
}
