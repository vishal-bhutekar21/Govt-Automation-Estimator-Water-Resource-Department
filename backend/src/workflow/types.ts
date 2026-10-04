export type WorkflowKind = 'LEGACY' | 'BUILDING';

export type EvidenceType =
  | 'FIELD_DRAWING'
  | 'SECTION_SKETCH'
  | 'SITE_PHOTO'
  | 'SOURCE_WORKBOOK'
  | 'RATE_DOCUMENT'
  | 'SUPPORTING_MEASUREMENT'
  | 'OTHER';

export type MemberKind =
  | 'POST'
  | 'RAFTER_X'
  | 'RAFTER_Y'
  | 'PAULI'
  | 'COLUMN'
  | 'BEAM'
  | 'BALLI'
  | 'GI_PIPE'
  | 'MS_ANGLE'
  | 'MESH'
  | 'OTHER';

export type BlockStatus =
  | 'AUTO'
  | 'APPLICABLE'
  | 'NOT_APPLICABLE'
  | 'REQUIRES_CONFIRMATION'
  | 'AMBIGUOUS'
  | 'MANUAL'
  | 'OVERRIDDEN'
  | 'REQUIRES_REVIEW'
  | 'EXCLUDED'
  | 'ACCEPTED';

export type RuleStatus = 'DRAFT' | 'VALIDATED_RULE' | 'REPLAY_ONLY' | 'DISABLED';

export type MeasurementRuleStatus = RuleStatus;

export type StructureKind = 'MAIN_HOUSE' | 'GI_SHED' | 'OPEN_SHED' | 'PORCH' | 'STORE' | 'OTHER';
export type AttachedSide = 'FRONT' | 'REAR' | 'LEFT' | 'RIGHT';
export type WallSegmentKind = 'OUTER' | 'INTERNAL' | 'PARTITION' | 'LOW_WALL' | 'OTHER';
export type FactSource = 'INHERITED' | 'OVERRIDE';
export type VerticalZoneKind = 'MASONRY' | 'MESH' | 'OTHER';

export interface OpenSidesFact {
  front: boolean;
  rear: boolean;
  left: boolean;
  right: boolean;
}

export interface VerticalZoneFact {
  id: string;
  kind: VerticalZoneKind;
  heightM: number | null;
  notes?: string;
}

export interface BuildingStructure {
  id: string;
  caseId: string;
  name: string;
  sortOrder: number;
  participation: 'INCLUDED' | 'EXCLUDED';
  exclusionReason?: string;
  structureKind?: StructureKind;
  structureTypeText: string;
  wallMaterialText: string;
  wallThicknessM: number | null;
  storeyHeightM: number | null;
  constructionYear: number | null;
  usefulLifeYears: number | null;
  usefulLifeSource: 'TYPED' | 'VALIDATED_TABLE' | 'NONE';
  floorFinish: string;
  roofFinish: string;
  externalFinish: string;
  internalFinish: string;
  shape?: 'RECTANGLE' | null;
  /** Room/grid spans are clear (internal) dimensions. Wall thickness is separate. */
  dimensionConvention?: 'CLEAR_INTERNAL';
  overallLengthM?: number | null;
  overallBreadthM?: number | null;
  gridColumns?: number | null;
  gridRows?: number | null;
  spanMode?: 'EQUAL' | 'UNEQUAL' | null;
  columnSpansM?: number[] | null;
  rowSpansM?: number[] | null;
  geometryStatus?: 'NONE' | 'DRAFT_GENERATED' | 'CONFIRMED' | null;
  geometryConfirmedAt?: string | null;
  openSides?: OpenSidesFact | null;
  attachedToStructureId?: string | null;
  attachedSide?: AttachedSide | null;
  foundationWidthM?: number | null;
  groundBeamDepthM?: number | null;
  solingDepthM?: number | null;
  evidenceConflictNotes?: string;
  planNotes?: string;
  updatedAt: string;
}

export interface RoomFact {
  id: string;
  structureId: string;
  code: string;
  lengthM: number | null;
  breadthM: number | null;
  rowIndex: number | null;
  bayIndex: number | null;
  enclosure: 'ENCLOSED' | 'OPEN' | 'PARTIALLY_OPEN' | 'UNKNOWN';
  generated?: boolean;
  boundaryWallIds?: {
    north: string;
    south: string;
    east: string;
    west: string;
  };
}

export interface WallRunFact {
  id: string;
  structureId: string;
  origin: 'CANDIDATE' | 'ENGINEER_CONFIRMED' | 'MANUAL';
  kind: 'SHARED' | 'EXTERNAL' | 'OTHER';
  segmentKind?: WallSegmentKind;
  label: string;
  count: number;
  lengthM: number;
  breadthM: number | null;
  depthM: number | null;
  thicknessM?: number | null;
  heightM?: number | null;
  thicknessSource?: FactSource;
  heightSource?: FactSource;
  verticalZones?: VerticalZoneFact[];
  sourceRoomIds: string[];
  confirmedBy?: string;
  confirmedAt?: string;
  generated?: boolean;
  axis?: 'LONG' | 'SHORT';
  role?: string;
}

export interface OpeningFact {
  id: string;
  structureId: string;
  code: string;
  kind: 'DOOR' | 'WINDOW' | 'VENTILATOR' | 'OTHER';
  count: number | null;
  widthM: number | null;
  heightM: number | null;
  hostWallRunId: string | null;
  roomId?: string | null;
}

export interface MemberFact {
  id: string;
  structureId: string;
  kind: MemberKind;
  roomId: string | null;
  /** Null means the count was not observed. Zero means the engineer counted none. */
  count: number | null;
  lengthM: number | null;
  breadthM: number | null;
  depthM: number | null;
}

export interface MeasurementLineFact {
  id: string;
  blockId: string;
  label: string;
  count: number;
  lengthM: number;
  breadthM: number;
  depthOrHeightM: number;
  formulaText: string;
  sourceFactIds: string[];
  sign: 1 | -1;
  quantity: number;
}

export interface MeasurementBlockFact {
  id: string;
  structureId: string;
  caseId: string;
  title: string;
  unit: string;
  ruleId: string;
  ruleStatus: RuleStatus;
  status: BlockStatus;
  formulaText: string;
  sourceFactIds: string[];
  evidenceIds: string[];
  derivedNet: number | null;
  engineerNet: number | null;
  overrideReason?: string;
  decidedBy?: string;
  decidedAt?: string;
  rateItemId?: string;
  rateMatch: 'UNMAPPED' | 'UNIQUE' | 'AMBIGUOUS' | 'MANUAL';
  lines: MeasurementLineFact[];
}

export interface CaseEvidenceRecord {
  id: string;
  caseId: string;
  structureId: string | null;
  documentType: EvidenceType;
  storedFileName: string;
  originalName: string;
  byteLength: number;
  uploadedBy: string;
  uploadedAt: string;
  version: number;
  notes: string;
  supersedesEvidenceId: string | null;
}

export interface RateScheduleVersionRecord {
  id: string;
  name: string;
  authority: string;
  versionLabel: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  sourceDocument: string;
  importedAt: string;
  legacy: boolean;
}

export interface CatalogueItemRecord {
  id: string;
  scheduleVersionId: string;
  itemNumber: string;
  description: string;
  unit: string;
  rate: number;
  sourceRow: string;
  reference: string;
}

export interface YpTableVersionRecord {
  id: string;
  name: string;
  citation: string;
  legacy: boolean;
  rows: { year: number; factor: number | null }[];
}

export interface DepreciationDecision {
  caseId: string;
  status: 'PENDING' | 'ACCEPTED' | 'BLOCKED';
  reason?: string;
  decidedBy?: string;
  decidedAt?: string;
}

export interface CalculationSnapshotRecord {
  id: string;
  caseId: string;
  status: 'DRAFT' | 'FINALIZED';
  label: 'PLATFORM' | 'SOURCE_REPLAY';
  evidenceVersionIds: string[];
  rateScheduleVersionId: string | null;
  ypTableVersionId: string | null;
  roundingProfileId: string;
  usefulLifeSource: 'TYPED' | 'VALIDATED_TABLE' | 'NONE' | 'REPLAY';
  presentCost: number | null;
  depreciatedValue: number | null;
  depreciationBlocked: boolean;
  depreciationFormula: string;
  blockers: string[];
  body: unknown;
  contentHash: string;
  createdBy: string;
  createdAt: string;
  finalizedAt: string | null;
  finalizedBy: string | null;
  supersedesSnapshotId: string | null;
}

export interface ApplicabilityRow {
  ruleId: string;
  ruleStatus: RuleStatus;
  title: string;
  state: BlockStatus;
  reason: string;
}
