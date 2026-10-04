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
  depreciateStructures,
  emptyStructureBlockers,
  hashBody,
  markBlocksForReview,
  matchCatalogue,
  proposeWallRuns,
  sourceReplay,
} from '../workflow/engine';
import { analyzeStructure, caseAttention, itemChoiceReadiness, searchCatalogue } from '../workflow/guidance';
import { generateRectangularGrid, generateSimpleRectanglePlan } from '../workflow/gridGeometry';
import { generateMeasurementForStructure } from '../workflow/measurementGenerate';
import { writeValuationReportPdf } from '../workflow/valuationReportPdf';
import { buildValuationWorkbook } from '../workflow/valuationWorkbookExport';
import {
  AttachedSide,
  BuildingStructure,
  CalculationSnapshotRecord,
  CatalogueItemRecord,
  EvidenceType,
  MeasurementBlockFact,
  MemberFact,
  MemberKind,
  OpeningFact,
  RoomFact,
  StructureKind,
  VerticalZoneFact,
  WallRunFact,
  WallSegmentKind,
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
    guidance: guidanceFor(caseId, structures),
  };
}

function guidanceFor(caseId: string, structures: BuildingStructure[]) {
  const valuationCase = db.cases.find((c) => c.id === caseId);
  const property = db.properties.find((p) => p.caseId === caseId);
  const analyzed = structures.map((structure) => analyzeStructure({
    structure,
    rooms: db.rooms.filter((room) => room.structureId === structure.id),
    walls: db.wallRuns.filter((wall) => wall.structureId === structure.id),
    openings: db.openings.filter((opening) => opening.structureId === structure.id),
    members: db.members.filter((member) => member.structureId === structure.id),
  }));
  return {
    structures: analyzed,
    attention: caseAttention({
      ownerName: property?.ownerName,
      surveyNumber: property?.surveyNumber,
      village: property?.village,
      evidenceCount: db.caseEvidence.filter((item) => item.caseId === caseId).length,
      rateScheduleVersionId: valuationCase?.rateScheduleVersionId,
      ypTableVersionId: valuationCase?.ypTableVersionId,
      structures: analyzed,
      depreciationAccepted: db.depreciationDecisions.find((item) => item.caseId === caseId)?.status === 'ACCEPTED',
      hasSnapshot: db.calculationSnapshots.some((item) => item.caseId === caseId && item.label === 'PLATFORM'),
    }),
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
  const previousSchedule = valuationCase.rateScheduleVersionId || null;
  if (req.body.rateScheduleVersionId !== undefined) {
    valuationCase.rateScheduleVersionId = req.body.rateScheduleVersionId || null;
  }
  if (req.body.ypTableVersionId !== undefined) {
    valuationCase.ypTableVersionId = req.body.ypTableVersionId || null;
    resetDepreciation(valuationCase.id);
  }
  property.updatedAt = new Date().toISOString();
  valuationCase.updatedAt = property.updatedAt;
  let rebound = 0;
  if (valuationCase.rateScheduleVersionId && valuationCase.rateScheduleVersionId !== previousSchedule) {
    rebound = rebindRatesForCase(valuationCase.id);
  }
  db.save();
  res.status(200).json({
    ...bundle(valuationCase.id),
    note: rebound
      ? `Identity saved. Bound catalogue rates on ${rebound} measurement line(s) from the pinned schedule.`
      : undefined,
  });
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
  const structureKind = normalizeStructureKind(req.body.structureKind) || kindFromName(String(req.body.name || ''));
  const name = String(req.body.name || defaultNameForKind(structureKind)).trim();
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
    structureKind,
    structureTypeText: name,
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
    shape: 'RECTANGLE',
    dimensionConvention: 'CLEAR_INTERNAL',
    overallLengthM: null,
    overallBreadthM: null,
    gridColumns: null,
    gridRows: null,
    spanMode: 'EQUAL',
    columnSpansM: null,
    rowSpansM: null,
    geometryStatus: 'NONE',
    geometryConfirmedAt: null,
    openSides: { front: false, rear: false, left: false, right: false },
    attachedToStructureId: null,
    attachedSide: null,
    foundationWidthM: null,
    groundBeamDepthM: null,
    solingDepthM: null,
    evidenceConflictNotes: '',
    planNotes: '',
    updatedAt: new Date().toISOString(),
  };
  db.buildingStructures.push(structure);
  db.save();
  res.status(201).json({ structure, bundle: bundle(valuationCase.id) });
};

export const removeStructure = (req: AuthRequest, res: Response): void => {
  if (!canWrite(req, res)) return;
  db.ensureWorkflowCollections();
  const structure = db.buildingStructures.find((s) => s.id === req.params.id);
  if (!structure) {
    fail(res, 404, 'NOT_FOUND', 'Structure not found.');
    return;
  }
  const caseId = structure.caseId;
  const valuationCase = requireBuildingCase(caseId, res);
  if (!valuationCase) return;

  let reopened = false;
  db.calculationSnapshots
    .filter((snapshot) => snapshot.caseId === caseId && snapshot.status === 'FINALIZED' && snapshot.label === 'PLATFORM')
    .forEach((snapshot) => {
      snapshot.status = 'DRAFT';
      snapshot.finalizedAt = null;
      snapshot.finalizedBy = null;
      reopened = true;
    });
  if (reopened && valuationCase.status === 'COMPLETED') {
    valuationCase.status = 'REVIEW';
    valuationCase.updatedAt = new Date().toISOString();
  }

  const structureId = structure.id;
  db.buildingStructures.splice(0, db.buildingStructures.length, ...db.buildingStructures.filter((item) => item.id !== structureId));
  db.rooms.splice(0, db.rooms.length, ...db.rooms.filter((room) => room.structureId !== structureId));
  db.wallRuns.splice(0, db.wallRuns.length, ...db.wallRuns.filter((wall) => wall.structureId !== structureId));
  db.openings.splice(0, db.openings.length, ...db.openings.filter((opening) => opening.structureId !== structureId));
  db.members.splice(0, db.members.length, ...db.members.filter((member) => member.structureId !== structureId));
  db.measurementBlocks.splice(0, db.measurementBlocks.length, ...db.measurementBlocks.filter((block) => block.structureId !== structureId));
  db.buildingStructures
    .filter((item) => item.caseId === caseId && item.attachedToStructureId === structureId)
    .forEach((item) => {
      item.attachedToStructureId = null;
      item.attachedSide = null;
      item.updatedAt = new Date().toISOString();
    });
  db.buildingStructures
    .filter((item) => item.caseId === caseId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .forEach((item, index) => {
      item.sortOrder = index + 1;
    });
  resetDepreciation(caseId);
  db.save();
  res.status(200).json({
    removedId: structureId,
    reopened,
    note: reopened
      ? `${structure.name} removed. Finalization was cleared so the case can be edited again.`
      : `${structure.name} removed from this case.`,
    bundle: bundle(caseId),
  });
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
  if (body.structureKind !== undefined) {
    const kind = normalizeStructureKind(body.structureKind);
    if (kind) structure.structureKind = kind;
  }
  if (body.structureTypeText !== undefined) structure.structureTypeText = String(body.structureTypeText);
  if (body.wallMaterialText !== undefined) structure.wallMaterialText = String(body.wallMaterialText);
  if (body.evidenceConflictNotes !== undefined) structure.evidenceConflictNotes = String(body.evidenceConflictNotes || '');
  if (body.planNotes !== undefined) structure.planNotes = String(body.planNotes || '');
  if (body.foundationWidthM !== undefined) structure.foundationWidthM = numberOrNull(body.foundationWidthM);
  if (body.groundBeamDepthM !== undefined) structure.groundBeamDepthM = numberOrNull(body.groundBeamDepthM);
  if (body.solingDepthM !== undefined) structure.solingDepthM = numberOrNull(body.solingDepthM);
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
  if (beforeThickness !== structure.wallThicknessM) {
    db.wallRuns.filter((wall) => wall.structureId === structure.id && (wall.thicknessSource || 'INHERITED') === 'INHERITED').forEach((wall) => {
      wall.thicknessM = structure.wallThicknessM;
      wall.breadthM = structure.wallThicknessM;
      wall.thicknessSource = 'INHERITED';
    });
  }
  if (body.storeyHeightM !== undefined) {
    db.wallRuns.filter((wall) => wall.structureId === structure.id && (wall.heightSource || 'INHERITED') === 'INHERITED').forEach((wall) => {
      wall.heightM = structure.storeyHeightM;
      wall.heightSource = 'INHERITED';
    });
  }
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

export const applyStructureLayout = (req: AuthRequest, res: Response): void => {
  if (!canWrite(req, res)) return;
  const structure = db.buildingStructures.find((s) => s.id === req.params.id);
  if (!structure) {
    fail(res, 404, 'NOT_FOUND', 'Structure not found.');
    return;
  }
  const body = req.body || {};
  const overallLengthM = Number(body.overallLengthM);
  const overallBreadthM = Number(body.overallBreadthM);
  const gridColumns = Number(body.gridColumns);
  const gridRows = Number(body.gridRows);
  const spanMode = body.spanMode === 'UNEQUAL' ? 'UNEQUAL' : 'EQUAL';
  const confirm = Boolean(body.confirm);
  const acknowledgeRegenerate = Boolean(body.acknowledgeRegenerate);

  if (structure.geometryStatus === 'CONFIRMED' && !acknowledgeRegenerate && !confirm) {
    fail(res, 409, 'GEOMETRY_CONFIRMED', 'Changing the structure layout will regenerate rooms and walls. Review the structure before continuing, then acknowledge regeneration.');
    return;
  }
  if (structure.geometryStatus === 'CONFIRMED' && !acknowledgeRegenerate && confirm && layoutChanged(structure, {
    overallLengthM, overallBreadthM, gridColumns, gridRows, spanMode,
    columnSpansM: body.columnSpansM, rowSpansM: body.rowSpansM,
  })) {
    fail(res, 409, 'GEOMETRY_CONFIRMED', 'Changing the structure layout will regenerate rooms and walls. Acknowledge regeneration before confirming again.');
    return;
  }

  const generated = generateRectangularGrid({
    structureId: structure.id,
    overallLengthM,
    overallBreadthM,
    gridColumns,
    gridRows,
    spanMode,
    columnSpansM: Array.isArray(body.columnSpansM) ? body.columnSpansM.map(Number) : null,
    rowSpansM: Array.isArray(body.rowSpansM) ? body.rowSpansM.map(Number) : null,
    wallThicknessM: structure.wallThicknessM,
  });
  if ('error' in generated) {
    fail(res, 400, 'VALIDATION_ERROR', generated.error);
    return;
  }

  structure.shape = 'RECTANGLE';
  structure.dimensionConvention = 'CLEAR_INTERNAL';
  structure.overallLengthM = generated.columnSpansM.reduce((sum, span) => sum + span, 0);
  structure.overallBreadthM = generated.rowSpansM.reduce((sum, span) => sum + span, 0);
  structure.gridColumns = gridColumns;
  structure.gridRows = gridRows;
  structure.spanMode = spanMode;
  structure.columnSpansM = generated.columnSpansM;
  structure.rowSpansM = generated.rowSpansM;
  structure.geometryStatus = confirm ? 'CONFIRMED' : 'DRAFT_GENERATED';
  structure.geometryConfirmedAt = confirm ? new Date().toISOString() : null;
  if (body.evidenceConflictNotes !== undefined) structure.evidenceConflictNotes = String(body.evidenceConflictNotes || '');
  if (body.planNotes !== undefined) structure.planNotes = String(body.planNotes || '');
  if (body.foundationWidthM !== undefined) structure.foundationWidthM = numberOrNull(body.foundationWidthM);
  if (body.groundBeamDepthM !== undefined) structure.groundBeamDepthM = numberOrNull(body.groundBeamDepthM);
  if (body.solingDepthM !== undefined) structure.solingDepthM = numberOrNull(body.solingDepthM);
  structure.updatedAt = new Date().toISOString();

  const previousRooms = db.rooms.filter((room) => room.structureId === structure.id);
  const rooms: RoomFact[] = generated.rooms.map((room) => {
    const previous = previousRooms.find((item) => item.code === room.code);
    return {
      id: room.id,
      structureId: room.structureId,
      code: room.code,
      lengthM: room.lengthM,
      breadthM: room.breadthM,
      rowIndex: room.rowIndex,
      bayIndex: room.bayIndex,
      enclosure: previous?.enclosure || room.enclosure,
      generated: true,
      boundaryWallIds: room.boundaryWallIds,
    };
  });
  const keptRooms = db.rooms.filter((room) => room.structureId !== structure.id);
  db.rooms.splice(0, db.rooms.length, ...keptRooms, ...rooms);

  const walls: WallRunFact[] = generated.walls.map((wall) => ({
    id: wall.id,
    structureId: wall.structureId,
    origin: confirm ? 'ENGINEER_CONFIRMED' : 'CANDIDATE',
    kind: wall.kind,
    segmentKind: wall.segmentKind,
    label: wall.label,
    count: wall.count,
    lengthM: wall.lengthM,
    breadthM: wall.breadthM,
    depthM: wall.depthM,
    thicknessM: wall.thicknessM,
    heightM: structure.storeyHeightM,
    thicknessSource: 'INHERITED',
    heightSource: 'INHERITED',
    verticalZones: [],
    sourceRoomIds: wall.sourceRoomIds,
    generated: true,
    axis: wall.axis,
    role: wall.role,
    confirmedBy: confirm ? req.user?.name : undefined,
    confirmedAt: confirm ? new Date().toISOString() : undefined,
  }));
  const keptWalls = db.wallRuns.filter((wall) => wall.structureId !== structure.id || wall.origin === 'MANUAL');
  db.wallRuns.splice(0, db.wallRuns.length, ...keptWalls, ...walls);

  const next = markBlocksForReview(db.measurementBlocks, structure.id);
  replaceBlocks(structure.caseId, next);
  db.save();
  res.status(200).json({
    structure,
    summary: generated.summary,
    rooms,
    wallRuns: walls,
    note: confirm
      ? 'Structure confirmed. Generated walls are available for downstream wall work after review.'
      : 'Generated structure saved as a draft check sketch. Confirm before treating walls as quantities.',
    bundle: bundle(structure.caseId),
  });
};

function layoutChanged(structure: BuildingStructure, next: {
  overallLengthM: number;
  overallBreadthM: number;
  gridColumns: number;
  gridRows: number;
  spanMode: string;
  columnSpansM?: number[];
  rowSpansM?: number[];
}): boolean {
  if (structure.overallLengthM !== next.overallLengthM) return true;
  if (structure.overallBreadthM !== next.overallBreadthM) return true;
  if (structure.gridColumns !== next.gridColumns) return true;
  if (structure.gridRows !== next.gridRows) return true;
  if ((structure.spanMode || 'EQUAL') !== next.spanMode) return true;
  if (next.spanMode === 'UNEQUAL') {
    const cols = (structure.columnSpansM || []).join('|');
    const rows = (structure.rowSpansM || []).join('|');
    const nextCols = (next.columnSpansM || []).join('|');
    const nextRows = (next.rowSpansM || []).join('|');
    if (cols !== nextCols || rows !== nextRows) return true;
  }
  return false;
}

export const applySimplePlan = (req: AuthRequest, res: Response): void => {
  if (!canWrite(req, res)) return;
  const structure = db.buildingStructures.find((s) => s.id === req.params.id);
  if (!structure) {
    fail(res, 404, 'NOT_FOUND', 'Structure not found.');
    return;
  }
  const body = req.body || {};
  const overallLengthM = Number(body.overallLengthM);
  const overallBreadthM = Number(body.overallBreadthM);
  const confirm = Boolean(body.confirm);
  const acknowledgeRegenerate = Boolean(body.acknowledgeRegenerate);
  if (structure.geometryStatus === 'CONFIRMED' && !acknowledgeRegenerate && (
    structure.overallLengthM !== overallLengthM || structure.overallBreadthM !== overallBreadthM
  )) {
    fail(res, 409, 'GEOMETRY_CONFIRMED', 'Changing the plan will regenerate walls. Acknowledge regeneration before continuing.');
    return;
  }

  const openSides = {
    front: Boolean(body.openSides?.front),
    rear: Boolean(body.openSides?.rear),
    left: Boolean(body.openSides?.left),
    right: Boolean(body.openSides?.right),
  };
  const generated = generateSimpleRectanglePlan({
    structureId: structure.id,
    overallLengthM,
    overallBreadthM,
    wallThicknessM: numberOrNull(body.wallThicknessM) ?? structure.wallThicknessM,
    openSides,
  });
  if ('error' in generated) {
    fail(res, 400, 'VALIDATION_ERROR', generated.error);
    return;
  }

  if (body.storeyHeightM !== undefined) structure.storeyHeightM = numberOrNull(body.storeyHeightM);
  if (body.wallThicknessM !== undefined) structure.wallThicknessM = numberOrNull(body.wallThicknessM);
  structure.dimensionConvention = 'CLEAR_INTERNAL';
  structure.shape = 'RECTANGLE';
  structure.overallLengthM = generated.overallLengthM;
  structure.overallBreadthM = generated.overallBreadthM;
  structure.gridColumns = null;
  structure.gridRows = null;
  structure.spanMode = null;
  structure.columnSpansM = null;
  structure.rowSpansM = null;
  structure.openSides = openSides;
  structure.attachedToStructureId = body.attachedToStructureId ? String(body.attachedToStructureId) : structure.attachedToStructureId || null;
  structure.attachedSide = normalizeAttachedSide(body.attachedSide) || structure.attachedSide || null;
  structure.geometryStatus = confirm ? 'CONFIRMED' : 'DRAFT_GENERATED';
  structure.geometryConfirmedAt = confirm ? new Date().toISOString() : null;
  structure.updatedAt = new Date().toISOString();

  // Sheds and porches do not invent rooms.
  const keptRooms = db.rooms.filter((room) => room.structureId !== structure.id);
  db.rooms.splice(0, db.rooms.length, ...keptRooms);

  const walls: WallRunFact[] = generated.walls.map((wall) => ({
    id: wall.id,
    structureId: wall.structureId,
    origin: confirm ? 'ENGINEER_CONFIRMED' : 'CANDIDATE',
    kind: wall.kind,
    segmentKind: wall.segmentKind,
    label: wall.label,
    count: wall.count,
    lengthM: wall.lengthM,
    breadthM: wall.breadthM,
    depthM: wall.depthM,
    thicknessM: wall.thicknessM,
    heightM: structure.storeyHeightM,
    thicknessSource: 'INHERITED',
    heightSource: 'INHERITED',
    verticalZones: [],
    sourceRoomIds: [],
    generated: true,
    axis: wall.axis,
    role: wall.role,
    confirmedBy: confirm ? req.user?.name : undefined,
    confirmedAt: confirm ? new Date().toISOString() : undefined,
  }));
  const keptWalls = db.wallRuns.filter((wall) => wall.structureId !== structure.id || wall.origin === 'MANUAL');
  db.wallRuns.splice(0, db.wallRuns.length, ...keptWalls, ...walls);
  db.save();
  res.status(200).json({
    structure,
    wallRuns: walls,
    note: confirm ? 'Simple plan confirmed.' : 'Simple plan saved as a draft check sketch.',
    bundle: bundle(structure.caseId),
  });
};

export const patchWallRun = (req: AuthRequest, res: Response): void => {
  if (!canWrite(req, res)) return;
  const wall = db.wallRuns.find((item) => item.id === req.params.id);
  if (!wall) {
    fail(res, 404, 'NOT_FOUND', 'Wall run not found.');
    return;
  }
  const structure = db.buildingStructures.find((item) => item.id === wall.structureId);
  const body = req.body || {};
  if (body.label !== undefined) wall.label = String(body.label);
  if (body.segmentKind) wall.segmentKind = normalizeSegmentKind(body.segmentKind) || wall.segmentKind;
  if (body.thicknessM !== undefined) {
    wall.thicknessM = numberOrNull(body.thicknessM);
    wall.breadthM = wall.thicknessM;
    wall.thicknessSource = wall.thicknessM === null || wall.thicknessM === structure?.wallThicknessM ? 'INHERITED' : 'OVERRIDE';
  }
  if (body.heightM !== undefined) {
    wall.heightM = numberOrNull(body.heightM);
    wall.heightSource = wall.heightM === null || wall.heightM === structure?.storeyHeightM ? 'INHERITED' : 'OVERRIDE';
  }
  if (Array.isArray(body.verticalZones)) {
    wall.verticalZones = body.verticalZones.map((zone: Partial<VerticalZoneFact>, index: number) => ({
      id: zone.id || `zone-${wall.id}-${index + 1}`,
      kind: zone.kind === 'MESH' || zone.kind === 'OTHER' ? zone.kind : 'MASONRY',
      heightM: numberOrNull(zone.heightM),
      notes: zone.notes ? String(zone.notes) : '',
    }));
  }
  db.save();
  res.status(200).json({ wallRun: wall, bundle: bundle(structure?.caseId || '') });
};

export const patchRoom = (req: AuthRequest, res: Response): void => {
  if (!canWrite(req, res)) return;
  const room = db.rooms.find((item) => item.id === req.params.id);
  if (!room) {
    fail(res, 404, 'NOT_FOUND', 'Room not found.');
    return;
  }
  const enclosure = req.body?.enclosure;
  if (enclosure === 'ENCLOSED' || enclosure === 'OPEN' || enclosure === 'PARTIALLY_OPEN' || enclosure === 'UNKNOWN') {
    room.enclosure = enclosure;
  }
  if (req.body?.code !== undefined) room.code = String(req.body.code).trim() || room.code;
  const structure = db.buildingStructures.find((item) => item.id === room.structureId);
  db.save();
  res.status(200).json({ room, bundle: bundle(structure?.caseId || '') });
};

function normalizeStructureKind(value: unknown): StructureKind | null {
  const kind = String(value || '').toUpperCase();
  if (kind === 'MAIN_HOUSE' || kind === 'GI_SHED' || kind === 'OPEN_SHED' || kind === 'PORCH' || kind === 'STORE' || kind === 'OTHER') {
    return kind;
  }
  return null;
}

function kindFromName(name: string): StructureKind {
  const lower = name.toLowerCase();
  if (lower.includes('gi') || lower.includes('tin')) return 'GI_SHED';
  if (lower.includes('open shed')) return 'OPEN_SHED';
  if (lower.includes('porch') || lower.includes('veranda')) return 'PORCH';
  if (lower.includes('store')) return 'STORE';
  if (lower.includes('house') || lower.includes('main')) return 'MAIN_HOUSE';
  return 'OTHER';
}

function defaultNameForKind(kind: StructureKind): string {
  if (kind === 'MAIN_HOUSE') return 'Main house';
  if (kind === 'GI_SHED') return 'Tin / GI shed';
  if (kind === 'OPEN_SHED') return 'Open shed';
  if (kind === 'PORCH') return 'Porch / Veranda';
  if (kind === 'STORE') return 'Store';
  return 'Other structure';
}

function normalizeAttachedSide(value: unknown): AttachedSide | null {
  const side = String(value || '').toUpperCase();
  if (side === 'FRONT' || side === 'REAR' || side === 'LEFT' || side === 'RIGHT') return side;
  return null;
}

function normalizeSegmentKind(value: unknown): WallSegmentKind | null {
  const kind = String(value || '').toUpperCase();
  if (kind === 'OUTER' || kind === 'INTERNAL' || kind === 'PARTITION' || kind === 'LOW_WALL' || kind === 'OTHER') return kind;
  return null;
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
  const ruleId = String(req.body.ruleId || '');
  const valuationCase = db.cases.find((item) => item.id === structure.caseId);
  const catalogue = valuationCase?.rateScheduleVersionId
    ? db.catalogueItems.filter((item) => item.scheduleVersionId === valuationCase.rateScheduleVersionId)
    : [];
  const generated = generateMeasurementForStructure({
    structure,
    rooms: db.rooms.filter((r) => r.structureId === structure.id),
    walls: db.wallRuns.filter((w) => w.structureId === structure.id),
    openings: db.openings.filter((o) => o.structureId === structure.id),
    members: db.members.filter((m) => m.structureId === structure.id),
    catalogue,
    existingBlocks: db.measurementBlocks.filter((b) => b.caseId === structure.caseId),
    ruleId,
  });
  if (!generated.created.length && !generated.updated.length) {
    const reason = generated.skipped[0]?.reason || 'No draft quantity could be created for that rule.';
    fail(res, 400, 'INPUT_REQUIRED', reason);
    return;
  }
  replaceBlocks(structure.caseId, generated.nextBlocks);
  db.save();
  const block = generated.created[0] || generated.updated[0];
  res.status(201).json({
    block,
    note: 'Draft line created from the rule registry. It is not a validated production rule until accepted.',
    bundle: bundle(structure.caseId),
  });
};

export const generateMeasurementSheet = (req: AuthRequest, res: Response): void => {
  if (!canWrite(req, res)) return;
  const structure = db.buildingStructures.find((s) => s.id === req.params.id);
  if (!structure) {
    fail(res, 404, 'NOT_FOUND', 'Structure not found.');
    return;
  }
  const valuationCase = db.cases.find((item) => item.id === structure.caseId);
  const catalogue = valuationCase?.rateScheduleVersionId
    ? db.catalogueItems.filter((item) => item.scheduleVersionId === valuationCase.rateScheduleVersionId)
    : [];
  const rooms = db.rooms.filter((r) => r.structureId === structure.id);
  const walls = db.wallRuns.filter((w) => w.structureId === structure.id);
  const openings = db.openings.filter((o) => o.structureId === structure.id);
  const members = db.members.filter((m) => m.structureId === structure.id);
  // Gut-193 Eknath sheets use eknath.* only. Ordinary cases use the fact-driven draft.* residential pack.
  const generated = generateMeasurementForStructure({
    structure,
    rooms,
    walls,
    openings,
    members,
    catalogue,
    existingBlocks: db.measurementBlocks.filter((b) => b.caseId === structure.caseId),
    includeGeneric: req.body?.includeGeneric !== false,
  });
  replaceBlocks(structure.caseId, generated.nextBlocks);
  const rebound = rebindRatesForCase(structure.caseId);
  db.save();
  const schedulePinned = Boolean(valuationCase?.rateScheduleVersionId);
  res.status(200).json({
    created: generated.created.length,
    updated: generated.updated.length,
    skipped: generated.skipped,
    rebound,
    evaluations: generated.evaluations.map((item) => ({
      ruleId: item.ruleId,
      name: item.name,
      status: item.status,
      applicability: item.applicability,
      reason: item.reason,
      derivedNet: item.quantity?.derivedNet ?? null,
      unit: item.unit,
      catalogueItemNumber: item.catalogueItemNumber,
    })),
    note: schedulePinned
      ? `Draft measurement lines written for review (${rebound} rate(s) bound). Accept only after checking quantities — source-profile formulas stay DRAFT.`
      : 'Draft quantities were written, but no rate schedule is pinned on Screen 1. Pin CASE-193-RA-UI-GUIDE (Gut 193) and Year’s Purchase before Accept / Prepare abstract, or present cost stays 0.',
    bundle: bundle(structure.caseId),
  });
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
    fail(res, 400, 'VALIDATION_ERROR', 'Say where this quantity was measured.');
    return;
  }
  const quantity = Number(req.body.quantity);
  if (!(quantity > 0)) {
    fail(res, 400, 'VALIDATION_ERROR', 'The measured quantity must be greater than zero.');
    return;
  }
  const chosen = chosenCatalogueItem(structure.caseId, req.body.catalogueItemId);
  if (chosen.error) {
    fail(res, 400, 'VALIDATION_ERROR', chosen.error);
    return;
  }
  const block: MeasurementBlockFact = {
    id: `blk-${uuidv4().slice(0, 8)}`,
    structureId: structure.id,
    caseId: structure.caseId,
    title: chosen.item?.description || String(req.body.title || 'Measured item'),
    unit: chosen.item?.unit || String(req.body.unit || ''),
    ruleId: 'manual',
    ruleStatus: 'DRAFT',
    status: 'MANUAL',
    formulaText: chosen.item ? 'Measured quantity. Unit and rate come from the selected catalogue row.' : 'Entered by the engineer',
    sourceFactIds: [],
    evidenceIds: [],
    derivedNet: null,
    engineerNet: quantity,
    overrideReason: String(req.body.reason).trim(),
    decidedBy: req.user?.name,
    decidedAt: new Date().toISOString(),
    rateItemId: chosen.item?.id,
    rateMatch: chosen.item ? 'UNIQUE' : 'UNMAPPED',
    lines: [],
  };
  if (!block.unit) {
    fail(res, 400, 'VALIDATION_ERROR', 'Choose a catalogue item so the unit is known.');
    return;
  }
  db.measurementBlocks.push(block);
  db.save();
  res.status(201).json({ block, bundle: bundle(structure.caseId) });
};

function chosenCatalogueItem(caseId: string, catalogueItemId: unknown): { item?: CatalogueItemRecord; error?: string } {
  if (!catalogueItemId) return {};
  const valuationCase = db.cases.find((item) => item.id === caseId);
  if (!valuationCase?.rateScheduleVersionId) {
    return { error: 'Pin a rate schedule on the case before choosing an item.' };
  }
  const items = db.catalogueItems.filter((item) => item.scheduleVersionId === valuationCase.rateScheduleVersionId);
  const item = items.find((row) => row.id === catalogueItemId);
  if (!item) return { error: 'That item is not in the rate schedule pinned on this case.' };
  return { item };
}

export const searchCaseCatalogue = (req: AuthRequest, res: Response): void => {
  const valuationCase = requireBuildingCase(req.params.caseId, res);
  if (!valuationCase) return;
  if (!valuationCase.rateScheduleVersionId) {
    res.status(200).json({
      readiness: 'MISSING_DATA',
      reason: 'Choose a rate schedule on the case before searching items.',
      results: [],
      ambiguousItemNumbers: [],
    });
    return;
  }
  const items = db.catalogueItems.filter((item) => item.scheduleVersionId === valuationCase.rateScheduleVersionId);
  const found = searchCatalogue(items, String(req.query.q || ''));
  res.status(200).json({
    readiness: found.ambiguousItemNumbers.length ? 'AMBIGUOUS' : 'MANUAL',
    reason: found.ambiguousItemNumbers.length
      ? 'More than one catalogue row shares an item number in these results. Choose the row. Nothing is selected automatically.'
      : itemChoiceReadiness({ pinned: true, item: null, sameNumberCount: 0 }).reason,
    results: found.results.map(publicItem),
    ambiguousItemNumbers: found.ambiguousItemNumbers,
  });
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

  const measurementSheet = blocks
    .filter((block) => block.status !== 'EXCLUDED')
    .map((block) => {
      const rateItem = scheduleItems.find((item) => item.id === block.rateItemId);
      return {
        title: block.title,
        unit: block.unit,
        ruleId: block.ruleId,
        itemNumber: rateItem?.itemNumber
          || (block.ruleId.startsWith('eknath.') ? catalogueItemFromRule(block.ruleId) : null),
        derivedNet: block.derivedNet,
        engineerNet: block.engineerNet,
        status: block.status,
        lines: block.lines.map((line) => ({
          label: line.label,
          count: line.count,
          lengthM: line.lengthM,
          breadthM: line.breadthM,
          depthOrHeightM: line.depthOrHeightM,
          sign: line.sign,
          quantity: line.quantity,
          formulaText: line.formulaText,
        })),
      };
    });

  const depreciationView = {
    ...depreciation,
    structures: depreciation.parts.map((part) => {
      const structure = structures.find((item) => item.id === part.structureId);
      return {
        name: structure?.name || part.structureId,
        presentCost: structureCosts.get(part.structureId) || 0,
        depreciatedValue: part.depreciated,
        ageYears: part.presentLife,
        remainingLifeYears: part.futureLife,
        ypFuture: part.ypFuture,
        ypTotal: part.ypTotal,
      };
    }),
  };

  const primary = structures[0];
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
    structureTypeText: primary?.structureTypeText || primary?.wallMaterialText || '',
    constructionYear: primary?.constructionYear ?? null,
    usefulLifeYears: primary?.usefulLifeYears ?? null,
    abstract,
    measurementSheet,
    depreciation: depreciationView,
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
  const property = db.properties.find((p) => p.caseId === valuationCase.id);
  const body = {
    ...replay,
    note: 'SOURCE_REPLAY fixture. Not the production specification.',
    owner: property?.ownerName,
    gutNumber: property?.surveyNumber || property?.houseNumber,
    village: property?.village,
    taluka: property?.taluka,
    district: property?.district,
    laCaseNumber: property?.laCaseNumber,
    conflictingIdentifierNotes: valuationCase.conflictingIdentifierNotes || '',
    abstract: replay.lines.map((line) => ({
      title: line.description,
      quantity: Number(line.quantity),
      unit: line.unit,
      rate: Number(line.rate),
      amount: line.amount,
      itemNumber: line.itemNumber,
      ruleId: 'SOURCE_REPLAY',
      ruleStatus: 'REPLAY_ONLY',
    })),
    measurementSheet: replay.lines.map((line) => ({
      title: line.description,
      unit: line.unit,
      ruleId: 'SOURCE_REPLAY',
      itemNumber: line.itemNumber,
      derivedNet: Number(line.quantity),
      engineerNet: Number(line.quantity),
      status: 'ACCEPTED',
      lines: [{
        label: line.description,
        count: 1,
        lengthM: Number(line.quantity),
        breadthM: 1,
        depthOrHeightM: 1,
        sign: 1,
        quantity: Number(line.quantity),
        formulaText: 'SOURCE_REPLAY workbook net',
      }],
    })),
    depreciation: {
      formula: replay.formula,
      presentCost: replay.presentCost,
      depreciatedValue: replay.depreciatedValue,
      structures: [{
        name: 'Main house (source replay)',
        presentCost: replay.presentCost,
        depreciatedValue: replay.depreciatedValue,
        ypFuture: 5.389,
        ypTotal: 7.024,
      }],
    },
    presentCost: replay.presentCost,
    depreciatedValue: replay.depreciatedValue,
  };
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

export const acceptAllDraftBlocks = (req: AuthRequest, res: Response): void => {
  if (!canWrite(req, res)) return;
  const valuationCase = requireBuildingCase(req.params.caseId, res);
  if (!valuationCase) return;
  const structureId = req.body?.structureId ? String(req.body.structureId) : null;
  let accepted = 0;
  let skippedUnmapped = 0;
  db.measurementBlocks.forEach((block, index) => {
    if (block.caseId !== valuationCase.id) return;
    if (structureId && block.structureId !== structureId) return;
    if (block.ruleId.startsWith('draft.')) return;
    if (block.status !== 'REQUIRES_CONFIRMATION' && block.status !== 'REQUIRES_REVIEW' && block.status !== 'APPLICABLE') return;
    if (block.rateMatch !== 'UNIQUE' && block.rateMatch !== 'MANUAL') {
      skippedUnmapped += 1;
      return;
    }
    const result = applyDecision(block, 'ACCEPT', { id: req.user!.id, name: req.user!.name });
    if (!('error' in result)) {
      db.measurementBlocks[index] = result.block;
      accepted += 1;
    }
  });
  db.save();
  res.status(200).json({
    accepted,
    skippedUnmapped,
    note: skippedUnmapped
      ? `${accepted} line(s) accepted. ${skippedUnmapped} still need a unique catalogue rate — pin CASE-193-RA-UI-GUIDE (or the matching schedule) on Screen 1, then Bind rates.`
      : 'Draft lines with unique rates were accepted for abstract calculation.',
    bundle: bundle(valuationCase.id),
  });
};

/** Re-match catalogue item numbers onto existing measurement lines after a schedule is pinned. */
export const bindCaseRates = (req: AuthRequest, res: Response): void => {
  if (!canWrite(req, res)) return;
  const valuationCase = requireBuildingCase(req.params.caseId, res);
  if (!valuationCase) return;
  if (!valuationCase.rateScheduleVersionId) {
    fail(res, 400, 'INPUT_REQUIRED', 'Pin a rate schedule on Screen 1 first (for Gut 193 use CASE-193-RA-UI-GUIDE).');
    return;
  }
  const rebound = rebindRatesForCase(valuationCase.id);
  db.save();
  res.status(200).json({
    rebound,
    note: rebound
      ? `Bound rates on ${rebound} line(s). Exclude generic helper lines if they are still accepted without rates, then Prepare abstract.`
      : 'No lines could be matched. Confirm the pinned schedule uses item numbers 1, 4, 21, 19.1, 68, etc.',
    bundle: bundle(valuationCase.id),
  });
};

/** Exclude generic draft.* helper lines so they do not block the workbook abstract. */
export const excludeHelperBlocks = (req: AuthRequest, res: Response): void => {
  if (!canWrite(req, res)) return;
  const valuationCase = requireBuildingCase(req.params.caseId, res);
  if (!valuationCase) return;
  const structureId = req.body?.structureId ? String(req.body.structureId) : null;
  let excluded = 0;
  db.measurementBlocks.forEach((block, index) => {
    if (block.caseId !== valuationCase.id) return;
    if (structureId && block.structureId !== structureId) return;
    if (!block.ruleId.startsWith('draft.')) return;
    if (block.status === 'EXCLUDED') return;
    const result = applyDecision(
      block,
      'EXCLUDE',
      { id: req.user!.id, name: req.user!.name },
      'Generic helper line — not part of the workbook abstract.'
    );
    if (!('error' in result)) {
      db.measurementBlocks[index] = result.block;
      excluded += 1;
    }
  });
  db.save();
  res.status(200).json({
    excluded,
    note: excluded
      ? `Excluded ${excluded} helper line(s). Bind rates on the Eknath lines, then Prepare abstract.`
      : 'No helper lines left to exclude.',
    bundle: bundle(valuationCase.id),
  });
};

export const exportSnapshotPdf = (req: AuthRequest, res: Response): void => {
  if (!canExport(req, res)) return;
  const snapshot = db.calculationSnapshots.find((s) => s.id === req.params.id);
  if (!snapshot) {
    fail(res, 404, 'NOT_FOUND', 'Snapshot not found.');
    return;
  }
  if (snapshot.status !== 'FINALIZED') {
    fail(res, 409, 'NOT_FINALIZED', 'Finalize the valuation first. Only the finalized PDF can be downloaded.');
    return;
  }
  const valuationCase = db.cases.find((item) => item.id === snapshot.caseId);
  const catalogueItems = valuationCase?.rateScheduleVersionId
    ? db.catalogueItems.filter((item) => item.scheduleVersionId === valuationCase.rateScheduleVersionId)
    : [];
  const enriched = enrichSnapshotForReport(snapshot, catalogueItems);
  const doc = new PDFDocument({ margin: 36, size: 'A4', compress: false, autoFirstPage: true });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Valuation_Report_${snapshot.caseId}.pdf"`);
  doc.pipe(res);
  writeValuationReportPdf(enriched, doc);
  doc.end();
};

export const exportSnapshotXls = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!canExport(req, res)) return;
  const snapshot = db.calculationSnapshots.find((s) => s.id === req.params.id);
  if (!snapshot) {
    fail(res, 404, 'NOT_FOUND', 'Snapshot not found.');
    return;
  }
  if (snapshot.status !== 'FINALIZED') {
    fail(res, 409, 'NOT_FINALIZED', 'Finalize the valuation first. Only the finalized Excel workbook can be downloaded.');
    return;
  }
  try {
    const valuationCase = db.cases.find((item) => item.id === snapshot.caseId);
    const structure = db.buildingStructures.find((item) => item.caseId === snapshot.caseId && item.participation === 'INCLUDED');
    const catalogueItems = valuationCase?.rateScheduleVersionId
      ? db.catalogueItems.filter((item) => item.scheduleVersionId === valuationCase.rateScheduleVersionId)
      : [];
    const ypTable = valuationCase?.ypTableVersionId
      ? db.ypTables.find((table) => table.id === valuationCase.ypTableVersionId) || null
      : null;
    const valuationYear = valuationCase?.valuationDate ? Number(String(valuationCase.valuationDate).slice(0, 4)) : null;
    const buffer = await buildValuationWorkbook(snapshot, {
      catalogueItems,
      ypTable,
      structureTypeText: structure?.structureTypeText || structure?.wallMaterialText || '',
      constructionYear: structure?.constructionYear ?? null,
      usefulLifeYears: structure?.usefulLifeYears ?? null,
      valuationYear,
    });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Valuation_Workbook_${snapshot.caseId}.xlsx"`);
    res.status(200).send(buffer);
  } catch (error) {
    fail(res, 500, 'EXPORT_FAILED', error instanceof Error ? error.message : 'Workbook export failed.');
  }
};

function enrichSnapshotForReport(
  snapshot: CalculationSnapshotRecord,
  catalogueItems: { itemNumber: string; description: string }[]
): CalculationSnapshotRecord {
  const body = { ...(snapshot.body as Record<string, unknown>) };
  const abstract = Array.isArray(body.abstract) ? [...body.abstract] as { title: string; itemNumber: string | null; ruleId?: string }[] : [];
  body.abstract = abstract.map((row) => {
    if (!row.itemNumber) return row;
    const hit = catalogueItems.find((item) => String(item.itemNumber).trim() === String(row.itemNumber).trim());
    return hit ? { ...row, title: hit.description } : row;
  });
  return { ...snapshot, body };
}

function catalogueItemFromRule(ruleId: string): string | null {
  const map: Record<string, string> = {
    'eknath.excavation.v1': '1',
    'eknath.soling.v1': '4',
    'eknath.rcc-beam.v1': '21',
    'eknath.tmt-steel.v1': '121',
    'eknath.aac-masonry.v1': '19.1',
    'eknath.rcc-column.v1': '6',
    'eknath.jungle-wood.v1': '68',
    'eknath.ceramic-floor.v1': '112',
    'eknath.ceiling.v1': '98',
    'eknath.external-plaster.v1': '30',
    'eknath.internal-plaster.v1': '29',
    'eknath.wood-frames.v1': '97',
  };
  return map[ruleId] || null;
}

function rebindRatesForCase(caseId: string): number {
  const valuationCase = db.cases.find((item) => item.id === caseId);
  if (!valuationCase?.rateScheduleVersionId) return 0;
  const items = db.catalogueItems.filter((item) => item.scheduleVersionId === valuationCase.rateScheduleVersionId);
  let rebound = 0;
  db.measurementBlocks.forEach((block, index) => {
    if (block.caseId !== caseId) return;
    if (block.ruleId.startsWith('draft.')) return;
    const itemNumber = catalogueItemFromRule(block.ruleId);
    if (!itemNumber) return;
    const matched = matchCatalogue(items, itemNumber);
    if (matched.status !== 'UNIQUE' || !matched.matches[0]) return;
    if (block.rateItemId === matched.matches[0].id && block.rateMatch === 'UNIQUE') return;
    db.measurementBlocks[index] = {
      ...block,
      rateItemId: matched.matches[0].id,
      rateMatch: 'UNIQUE',
    };
    rebound += 1;
  });
  return rebound;
}

