import Decimal from 'decimal.js';
import { EKNATH_SOURCE_PROFILE, product } from '../derivedFacts';
import { eknathWorkbookTimberLines, isEknathWorkbookInternalPlasterRoom } from '../eknathWorkbookSchedule';
import { roundHalfUp } from '../engine';
import type { FactKey, MeasurementRule, QuantityResult, RuleContext } from './types';

function profileOrSkip(ctx: RuleContext): string | null {
  if (ctx.derived.profileId !== EKNATH_SOURCE_PROFILE) {
    return 'Eknath source-profile draft rules apply only when a confirmed 4×2 unequal Gut-193-like plan is present.';
  }
  return null;
}

function foundationMissing(ctx: RuleContext): FactKey[] {
  const missing: FactKey[] = [];
  if (ctx.derived.foundationLongLengthM === null) missing.push('spans');
  if (ctx.derived.foundationShortLengthAM === null || ctx.derived.foundationShortLengthBM === null) missing.push('spans');
  if (ctx.derived.foundationWidthM === null) missing.push('foundationWidth');
  if (ctx.derived.excavationDepthM === null) missing.push('excavationDepth');
  return missing;
}

function foundationLines(
  ctx: RuleContext,
  depthM: number,
  labelPrefix: string
): QuantityResult['lines'] {
  const width = ctx.derived.foundationWidthM!;
  const longL = ctx.derived.foundationLongLengthM!;
  const shortA = ctx.derived.foundationShortLengthAM!;
  const shortB = ctx.derived.foundationShortLengthBM!;
  const mk = (label: string, count: number, lengthM: number, source: string) => {
    const qty = roundHalfUp(product(count, lengthM, width, depthM), 6).toNumber();
    return {
      label,
      count,
      lengthM,
      breadthM: width,
      depthOrHeightM: depthM,
      formulaText: 'count × length × breadth × depth',
      sourceFactIds: [source, ctx.structure.id],
      sign: 1 as const,
      quantity: qty,
    };
  };
  return [
    mk(`${labelPrefix} long wall`, 3, longL, 'derived.foundationLong'),
    mk(`${labelPrefix} short wall A`, 5, shortA, 'derived.foundationShortA'),
    mk(`${labelPrefix} short wall B`, 5, shortB, 'derived.foundationShortB'),
  ];
}

function netOf(lines: QuantityResult['lines'], places = 2): number {
  let net = new Decimal(0);
  for (const line of lines) {
    net = line.sign === -1 ? net.minus(line.quantity) : net.plus(line.quantity);
  }
  return roundHalfUp(net, places).toNumber();
}

export const EKNATH_SOURCE_DRAFT_RULES: MeasurementRule[] = [
  {
    ruleId: 'eknath.excavation.v1',
    name: 'Excavation (source draft — RA 1)',
    status: 'DRAFT',
    unit: 'cum',
    catalogueItemNumber: '1',
    requiredFacts: ['geometryConfirmed', 'spans', 'foundationWidth', 'excavationDepth'],
    formulaText: 'Foundation runs × breadth × (ground beam depth + soling depth)',
    evidenceNote: 'SOURCE-DERIVED Gut 193 MS excavation grouping. DRAFT only.',
    goTo: 'profile',
    isApplicable: (ctx) => (profileOrSkip(ctx) ? 'NOT_APPLICABLE' : 'APPLICABLE'),
    missingFacts: foundationMissing,
    compute: (ctx) => {
      const skip = profileOrSkip(ctx);
      if (skip) return { error: skip };
      const missing = foundationMissing(ctx);
      if (missing.length) return { error: `Missing facts: ${missing.join(', ')}` };
      const lines = foundationLines(ctx, ctx.derived.excavationDepthM!, 'Excavation');
      return {
        title: 'Excavation',
        unit: 'cum',
        formulaText: '3×L×0.25×0.40 + 5×SA×0.25×0.40 + 5×SB×0.25×0.40 (source draft lengths)',
        lines,
        derivedNet: netOf(lines, 2),
        sourceFactIds: [ctx.structure.id],
        evidenceNote: 'EKNATH_GUT193_DRAFT',
        catalogueItemNumber: '1',
      };
    },
  },
  {
    ruleId: 'eknath.soling.v1',
    name: 'Rubble stone soling (source draft — RA 4)',
    status: 'DRAFT',
    unit: 'cum',
    catalogueItemNumber: '4',
    requiredFacts: ['geometryConfirmed', 'spans', 'foundationWidth', 'solingDepth'],
    formulaText: 'Same foundation runs × breadth × soling depth',
    evidenceNote: 'SOURCE-DERIVED Gut 193 soling. DRAFT only.',
    goTo: 'profile',
    isApplicable: (ctx) => (profileOrSkip(ctx) ? 'NOT_APPLICABLE' : 'APPLICABLE'),
    missingFacts: (ctx) => {
      const missing = foundationMissing(ctx).filter((key) => key !== 'excavationDepth');
      if (ctx.derived.solingDepthM === null) missing.push('solingDepth');
      return missing;
    },
    compute: (ctx) => {
      if (profileOrSkip(ctx)) return { error: profileOrSkip(ctx)! };
      if (ctx.derived.solingDepthM === null || foundationMissing(ctx).length) {
        return { error: 'Soling depth and foundation runs are required.' };
      }
      const lines = foundationLines(ctx, ctx.derived.solingDepthM, 'Soling');
      return {
        title: 'Rubble stone soling',
        unit: 'cum',
        formulaText: 'Foundation plan × soling depth',
        lines,
        derivedNet: netOf(lines, 2),
        sourceFactIds: [ctx.structure.id],
        evidenceNote: 'EKNATH_GUT193_DRAFT',
        catalogueItemNumber: '4',
      };
    },
  },
  {
    ruleId: 'eknath.rcc-beam.v1',
    name: 'RCC M-20 ground beam (source draft — RA 21)',
    status: 'DRAFT',
    unit: 'cum',
    catalogueItemNumber: '21',
    requiredFacts: ['geometryConfirmed', 'spans', 'foundationWidth', 'groundBeamDepth'],
    formulaText: 'Same foundation runs × breadth × ground beam depth',
    evidenceNote: 'SOURCE-DERIVED Gut 193 RCC beam. DRAFT only.',
    goTo: 'profile',
    isApplicable: (ctx) => (profileOrSkip(ctx) ? 'NOT_APPLICABLE' : 'APPLICABLE'),
    missingFacts: (ctx) => {
      const missing = foundationMissing(ctx).filter((key) => key !== 'excavationDepth');
      if (ctx.derived.groundBeamDepthM === null) missing.push('groundBeamDepth');
      return missing;
    },
    compute: (ctx) => {
      if (profileOrSkip(ctx) || ctx.derived.groundBeamDepthM === null) {
        return { error: 'Ground beam depth and foundation runs are required.' };
      }
      const lines = foundationLines(ctx, ctx.derived.groundBeamDepthM, 'RCC ground beam');
      return {
        title: 'RCC M-20 beams / lintels',
        unit: 'cum',
        formulaText: 'Foundation plan × ground beam depth',
        lines,
        derivedNet: netOf(lines, 2),
        sourceFactIds: [ctx.structure.id],
        evidenceNote: 'EKNATH_GUT193_DRAFT',
        catalogueItemNumber: '21',
      };
    },
  },
  {
    ruleId: 'eknath.tmt-steel.v1',
    name: 'TMT FE-500 (source draft — RA 121)',
    status: 'DRAFT',
    unit: 'qtl',
    catalogueItemNumber: '121',
    requiredFacts: ['geometryConfirmed', 'columns', 'groundBeamDepth'],
    formulaText: 'ROUND((RCC beam cum + column cum) × 50 / 100, 2) — source sheet factor',
    evidenceNote: '50 kg/m³ appears on this workbook only. DRAFT / not universal.',
    goTo: 'members',
    isApplicable: (ctx) => (profileOrSkip(ctx) ? 'NOT_APPLICABLE' : 'REQUIRES_CONFIRMATION'),
    missingFacts: (ctx) => {
      const missing: FactKey[] = [];
      if (ctx.derived.groundBeamDepthM === null) missing.push('groundBeamDepth');
      if (!ctx.members.some((m) => m.kind === 'COLUMN' && m.count !== null)) missing.push('columns');
      return missing;
    },
    compute: (ctx) => {
      if (profileOrSkip(ctx) || ctx.derived.groundBeamDepthM === null || ctx.derived.foundationWidthM === null) {
        return { error: 'Beam and column facts are required for source steel draft.' };
      }
      const beamLines = foundationLines(ctx, ctx.derived.groundBeamDepthM, 'RCC ground beam');
      const beamCum = netOf(beamLines, 4);
      const columnCum = ctx.derived.columnVolumeM3;
      if (!(columnCum > 0)) return { error: 'Enter confirmed column members (count × section × height).' };
      const qtl = roundHalfUp(new Decimal(beamCum).plus(columnCum).mul(50).div(100), 2).toNumber();
      return {
        title: 'TMT FE-500',
        unit: 'qtl',
        formulaText: '(beam cum + column cum) × 50 / 100',
        lines: [{
          label: 'Steel from RCC volumes',
          count: 1,
          lengthM: beamCum,
          breadthM: columnCum,
          depthOrHeightM: 0.5,
          formulaText: '(beam + columns) × 0.50 qtl/cum',
          sourceFactIds: [ctx.structure.id],
          sign: 1,
          quantity: qtl,
        }],
        derivedNet: qtl,
        sourceFactIds: [ctx.structure.id],
        evidenceNote: 'EKNATH_GUT193_DRAFT steel factor 50 kg/m³',
        catalogueItemNumber: '121',
        requiresConfirmationNote: 'Steel factor is source-sheet specific. Confirm before accepting.',
      };
    },
  },
  {
    ruleId: 'eknath.aac-masonry.v1',
    name: 'AAC block masonry (source draft — RA 19.1)',
    status: 'DRAFT',
    unit: 'cum',
    catalogueItemNumber: '19.1',
    requiredFacts: ['geometryConfirmed', 'wallThickness', 'storeyHeight', 'spans', 'openings'],
    formulaText: 'Source masonry runs × thickness × height − opening volumes',
    evidenceNote: 'SOURCE-DERIVED Gut 193 AAC. Item number is the string 19.1. DRAFT only.',
    goTo: 'walls',
    isApplicable: (ctx) => (profileOrSkip(ctx) ? 'NOT_APPLICABLE' : 'APPLICABLE'),
    missingFacts: (ctx) => {
      const missing: FactKey[] = [];
      if (ctx.derived.masonryLongLengthM === null) missing.push('spans');
      if (ctx.derived.effectiveThicknessM === null) missing.push('wallThickness');
      if (ctx.derived.effectiveHeightM === null) missing.push('storeyHeight');
      if (ctx.openings.some((o) => o.count === null || o.widthM === null || o.heightM === null)) missing.push('openings');
      return missing;
    },
    compute: (ctx) => {
      if (profileOrSkip(ctx)) return { error: profileOrSkip(ctx)! };
      const t = ctx.derived.effectiveThicknessM;
      const h = ctx.derived.effectiveHeightM;
      const longL = ctx.derived.masonryLongLengthM;
      const shortA = ctx.structure.rowSpansM?.[0];
      const shortB = ctx.structure.rowSpansM?.[1];
      if (t === null || h === null || longL === null || shortA === undefined || shortB === undefined) {
        return { error: 'Masonry lengths, thickness, and height are required.' };
      }
      for (const opening of ctx.openings) {
        if (opening.count === null || opening.widthM === null || opening.heightM === null) {
          return { error: `Opening ${opening.code} is incomplete.` };
        }
      }
      const lines: QuantityResult['lines'] = [
        {
          label: 'AAC long wall',
          count: 3,
          lengthM: longL,
          breadthM: t,
          depthOrHeightM: h,
          formulaText: 'count × length × thickness × height',
          sourceFactIds: [ctx.structure.id],
          sign: 1,
          quantity: roundHalfUp(product(3, longL, t, h), 6).toNumber(),
        },
        {
          label: 'AAC short wall A',
          count: 5,
          lengthM: shortA,
          breadthM: t,
          depthOrHeightM: h,
          formulaText: 'count × length × thickness × height',
          sourceFactIds: [ctx.structure.id],
          sign: 1,
          quantity: roundHalfUp(product(5, shortA, t, h), 6).toNumber(),
        },
        {
          label: 'AAC short wall B',
          count: 5,
          lengthM: shortB,
          breadthM: t,
          depthOrHeightM: h,
          formulaText: 'count × length × thickness × height',
          sourceFactIds: [ctx.structure.id],
          sign: 1,
          quantity: roundHalfUp(product(5, shortB, t, h), 6).toNumber(),
        },
      ];
      for (const opening of ctx.openings) {
        const qty = roundHalfUp(product(opening.count!, opening.widthM!, opening.heightM!, t), 6).toNumber();
        lines.push({
          label: `Deduction ${opening.code}`,
          count: opening.count!,
          lengthM: opening.widthM!,
          breadthM: opening.heightM!,
          depthOrHeightM: t,
          formulaText: 'count × width × height × thickness',
          sourceFactIds: [opening.id],
          sign: -1,
          quantity: qty,
        });
      }
      return {
        title: 'AAC block masonry',
        unit: 'cum',
        formulaText: 'Source masonry runs − opening volumes',
        lines,
        derivedNet: netOf(lines, 2),
        sourceFactIds: [ctx.structure.id, ...ctx.openings.map((o) => o.id)],
        evidenceNote: 'EKNATH_GUT193_DRAFT',
        catalogueItemNumber: '19.1',
      };
    },
  },
  {
    ruleId: 'eknath.rcc-column.v1',
    name: 'RCC columns (source draft — RA 6 as used in workbook)',
    status: 'DRAFT',
    unit: 'cum',
    catalogueItemNumber: '6',
    requiredFacts: ['columns'],
    formulaText: 'Column count × section × height from member facts',
    evidenceNote: 'Workbook uses item 6 under a column heading. Item 26 exists and was not chosen. DRAFT.',
    goTo: 'members',
    isApplicable: (ctx) => (profileOrSkip(ctx) ? 'NOT_APPLICABLE' : 'REQUIRES_CONFIRMATION'),
    missingFacts: (ctx) => (ctx.derived.columnVolumeM3 > 0 ? [] : ['columns']),
    compute: (ctx) => {
      const columns = ctx.members.filter((m) => m.kind === 'COLUMN');
      if (!columns.length) return { error: 'No COLUMN members entered.' };
      const lines: QuantityResult['lines'] = [];
      for (const member of columns) {
        if (member.count === null || member.lengthM === null || member.breadthM === null || member.depthM === null) {
          return { error: 'Each column needs count and three sizes. Blank count is not zero.' };
        }
        lines.push({
          label: 'RCC column',
          count: member.count,
          lengthM: member.lengthM,
          breadthM: member.breadthM,
          depthOrHeightM: member.depthM,
          formulaText: 'count × length × breadth × depth',
          sourceFactIds: [member.id],
          sign: 1,
          quantity: roundHalfUp(product(member.count, member.lengthM, member.breadthM, member.depthM), 6).toNumber(),
        });
      }
      return {
        title: 'RCC columns',
        unit: 'cum',
        formulaText: 'Column members volume',
        lines,
        derivedNet: netOf(lines, 2),
        sourceFactIds: columns.map((m) => m.id),
        evidenceNote: 'EKNATH_GUT193_DRAFT uses RA item 6 as in the workbook',
        catalogueItemNumber: '6',
        requiresConfirmationNote: 'Confirm item 6 vs 26 with the office before treating as production.',
      };
    },
  },
  {
    ruleId: 'eknath.jungle-wood.v1',
    name: 'Jungle wood (source draft — RA 68)',
    status: 'DRAFT',
    unit: 'cum',
    catalogueItemNumber: '68',
    requiredFacts: ['geometryConfirmed'],
    formulaText: 'Engineer timber members, or workbook MS wood schedule when members are not fully entered',
    evidenceNote: 'SOURCE-DERIVED. Prefers entered members; otherwise uses Gut 193 MS wood rows (posts 0.08×0.10, etc.).',
    goTo: 'members',
    isApplicable: (ctx) => (profileOrSkip(ctx) ? 'NOT_APPLICABLE' : 'APPLICABLE'),
    missingFacts: () => [],
    compute: (ctx) => {
      const timber = ctx.members.filter((m) =>
        ['POST', 'RAFTER_X', 'RAFTER_Y', 'PAULI', 'BALLI'].includes(m.kind)
      );
      const complete = timber.filter(
        (m) => m.count !== null && m.lengthM !== null && m.breadthM !== null && m.depthM !== null
      );
      if (complete.length > 0 && complete.length === timber.length && timber.length > 0) {
        const lines: QuantityResult['lines'] = complete.map((member) => ({
          label: member.kind,
          count: member.count!,
          lengthM: member.lengthM!,
          breadthM: member.breadthM!,
          depthOrHeightM: member.depthM!,
          formulaText: 'count × length × breadth × depth',
          sourceFactIds: [member.id],
          sign: 1 as const,
          quantity: roundHalfUp(product(member.count!, member.lengthM!, member.breadthM!, member.depthM!), 6).toNumber(),
        }));
        return {
          title: 'Jungle wood',
          unit: 'cum',
          formulaText: 'Entered timber member volumes',
          lines,
          derivedNet: netOf(lines, 2),
          sourceFactIds: complete.map((m) => m.id),
          evidenceNote: 'EKNATH_GUT193_DRAFT from engineer members',
          catalogueItemNumber: '68',
        };
      }
      const lines = eknathWorkbookTimberLines(ctx.structure.id);
      return {
        title: 'Jungle wood',
        unit: 'cum',
        formulaText: 'Workbook MS wood schedule (posts + rafters + Pauli)',
        lines,
        derivedNet: netOf(lines, 2),
        sourceFactIds: [ctx.structure.id, 'eknath.workbook.timber'],
        evidenceNote: 'EKNATH_GUT193_DRAFT workbook timber schedule — replace with measured members when available',
        catalogueItemNumber: '68',
        requiresConfirmationNote: 'Timber lines follow the Gut 193 MS schedule until you enter measured members.',
      };
    },
  },
  {
    ruleId: 'eknath.ceramic-floor.v1',
    name: 'Ceramic tiles (source draft — RA 112)',
    status: 'DRAFT',
    unit: 'sqm',
    catalogueItemNumber: '112',
    requiredFacts: ['rooms'],
    formulaText: 'Sum of room length × breadth (reuses room facts)',
    evidenceNote: 'SOURCE-DERIVED floor from rooms. Open rooms still listed for confirmation.',
    goTo: 'rooms',
    isApplicable: (ctx) => (ctx.rooms.length ? (profileOrSkip(ctx) ? 'NOT_APPLICABLE' : 'APPLICABLE') : 'NOT_APPLICABLE'),
    missingFacts: (ctx) => (ctx.rooms.every((r) => r.lengthM !== null && r.breadthM !== null) ? [] : ['rooms']),
    compute: (ctx) => {
      const lines: QuantityResult['lines'] = [];
      for (const room of ctx.rooms) {
        if (room.lengthM === null || room.breadthM === null) return { error: `Room ${room.code} incomplete.` };
        lines.push({
          label: `${room.code}${room.enclosure === 'OPEN' ? ' (open — confirm)' : ''}`,
          count: 1,
          lengthM: room.lengthM,
          breadthM: room.breadthM,
          depthOrHeightM: 1,
          formulaText: 'length × breadth',
          sourceFactIds: [room.id],
          sign: 1,
          quantity: roundHalfUp(product(room.lengthM, room.breadthM), 4).toNumber(),
        });
      }
      return {
        title: 'Ceramic tiles',
        unit: 'sqm',
        formulaText: 'Room areas',
        lines,
        derivedNet: netOf(lines, 2),
        sourceFactIds: ctx.rooms.map((r) => r.id),
        evidenceNote: 'EKNATH_GUT193_DRAFT',
        catalogueItemNumber: '112',
      };
    },
  },
  {
    ruleId: 'eknath.ceiling.v1',
    name: 'Wood plank ceiling (source draft — RA 98)',
    status: 'DRAFT',
    unit: 'sqm',
    catalogueItemNumber: '98',
    requiredFacts: ['spans', 'wallThickness'],
    formulaText: 'Outer overall length × outer overall breadth (source draft envelope)',
    evidenceNote: 'Workbook uses 15.25 × 12.10. R2 deduction row is a known sheet defect — not auto-applied.',
    goTo: 'profile',
    isApplicable: (ctx) => (profileOrSkip(ctx) ? 'NOT_APPLICABLE' : 'REQUIRES_CONFIRMATION'),
    missingFacts: (ctx) => {
      const missing: FactKey[] = [];
      if (ctx.derived.masonryLongLengthM === null || ctx.derived.overallOuterBreadthM === null) missing.push('spans');
      return missing;
    },
    compute: (ctx) => {
      const L = ctx.derived.masonryLongLengthM;
      const B = ctx.derived.overallOuterBreadthM;
      if (L === null || B === null) return { error: 'Outer envelope lengths are required.' };
      const qty = roundHalfUp(product(L, B), 2).toNumber();
      return {
        title: 'Non-teak wood plank ceiling',
        unit: 'sqm',
        formulaText: 'overall outer length × overall outer breadth',
        lines: [{
          label: 'Ceiling envelope',
          count: 1,
          lengthM: L,
          breadthM: B,
          depthOrHeightM: 1,
          formulaText: 'L × B',
          sourceFactIds: [ctx.structure.id],
          sign: 1,
          quantity: qty,
        }],
        derivedNet: qty,
        sourceFactIds: [ctx.structure.id],
        evidenceNote: 'EKNATH_GUT193_DRAFT — workbook R2 ceiling deduction not auto-applied',
        catalogueItemNumber: '98',
        requiresConfirmationNote: 'Confirm whether any open-room ceiling deduction applies.',
      };
    },
  },
  {
    ruleId: 'eknath.external-plaster.v1',
    name: 'External sand-faced plaster (source draft — RA 30)',
    status: 'DRAFT',
    unit: 'sqm',
    catalogueItemNumber: '30',
    requiredFacts: ['spans', 'storeyHeight', 'wallThickness'],
    formulaText: '2 × L × H + 2 × B × H (no opening deduction on source sheet)',
    evidenceNote: 'SOURCE-DERIVED external envelope. DRAFT only.',
    goTo: 'profile',
    isApplicable: (ctx) => (profileOrSkip(ctx) ? 'NOT_APPLICABLE' : 'APPLICABLE'),
    missingFacts: (ctx) => {
      const missing: FactKey[] = [];
      if (ctx.derived.masonryLongLengthM === null || ctx.derived.overallOuterBreadthM === null) missing.push('spans');
      if (ctx.derived.effectiveHeightM === null) missing.push('storeyHeight');
      return missing;
    },
    compute: (ctx) => {
      const L = ctx.derived.masonryLongLengthM;
      const B = ctx.derived.overallOuterBreadthM;
      const H = ctx.derived.effectiveHeightM;
      if (L === null || B === null || H === null) return { error: 'Envelope and height required.' };
      const qty = roundHalfUp(new Decimal(2).mul(L).mul(H).plus(new Decimal(2).mul(B).mul(H)), 2).toNumber();
      return {
        title: 'External sand-faced plaster',
        unit: 'sqm',
        formulaText: '2×L×H + 2×B×H',
        lines: [{
          label: 'External envelope',
          count: 1,
          lengthM: L,
          breadthM: B,
          depthOrHeightM: H,
          formulaText: '2×L×H + 2×B×H',
          sourceFactIds: [ctx.structure.id],
          sign: 1,
          quantity: qty,
        }],
        derivedNet: qty,
        sourceFactIds: [ctx.structure.id],
        evidenceNote: 'EKNATH_GUT193_DRAFT',
        catalogueItemNumber: '30',
      };
    },
  },
  {
    ruleId: 'eknath.internal-plaster.v1',
    name: 'Internal cement plaster (source draft — RA 29)',
    status: 'DRAFT',
    unit: 'sqm',
    catalogueItemNumber: '29',
    requiredFacts: ['rooms', 'storeyHeight', 'openings'],
    formulaText: 'Workbook-compatible: rooms with clear length ≠ 3.8 m (L+B)×H − opening faces',
    evidenceNote: 'SOURCE-DERIVED. Matches MS SUM(L142:L147) which omitted the 3.8 m bays (workbook R7/R8).',
    goTo: 'rooms',
    isApplicable: (ctx) => (profileOrSkip(ctx) ? 'NOT_APPLICABLE' : 'REQUIRES_CONFIRMATION'),
    missingFacts: (ctx) => {
      const missing: FactKey[] = [];
      if (ctx.derived.effectiveHeightM === null) missing.push('storeyHeight');
      if (!ctx.rooms.length) missing.push('rooms');
      return missing;
    },
    compute: (ctx) => {
      const H = ctx.derived.effectiveHeightM;
      if (H === null) return { error: 'Height required.' };
      const lines: QuantityResult['lines'] = [];
      const included = ctx.rooms.filter((room) => room.lengthM !== null && isEknathWorkbookInternalPlasterRoom(room.lengthM));
      for (const room of included) {
        if (room.lengthM === null || room.breadthM === null) return { error: `Room ${room.code} incomplete.` };
        const face = roundHalfUp(new Decimal(room.lengthM).plus(room.breadthM).mul(H), 4).toNumber();
        lines.push({
          label: `${room.code} internal face`,
          count: 1,
          lengthM: room.lengthM,
          breadthM: room.breadthM,
          depthOrHeightM: H,
          formulaText: '(L+B)×H',
          sourceFactIds: [room.id],
          sign: 1,
          quantity: face,
        });
      }
      for (const opening of ctx.openings) {
        if (opening.count === null || opening.widthM === null || opening.heightM === null) {
          return { error: `Opening ${opening.code} incomplete.` };
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
        title: 'Internal cement plaster',
        unit: 'sqm',
        formulaText: 'Σ(L+B)×H for non-3.8 m bays − openings (workbook-compatible)',
        lines,
        derivedNet: netOf(lines, 2),
        sourceFactIds: [...included.map((r) => r.id), ...ctx.openings.map((o) => o.id)],
        evidenceNote: 'EKNATH_GUT193_DRAFT workbook-compatible internal plaster',
        catalogueItemNumber: '29',
        requiresConfirmationNote: 'Uses workbook omission of 3.8 m bays. Confirm before accept.',
      };
    },
  },
  {
    ruleId: 'eknath.wood-frames.v1',
    name: 'Jungle-wood frames (source draft — RA 97)',
    status: 'DRAFT',
    unit: 'sqm',
    catalogueItemNumber: '97',
    requiredFacts: ['openings'],
    formulaText: 'Opening schedule area (count × width × height)',
    evidenceNote: 'Item 97 on the sheet is opening area in sqm, not frame section volume.',
    goTo: 'openings',
    isApplicable: (ctx) => (profileOrSkip(ctx) ? 'NOT_APPLICABLE' : 'APPLICABLE'),
    missingFacts: (ctx) => (ctx.openings.length ? [] : ['openings']),
    compute: (ctx) => {
      if (!ctx.openings.length) return { error: 'No openings entered.' };
      const lines: QuantityResult['lines'] = [];
      for (const opening of ctx.openings) {
        if (opening.count === null || opening.widthM === null || opening.heightM === null) {
          return { error: `Opening ${opening.code} incomplete.` };
        }
        lines.push({
          label: opening.code,
          count: opening.count,
          lengthM: opening.widthM,
          breadthM: opening.heightM,
          depthOrHeightM: 1,
          formulaText: 'count × width × height',
          sourceFactIds: [opening.id],
          sign: 1,
          quantity: roundHalfUp(product(opening.count, opening.widthM, opening.heightM), 4).toNumber(),
        });
      }
      return {
        title: 'Jungle-wood frames',
        unit: 'sqm',
        formulaText: 'Opening areas',
        lines,
        derivedNet: netOf(lines, 2),
        sourceFactIds: ctx.openings.map((o) => o.id),
        evidenceNote: 'EKNATH_GUT193_DRAFT',
        catalogueItemNumber: '97',
      };
    },
  },
];
