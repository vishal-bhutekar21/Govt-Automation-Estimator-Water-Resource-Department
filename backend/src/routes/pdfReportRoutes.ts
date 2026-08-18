import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import { generateValuationPdf } from '../controllers/pdfReportController';

const router = Router();

router.get('/:id/report/download', authenticateJWT, generateValuationPdf);

export default router;
