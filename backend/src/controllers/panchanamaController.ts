import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db';
import { AuthRequest } from '../middleware/auth';
import { PanchanamaDetails, EvidencePhoto } from '../models/types';

// Helper to get or create panchanama record
export const getCasePanchanama = (caseId: string): { panchanama: PanchanamaDetails; photos: EvidencePhoto[] } => {
  let panchanama = db.panchanamaRecords?.find((p) => p.caseId === caseId);

  if (!panchanama) {
    panchanama = {
      id: `panch-${uuidv4().slice(0, 8)}`,
      caseId,
      dateOfInspection: '2016-04-12',
      panchas: [
        { name: 'Shri Rambhau Tukaram Patil', address: 'Dadulgaon, Tal. Nandura', isSigned: true },
        { name: 'Shri Suresh Pundlik Wankhade', address: 'Dadulgaon, Tal. Nandura', isSigned: true },
      ],
      jointInspectionOfficers: [
        'Sectional Engineer (Irrigation Sub-Division)',
        'Talathi / Patwari (Dadulgaon Saja)',
        'Circle Officer (Revenue Department)',
      ],
      generalRemarks:
        'The residential house structure of Shri Mohan Vishwanath Gai is located in the core submergence zone of Jigaon Major Irrigation Project. Measurements of all rooms, BBM walls, teak roof purlins, and CGI sheets were recorded in the presence of the owner and panchas.',
      structuralCondition: 'GOOD',
      updatedAt: new Date().toISOString(),
    };
    if (!db.panchanamaRecords) {
      db.panchanamaRecords = [];
    }
    db.panchanamaRecords.push(panchanama);
    db.save();
  }

  const photos = db.evidencePhotos?.filter((p) => p.caseId === caseId) || [];

  return { panchanama: panchanama!, photos };
};

export const getPanchanama = (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params; // caseId
    const data = getCasePanchanama(id);
    res.status(200).json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

export const updatePanchanama = (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params; // caseId
    const { panchas, jointInspectionOfficers, generalRemarks, structuralCondition, dateOfInspection } = req.body;

    const { panchanama } = getCasePanchanama(id);

    if (panchas !== undefined) panchanama.panchas = panchas;
    if (jointInspectionOfficers !== undefined) panchanama.jointInspectionOfficers = jointInspectionOfficers;
    if (generalRemarks !== undefined) panchanama.generalRemarks = generalRemarks;
    if (structuralCondition !== undefined) panchanama.structuralCondition = structuralCondition;
    if (dateOfInspection !== undefined) panchanama.dateOfInspection = dateOfInspection;
    panchanama.updatedAt = new Date().toISOString();

    db.save();

    res.status(200).json({ message: 'Panchanama updated successfully', panchanama });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

export const addPhoto = (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params; // caseId
    const { title, category, description, photoUrl } = req.body;

    const newPhoto: EvidencePhoto = {
      id: `photo-${uuidv4().slice(0, 8)}`,
      caseId: id,
      title: title || 'Structural Inspection Photo',
      category: category || 'FRONT_ELEVATION',
      description: description || 'Visual condition at the time of inspection',
      photoUrl: photoUrl || 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=600&q=80',
      capturedAt: new Date().toISOString(),
    };

    if (!db.evidencePhotos) db.evidencePhotos = [];
    db.evidencePhotos.push(newPhoto);
    db.save();

    res.status(201).json({ message: 'Photo added', photo: newPhoto });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

export const deletePhoto = (req: AuthRequest, res: Response): void => {
  try {
    const { photoId } = req.params;
    if (!db.evidencePhotos) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Photo not found' });
      return;
    }

    const idx = db.evidencePhotos.findIndex((p) => p.id === photoId);
    if (idx === -1) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Photo not found' });
      return;
    }

    const deleted = db.evidencePhotos.splice(idx, 1)[0];
    db.save();

    res.status(200).json({ message: 'Photo deleted', photo: deleted });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};
