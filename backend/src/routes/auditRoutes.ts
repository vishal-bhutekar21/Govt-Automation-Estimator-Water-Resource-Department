import { Router } from 'express';
import { authenticateJWT, requireRole } from '../middleware/auth';
import { getAuditLogs } from '../controllers/auditController';

const router = Router();

router.get('/', authenticateJWT, getAuditLogs);

export default router;
