import { Response } from 'express';
import { db } from '../database/db';
import { AuthRequest } from '../middleware/auth';
import { AuditLog } from '../models/types';

export const getAuditLogs = (req: AuthRequest, res: Response): void => {
  try {
    const logs = [...db.auditLogs].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    res.status(200).json({ logs });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};
