import type {
  BuildingStructure,
  CatalogueItemRecord,
  MeasurementBlockFact,
  MeasurementLineFact,
  MemberFact,
  OpeningFact,
  RoomFact,
  RuleStatus,
  WallRunFact,
} from '../types';
import type { DerivedFactBundle } from '../derivedFacts';

export type FactKey =
  | 'rooms'
  | 'confirmedWalls'
  | 'wallThickness'
  | 'storeyHeight'
  | 'foundationWidth'
  | 'groundBeamDepth'
  | 'solingDepth'
  | 'excavationDepth'
  | 'openings'
  | 'members'
  | 'columns'
  | 'timberMembers'
  | 'spans'
  | 'geometryConfirmed';

export type ApplicabilityState =
  | 'APPLICABLE'
  | 'INPUT_REQUIRED'
  | 'NOT_APPLICABLE'
  | 'REQUIRES_CONFIRMATION';

export interface RuleContext {
  structure: BuildingStructure;
  rooms: RoomFact[];
  walls: WallRunFact[];
  openings: OpeningFact[];
  members: MemberFact[];
  catalogue: CatalogueItemRecord[];
  derived: DerivedFactBundle;
}

export interface QuantityResult {
  title: string;
  unit: string;
  formulaText: string;
  lines: Omit<MeasurementLineFact, 'id' | 'blockId'>[];
  derivedNet: number;
  sourceFactIds: string[];
  evidenceNote: string;
  catalogueItemNumber: string | null;
  requiresConfirmationNote?: string;
}

export interface RuleEvaluation {
  ruleId: string;
  name: string;
  status: RuleStatus;
  unit: string;
  catalogueItemNumber: string | null;
  applicability: ApplicabilityState;
  reason: string;
  formulaText: string;
  requiredFacts: FactKey[];
  missingFacts: FactKey[];
  quantity: QuantityResult | null;
  goTo: 'rooms' | 'walls' | 'openings' | 'members' | 'profile' | null;
}

export interface MeasurementRule {
  ruleId: string;
  name: string;
  status: RuleStatus;
  unit: string;
  catalogueItemNumber: string | null;
  requiredFacts: FactKey[];
  formulaText: string;
  evidenceNote: string;
  goTo: RuleEvaluation['goTo'];
  isApplicable: (ctx: RuleContext) => ApplicabilityState | { state: ApplicabilityState; reason: string };
  missingFacts: (ctx: RuleContext) => FactKey[];
  compute: (ctx: RuleContext) => QuantityResult | { error: string };
}

export type { MeasurementBlockFact, RuleStatus };
