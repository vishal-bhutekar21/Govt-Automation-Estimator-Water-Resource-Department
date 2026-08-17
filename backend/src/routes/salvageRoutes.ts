import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import {
  getSalvage,
  updateSalvageConfig,
  getFinalValuationSummary,
} from '../controllers/salvageController';

const router = Router();

// Routes for Case Salvage & Final Valuation
router.get('/:id/salvage', authenticateJWT, getSalvage);
router.post('/:id/salvage/update', authenticateJWT, updateSalvageConfig);
router.get('/:id/final-valuation', authenticateJWT, getFinalValuationSummary);

export default router;
