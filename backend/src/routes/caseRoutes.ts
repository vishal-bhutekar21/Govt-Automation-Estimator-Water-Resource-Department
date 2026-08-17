import { Router } from 'express';
import {
  getCases,
  getCaseById,
  createCase,
  updateProperty,
  updateStructure,
  updateCaseStatus,
} from '../controllers/caseController';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/', getCases);
router.post('/', createCase);
router.get('/:id', getCaseById);
router.put('/:id/property', updateProperty);
router.put('/:id/structure', updateStructure);
router.put('/:id/status', updateCaseStatus);

export default router;
