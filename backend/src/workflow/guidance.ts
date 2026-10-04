import {
  BuildingStructure,
  CatalogueItemRecord,
  MemberFact,
  OpeningFact,
  RoomFact,
  WallRunFact,
} from './types';
import { roundHalfUp } from './engine';
import { previewMeasurementRules } from './measurementGenerate';
import type { RuleEvaluation } from './rules/types';
import Decimal from 'decimal.js';

export type Readiness =
  | 'READY'
  | 'MISSING_DATA'
  | 'AMBIGUOUS'
  | 'NOT_APPLICABLE'
  | 'MANUAL'
  | 'DRAFT_RULE'
  | 'REQUIRES_REVIEW';

export interface FactCheck {
  id: string;
  label: string;
  present: boolean;
  source: string;
}

export interface RuleGuidance {
  ruleId: string;
  title: string;
  unit: string;
  ruleStatus: 'DRAFT' | 'VALIDATED_RULE' | 'REPLAY_ONLY' | 'DISABLED';
  readiness: Readiness;
  reason: string;
  formula: string;
  facts: FactCheck[];
  derivedQuantity: number | null;
  derivedFrom: string;
  catalogueItemNumber?: string | null;
  goTo: 'rooms' | 'walls' | 'openings' | 'members' | 'profile' | null;
}

export interface DerivedPreview {
  label: string;
  quantity: number | null;
  unit: string;
  source: string;
  note: string;
}

export interface StructureGuidance {
  structureId: string;
  structureName: string;
  rules: RuleGuidance[];
  derived: DerivedPreview[];
  profile: { id: string; label: string; state: 'done' | 'attention'; detail: string }[];
}

export function analyzeStructure(input: {
  structure: BuildingStructure;
  rooms: RoomFact[];
  walls: WallRunFact[];
  openings: OpeningFact[];
  members: MemberFact[];
}): StructureGuidance {
  const roomsHere = input.rooms.filter((room) => room.structureId === input.structure.id);
  const wallsHere = input.walls.filter((wall) => wall.structureId === input.structure.id);
  const openingsHere = input.openings.filter((opening) => opening.structureId === input.structure.id);
  const membersHere = input.members.filter((member) => member.structureId === input.structure.id);
  const evaluations = previewMeasurementRules({
    structure: input.structure,
    rooms: roomsHere,
    walls: wallsHere,
    openings: openingsHere,
    members: membersHere,
  });
  const rules = evaluations.map((evaluation) => guidanceFromEvaluation(evaluation, {
    structure: input.structure,
    rooms: roomsHere,
    walls: wallsHere,
    openings: openingsHere,
    members: membersHere,
  }));
  return {
    structureId: input.structure.id,
    structureName: input.structure.name,
    rules,
    derived: derivedPreviews(roomsHere, rules),
    profile: profileChecks(input.structure, roomsHere, wallsHere, openingsHere, membersHere),
  };
}

function guidanceFromEvaluation(
  evaluation: RuleEvaluation,
  input: {
    structure: BuildingStructure;
    rooms: RoomFact[];
    walls: WallRunFact[];
    openings: OpeningFact[];
    members: MemberFact[];
  }
): RuleGuidance {
  let readiness: Readiness = 'DRAFT_RULE';
  if (evaluation.applicability === 'NOT_APPLICABLE') readiness = 'NOT_APPLICABLE';
  else if (evaluation.applicability === 'INPUT_REQUIRED' || evaluation.missingFacts.length) readiness = 'MISSING_DATA';
  else if (evaluation.status === 'VALIDATED_RULE') readiness = 'READY';
  else if (evaluation.applicability === 'REQUIRES_CONFIRMATION') readiness = 'REQUIRES_REVIEW';

  const factKeys = Array.from(new Set([...evaluation.requiredFacts, ...evaluation.missingFacts]));
  const facts = factKeys.map((key) => factCheckFor(key, evaluation.missingFacts.includes(key), input));

  return {
    ruleId: evaluation.ruleId,
    title: evaluation.name,
    unit: evaluation.unit,
    ruleStatus: evaluation.status,
    readiness,
    reason: evaluation.reason || reasonFor(readiness, evaluation.name),
    formula: evaluation.formulaText,
    facts,
    derivedQuantity: evaluation.quantity?.derivedNet ?? null,
    derivedFrom: evaluation.quantity?.evidenceNote || derivedFrom(evaluation.ruleId, input),
    catalogueItemNumber: evaluation.catalogueItemNumber,
    goTo: readiness === 'MISSING_DATA' ? evaluation.goTo : null,
  };
}

function factCheckFor(
  key: string,
  missing: boolean,
  input: {
    structure: BuildingStructure;
    rooms: RoomFact[];
    walls: WallRunFact[];
    openings: OpeningFact[];
    members: MemberFact[];
  }
): FactCheck {
  const confirmed = input.walls.filter((wall) => wall.origin === 'ENGINEER_CONFIRMED' || wall.origin === 'MANUAL');
  if (key === 'confirmedWalls') {
    return {
      id: 'confirmed-walls',
      label: 'Confirmed walls',
      present: !missing && confirmed.length > 0,
      source: confirmed.length ? `${confirmed.length} confirmed` : 'No wall has been confirmed',
    };
  }
  if (key === 'wallThickness') {
    return {
      id: 'thickness',
      label: 'Wall thickness',
      present: !missing && input.structure.wallThicknessM !== null,
      source: input.structure.wallThicknessM ? `${input.structure.wallThicknessM} m from the structure` : 'Not entered on the structure',
    };
  }
  if (key === 'storeyHeight') {
    return {
      id: 'height',
      label: 'Height',
      present: !missing && input.structure.storeyHeightM !== null,
      source: input.structure.storeyHeightM ? `${input.structure.storeyHeightM} m from the structure` : 'Not entered',
    };
  }
  if (key === 'openings') {
    const incomplete = input.openings.filter((opening) => opening.count === null || opening.widthM === null || opening.heightM === null);
    return {
      id: 'openings',
      label: 'Openings',
      present: !missing,
      source: input.openings.length === 0
        ? 'None entered. None were assumed'
        : incomplete.length
          ? `${incomplete.map((opening) => opening.code).join(', ')} still need a count, width, or height`
          : `${input.openings.length} opening groups already measured`,
    };
  }
  if (key === 'rooms') {
    return {
      id: 'rooms',
      label: 'Room length and breadth',
      present: !missing,
      source: input.rooms.map((room) => room.code).join(', ') || 'No rooms',
    };
  }
  return {
    id: key,
    label: key,
    present: !missing,
    source: missing ? 'Still needed' : 'From saved structure facts',
  };
}

function reasonFor(readiness: Readiness, title: string): string {
  if (readiness === 'NOT_APPLICABLE') return `${title} has nothing on this structure to measure. Nothing was copied from another structure.`;
  if (readiness === 'MISSING_DATA') return `${title} still needs the facts marked missing.`;
  if (readiness === 'READY') return `${title} can be calculated from the facts already entered.`;
  if (readiness === 'REQUIRES_REVIEW') return `${title} can be drafted but needs engineer confirmation before accept.`;
  return `${title} has the facts it needs, but this calculation is not validated for automatic use. It will not be added to the measurement sheet unless you explicitly create a draft line and accept it.`;
}

function factsFor(ruleId: string, input: {
  structure: BuildingStructure;
  rooms: RoomFact[];
  walls: WallRunFact[];
  openings: OpeningFact[];
  members: MemberFact[];
}): FactCheck[] {
  if (ruleId === 'draft.room-floor.v1') {
    const incomplete = input.rooms.filter((room) => room.lengthM === null || room.breadthM === null);
    return [{
      id: 'room-sizes',
      label: 'Room length and breadth',
      present: input.rooms.length > 0 && incomplete.length === 0,
      source: incomplete.length
        ? `${incomplete.map((room) => room.code).join(', ')} still need a length or a breadth`
        : input.rooms.length
          ? input.rooms.map((room) => room.code).join(', ')
          : 'No rooms on this structure',
    }];
  }
  if (ruleId === 'draft.confirmed-wall-volume.v1') {
    const confirmed = input.walls.filter((wall) => wall.origin === 'ENGINEER_CONFIRMED' || wall.origin === 'MANUAL');
    const incompleteOpenings = input.openings.filter((opening) => opening.count === null || opening.widthM === null || opening.heightM === null);
    return [
      {
        id: 'confirmed-walls',
        label: 'Confirmed walls',
        present: confirmed.length > 0,
        source: confirmed.length
          ? `${confirmed.length} confirmed`
          : input.walls.some((wall) => wall.origin === 'CANDIDATE')
            ? 'Walls are only proposed. Confirm the ones you measured'
            : 'No wall has been confirmed',
      },
      {
        id: 'thickness',
        label: 'Wall thickness',
        present: input.structure.wallThicknessM !== null && input.structure.wallThicknessM > 0,
        source: input.structure.wallThicknessM ? `${input.structure.wallThicknessM} m from the structure` : 'Not entered on the structure',
      },
      {
        id: 'height',
        label: 'Height',
        present: input.structure.storeyHeightM !== null && input.structure.storeyHeightM > 0,
        source: input.structure.storeyHeightM ? `${input.structure.storeyHeightM} m from the structure` : 'Not entered on the structure',
      },
      {
        id: 'openings',
        label: 'Openings',
        present: incompleteOpenings.length === 0,
        source: input.openings.length === 0
          ? 'None entered. None were assumed'
          : incompleteOpenings.length
            ? `${incompleteOpenings.map((opening) => opening.code).join(', ')} still need a count, width, or height`
            : `${input.openings.length} opening groups already measured`,
      },
    ];
  }
  if (ruleId === 'draft.opening-area.v1') {
    const incomplete = input.openings.filter((opening) => opening.count === null || opening.widthM === null || opening.heightM === null);
    return [{
      id: 'opening-sizes',
      label: 'Opening count, width, and height',
      present: input.openings.length > 0 && incomplete.length === 0,
      source: incomplete.length
        ? `${incomplete.map((opening) => opening.code).join(', ')} are incomplete`
        : input.openings.map((opening) => `${opening.code} × ${opening.count}`).join(', '),
    }];
  }
  const incomplete = input.members.filter((member) => member.count === null || member.lengthM === null || member.breadthM === null || member.depthM === null);
  return [{
    id: 'member-sizes',
    label: 'Member count and section',
    present: input.members.length > 0 && incomplete.length === 0,
    source: incomplete.length
      ? `${incomplete.map((member) => memberLabel(member.kind)).join(', ')} still need a count or a size. A blank count is not zero`
      : input.members.map((member) => memberLabel(member.kind)).join(', '),
  }];
}

function derivedFrom(ruleId: string, input: { rooms: RoomFact[]; openings: OpeningFact[]; members: MemberFact[] }): string {
  if (ruleId === 'draft.room-floor.v1') return input.rooms.map((room) => room.code).filter(Boolean).join(', ') || 'rooms';
  if (ruleId === 'draft.opening-area.v1') return 'opening schedule';
  if (ruleId === 'draft.member-volume.v1') return 'member schedule';
  return 'confirmed walls, thickness, and height';
}

function derivedPreviews(rooms: RoomFact[], rules: RuleGuidance[]): DerivedPreview[] {
  const rows: DerivedPreview[] = rooms
    .filter((room) => room.lengthM !== null && room.breadthM !== null)
    .map((room) => ({
      label: room.code || 'Room',
      quantity: roundHalfUp(new Decimal(room.lengthM as number).mul(room.breadthM as number), 4).toNumber(),
      unit: 'sqm',
      source: `${room.lengthM} m × ${room.breadthM} m`,
      note: 'Derived from this room. Not a measurement-sheet line.',
    }));
  const floor = rules.find((rule) => (
    (rule.ruleId === 'draft.floor-finish.v1' || rule.ruleId === 'eknath.ceramic-floor.v1')
    && rule.derivedQuantity !== null
  ));
  if (floor && floor.derivedQuantity !== null) {
    rows.push({
      label: 'Total floor area',
      quantity: floor.derivedQuantity,
      unit: 'sqm',
      source: floor.derivedFrom,
      note: 'Derived. Accept the draft line on Review to put it on the measurement sheet.',
    });
  }
  return rows;
}

function profileChecks(
  structure: BuildingStructure,
  rooms: RoomFact[],
  walls: WallRunFact[],
  openings: OpeningFact[],
  members: MemberFact[]
): StructureGuidance['profile'] {
  const confirmed = walls.filter((wall) => wall.origin === 'ENGINEER_CONFIRMED' || wall.origin === 'MANUAL');
  const openingsComplete = openings.every((opening) => opening.count !== null && opening.widthM !== null && opening.heightM !== null);
  return [
    {
      id: 'profile',
      label: 'Profile',
      state: structure.wallMaterialText.trim() && structure.wallThicknessM && structure.storeyHeightM ? 'done' : 'attention',
      detail: structure.wallThicknessM ? `Thickness ${structure.wallThicknessM} m, height ${structure.storeyHeightM ?? 'missing'} m` : 'Thickness or height is still blank',
    },
    {
      id: 'rooms',
      label: 'Rooms',
      state: rooms.length > 0 && rooms.every((room) => room.lengthM && room.breadthM) ? 'done' : 'attention',
      detail: rooms.length ? `${rooms.length} rooms` : 'No rooms',
    },
    {
      id: 'walls',
      label: 'Wall confirmation',
      state: confirmed.length > 0 ? 'done' : 'attention',
      detail: confirmed.length ? `${confirmed.length} confirmed` : 'No confirmed wall',
    },
    {
      id: 'openings',
      label: 'Openings',
      state: openings.length === 0 || openingsComplete ? 'done' : 'attention',
      detail: openings.length === 0 ? 'None entered' : openingsComplete ? `${openings.length} measured` : 'A size is missing',
    },
    {
      id: 'members',
      label: 'Members',
      state: members.length === 0 || members.every((member) => member.count !== null && member.lengthM && member.breadthM && member.depthM) ? 'done' : 'attention',
      detail: members.length === 0 ? 'None entered' : `${members.length} groups`,
    },
  ];
}

export function searchCatalogue(items: CatalogueItemRecord[], query: string): {
  results: CatalogueItemRecord[];
  ambiguousItemNumbers: string[];
} {
  const needle = query.trim().toLowerCase();
  if (!needle) return { results: [], ambiguousItemNumbers: [] };
  const results = items.filter((item) =>
    item.description.toLowerCase().includes(needle)
    || item.itemNumber.toLowerCase().includes(needle)
    || item.unit.toLowerCase().includes(needle)
  );
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.itemNumber, (counts.get(item.itemNumber) || 0) + 1);
  const ambiguousItemNumbers = [...new Set(results.map((item) => item.itemNumber))].filter((itemNumber) => (counts.get(itemNumber) || 0) > 1);
  return { results, ambiguousItemNumbers };
}

export function itemChoiceReadiness(input: {
  pinned: boolean;
  item: CatalogueItemRecord | null;
  sameNumberCount: number;
}): { readiness: Readiness; reason: string } {
  if (!input.pinned) {
    return { readiness: 'MISSING_DATA', reason: 'Choose a rate schedule on the case before searching items.' };
  }
  if (!input.item) {
    return { readiness: 'MISSING_DATA', reason: 'Select an item from the search results. The item number is not typed.' };
  }
  if (input.sameNumberCount > 1) {
    return {
      readiness: 'AMBIGUOUS',
      reason: 'More than one catalogue row uses this item number. Choose the row you mean. Nothing was selected automatically.',
    };
  }
  return {
    readiness: 'MANUAL',
    reason: 'No validated calculation is tied to this item. Enter the measured quantity. The unit comes from the catalogue.',
  };
}

export function caseAttention(input: {
  ownerName?: string;
  surveyNumber?: string;
  village?: string;
  evidenceCount: number;
  rateScheduleVersionId?: string | null;
  ypTableVersionId?: string | null;
  structures: StructureGuidance[];
  depreciationAccepted: boolean;
  hasSnapshot: boolean;
}): { label: string; state: 'done' | 'attention'; detail: string }[] {
  const structures = input.structures;
  const geometryAttention = structures.length === 0 || structures.some((structure) => structure.profile.some((item) => item.id === 'walls' && item.state === 'attention' && structures.length > 0));
  return [
    {
      label: 'Identity',
      state: input.ownerName && (input.surveyNumber || input.village) ? 'done' : 'attention',
      detail: input.ownerName || 'Owner is missing',
    },
    {
      label: 'Evidence',
      // Drawings are optional for calculation; do not block the checklist.
      state: 'done',
      detail: input.evidenceCount ? `${input.evidenceCount} file(s)` : 'Optional — attach drawings when available',
    },
    {
      label: 'Structure',
      state: structures.length > 0 ? 'done' : 'attention',
      detail: structures.map((structure) => structure.structureName).join(', ') || 'No structure',
    },
    {
      label: 'Geometry',
      state: structures.length > 0 && !geometryAttention ? 'done' : 'attention',
      detail: structures.length ? 'Wall confirmation is per structure' : 'Add a structure first',
    },
    {
      label: 'Rates',
      state: input.rateScheduleVersionId ? 'done' : 'attention',
      detail: input.rateScheduleVersionId
        ? 'Schedule pinned'
        : 'Pin a rate schedule on Screen 1 (Gut 193: CASE-193-RA-UI-GUIDE) — without it present cost stays 0',
    },
    {
      label: 'Depreciation',
      state: input.depreciationAccepted && input.ypTableVersionId ? 'done' : 'attention',
      detail: !input.ypTableVersionId
        ? 'Pin Year’s Purchase on Screen 1 (Gut 193: Gut 193 workbook YP)'
        : input.depreciationAccepted
          ? 'Accepted'
          : 'YP pinned — accept depreciation after abstract totals look right',
    },
    {
      label: 'Measurements',
      state: input.hasSnapshot ? 'done' : 'attention',
      detail: input.hasSnapshot ? 'A draft abstract exists' : 'No abstract yet',
    },
  ];
}

export function memberLabel(kind: string): string {
  const labels: Record<string, string> = {
    COLUMN: 'Columns',
    BEAM: 'Beams',
    POST: 'Posts',
    RAFTER_X: 'Rafters along the length',
    RAFTER_Y: 'Rafters across the width',
    PAULI: 'Pauli',
    BALLI: 'Balli',
    GI_PIPE: 'GI pipes',
    MS_ANGLE: 'MS angles',
    MESH: 'Mesh',
    OTHER: 'Other members',
  };
  return labels[kind] || kind;
}
