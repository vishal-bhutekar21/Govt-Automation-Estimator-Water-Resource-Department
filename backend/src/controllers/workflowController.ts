import fs from 'fs';
import path from 'path';
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import PDFDocument from 'pdfkit';
import { db } from '../database/db';
import { AuthRequest } from '../middleware/auth';
import { UserRole } from '../models/types';
import {
  abstractAmount,
  acceptedNet,
  applicabilityFor,
  applyDecision,
  buildDraftBlock,
  depreciateStructures,
  emptyStructureBlockers,
  hashBody,
  markBlocksForReview,
  matchCatalogue,
  proposeWallRuns,
  sourceReplay,
} from '../workflow/engine';
import {
  BuildingStructure,
  CalculationSnapshotRecord,
  CatalogueItemRecord,
  EvidenceType,
  MeasurementBlockFact,
  MemberFact,
  MemberKind,
  OpeningFact,
  RoomFact,
} from '../workflow/types';

const EVIDENCE_DIR = path.resolve(__dirname, '../../data/evidence');
const WRITERS: UserRole[] = ['ADMIN', 'ESTIMATOR'];
const EXPORTERS: UserRole[] = ['ADMIN', 'ESTIMATOR', 'CHECKER'];

function fail(res: Response, status: number, error: string, message: string): void {
  res.status(status).json({ error, message });
}

function canWrite(req: AuthRequest, res: Response): boolean {
  if (!req.user || !WRITERS.includes(req.user.role)) {
    fail(res, 403, 'FORBIDDEN', 'Preparation is limited to the estimator and administrator roles. This matrix is provisional and is not an office delegation order.');
    return false;
  }
  return true;
}

function canExport(req: AuthRequest, res: Response): boolean {
  if (!req.user || !EXPORTERS.includes(req.user.role)) {
    fail(res, 403, 'FORBIDDEN', 'Export is not available to the viewer role.');
    return false;
  }
  return true;
}

function requireBuildingCase(caseId: string, res: Response) {
  const valuationCase = db.cases.find((c) => c.id === caseId);
  if (!valuationCase) {
    fail(res, 404, 'NOT_FOUND', 'Valuation case not found.');
    return null;
  }
  if (valuationCase.workflow !== 'BUILDING') {
    fail(res, 409, 'LEGACY_CASE', 'This case stays on the legacy workflow. Its old measurements were not rewritten as rooms.');
    return null;
  }
  return valuationCase;
}

function bundle(caseId: string) {
  db.ensureWorkflowCollections();
  const valuationCase = db.cases.find((c) => c.id === caseId);
  const property = db.properties.find((p) => p.caseId === caseId);
  const structures = db.buildingStructures.filter((s) => s.caseId === caseId).sort((a, b) => a.sortOrder - b.sortOrder);
  const structureIds = new Set(structures.map((s) => s.id));
  return {
    case: valuationCase,
    property,
    structures,
    rooms: db.rooms.filter((r) => structureIds.has(r.structureId)),
    wallRuns: db.wallRuns.filter((w) => structureIds.has(w.structureId)),
    openings: db.openings.filter((o) => structureIds.has(o.structureId)),
    members: db.members.filter((m) => structureIds.has(m.structureId)),
    blocks: db.measurementBlocks.filter((b) => b.caseId === caseId),
    evidence: db.caseEvidence.filter((e) => e.caseId === caseId),
    snapshots: db.calculationSnapshots.filter((s) => s.caseId === caseId),
    depreciationDecision: db.depreciationDecisions.find((d) => d.caseId === caseId) || null,
    rateScheduleVersions: db.rateScheduleVersions,
    ypTables: db.ypTables.map((table) => ({ id: table.id, name: table.name, citation: table.citation, legacy: table.legacy, years: table.rows.length })),
  };
}

export const getWorkflowCase = (req: AuthRequest, res: Response): void => {
  const valuationCase = db.cases.find((c) => c.id === req.params.caseId);
  if (!valuationCase) {
    fail(res, 404, 'NOT_FOUND', 'Valuation case not found.');
    return;
  }
  res.status(200).json(bundle(req.params.caseId));
};

export const updateIdentity = (req: AuthRequest, res: Response): void => {
  if (!canWrite(req, res)) return;
  const valuationCase = requireBuildingCase(req.params.caseId, res);
  if (!valuationCase) return;
  const property = db.properties.find((p) => p.caseId === valuationCase.id);
  if (!property) {
    fail(res, 404, 'NOT_FOUND', 'Property identity was not found.');
    return;
  }
  const fields = ['ownerName', 'village', 'taluka', 'district', 'laCaseNumber', 'surveyNumber', 'houseNumber', 'additionalNotes'] as const;
  for (const field of fields) {
    if (req.body[field] !== undefined) (property as unknown as Record<string, string>)[field] = String(req.body[field]);
  }
  if (req.body.valuationDate) valuationCase.valuationDate = String(req.body.valuationDate);
  if (req.body.dateOfInspection) valuationCase.dateOfInspection = String(req.body.dateOfInspection);
  if (req.body.conflictingIdentifierNotes !== undefined) {
    valuationCase.conflictingIdentifierNotes = String(req.body.conflictingIdentifierNotes);
  }
  if (req.body.rateScheduleVersionId !== undefined) {
    valuationCase.rateScheduleVersionId = req.body.rateScheduleVersionId || null;
  }
  if (req.body.ypTableVersionId !== undefined) {
    valuationCase.ypTableVersionId = req.body.ypTableVersionId || null;
    resetDepreciation(valuationCase.id);
  }
  property.updatedAt = new Date().toISOString();
  valuationCase.updatedAt = property.updatedAt;
  db.save();
  res.status(200).json(bundle(valuationCase.id));
};

function resetDepreciation(caseId: string): void {
  const existing = db.depreciationDecisions.find((d) => d.caseId === caseId);
  if (existing) {
    existing.status = 'PENDING';
    existing.reason = 'An input that depreciation depends on changed.';
  }
}

export const addStructure = (req: AuthRequest, res: Response): void => {
  if (!canWrite(req, res)) return;
  const valuationCase = requireBuildingCase(req.params.caseId, res);
  if (!valuationCase) return;
  const name = String(req.body.name || '').trim();
  if (!name) {
    fail(res, 400, 'VALIDATION_ERROR', 'A structure needs a name, such as main house or tin shed.');
    return;
  }
  const structure: BuildingStructure = {
    id: `bldg-${uuidv4().slice(0, 8)}`,
    caseId: valuationCase.id,
    name,
    sortOrder: db.buildingStructures.filter((s) => s.caseId === valuationCase.id).length + 1,
    participation: 'INCLUDED',
    structureTypeText: '',
    wallMaterialText: '',
    wallThicknessM: null,
    storeyHeightM: null,
    constructionYear: null,
    usefulLifeYears: null,
    usefulLifeSource: 'NONE',
    floorFinish: '',
    roofFinish: '',
    externalFinish: '',
    internalFinish: '',
    updatedAt: new Date().toISOString(),
  };
  db.buildingStructures.push(structure);
  db.save();
  res.status(201).json({ structure, bundle: bundle(valuationCase.id) });
};

export const updateStructureProfile = (req: AuthRequest, res: Response): void => {
  if (!canWrite(req, res)) return;
  const structure = db.buildingStructures.find((s) => s.id === req.params.id);
  if (!structure) {
    fail(res, 404, 'NOT_FOUND', 'Structure not found.');
    return;
  }
  const beforeThickness = structure.wallThicknessM;
  const beforeYear = structure.constructionYear;
  const beforeLife = structure.usefulLifeYears;
  const body = req.body || {};
  if (body.name !== undefined) structure.name = String(body.name);
  if (body.participation === 'EXCLUDED' || body.participation === 'INCLUDED') structure.participation = body.participation;
  if (body.exclusionReason !== undefined) structure.exclusionReason = String(body.exclusionReason);
  if (body.structureTypeText !== undefined) structure.structureTypeText = String(body.structureTypeText);
  if (body.wallMaterialText !== undefined) structure.wallMaterialText = String(body.wallMaterialText);
  if (body.wallThicknessM !== undefined) structure.wallThicknessM = body.wallThicknessM === null || body.wallThicknessM === '' ? null : Number(body.wallThicknessM);
  if (body.storeyHeightM !== undefined) structure.storeyHeightM = body.storeyHeightM === null || body.storeyHeightM === '' ? null : Number(body.storeyHeightM);
  if (body.constructionYear !== undefined) structure.constructionYear = body.constructionYear === null || body.constructionYear === '' ? null : Number(body.constructionYear);
  if (body.usefulLifeYears !== undefined) {
    structure.usefulLifeYears = body.usefulLifeYears === null || body.usefulLifeYears === '' ? null : Number(body.usefulLifeYears);
    structure.usefulLifeSource = structure.usefulLifeYears === null ? 'NONE' : 'TYPED';
  }
  for (const key of ['floorFinish', 'roofFinish', 'externalFinish', 'internalFinish'] as const) {
    if (body[key] !== undefined) structure[key] = String(body[key]);
  }
  structure.updatedAt = new Date().toISOString();
  let impact: MeasurementBlockFact[] = [];
  if (beforeThickness !== structure.wallThicknessM || beforeYear !== structure.constructionYear || beforeLife !== structure.usefulLifeYears) {
    const next = markBlocksForReview(db.measurementBlocks, structure.id);
    replaceBlocks(structure.caseId, next);
    impact = next.filter((b) => b.structureId === structure.id && b.status === 'REQUIRES_REVIEW');
    resetDepreciation(structure.caseId);
  }
  db.save();
  res.status(200).json({
    structure,
    impact: impact.map((b) => ({ id: b.id, title: b.title, previous: b.engineerNet, derived: b.derivedNet, status: b.status })),
    bundle: bundle(structure.caseId),
  });
};

function replaceBlocks(caseId: string, next: MeasurementBlockFact[]): void {
  const others = db.measurementBlocks.filter((b) => b.caseId !== caseId);
  db.measurementBlocks.splice(0, db.measurementBlocks.length, ...others, ...next.filter((b) => b.caseId === caseId));
}

export const replaceRooms = (req: AuthRequest, res: Response): void => {
  if (!canWrite(req, res)) return;
  const structure = db.buildingStructures.find((s) => s.id === req.params.id);
  if (!structure) {
    fail(res, 404, 'NOT_FOUND', 'Structure not found.');
    return;
  }
  const incoming = Array.isArray(req.body.rooms) ? req.body.rooms : [];
  const rooms: RoomFact[] = incoming.map((room: Partial<RoomFact>) => ({
    id: room.id || `room-${uuidv4().slice(0, 8)}`,
    structureId: structure.id,
    code: String(room.code || '').trim(),
    lengthM: numberOrNull(room.lengthM),
    breadthM: numberOrNull(room.breadthM),
    rowIndex: numberOrNull(room.rowIndex),
    bayIndex: numberOrNull(room.bayIndex),
    enclosure: room.enclosure === 'OPEN' || room.enclosure === 'ENCLOSED' ? room.enclosure : 'UNKNOWN',
  }));
  if (rooms.some((room) => !room.code)) {
    fail(res, 400, 'VALIDATION_ERROR', 'Every room needs a code.');
    return;
  }
  const kept = db.rooms.filter((r) => r.structureId !== structure.id);
  db.rooms.splice(0, db.rooms.length, ...kept, ...rooms);
  const next = markBlocksForReview(db.measurementBlocks, structure.id);
  replaceBlocks(structure.caseId, next);
  db.save();
  res.status(200).json({ rooms, bundle: bundle(structure.caseId) });
};

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export const generateCandidates = (req: AuthRequest, res: Response): void => {
  if (!canWrite(req, res)) return;
  const structure = db.buildingStructures.find((s) => s.id === req.params.id);
  if (!structure) {
    fail(res, 404, 'NOT_FOUND', 'Structure not found.');
    return;
  }
  const rooms = db.rooms.filter((r) => r.structureId === structure.id);
  let counter = 0;
  const proposed = proposeWallRuns(structure.id, rooms, structure.wallThicknessM, () => `wall-${uuidv4().slice(0, 8)}-${counter++}`);
  const kept = db.wallRuns.filter((w) => w.structureId !== structure.id || w.origin !== 'CANDIDATE');
  db.wallRuns.splice(0, db.wallRuns.length, ...kept, ...proposed.runs);
  db.save();
  res.status(200).json({ note: proposed.note, wallRuns: proposed.runs, bundle: bundle(structure.caseId) });
};

export const confirmWallRun = (req: AuthRequest, res: Response): void => {
  if (!canWrite(req, res)) return;
  const wall = db.wallRuns.find((w) => w.id === req.params.id);
  if (!wall) {
    fail(res, 404, 'NOT_FOUND', 'Wall run not found.');
    return;
  }
  if (req.body.lengthM !== undefined) wall.lengthM = Number(req.body.lengthM);
  if (req.body.count !== undefined) wall.count = Number(req.body.count);
  if (req.body.breadthM !== undefined) wall.breadthM = numberOrNull(req.body.breadthM);
  if (req.body.action === 'REJECT') {
    const index = db.wallRuns.findIndex((w) => w.id === wall.id);
    db.wallRuns.splice(index, 1);
    db.save();
    const structure = db.buildingStructures.find((s) => s.id === wall.structureId);
    res.status(200).json({ bundle: bundle(structure?.caseId || '') });
    return;
  }
  wall.origin = 'ENGINEER_CONFIRMED';
  wall.confirmedBy = req.user?.name;
  wall.confirmedAt = new Date().toISOString();
  const structure = db.buildingStructures.find((s) => s.id === wall.structureId);
  if (structure) {
    replaceBlocks(structure.caseId, markBlocksForReview(db.measurementBlocks, structure.id));
  }
  db.save();
  res.status(200).json({ wallRun: wall, bundle: bundle(structure?.caseId || '') });
};

export const addManualWall = (req: AuthRequest, res: Response): void => {
  if (!canWrite(req, res)) return;
  const structure = db.buildingStructures.find((s) => s.id === req.params.id);
  if (!structure) {
    fail(res, 404, 'NOT_FOUND', 'Structure not found.');
    return;
  }
  if (req.body.lengthM === undefined || req.body.lengthM === '') {
    fail(res, 400, 'VALIDATION_ERROR', 'A manual wall needs a length.');
    return;
  }
  db.wallRuns.push({
    id: `wall-${uuidv4().slice(0, 8)}`,
    structureId: structure.id,
    origin: 'MANUAL',
    kind: 'OTHER',
    label: String(req.body.label || 'Manual wall'),
    count: Number(req.body.count || 1),
    lengthM: Number(req.body.lengthM),
    breadthM: numberOrNull(req.body.breadthM) ?? structure.wallThicknessM,
    depthM: numberOrNull(req.body.depthM),
    sourceRoomIds: [],
    confirmedBy: req.user?.name,
    confirmedAt: new Date().toISOString(),
  });
  db.save();
  res.status(201).json(bundle(structure.caseId));
};

export const replaceOpenings = (req: AuthRequest, res: Response): void => {
  if (!canWrite(req, res)) return;
  const structure = db.buildingStructures.find((s) => s.id === req.params.id);
  if (!structure) {
    fail(res, 404, 'NOT_FOUND', 'Structure not found.');
    return;
  }
  const openings: OpeningFact[] = (req.body.openings || []).map((opening: Partial<OpeningFact>) => ({
    id: opening.id || `opn-${uuidv4().slice(0, 8)}`,
    structureId: structure.id,
    code: String(opening.code || '').trim(),
    kind: opening.kind || 'OTHER',
    count: numberOrNull(opening.count),
    widthM: numberOrNull(opening.widthM),
    heightM: numberOrNull(opening.heightM),
    hostWallRunId: opening.hostWallRunId || null,
  }));
  const kept = db.openings.filter((o) => o.structureId !== structure.id);
  db.openings.splice(0, db.openings.length, ...kept, ...openings);
  replaceBlocks(structure.caseId, markBlocksForReview(db.measurementBlocks, structure.id));
  db.save();
  res.status(200).json(bundle(structure.caseId));
};

export const replaceMembers = (req: AuthRequest, res: Response): void => {
  if (!canWrite(req, res)) return;
  const structure = db.buildingStructures.find((s) => s.id === req.params.id);
  if (!structure) {
    fail(res, 404, 'NOT_FOUND', 'Structure not found.');
    return;
  }
  const members: MemberFact[] = (req.body.members || []).map((member: Partial<MemberFact>) => ({
    id: member.id || `mem-${uuidv4().slice(0, 8)}`,
    structureId: structure.id,
    kind: (member.kind || 'OTHER') as MemberKind,
    roomId: member.roomId || null,
    count: numberOrNull(member.count),
    lengthM: numberOrNull(member.lengthM),
    breadthM: numberOrNull(member.breadthM),
    depthM: numberOrNull(member.depthM),
  }));
  const kept = db.members.filter((m) => m.structureId !== structure.id);
  db.members.splice(0, db.members.length, ...kept, ...members);
  replaceBlocks(structure.caseId, markBlocksForReview(db.measurementBlocks, structure.id));
  db.save();
  res.status(200).json(bundle(structure.caseId));
};

export const generateApplicability = (req: AuthRequest, res: Response): void => {
  if (!canWrite(req, res)) return;
  const structure = db.buildingStructures.find((s) => s.id === req.params.id);
  if (!structure) {
    fail(res, 404, 'NOT_FOUND', 'Structure not found.');
    return;
  }
  const rows = applicabilityFor({
    structure,
    rooms: db.rooms.filter((r) => r.structureId === structure.id),
    confirmedWalls: db.wallRuns.filter((w) => w.structureId === structure.id && w.origin !== 'CANDIDATE'),
    openings: db.openings.filter((o) => o.structureId === structure.id),
  });
  res.status(200).json({
    applicability: rows,
    note: 'No quantity was written. Draft suggestions are not production rules. Ask for a suggestion explicitly, or add a manual line.',
  });
};

export const createDraftLine = (req: AuthRequest, res: Response): void => {
  if (!canWrite(req, res)) return;
  const structure = db.buildingStructures.find((s) => s.id === req.params.id);
  if (!structure) {
    fail(res, 404, 'NOT_FOUND', 'Structure not found.');
    return;
  }
  const built = buildDraftBlock({
    ruleId: String(req.body.ruleId || ''),
    structure,
    rooms: db.rooms.filter((r) => r.structureId === structure.id),
    walls: db.wallRuns.filter((w) => w.structureId === structure.id),
    openings: db.openings.filter((o) => o.structureId === structure.id),
    members: db.members.filter((m) => m.structureId === structure.id),
    blockId: `blk-${uuidv4().slice(0, 8)}`,
    caseId: structure.caseId,
  });
  if ('error' in built) {
    fail(res, 400, 'INPUT_REQUIRED', built.error);
    return;
  }
  db.measurementBlocks.push(built.block);
  db.save();
  res.status(201).json({ block: built.block, bundle: bundle(structure.caseId) });
};

export const decideBlock = (req: AuthRequest, res: Response): void => {
  if (!canWrite(req, res)) return;
  const index = db.measurementBlocks.findIndex((b) => b.id === req.params.id);
  if (index === -1) {
    fail(res, 404, 'NOT_FOUND', 'Measurement line not found.');
    return;
  }
  const result = applyDecision(
    db.measurementBlocks[index],
    req.body.action,
    { id: req.user!.id, name: req.user!.name },
    req.body.reason,
    req.body.overrideNet
  );
  if ('error' in result) {
    fail(res, 400, 'VALIDATION_ERROR', result.error);
    return;
  }
  db.measurementBlocks[index] = result.block;
  db.auditLogs.push({
    id: `aud-${uuidv4().slice(0, 8)}`,
    caseId: result.block.caseId,
    userId: req.user!.id,
    userName: req.user!.name,
    userRole: req.user!.role,
    action: `MEASUREMENT_${req.body.action}`,
    entityType: 'MEASUREMENT_BLOCK',
    entityId: result.block.id,
    newValue: JSON.stringify({ status: result.block.status, engineerNet: result.block.engineerNet, derivedNet: result.block.derivedNet }),
    reason: req.body.reason,
    timestamp: new Date().toISOString(),
  });
  db.save();
  res.status(200).json({ block: result.block });
};

export const addManualBlock = (req: AuthRequest, res: Response): void => {
  if (!canWrite(req, res)) return;
  const structure = db.buildingStructures.find((s) => s.id === req.params.id);
  if (!structure) {
    fail(res, 404, 'NOT_FOUND', 'Structure not found.');
    return;
  }
  if (!req.body.reason || !String(req.body.reason).trim()) {
    fail(res, 400, 'VALIDATION_ERROR', 'A manual line needs a reason.');
    return;
  }
  const quantity = Number(req.body.quantity);
  if (!Number.isFinite(quantity)) {
    fail(res, 400, 'VALIDATION_ERROR', 'A manual line needs a quantity.');
    return;
  }
  const block: MeasurementBlockFact = {
    id: `blk-${uuidv4().slice(0, 8)}`,
    structureId: structure.id,
    caseId: structure.caseId,
    title: String(req.body.title || 'Manual item'),
    unit: String(req.body.unit || 'cum'),
    ruleId: 'manual',
    ruleStatus: 'DRAFT',
    status: 'MANUAL',
    formulaText: 'Entered by the engineer',
    sourceFactIds: [],
    evidenceIds: [],
    derivedNet: null,
    engineerNet: quantity,
    overrideReason: String(req.body.reason).trim(),
    decidedBy: req.user?.name,
    decidedAt: new Date().toISOString(),
    rateMatch: 'UNMAPPED',
    lines: [],
  };
  db.measurementBlocks.push(block);
  db.save();
  res.status(201).json({ block, bundle: bundle(structure.caseId) });
};

export const pinRate = (req: AuthRequest, res: Response): void => {
  if (!canWrite(req, res)) return;
  const index = db.measurementBlocks.findIndex((b) => b.id === req.params.id);
  if (index === -1) {
    fail(res, 404, 'NOT_FOUND', 'Measurement line not found.');
    return;
  }
  const block = db.measurementBlocks[index];
  const valuationCase = db.cases.find((c) => c.id === block.caseId);
  if (!valuationCase?.rateScheduleVersionId) {
    fail(res, 400, 'INPUT_REQUIRED', 'Pin a rate-schedule version on the case before matching an item.');
    return;
  }
  if (typeof req.body.itemNumber !== 'string') {
    fail(res, 400, 'VALIDATION_ERROR', 'Item number must be a string, for example "19.1".');
    return;
  }
  const items = db.catalogueItems.filter((item) => item.scheduleVersionId === valuationCase.rateScheduleVersionId);
  const matched = matchCatalogue(items, req.body.itemNumber);
  if (matched.status === 'UNIQUE') {
    block.rateItemId = matched.matches[0].id;
    block.rateMatch = 'UNIQUE';
  } else if (matched.status === 'AMBIGUOUS') {
    block.rateItemId = undefined;
    block.rateMatch = 'AMBIGUOUS';
    block.status = block.status === 'ACCEPTED' || block.status === 'MANUAL' || block.status === 'OVERRIDDEN' ? 'AMBIGUOUS' : block.status;
  } else {
    block.rateItemId = undefined;
    block.rateMatch = 'UNMAPPED';
  }
  db.measurementBlocks[index] = block;
  db.save();
  res.status(200).json({ match: matched.status, matches: matched.matches.map(publicItem), block });
};

function publicItem(item: CatalogueItemRecord) {
  return { id: item.id, itemNumber: item.itemNumber, description: item.description, unit: item.unit, rate: item.rate };
}

export const importRateSchedule = (req: AuthRequest, res: Response): void => {
  if (!req.user || req.user.role !== 'ADMIN') {
    fail(res, 403, 'FORBIDDEN', 'Only an administrator can import a rate schedule.');
    return;
  }
  const items = req.body.items;
  if (!Array.isArray(items) || items.length === 0) {
    fail(res, 400, 'VALIDATION_ERROR', 'Provide a non-empty items array.');
    return;
  }
  if (items.some((item: { itemNumber?: unknown }) => typeof item.itemNumber !== 'string' || !item.itemNumber.trim())) {
    fail(res, 400, 'VALIDATION_ERROR', 'Every item number must be a string. Do not send 19.1 as a number.');
    return;
  }
  const version = {
    id: `rate-${uuidv4().slice(0, 8)}`,
    name: String(req.body.name || 'Imported schedule'),
    authority: String(req.body.authority || ''),
    versionLabel: String(req.body.versionLabel || 'unverified'),
    effectiveFrom: req.body.effectiveFrom || null,
    effectiveTo: req.body.effectiveTo || null,
    sourceDocument: String(req.body.sourceDocument || ''),
    importedAt: new Date().toISOString(),
    legacy: false,
  };
  db.rateScheduleVersions.push(version);
  const seen = new Map<string, number>();
  for (const item of items) {
    const itemNumber = String(item.itemNumber).trim();
    seen.set(itemNumber, (seen.get(itemNumber) || 0) + 1);
    db.catalogueItems.push({
      id: `cat-${uuidv4().slice(0, 8)}`,
      scheduleVersionId: version.id,
      itemNumber,
      description: String(item.description || ''),
      unit: String(item.unit || ''),
      rate: Number(item.rate),
      sourceRow: String(item.sourceRow || ''),
      reference: String(item.reference || ''),
    });
  }
  const duplicates = [...seen.entries()].filter(([, count]) => count > 1).map(([itemNumber]) => itemNumber);
  db.save();
  res.status(201).json({ schedule: version, imported: items.length, duplicateItemNumbers: duplicates });
};

export const importYpTable = (req: AuthRequest, res: Response): void => {
  if (!req.user || req.user.role !== 'ADMIN') {
    fail(res, 403, 'FORBIDDEN', 'Only an administrator can import a Year’s Purchase table.');
    return;
  }
  const rows = req.body.rows;
  if (!Array.isArray(rows)) {
    fail(res, 400, 'VALIDATION_ERROR', 'Provide rows of year and factor. Use null when the factor is unknown.');
    return;
  }
  const table = {
    id: `yp-${uuidv4().slice(0, 8)}`,
    name: String(req.body.name || 'Year’s Purchase table'),
    citation: String(req.body.citation || ''),
    legacy: false,
    rows: rows.map((row: { year: number; factor: number | null }) => ({
      year: Number(row.year),
      factor: row.factor === null || row.factor === undefined || row.factor === ('' as unknown) ? null : Number(row.factor),
    })),
  };
  db.ypTables.push(table);
  db.save();
  res.status(201).json({ table });
};

export const calculateSnapshot = (req: AuthRequest, res: Response): void => {
  if (!canWrite(req, res)) return;
  const valuationCase = requireBuildingCase(req.params.caseId, res);
  if (!valuationCase) return;
  const snapshot = buildPlatformSnapshot(valuationCase.id, req.user!.name);
  db.calculationSnapshots.push(snapshot);
  db.save();
  res.status(201).json({ snapshot });
};

function buildPlatformSnapshot(caseId: string, actor: string): CalculationSnapshotRecord {
  const valuationCase = db.cases.find((c) => c.id === caseId)!;
  const property = db.properties.find((p) => p.caseId === caseId);
  const structures = db.buildingStructures.filter((s) => s.caseId === caseId && s.participation === 'INCLUDED');
  const blocks = db.measurementBlocks.filter((b) => b.caseId === caseId);
  const evidence = db.caseEvidence.filter((e) => e.caseId === caseId);
  const table = db.ypTables.find((t) => t.id === valuationCase.ypTableVersionId) || null;
  const scheduleItems = db.catalogueItems.filter((item) => item.scheduleVersionId === valuationCase.rateScheduleVersionId);

  const abstract: { structureId: string; blockId: string; title: string; quantity: number; unit: string; rate: number | null; amount: number | null; itemNumber: string | null; ruleId: string; ruleStatus: string }[] = [];
  const structureCosts = new Map<string, number>();
  for (const structure of structures) structureCosts.set(structure.id, 0);

  for (const block of blocks) {
    const net = acceptedNet(block);
    if (net === null) continue;
    const rateItem = scheduleItems.find((item) => item.id === block.rateItemId);
    const rate = rateItem ? rateItem.rate : null;
    const amount = rate === null ? null : abstractAmount(net, rate);
    if (amount !== null) structureCosts.set(block.structureId, (structureCosts.get(block.structureId) || 0) + amount);
    abstract.push({
      structureId: block.structureId,
      blockId: block.id,
      title: block.title,
      quantity: net,
      unit: block.unit,
      rate,
      amount,
      itemNumber: rateItem ? rateItem.itemNumber : null,
      ruleId: block.ruleId,
      ruleStatus: block.ruleStatus,
    });
  }

  const depreciation = depreciateStructures({
    valuationDate: valuationCase.valuationDate,
    table,
    structures: structures.map((structure) => ({
      structureId: structure.id,
      name: structure.name,
      constructionYear: structure.constructionYear,
      usefulLifeYears: structure.usefulLifeYears,
      presentCost: structureCosts.get(structure.id) || 0,
    })),
  });

  const blockers = [
    ...emptyStructureBlockers(db.buildingStructures.filter((s) => s.caseId === caseId), blocks),
    ...depreciation.reasons,
  ];
  if (abstract.some((line) => line.amount === null)) blockers.push('An accepted line has no rate, so the abstract is incomplete.');
  const decision = db.depreciationDecisions.find((d) => d.caseId === caseId);
  if (!depreciation.blocked && decision?.status !== 'ACCEPTED') {
    blockers.push('Depreciation is calculated and still needs the engineer to accept it before finalizing.');
  }

  const body = {
    label: 'PLATFORM',
    owner: property?.ownerName,
    gutNumber: property?.surveyNumber || property?.houseNumber,
    village: property?.village,
    taluka: property?.taluka,
    district: property?.district,
    laCaseNumber: property?.laCaseNumber,
    conflictingIdentifierNotes: valuationCase.conflictingIdentifierNotes || '',
    evidenceVersionIds: evidence.map((e) => e.id),
    rateScheduleVersionId: valuationCase.rateScheduleVersionId || null,
    ypTableVersionId: valuationCase.ypTableVersionId || null,
    roundingProfileId: 'UNVALIDATED_HALF_UP_RUPEE',
    salvage: null,
    abstract,
    depreciation,
    presentCost: depreciation.presentCost,
    depreciatedValue: depreciation.depreciatedValue,
  };

  const previous = [...db.calculationSnapshots].reverse().find((s) => s.caseId === caseId);
  return {
    id: `snap-${uuidv4().slice(0, 8)}`,
    caseId,
    status: 'DRAFT',
    label: 'PLATFORM',
    evidenceVersionIds: evidence.map((e) => e.id),
    rateScheduleVersionId: valuationCase.rateScheduleVersionId || null,
    ypTableVersionId: valuationCase.ypTableVersionId || null,
    roundingProfileId: 'UNVALIDATED_HALF_UP_RUPEE',
    usefulLifeSource: structures.every((s) => s.usefulLifeSource === 'TYPED') ? 'TYPED' : 'NONE',
    presentCost: depreciation.presentCost,
    depreciatedValue: depreciation.depreciatedValue,
    depreciationBlocked: depreciation.blocked,
    depreciationFormula: depreciation.formula,
    blockers,
    body,
    contentHash: hashBody(body),
    createdBy: actor,
    createdAt: new Date().toISOString(),
    finalizedAt: null,
    finalizedBy: null,
    supersedesSnapshotId: previous?.id || null,
  };
}

export const acceptDepreciation = (req: AuthRequest, res: Response): void => {
  if (!canWrite(req, res)) return;
  const valuationCase = requireBuildingCase(req.params.caseId, res);
  if (!valuationCase) return;
  const preview = buildPlatformSnapshot(valuationCase.id, req.user!.name);
  if (preview.depreciationBlocked) {
    fail(res, 409, 'BLOCKED', preview.blockers.filter((b) => b.toLowerCase().includes('year') || b.toLowerCase().includes('life') || b.toLowerCase().includes('purchase') || b.toLowerCase().includes('valuation')).join(' ') || 'Depreciation is blocked.');
    return;
  }
  const existing = db.depreciationDecisions.find((d) => d.caseId === valuationCase.id);
  const decision = {
    caseId: valuationCase.id,
    status: 'ACCEPTED' as const,
    decidedBy: req.user!.name,
    decidedAt: new Date().toISOString(),
  };
  if (existing) Object.assign(existing, decision);
  else db.depreciationDecisions.push(decision);
  db.save();
  res.status(200).json({ decision });
};

export const finalizeSnapshot = (req: AuthRequest, res: Response): void => {
  if (!req.user || req.user.role !== 'ADMIN') {
    fail(res, 403, 'FORBIDDEN', 'Finalizing is limited to the administrator role until the office confirms who may finalize. Calculation is not approval.');
    return;
  }
  const snapshot = db.calculationSnapshots.find((s) => s.id === req.params.id);
  if (!snapshot) {
    fail(res, 404, 'NOT_FOUND', 'Snapshot not found.');
    return;
  }
  if (snapshot.status === 'FINALIZED') {
    fail(res, 409, 'IMMUTABLE', 'This snapshot is already finalized. A correction creates a new snapshot.');
    return;
  }
  if (snapshot.blockers.length > 0) {
    fail(res, 409, 'BLOCKED', snapshot.blockers.join(' '));
    return;
  }
  if (snapshot.label === 'SOURCE_REPLAY' && req.body.acknowledgeConflicts !== true) {
    fail(res, 409, 'DOMAIN_VALIDATION_REQUIRED', 'Source replay still has unresolved conflicts. Acknowledge them explicitly or do not finalize this fixture.');
    return;
  }
  snapshot.status = 'FINALIZED';
  snapshot.finalizedAt = new Date().toISOString();
  snapshot.finalizedBy = req.user.name;
  const valuationCase = db.cases.find((c) => c.id === snapshot.caseId);
  if (valuationCase) {
    valuationCase.status = 'COMPLETED';
    valuationCase.updatedAt = snapshot.finalizedAt;
  }
  db.save();
  res.status(200).json({ snapshot });
};

export const getSnapshot = (req: AuthRequest, res: Response): void => {
  const snapshot = db.calculationSnapshots.find((s) => s.id === req.params.id);
  if (!snapshot) {
    fail(res, 404, 'NOT_FOUND', 'Snapshot not found.');
    return;
  }
  res.status(200).json({ snapshot });
};

export const runSourceReplay = (req: AuthRequest, res: Response): void => {
  if (!canWrite(req, res)) return;
  const valuationCase = requireBuildingCase(req.params.caseId, res);
  if (!valuationCase) return;
  const replay = sourceReplay();
  const body = { ...replay, note: 'SOURCE_REPLAY fixture. Not the production specification.' };
  const snapshot: CalculationSnapshotRecord = {
    id: `snap-${uuidv4().slice(0, 8)}`,
    caseId: valuationCase.id,
    status: 'DRAFT',
    label: 'SOURCE_REPLAY',
    evidenceVersionIds: db.caseEvidence.filter((e) => e.caseId === valuationCase.id).map((e) => e.id),
    rateScheduleVersionId: null,
    ypTableVersionId: null,
    roundingProfileId: 'WORKBOOK_193_REPLAY',
    usefulLifeSource: 'REPLAY',
    presentCost: replay.presentCost,
    depreciatedValue: replay.depreciatedValue,
    depreciationBlocked: false,
    depreciationFormula: replay.formula,
    blockers: replay.conflicts,
    body,
    contentHash: hashBody(body),
    createdBy: req.user!.name,
    createdAt: new Date().toISOString(),
    finalizedAt: null,
    finalizedBy: null,
    supersedesSnapshotId: null,
  };
  db.calculationSnapshots.push(snapshot);
  db.save();
  res.status(201).json({ snapshot });
};

export const uploadEvidence = (req: AuthRequest, res: Response): void => {
  if (!canWrite(req, res)) return;
  const valuationCase = requireBuildingCase(req.params.caseId, res);
  if (!valuationCase) return;
  const file = (req as AuthRequest & { file?: Express.Multer.File }).file;
  if (!file) {
    fail(res, 400, 'VALIDATION_ERROR', 'Attach a file. The drawing is evidence; it is not parsed into measurements.');
    return;
  }
  const allowed: EvidenceType[] = ['FIELD_DRAWING', 'SECTION_SKETCH', 'SITE_PHOTO', 'SOURCE_WORKBOOK', 'RATE_DOCUMENT', 'SUPPORTING_MEASUREMENT', 'OTHER'];
  const documentType = allowed.includes(req.body.documentType) ? req.body.documentType as EvidenceType : 'OTHER';
  const version = db.caseEvidence.filter((e) => e.caseId === valuationCase.id && e.documentType === documentType).length + 1;
  const id = `ev-${uuidv4().slice(0, 8)}`;
  const safeName = `${id}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  try {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    fs.writeFileSync(path.join(EVIDENCE_DIR, safeName), file.buffer);
  } catch {
    fail(res, 503, 'STORAGE_UNAVAILABLE', 'The evidence file could not be stored. Nothing was overwritten.');
    return;
  }
  db.caseEvidence.push({
    id,
    caseId: valuationCase.id,
    structureId: req.body.structureId || null,
    documentType,
    storedFileName: safeName,
    originalName: file.originalname,
    byteLength: file.size,
    uploadedBy: req.user!.name,
    uploadedAt: new Date().toISOString(),
    version,
    notes: String(req.body.notes || ''),
    supersedesEvidenceId: req.body.supersedesEvidenceId || null,
  });
  db.save();
  res.status(201).json({ evidence: db.caseEvidence.filter((e) => e.caseId === valuationCase.id) });
};

export const exportSnapshotPdf = (req: AuthRequest, res: Response): void => {
  if (!canExport(req, res)) return;
  const snapshot = db.calculationSnapshots.find((s) => s.id === req.params.id);
  if (!snapshot) {
    fail(res, 404, 'NOT_FOUND', 'Snapshot not found.');
    return;
  }
  const doc = new PDFDocument({ margin: 48, compress: false });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${snapshot.id}.pdf"`);
  doc.pipe(res);
  writeSnapshotText(snapshot, (line) => doc.text(line));
  doc.end();
};

export const exportSnapshotXls = (req: AuthRequest, res: Response): void => {
  if (!canExport(req, res)) return;
  const snapshot = db.calculationSnapshots.find((s) => s.id === req.params.id);
  if (!snapshot) {
    fail(res, 404, 'NOT_FOUND', 'Snapshot not found.');
    return;
  }
  const lines: string[] = [];
  writeSnapshotText(snapshot, (line) => lines.push(line));
  const rows = lines.map((line) => `<Row><Cell><Data ss:Type="String">${escapeXml(line)}</Data></Cell></Row>`).join('');
  const xml = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Snapshot"><Table>${rows}</Table></Worksheet>
</Workbook>`;
  res.setHeader('Content-Type', 'application/vnd.ms-excel');
  res.setHeader('Content-Disposition', `attachment; filename="${snapshot.id}.xls"`);
  res.status(200).send(xml);
};

function writeSnapshotText(snapshot: CalculationSnapshotRecord, write: (line: string) => void): void {
  const body = snapshot.body as {
    owner?: string;
    gutNumber?: string;
    village?: string;
    laCaseNumber?: string;
    conflictingIdentifierNotes?: string;
    abstract?: { title: string; quantity: number; unit: string; rate: number | null; amount: number | null; itemNumber: string | null }[];
    salvage?: null;
    depreciation?: { formula?: string };
  };
  write(`Snapshot ${snapshot.id} (${snapshot.label}, ${snapshot.status})`);
  write(`Owner: ${body.owner || ''}`);
  write(`Gut: ${body.gutNumber || ''}`);
  write(`Village: ${body.village || ''}`);
  write(`LA case: ${body.laCaseNumber || ''}`);
  write(`Identity notes: ${body.conflictingIdentifierNotes || ''}`);
  write(`Rounding profile: ${snapshot.roundingProfileId}`);
  write(`Present cost: ${snapshot.presentCost ?? 'blocked'}`);
  write(`Depreciated value: ${snapshot.depreciatedValue ?? 'blocked'}`);
  write(`Formula: ${snapshot.depreciationFormula}`);
  write('Salvage: none');
  write('Abstract');
  for (const line of body.abstract || []) {
    write(`${line.itemNumber || '—'} ${line.title} ${line.quantity} ${line.unit} rate ${line.rate ?? '—'} amount ${line.amount ?? '—'}`);
  }
  if (snapshot.blockers.length) {
    write('Blockers / conflicts');
    snapshot.blockers.forEach((blocker) => write(blocker));
  }
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
