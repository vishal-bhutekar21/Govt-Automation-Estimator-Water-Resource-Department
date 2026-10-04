import { v4 as uuidv4 } from 'uuid';
import type {
  BuildingStructure,
  CatalogueItemRecord,
  MeasurementBlockFact,
  MemberFact,
  OpeningFact,
  RoomFact,
  WallRunFact,
} from './types';
import { EKNATH_SOURCE_PROFILE } from './derivedFacts';
import {
  buildRuleContext,
  evaluateRule,
  evaluateRules,
  evaluationToBlock,
  getMeasurementRule,
  listMeasurementRules,
} from './rules/registry';
import type { RuleEvaluation } from './rules/types';

export function previewMeasurementRules(input: {
  structure: BuildingStructure;
  rooms: RoomFact[];
  walls: WallRunFact[];
  openings: OpeningFact[];
  members: MemberFact[];
  catalogue?: CatalogueItemRecord[];
}): RuleEvaluation[] {
  const ctx = buildRuleContext(input);
  return evaluateRules(ctx);
}

export function generateMeasurementForStructure(input: {
  structure: BuildingStructure;
  rooms: RoomFact[];
  walls: WallRunFact[];
  openings: OpeningFact[];
  members: MemberFact[];
  catalogue: CatalogueItemRecord[];
  existingBlocks: MeasurementBlockFact[];
  /** When set, only this rule. Otherwise all applicable draft rules with computable quantities. */
  ruleId?: string;
  /** Include generic draft helpers as well as source-profile rules. Default true. */
  includeGeneric?: boolean;
}): {
  evaluations: RuleEvaluation[];
  created: MeasurementBlockFact[];
  updated: MeasurementBlockFact[];
  skipped: { ruleId: string; reason: string }[];
  nextBlocks: MeasurementBlockFact[];
} {
  const ctx = buildRuleContext(input);
  const evaluations = input.ruleId
    ? (() => {
      const rule = getMeasurementRule(input.ruleId!);
      return rule ? [evaluateRule(rule, ctx)] : [];
    })()
    : evaluateRules(ctx);

  const isEknathProfile = ctx.derived.profileId === EKNATH_SOURCE_PROFILE;
  // On Gut-193 profile, keep eknath.* only unless the caller forces generic helpers.
  const includeGeneric = input.includeGeneric === true
    ? true
    : input.includeGeneric === false
      ? false
      : !isEknathProfile;
  const created: MeasurementBlockFact[] = [];
  const updated: MeasurementBlockFact[] = [];
  const skipped: { ruleId: string; reason: string }[] = [];

  const retained = input.existingBlocks.filter((block) => block.structureId !== input.structure.id);
  const structureBlocks = input.existingBlocks.filter((block) => block.structureId === input.structure.id);
  const nextStructureBlocks = [...structureBlocks];

  for (const evaluation of evaluations) {
    if (!includeGeneric && evaluation.ruleId.startsWith('draft.')) {
      skipped.push({ ruleId: evaluation.ruleId, reason: 'Ordinary draft pack skipped on Eknath source-profile sheet.' });
      continue;
    }
    if (evaluation.status === 'REPLAY_ONLY' || evaluation.status === 'DISABLED') {
      skipped.push({ ruleId: evaluation.ruleId, reason: evaluation.reason });
      continue;
    }
    if (evaluation.applicability === 'NOT_APPLICABLE') {
      skipped.push({ ruleId: evaluation.ruleId, reason: evaluation.reason });
      continue;
    }
    if (evaluation.applicability === 'INPUT_REQUIRED' || !evaluation.quantity) {
      skipped.push({ ruleId: evaluation.ruleId, reason: evaluation.reason });
      continue;
    }
    // Do not silently replace engineer overrides
    const existing = nextStructureBlocks.find((block) => block.ruleId === evaluation.ruleId);
    if (existing && (existing.status === 'OVERRIDDEN' || existing.status === 'ACCEPTED' || existing.status === 'MANUAL')) {
      skipped.push({ ruleId: evaluation.ruleId, reason: 'Existing accepted/overridden/manual line kept. Reset it before regenerating.' });
      continue;
    }

    const blockId = existing?.id || `blk-${uuidv4().slice(0, 8)}`;
    const built = evaluationToBlock(evaluation, {
      blockId,
      caseId: input.structure.caseId,
      structureId: input.structure.id,
      catalogue: input.catalogue,
    });
    if ('error' in built) {
      skipped.push({ ruleId: evaluation.ruleId, reason: built.error });
      continue;
    }
    if (existing) {
      const index = nextStructureBlocks.findIndex((block) => block.id === existing.id);
      nextStructureBlocks[index] = built;
      updated.push(built);
    } else {
      nextStructureBlocks.push(built);
      created.push(built);
    }
  }

  return {
    evaluations,
    created,
    updated,
    skipped,
    nextBlocks: [...retained, ...nextStructureBlocks],
  };
}

export function registryRuleCount(): { total: number; eknathDraft: number; generic: number; validated: number } {
  const rules = listMeasurementRules();
  return {
    total: rules.length,
    eknathDraft: rules.filter((rule) => rule.ruleId.startsWith('eknath.')).length,
    generic: rules.filter((rule) => rule.ruleId.startsWith('draft.')).length,
    validated: rules.filter((rule) => rule.status === 'VALIDATED_RULE').length,
  };
}
