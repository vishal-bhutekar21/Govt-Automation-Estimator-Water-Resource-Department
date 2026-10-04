import Decimal from 'decimal.js';
import { EKNATH_SOURCE_PROFILE, product } from '../derivedFacts';
import { roundHalfUp } from '../engine';
import type { FactKey, MeasurementRule, QuantityResult, RuleContext } from './types';

/**
 * Ordinary residential draft pack — fact-driven, for any BUILDING case that is NOT
 * the Gut-193 Eknath source profile. Formulas use confirmed walls, rooms, openings,
 * members, and typed construction finishes. Status stays DRAFT (not validated PWD law).
 */

function isEknath(ctx: RuleContext): boolean {
  return ctx.derived.profileId === EKNATH_SOURCE_PROFILE;
}

function hasText(value: string | null | undefined): boolean {
  return Boolean(value && value.trim());
}

function netOf(lines: QuantityResult['lines'], places = 2): number {
  let net = new Decimal(0);
  for (const line of lines) {
    net = line.sign === -1 ? net.minus(line.quantity) : net.plus(line.quantity);
  }
  return roundHalfUp(net, places).toNumber();
}

function trenchMissing(ctx: RuleContext): FactKey[] {
  const missing: FactKey[] = [];
  if (!ctx.derived.confirmedWalls.length) missing.push('confirmedWalls');
  if (ctx.derived.foundationWidthM === null) missing.push('foundationWidth');
  return missing;
}

function trenchLines(ctx: RuleContext, depthM: number, label: string): QuantityResult['lines'] {
  const width = ctx.derived.foundationWidthM!;
  return ctx.derived.confirmedWalls.map((wall) => {
    const count = wall.count || 1;
    const qty = roundHalfUp(product(count, wall.lengthM, width, depthM), 6).toNumber();
    return {
      label: `${label} · ${wall.label}`,
      count,
      lengthM: wall.lengthM,
      breadthM: width,
      depthOrHeightM: depthM,
      formulaText: 'count × wall length × foundation width × depth',
      sourceFactIds: [wall.id, ctx.structure.id],
      sign: 1 as const,
      quantity: qty,
    };
  });
}

function wallVolumeLines(ctx: RuleContext): QuantityResult['lines'] | { error: string } {
  if (!ctx.derived.confirmedWalls.length) return { error: 'Confirm walls before measuring masonry.' };
  if (ctx.structure.wallThicknessM === null || ctx.structure.storeyHeightM === null) {
    return { error: 'Wall thickness and height are required.' };
  }
  const lines: QuantityResult['lines'] = [];
  for (const wall of ctx.derived.confirmedWalls) {
    const count = wall.count || 1;
    const qty = roundHalfUp(product(count, wall.lengthM, ctx.structure.wallThicknessM, ctx.structure.storeyHeightM), 6).toNumber();
    lines.push({
      label: wall.label,
      count,
      lengthM: wall.lengthM,
      breadthM: ctx.structure.wallThicknessM,
      depthOrHeightM: ctx.structure.storeyHeightM,
      formulaText: 'count × length × thickness × height',
      sourceFactIds: [wall.id],
      sign: 1,
      quantity: qty,
    });
  }
  for (const opening of ctx.openings) {
    if (opening.count === null || opening.widthM === null || opening.heightM === null) {
      return { error: `Opening ${opening.code} is incomplete.` };
    }
    const qty = roundHalfUp(product(opening.count, opening.widthM, opening.heightM, ctx.structure.wallThicknessM), 6).toNumber();
    lines.push({
      label: `Deduction ${opening.code}`,
      count: opening.count,
      lengthM: opening.widthM,
      breadthM: opening.heightM,
      depthOrHeightM: ctx.structure.wallThicknessM,
      formulaText: 'count × width × height × thickness',
      sourceFactIds: [opening.id],
      sign: -1,
      quantity: qty,
    });
  }
  return lines;
}

function memberLines(ctx: RuleContext, kinds: string[], labelPrefix: string): QuantityResult['lines'] | { error: string } {
  const selected = ctx.members.filter((member) => kinds.includes(member.kind));
  if (!selected.length) return { error: 'No matching member groups.' };
  const lines: QuantityResult['lines'] = [];
  for (const member of selected) {
    if (member.count === null || member.lengthM === null || member.breadthM === null || member.depthM === null) {
      return { error: `${member.kind} is missing count or section.` };
    }
    const qty = roundHalfUp(product(member.count, member.lengthM, member.breadthM, member.depthM), 6).toNumber();
    lines.push({
      label: `${labelPrefix} · ${member.kind}`,
      count: member.count,
      lengthM: member.lengthM,
      breadthM: member.breadthM,
      depthOrHeightM: member.depthM,
      formulaText: 'count × length × breadth × depth',
      sourceFactIds: [member.id],
      sign: 1,
      quantity: qty,
    });
  }
  return lines;
}

export const GENERIC_DRAFT_RULES: MeasurementRule[] = [
  {
    ruleId: 'draft.excavation.v1',
    name: 'Excavation in foundation trenches',
    status: 'DRAFT',
    unit: 'cum',
    catalogueItemNumber: null,
    requiredFacts: ['confirmedWalls', 'foundationWidth', 'excavationDepth'],
    formulaText: 'Confirmed wall length × foundation width × (ground beam + soling depth)',
    evidenceNote: 'Ordinary fact-driven draft. Not Gut-193 workbook lengths.',
    goTo: 'profile',
    isApplicable: (ctx) => {
      if (isEknath(ctx)) return 'NOT_APPLICABLE';
      if (ctx.structure.geometryStatus === 'CONFIRMED' || ctx.derived.confirmedWalls.length || ctx.structure.foundationWidthM !== null) {
        return 'APPLICABLE';
      }
      return 'NOT_APPLICABLE';
    },
    missingFacts: (ctx) => {
      const missing = trenchMissing(ctx);
      if (ctx.derived.excavationDepthM === null) missing.push('excavationDepth');
      return missing;
    },
    compute: (ctx) => {
      if (isEknath(ctx)) return { error: 'Use Eknath source-profile excavation on this plan.' };
      if (trenchMissing(ctx).length || ctx.derived.excavationDepthM === null) {
        return { error: 'Need confirmed walls, foundation width, ground beam depth, and soling depth.' };
      }
      const lines = trenchLines(ctx, ctx.derived.excavationDepthM, 'Excavation');
      return {
        title: 'Excavation',
        unit: 'cum',
        formulaText: 'Σ confirmed walls × foundation width × excavation depth',
        lines,
        derivedNet: netOf(lines, 2),
        sourceFactIds: [ctx.structure.id],
        evidenceNote: 'DRAFT — ordinary wall-run trench',
        catalogueItemNumber: null,
      };
    },
  },
  {
    ruleId: 'draft.soling.v1',
    name: 'Soling in foundation',
    status: 'DRAFT',
    unit: 'cum',
    catalogueItemNumber: null,
    requiredFacts: ['confirmedWalls', 'foundationWidth', 'solingDepth'],
    formulaText: 'Confirmed wall length × foundation width × soling depth',
    evidenceNote: 'Ordinary fact-driven draft.',
    goTo: 'profile',
    isApplicable: (ctx) => {
      if (isEknath(ctx)) return 'NOT_APPLICABLE';
      if (ctx.structure.geometryStatus === 'CONFIRMED' || ctx.derived.confirmedWalls.length || ctx.structure.foundationWidthM !== null) {
        return 'APPLICABLE';
      }
      return 'NOT_APPLICABLE';
    },
    missingFacts: (ctx) => {
      const missing = trenchMissing(ctx);
      if (ctx.derived.solingDepthM === null) missing.push('solingDepth');
      return missing;
    },
    compute: (ctx) => {
      if (ctx.derived.solingDepthM === null) return { error: 'Soling depth is required.' };
      const lines = trenchLines(ctx, ctx.derived.solingDepthM, 'Soling');
      return {
        title: 'Soling',
        unit: 'cum',
        formulaText: 'Σ confirmed walls × foundation width × soling depth',
        lines,
        derivedNet: netOf(lines, 2),
        sourceFactIds: [ctx.structure.id],
        evidenceNote: 'DRAFT — ordinary wall-run trench',
        catalogueItemNumber: null,
      };
    },
  },
  {
    ruleId: 'draft.ground-beam.v1',
    name: 'RCC / concrete in ground beam',
    status: 'DRAFT',
    unit: 'cum',
    catalogueItemNumber: null,
    requiredFacts: ['confirmedWalls', 'foundationWidth', 'groundBeamDepth'],
    formulaText: 'Confirmed wall length × foundation width × ground beam depth',
    evidenceNote: 'Ordinary fact-driven draft.',
    goTo: 'profile',
    isApplicable: (ctx) => {
      if (isEknath(ctx)) return 'NOT_APPLICABLE';
      if (ctx.structure.geometryStatus === 'CONFIRMED' || ctx.derived.confirmedWalls.length || ctx.structure.foundationWidthM !== null) {
        return 'APPLICABLE';
      }
      return 'NOT_APPLICABLE';
    },
    missingFacts: (ctx) => {
      const missing = trenchMissing(ctx);
      if (ctx.derived.groundBeamDepthM === null) missing.push('groundBeamDepth');
      return missing;
    },
    compute: (ctx) => {
      if (ctx.derived.groundBeamDepthM === null) return { error: 'Ground beam depth is required.' };
      const lines = trenchLines(ctx, ctx.derived.groundBeamDepthM, 'Ground beam');
      return {
        title: 'RCC / concrete in ground beam',
        unit: 'cum',
        formulaText: 'Σ confirmed walls × foundation width × ground beam depth',
        lines,
        derivedNet: netOf(lines, 2),
        sourceFactIds: [ctx.structure.id],
        evidenceNote: 'DRAFT — ordinary wall-run trench',
        catalogueItemNumber: null,
      };
    },
  },
  {
    ruleId: 'draft.wall-masonry.v1',
    name: 'Wall masonry (material typed on structure)',
    status: 'DRAFT',
    unit: 'cum',
    catalogueItemNumber: null,
    requiredFacts: ['confirmedWalls', 'wallThickness', 'storeyHeight', 'openings'],
    formulaText: 'Confirmed wall volume minus opening volumes',
    evidenceNote: 'Ordinary fact-driven draft. Applies when wall material is selected.',
    goTo: 'walls',
    isApplicable: (ctx) => {
      if (isEknath(ctx)) return 'NOT_APPLICABLE';
      return hasText(ctx.structure.wallMaterialText) ? 'APPLICABLE' : 'NOT_APPLICABLE';
    },
    missingFacts: (ctx) => {
      const missing: FactKey[] = [];
      if (!ctx.derived.confirmedWalls.length) missing.push('confirmedWalls');
      if (ctx.structure.wallThicknessM === null) missing.push('wallThickness');
      if (ctx.structure.storeyHeightM === null) missing.push('storeyHeight');
      if (ctx.openings.some((o) => o.count === null || o.widthM === null || o.heightM === null)) missing.push('openings');
      return missing;
    },
    compute: (ctx) => {
      const lines = wallVolumeLines(ctx);
      if ('error' in lines) return lines;
      const material = ctx.structure.wallMaterialText.trim();
      return {
        title: `Wall masonry (${material})`,
        unit: 'cum',
        formulaText: 'Confirmed walls × thickness × height − openings',
        lines,
        derivedNet: netOf(lines, 2),
        sourceFactIds: [ctx.structure.id],
        evidenceNote: 'DRAFT — select catalogue rate on Review',
        catalogueItemNumber: null,
      };
    },
  },
  {
    ruleId: 'draft.floor-finish.v1',
    name: 'Floor finish from room areas',
    status: 'DRAFT',
    unit: 'sqm',
    catalogueItemNumber: null,
    requiredFacts: ['rooms'],
    formulaText: 'Sum of room length × breadth',
    evidenceNote: 'Applies when a floor finish is selected.',
    goTo: 'rooms',
    isApplicable: (ctx) => {
      if (isEknath(ctx)) return 'NOT_APPLICABLE';
      if (!hasText(ctx.structure.floorFinish)) return 'NOT_APPLICABLE';
      return ctx.rooms.length ? 'APPLICABLE' : 'NOT_APPLICABLE';
    },
    missingFacts: (ctx) => (ctx.derived.roomAreas.length ? [] : ['rooms']),
    compute: (ctx) => {
      if (!ctx.derived.roomAreas.length) return { error: 'Add room sizes first.' };
      const lines = ctx.derived.roomAreas.map((room) => ({
        label: room.code,
        count: 1,
        lengthM: room.lengthM,
        breadthM: room.breadthM,
        depthOrHeightM: 1,
        formulaText: 'length × breadth',
        sourceFactIds: [room.roomId],
        sign: 1 as const,
        quantity: room.areaM2,
      }));
      return {
        title: `Floor finish (${ctx.structure.floorFinish.trim()})`,
        unit: 'sqm',
        formulaText: 'Σ room length × breadth',
        lines,
        derivedNet: netOf(lines, 2),
        sourceFactIds: [ctx.structure.id],
        evidenceNote: 'DRAFT',
        catalogueItemNumber: null,
      };
    },
  },
  {
    ruleId: 'draft.ceiling-roof.v1',
    name: 'Roof / ceiling from room areas',
    status: 'DRAFT',
    unit: 'sqm',
    catalogueItemNumber: null,
    requiredFacts: ['rooms'],
    formulaText: 'Sum of room length × breadth',
    evidenceNote: 'Applies when a roof / ceiling finish is selected.',
    goTo: 'rooms',
    isApplicable: (ctx) => {
      if (isEknath(ctx)) return 'NOT_APPLICABLE';
      if (!hasText(ctx.structure.roofFinish)) return 'NOT_APPLICABLE';
      return ctx.rooms.length ? 'APPLICABLE' : 'NOT_APPLICABLE';
    },
    missingFacts: (ctx) => (ctx.derived.roomAreas.length ? [] : ['rooms']),
    compute: (ctx) => {
      if (!ctx.derived.roomAreas.length) return { error: 'Add room sizes first.' };
      const lines = ctx.derived.roomAreas.map((room) => ({
        label: room.code,
        count: 1,
        lengthM: room.lengthM,
        breadthM: room.breadthM,
        depthOrHeightM: 1,
        formulaText: 'length × breadth',
        sourceFactIds: [room.roomId],
        sign: 1 as const,
        quantity: room.areaM2,
      }));
      return {
        title: `Roof / ceiling (${ctx.structure.roofFinish.trim()})`,
        unit: 'sqm',
        formulaText: 'Σ room length × breadth',
        lines,
        derivedNet: netOf(lines, 2),
        sourceFactIds: [ctx.structure.id],
        evidenceNote: 'DRAFT',
        catalogueItemNumber: null,
      };
    },
  },
  {
    ruleId: 'draft.external-plaster.v1',
    name: 'External plaster on confirmed walls',
    status: 'DRAFT',
    unit: 'sqm',
    catalogueItemNumber: null,
    requiredFacts: ['confirmedWalls', 'storeyHeight', 'openings'],
    formulaText: 'Confirmed wall length × height − opening areas',
    evidenceNote: 'Ordinary fact-driven draft.',
    goTo: 'walls',
    isApplicable: (ctx) => {
      if (isEknath(ctx)) return 'NOT_APPLICABLE';
      return (ctx.structure.geometryStatus === 'CONFIRMED' || ctx.walls.length > 0) ? 'APPLICABLE' : 'NOT_APPLICABLE';
    },
    missingFacts: (ctx) => {
      const missing: FactKey[] = [];
      if (!ctx.derived.confirmedWalls.length) missing.push('confirmedWalls');
      if (ctx.structure.storeyHeightM === null) missing.push('storeyHeight');
      if (ctx.openings.some((o) => o.count === null || o.widthM === null || o.heightM === null)) missing.push('openings');
      return missing;
    },
    compute: (ctx) => {
      if (ctx.structure.storeyHeightM === null) return { error: 'Storey height is required.' };
      const height = ctx.structure.storeyHeightM;
      const lines: QuantityResult['lines'] = ctx.derived.confirmedWalls.map((wall) => {
        const count = wall.count || 1;
        const qty = roundHalfUp(product(count, wall.lengthM, height), 4).toNumber();
        return {
          label: wall.label,
          count,
          lengthM: wall.lengthM,
          breadthM: height,
          depthOrHeightM: 1,
          formulaText: 'count × length × height',
          sourceFactIds: [wall.id],
          sign: 1 as const,
          quantity: qty,
        };
      });
      for (const opening of ctx.openings) {
        if (opening.count === null || opening.widthM === null || opening.heightM === null) {
          return { error: `Opening ${opening.code} is incomplete.` };
        }
        const qty = roundHalfUp(product(opening.count, opening.widthM, opening.heightM), 4).toNumber();
        lines.push({
          label: `Deduction ${opening.code}`,
          count: opening.count,
          lengthM: opening.widthM,
          breadthM: opening.heightM,
          depthOrHeightM: 1,
          formulaText: 'count × width × height',
          sourceFactIds: [opening.id],
          sign: -1,
          quantity: qty,
        });
      }
      return {
        title: 'External plaster',
        unit: 'sqm',
        formulaText: 'Confirmed wall faces − openings',
        lines,
        derivedNet: netOf(lines, 2),
        sourceFactIds: [ctx.structure.id],
        evidenceNote: 'DRAFT',
        catalogueItemNumber: null,
      };
    },
  },
  {
    ruleId: 'draft.internal-plaster.v1',
    name: 'Internal plaster from room perimeters',
    status: 'DRAFT',
    unit: 'sqm',
    catalogueItemNumber: null,
    requiredFacts: ['rooms', 'storeyHeight', 'openings'],
    formulaText: 'Σ 2×(L+B)×H for enclosed rooms − opening areas',
    evidenceNote: 'Ordinary fact-driven draft.',
    goTo: 'rooms',
    isApplicable: (ctx) => (isEknath(ctx) ? 'NOT_APPLICABLE' : (ctx.rooms.length ? 'APPLICABLE' : 'NOT_APPLICABLE')),
    missingFacts: (ctx) => {
      const missing: FactKey[] = [];
      if (!ctx.derived.roomAreas.length) missing.push('rooms');
      if (ctx.structure.storeyHeightM === null) missing.push('storeyHeight');
      if (ctx.openings.some((o) => o.count === null || o.widthM === null || o.heightM === null)) missing.push('openings');
      return missing;
    },
    compute: (ctx) => {
      if (ctx.structure.storeyHeightM === null) return { error: 'Storey height is required.' };
      const height = ctx.structure.storeyHeightM;
      const rooms = ctx.derived.roomAreas.filter((room) => room.enclosure !== 'OPEN');
      if (!rooms.length) return { error: 'No enclosed rooms for internal plaster.' };
      const lines: QuantityResult['lines'] = rooms.map((room) => {
        const perimeter = new Decimal(room.lengthM).plus(room.breadthM).mul(2);
        const qty = roundHalfUp(perimeter.mul(height), 4).toNumber();
        return {
          label: room.code,
          count: 1,
          lengthM: roundHalfUp(perimeter, 4).toNumber(),
          breadthM: height,
          depthOrHeightM: 1,
          formulaText: '2 × (L + B) × H',
          sourceFactIds: [room.roomId],
          sign: 1 as const,
          quantity: qty,
        };
      });
      for (const opening of ctx.openings) {
        if (opening.count === null || opening.widthM === null || opening.heightM === null) {
          return { error: `Opening ${opening.code} is incomplete.` };
        }
        const qty = roundHalfUp(product(opening.count, opening.widthM, opening.heightM), 4).toNumber();
        lines.push({
          label: `Deduction ${opening.code}`,
          count: opening.count,
          lengthM: opening.widthM,
          breadthM: opening.heightM,
          depthOrHeightM: 1,
          formulaText: 'count × width × height',
          sourceFactIds: [opening.id],
          sign: -1,
          quantity: qty,
        });
      }
      return {
        title: 'Internal plaster',
        unit: 'sqm',
        formulaText: 'Enclosed room perimeters × height − openings',
        lines,
        derivedNet: netOf(lines, 2),
        sourceFactIds: [ctx.structure.id],
        evidenceNote: 'DRAFT',
        catalogueItemNumber: null,
      };
    },
  },
  {
    ruleId: 'draft.rcc-columns.v1',
    name: 'RCC columns from member schedule',
    status: 'DRAFT',
    unit: 'cum',
    catalogueItemNumber: null,
    requiredFacts: ['members'],
    formulaText: 'Column count × length × breadth × depth',
    evidenceNote: 'Applies when COLUMN members are entered.',
    goTo: 'members',
    isApplicable: (ctx) => {
      if (isEknath(ctx)) return 'NOT_APPLICABLE';
      return ctx.members.some((m) => m.kind === 'COLUMN') ? 'APPLICABLE' : 'NOT_APPLICABLE';
    },
    missingFacts: (ctx) => {
      const columns = ctx.members.filter((m) => m.kind === 'COLUMN');
      return columns.every((m) => m.count !== null && m.lengthM !== null && m.breadthM !== null && m.depthM !== null) ? [] : ['members'];
    },
    compute: (ctx) => {
      const lines = memberLines(ctx, ['COLUMN'], 'Column');
      if ('error' in lines) return lines;
      return {
        title: 'RCC columns',
        unit: 'cum',
        formulaText: 'Σ column count × section × length',
        lines,
        derivedNet: netOf(lines, 2),
        sourceFactIds: [ctx.structure.id],
        evidenceNote: 'DRAFT',
        catalogueItemNumber: null,
      };
    },
  },
  {
    ruleId: 'draft.timber-members.v1',
    name: 'Timber / wood members',
    status: 'DRAFT',
    unit: 'cum',
    catalogueItemNumber: null,
    requiredFacts: ['members'],
    formulaText: 'Member count × length × breadth × depth',
    evidenceNote: 'Applies when posts, rafters, pauli, or balli are entered.',
    goTo: 'members',
    isApplicable: (ctx) => {
      if (isEknath(ctx)) return 'NOT_APPLICABLE';
      const kinds = new Set(['POST', 'RAFTER_X', 'RAFTER_Y', 'PAULI', 'BALLI']);
      return ctx.members.some((m) => kinds.has(m.kind)) ? 'APPLICABLE' : 'NOT_APPLICABLE';
    },
    missingFacts: (ctx) => {
      const kinds = new Set(['POST', 'RAFTER_X', 'RAFTER_Y', 'PAULI', 'BALLI']);
      const timber = ctx.members.filter((m) => kinds.has(m.kind));
      return timber.every((m) => m.count !== null && m.lengthM !== null && m.breadthM !== null && m.depthM !== null) ? [] : ['members'];
    },
    compute: (ctx) => {
      const lines = memberLines(ctx, ['POST', 'RAFTER_X', 'RAFTER_Y', 'PAULI', 'BALLI'], 'Timber');
      if ('error' in lines) return lines;
      return {
        title: 'Timber / wood members',
        unit: 'cum',
        formulaText: 'Σ timber member volumes',
        lines,
        derivedNet: netOf(lines, 2),
        sourceFactIds: [ctx.structure.id],
        evidenceNote: 'DRAFT',
        catalogueItemNumber: null,
      };
    },
  },
  {
    ruleId: 'draft.opening-area.v1',
    name: 'Opening area (doors / windows)',
    status: 'DRAFT',
    unit: 'sqm',
    catalogueItemNumber: null,
    requiredFacts: ['openings'],
    formulaText: 'Opening count × width × height',
    evidenceNote: 'Helper quantity for review; often used as deduction elsewhere.',
    goTo: 'openings',
    isApplicable: (ctx) => (isEknath(ctx) ? 'NOT_APPLICABLE' : (ctx.openings.length ? 'APPLICABLE' : 'NOT_APPLICABLE')),
    missingFacts: (ctx) => (ctx.openings.every((o) => o.count !== null && o.widthM !== null && o.heightM !== null) ? [] : ['openings']),
    compute: (ctx) => {
      const lines: QuantityResult['lines'] = [];
      for (const opening of ctx.openings) {
        if (opening.count === null || opening.widthM === null || opening.heightM === null) {
          return { error: `Opening ${opening.code} is incomplete.` };
        }
        const qty = roundHalfUp(product(opening.count, opening.widthM, opening.heightM), 4).toNumber();
        lines.push({
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
      return {
        title: 'Opening area',
        unit: 'sqm',
        formulaText: 'Σ openings',
        lines,
        derivedNet: netOf(lines, 2),
        sourceFactIds: [ctx.structure.id],
        evidenceNote: 'DRAFT helper',
        catalogueItemNumber: null,
      };
    },
  },
];
