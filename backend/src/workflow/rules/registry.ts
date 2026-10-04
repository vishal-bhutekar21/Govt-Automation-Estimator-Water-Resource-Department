import { buildDerivedFacts } from '../derivedFacts';
import { matchCatalogue } from '../engine';
import type {
  BuildingStructure,
  CatalogueItemRecord,
  MeasurementBlockFact,
  MemberFact,
  OpeningFact,
  RoomFact,
  WallRunFact,
} from '../types';
import { EKNATH_SOURCE_DRAFT_RULES } from './eknathSourceDraft';
import { GENERIC_DRAFT_RULES } from './genericDrafts';
import type { MeasurementRule, RuleContext, RuleEvaluation } from './types';

const RULES: MeasurementRule[] = [...EKNATH_SOURCE_DRAFT_RULES, ...GENERIC_DRAFT_RULES];

export function listMeasurementRules(): MeasurementRule[] {
  return RULES.filter((rule) => rule.status !== 'DISABLED');
}

export function getMeasurementRule(ruleId: string): MeasurementRule | undefined {
  return RULES.find((rule) => rule.ruleId === ruleId);
}

export function buildRuleContext(input: {
  structure: BuildingStructure;
  rooms: RoomFact[];
  walls: WallRunFact[];
  openings: OpeningFact[];
  members: MemberFact[];
  catalogue?: CatalogueItemRecord[];
}): RuleContext {
  const rooms = input.rooms.filter((room) => room.structureId === input.structure.id);
  const walls = input.walls.filter((wall) => wall.structureId === input.structure.id);
  const openings = input.openings.filter((opening) => opening.structureId === input.structure.id);
  const members = input.members.filter((member) => member.structureId === input.structure.id);
  return {
    structure: input.structure,
    rooms,
    walls,
    openings,
    members,
    catalogue: input.catalogue || [],
    derived: buildDerivedFacts({ structure: input.structure, rooms, walls, openings, members }),
  };
}

export function evaluateRules(ctx: RuleContext): RuleEvaluation[] {
  return listMeasurementRules().map((rule) => evaluateRule(rule, ctx));
}

export function evaluateRule(rule: MeasurementRule, ctx: RuleContext): RuleEvaluation {
  const applicableRaw = rule.isApplicable(ctx);
  const applicability = typeof applicableRaw === 'string' ? applicableRaw : applicableRaw.state;
  const applicableReason = typeof applicableRaw === 'string' ? '' : applicableRaw.reason;
  const missing = applicability === 'NOT_APPLICABLE' ? [] : rule.missingFacts(ctx);

  let quantity = null;
  let reason = applicableReason || defaultReason(applicability, rule, missing);

  if (applicability !== 'NOT_APPLICABLE' && missing.length === 0) {
    const computed = rule.compute(ctx);
    if ('error' in computed) {
      reason = computed.error;
      return {
        ruleId: rule.ruleId,
        name: rule.name,
        status: rule.status,
        unit: rule.unit,
        catalogueItemNumber: rule.catalogueItemNumber,
        applicability: 'INPUT_REQUIRED',
        reason,
        formulaText: rule.formulaText,
        requiredFacts: rule.requiredFacts,
        missingFacts: missing,
        quantity: null,
        goTo: rule.goTo,
      };
    }
    quantity = computed;
    if (computed.requiresConfirmationNote) {
      reason = computed.requiresConfirmationNote;
    } else if (rule.status === 'DRAFT') {
      reason = 'Draft source/helper rule. Not validated for automatic production use.';
    }
  } else if (missing.length) {
    reason = `Missing facts: ${missing.join(', ')}. Nothing was invented.`;
  }

  return {
    ruleId: rule.ruleId,
    name: rule.name,
    status: rule.status,
    unit: rule.unit,
    catalogueItemNumber: rule.catalogueItemNumber,
    applicability: missing.length && applicability !== 'NOT_APPLICABLE' ? 'INPUT_REQUIRED' : applicability,
    reason,
    formulaText: rule.formulaText,
    requiredFacts: rule.requiredFacts,
    missingFacts: missing,
    quantity,
    goTo: rule.goTo,
  };
}

function defaultReason(
  applicability: string,
  rule: MeasurementRule,
  missing: string[]
): string {
  if (applicability === 'NOT_APPLICABLE') return 'Not applicable to this structure from the facts entered.';
  if (missing.length) return `Missing facts: ${missing.join(', ')}.`;
  if (rule.status === 'DRAFT') return 'Draft rule — generate only for review.';
  return 'Applicable.';
}

export function evaluationToBlock(
  evaluation: RuleEvaluation,
  input: { blockId: string; caseId: string; structureId: string; catalogue: CatalogueItemRecord[] }
): MeasurementBlockFact | { error: string } {
  if (!evaluation.quantity) {
    return { error: evaluation.reason || 'No quantity available.' };
  }
  if (evaluation.status === 'VALIDATED_RULE') {
    // reserved — none yet
  }
  if (evaluation.status === 'REPLAY_ONLY') {
    return { error: 'This rule is replay-only and is not written through ordinary generation.' };
  }

  let rateMatch: MeasurementBlockFact['rateMatch'] = 'UNMAPPED';
  let rateItemId: string | undefined;
  if (evaluation.catalogueItemNumber) {
    const match = matchCatalogue(input.catalogue, evaluation.catalogueItemNumber);
    if (match.status === 'UNIQUE' && match.matches[0]) {
      rateMatch = 'UNIQUE';
      rateItemId = match.matches[0].id;
    } else if (match.status === 'AMBIGUOUS') {
      rateMatch = 'AMBIGUOUS';
    }
  }

  const lines = evaluation.quantity.lines.map((line, index) => ({
    id: `${input.blockId}-L${index + 1}`,
    blockId: input.blockId,
    ...line,
  }));

  return {
    id: input.blockId,
    structureId: input.structureId,
    caseId: input.caseId,
    title: evaluation.quantity.title,
    unit: evaluation.quantity.unit,
    ruleId: evaluation.ruleId,
    ruleStatus: evaluation.status === 'VALIDATED_RULE' ? 'VALIDATED_RULE' : 'DRAFT',
    status: evaluation.quantity.requiresConfirmationNote || evaluation.applicability === 'REQUIRES_CONFIRMATION'
      ? 'REQUIRES_CONFIRMATION'
      : 'REQUIRES_CONFIRMATION',
    formulaText: evaluation.quantity.formulaText,
    sourceFactIds: evaluation.quantity.sourceFactIds,
    evidenceIds: [],
    derivedNet: evaluation.quantity.derivedNet,
    engineerNet: evaluation.quantity.derivedNet,
    rateItemId,
    rateMatch,
    lines,
  };
}
