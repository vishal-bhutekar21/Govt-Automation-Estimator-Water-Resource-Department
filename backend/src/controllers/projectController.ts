import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db';
import { AuthRequest } from '../middleware/auth';
import { Project } from '../models/types';
import { DecimalMath } from '../utils/decimal';

export const getProjects = (_req: AuthRequest, res: Response): void => {
  try {
    const projectsWithCounts = db.projects.map((proj) => {
      const cases = db.cases.filter((c) => c.projectId === proj.id);
      let totalValuation = 0;
      cases.forEach((c) => {
        const val = db.finalValuations.find((fv) => fv.caseId === c.id);
        if (val) {
          totalValuation = DecimalMath.add(totalValuation, val.finalValuationAmount).toNumber();
        }
      });

      return {
        ...proj,
        casesCount: cases.length,
        totalValuationSum: totalValuation,
        formattedTotalValuation: DecimalMath.formatINR(totalValuation),
      };
    });

    res.status(200).json({ projects: projectsWithCounts });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

export const getProjectById = (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const project = db.projects.find((p) => p.id === id);

    if (!project) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Project not found' });
      return;
    }

    const cases = db.cases.filter((c) => c.projectId === id).map((c) => {
      const property = db.properties.find((p) => p.caseId === c.id);
      const val = db.finalValuations.find((fv) => fv.caseId === c.id);
      return {
        ...c,
        property,
        finalValuation: val,
      };
    });

    res.status(200).json({ project, cases });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

export const createProject = (req: AuthRequest, res: Response): void => {
  try {
    const { projectCode, projectName, department, division, subDivision, district, taluka, description } = req.body;

    if (!projectCode || !projectName || !department) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Project Code, Project Name, and Department are mandatory.',
      });
      return;
    }

    const existing = db.projects.find(
      (p) => p.projectCode.toLowerCase() === projectCode.toLowerCase().trim()
    );
    if (existing) {
      res.status(400).json({
        error: 'DUPLICATE_CODE',
        message: `Project Code "${projectCode}" already exists.`,
      });
      return;
    }

    const newProject: Project = {
      id: `proj-${uuidv4().slice(0, 8)}`,
      projectCode: projectCode.trim().toUpperCase(),
      projectName: projectName.trim(),
      department: department.trim(),
      division: division || '',
      subDivision: subDivision || '',
      district: district || '',
      taluka: taluka || '',
      description: description || '',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.projects.push(newProject);
    db.save();

    // Record audit log
    db.auditLogs.push({
      id: `aud-${uuidv4().slice(0, 8)}`,
      userId: req.user?.id || 'system',
      userName: req.user?.name || 'System',
      action: 'PROJECT_CREATED',
      entityType: 'PROJECT',
      entityId: newProject.id,
      newValue: JSON.stringify(newProject),
      timestamp: new Date().toISOString(),
    });
    db.save();

    res.status(201).json({ message: 'Project created successfully', project: newProject });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};
