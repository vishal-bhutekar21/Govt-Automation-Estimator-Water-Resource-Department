import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import {
  getDepreciation,
  recalculateDepreciation,
  getYpFactors,
} from '../controllers/depreciationController';

const router = Router();

// Routes for Case Depreciation & YP Factors
router.get('/:id/depreciation', authenticateJWT, getDepreciation);
router.post('/:id/depreciation/calculate', authenticateJWT, recalculateDepreciation);
router.get('/rates/yp-factors', authenticateJWT, getYpFactors);

export default router;
