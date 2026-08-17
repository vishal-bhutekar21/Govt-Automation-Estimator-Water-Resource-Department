import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db';
import { AuthRequest } from '../middleware/auth';
import { ValuationCase, PropertyDetails, StructureDetails, CaseStatus } from '../models/types';
import { DecimalMath } from '../utils/decimal';

export const getCases = (req: AuthRequest, res: Response): void => {
  try {
    const { projectId, status, search } = req.query;

    let cases = [...db.cases];

    if (projectId) {
      cases = cases.filter((c) => c.projectId === projectId);
    }

    if (status) {
      cases = cases.filter((c) => c.status === status);
    }

    if (search) {
      const q = String(search).toLowerCase();
      cases = cases.filter((c) => {
        const prop = db.properties.find((p) => p.caseId === c.id);
        return (
          c.caseNumber.toLowerCase().includes(q) ||
          (prop && prop.ownerName.toLowerCase().includes(q)) ||
          (prop && prop.houseNumber.toLowerCase().includes(q)) ||
          (prop && prop.village.toLowerCase().includes(q))
        );
      });
    }

    const detailedCases = cases.map((c) => {
      const project = db.projects.find((p) => p.id === c.projectId);
      const property = db.properties.find((p) => p.caseId === c.id);
      const structure = db.structures.find((s) => s.caseId === c.id);
      const finalValuation = db.finalValuations.find((fv) => fv.caseId === c.id);

      return {
        ...c,
        projectName: project ? project.projectName : 'Unknown Project',
        property,
        structure,
        finalValuation,
        formattedValuation: finalValuation ? DecimalMath.formatINR(finalValuation.finalValuationAmount) : 'In Progress',
      };
    });

    res.status(200).json({ cases: detailedCases });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

export const getCaseById = (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const valuationCase = db.cases.find((c) => c.id === id);

    if (!valuationCase) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Valuation Case not found' });
      return;
    }

    const project = db.projects.find((p) => p.id === valuationCase.projectId);
    const property = db.properties.find((p) => p.caseId === id);
    const structure = db.structures.find((s) => s.caseId === id);
    const measurementGroups = db.measurementGroups.filter((g) => g.caseId === id);
    const estimateItems = db.estimateItems.filter((e) => e.caseId === id);
    const depreciationCalculation = db.depreciationCalculations.find((d) => d.caseId === id);
    const salvageEstimate = db.salvageEstimates.find((s) => s.caseId === id);
    const finalValuation = db.finalValuations.find((fv) => fv.caseId === id);
    const documents = db.documents.filter((d) => d.caseId === id);
    const auditLogs = db.auditLogs.filter((a) => a.caseId === id);

    res.status(200).json({
      case: valuationCase,
      project,
      property,
      structure,
      measurementGroups,
      estimateItems,
      depreciationCalculation,
      salvageEstimate,
      finalValuation,
      documents,
      auditLogs,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

export const createCase = (req: AuthRequest, res: Response): void => {
  try {
    const {
      projectId,
      caseNumber,
      dateOfInspection,
      valuationDate,
      ownerName,
      houseNumber,
      village,
      taluka,
      district,
      laCaseNumber,
      surveyNumber,
    } = req.body;

    if (!projectId || !caseNumber || !ownerName) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Project, Case Number, and Owner Name are mandatory fields.',
      });
      return;
    }

    const existing = db.cases.find((c) => c.caseNumber.toLowerCase() === caseNumber.toLowerCase().trim());
    if (existing) {
      res.status(400).json({
        error: 'DUPLICATE_CASE_NUMBER',
        message: `Case Number "${caseNumber}" already exists.`,
      });
      return;
    }

    const newCaseId = `case-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();

    const newCase: ValuationCase = {
      id: newCaseId,
      caseNumber: caseNumber.trim(),
      projectId,
      status: 'DRAFT',
      dateOfInspection: dateOfInspection || new Date().toISOString().split('T')[0],
      valuationDate: valuationDate || new Date().toISOString().split('T')[0],
      preparedBy: req.user?.name || 'Assigned Estimator',
      checkedBy: 'Assistant Engineer (A.E. Gr-I)',
      approvedBy: 'Executive Engineer (E.E.)',
      createdBy: req.user?.id || 'system',
      createdAt: now,
      updatedAt: now,
    };

    const newProperty: PropertyDetails = {
      id: `prop-${uuidv4().slice(0, 8)}`,
      caseId: newCaseId,
      ownerName: ownerName.trim(),
      contactNumber: '',
      address: '',
      village: village || '',
      taluka: taluka || '',
      district: district || '',
      laCaseNumber: laCaseNumber || '',
      houseNumber: houseNumber || '',
      surveyNumber: surveyNumber || '',
      submergenceType: 'Full Submergence (Reservoir Area)',
      additionalNotes: '',
      updatedAt: now,
    };

    const newStructure: StructureDetails = {
      id: `struct-${uuidv4().slice(0, 8)}`,
      caseId: newCaseId,
      structureType: 'Residential Dwelling',
      constructionType: 'B.B.M. Wall + C.G.I. Sheet Roof (Class-B)',
      yearOfConstruction: new Date().getFullYear() - 4,
      totalUsefulLife: 45,
      presentLife: 4,
      futureLife: 41,
      roofType: 'C.G.I. Sheet over Country Teak Frame',
      wallType: 'Burnt Brick Masonry in CM 1:6',
      floorType: 'Cement Concrete 1:4:8 with IPS',
      numberOfRooms: 3,
      builtUpArea: 60.00,
      plinthArea: 68.00,
      additionalNotes: '',
      updatedAt: now,
    };

    db.cases.push(newCase);
    db.properties.push(newProperty);
    db.structures.push(newStructure);
    db.save();

    // Audit log
    db.auditLogs.push({
      id: `aud-${uuidv4().slice(0, 8)}`,
      caseId: newCaseId,
      userId: req.user?.id || 'system',
      userName: req.user?.name || 'System',
      action: 'CASE_CREATED',
      entityType: 'CASE',
      entityId: newCaseId,
      newValue: JSON.stringify({ caseNumber, ownerName }),
      timestamp: now,
    });
    db.save();

    res.status(201).json({
      message: 'Valuation Case created successfully',
      case: newCase,
      property: newProperty,
      structure: newStructure,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

export const updateProperty = (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params; // caseId
    const updates = req.body;

    const propertyIndex = db.properties.findIndex((p) => p.caseId === id);
    if (propertyIndex === -1) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Property details not found for this case' });
      return;
    }

    const currentProp = db.properties[propertyIndex];
    const updatedProperty: PropertyDetails = {
      ...currentProp,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    db.properties[propertyIndex] = updatedProperty;

    // Update case status if in DRAFT
    const cIndex = db.cases.findIndex((c) => c.id === id);
    if (cIndex !== -1 && db.cases[cIndex].status === 'DRAFT') {
      db.cases[cIndex].status = 'MEASUREMENT_IN_PROGRESS';
      db.cases[cIndex].updatedAt = new Date().toISOString();
    }

    // Audit log
    db.auditLogs.push({
      id: `aud-${uuidv4().slice(0, 8)}`,
      caseId: id,
      userId: req.user?.id || 'system',
      userName: req.user?.name || 'System',
      action: 'PROPERTY_DETAILS_UPDATED',
      entityType: 'PROPERTY',
      entityId: updatedProperty.id,
      oldValue: JSON.stringify(currentProp),
      newValue: JSON.stringify(updatedProperty),
      timestamp: new Date().toISOString(),
    });

    db.save();

    res.status(200).json({
      message: 'Property particulars saved successfully',
      property: updatedProperty,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

export const updateStructure = (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params; // caseId
    const {
      structureType,
      constructionType,
      yearOfConstruction,
      totalUsefulLife,
      presentLife,
      futureLife,
      roofType,
      wallType,
      floorType,
      numberOfRooms,
      builtUpArea,
      plinthArea,
      additionalNotes,
    } = req.body;

    const structureIndex = db.structures.findIndex((s) => s.caseId === id);
    if (structureIndex === -1) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Structure details not found for this case' });
      return;
    }

    const currentStruct = db.structures[structureIndex];

    // Lifecycle validation
    const currentYear = new Date().getFullYear();
    const constYear = Number(yearOfConstruction) || currentStruct.yearOfConstruction;
    const totalLife = Number(totalUsefulLife) || currentStruct.totalUsefulLife;

    if (constYear > currentYear) {
      res.status(400).json({
        error: 'INVALID_YEAR',
        message: `Year of construction (${constYear}) cannot be in the future.`,
      });
      return;
    }

    const calcPresentLife = presentLife !== undefined ? Number(presentLife) : currentYear - constYear;
    const calcFutureLife = futureLife !== undefined ? Number(futureLife) : totalLife - calcPresentLife;

    if (calcFutureLife < 0) {
      res.status(400).json({
        error: 'INVALID_LIFE',
        message: 'Present life cannot exceed the total useful life of the building.',
      });
      return;
    }

    const updatedStructure: StructureDetails = {
      ...currentStruct,
      structureType: structureType || currentStruct.structureType,
      constructionType: constructionType || currentStruct.constructionType,
      yearOfConstruction: constYear,
      totalUsefulLife: totalLife,
      presentLife: calcPresentLife,
      futureLife: calcFutureLife,
      roofType: roofType || currentStruct.roofType,
      wallType: wallType || currentStruct.wallType,
      floorType: floorType || currentStruct.floorType,
      numberOfRooms: Number(numberOfRooms) || currentStruct.numberOfRooms,
      builtUpArea: Number(builtUpArea) || currentStruct.builtUpArea,
      plinthArea: Number(plinthArea) || currentStruct.plinthArea,
      additionalNotes: additionalNotes || currentStruct.additionalNotes,
      updatedAt: new Date().toISOString(),
    };

    db.structures[structureIndex] = updatedStructure;

    // Audit log
    db.auditLogs.push({
      id: `aud-${uuidv4().slice(0, 8)}`,
      caseId: id,
      userId: req.user?.id || 'system',
      userName: req.user?.name || 'System',
      action: 'STRUCTURE_DETAILS_UPDATED',
      entityType: 'STRUCTURE',
      entityId: updatedStructure.id,
      oldValue: JSON.stringify(currentStruct),
      newValue: JSON.stringify(updatedStructure),
      timestamp: new Date().toISOString(),
    });

    db.save();

    res.status(200).json({
      message: 'Structure specifications saved successfully',
      structure: updatedStructure,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

export const updateCaseStatus = (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const caseIndex = db.cases.findIndex((c) => c.id === id);
    if (caseIndex === -1) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Case not found' });
      return;
    }

    const oldStatus = db.cases[caseIndex].status;
    db.cases[caseIndex].status = status as CaseStatus;
    db.cases[caseIndex].updatedAt = new Date().toISOString();

    db.auditLogs.push({
      id: `aud-${uuidv4().slice(0, 8)}`,
      caseId: id,
      userId: req.user?.id || 'system',
      userName: req.user?.name || 'System',
      action: 'CASE_STATUS_CHANGED',
      entityType: 'CASE',
      entityId: id,
      oldValue: oldStatus,
      newValue: status,
      timestamp: new Date().toISOString(),
    });

    db.save();

    res.status(200).json({
      message: `Case status updated to ${status}`,
      case: db.cases[caseIndex],
    });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};
