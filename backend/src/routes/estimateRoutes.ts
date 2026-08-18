import { Router } from 'express';
import { getEstimate, recalculateEstimate, updateEstimateItem, linkGroupRate } from '../controllers/estimateController';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/:id/estimate', getEstimate);
router.post('/:id/estimate/recalculate', recalculateEstimate);
router.put('/estimate/items/:itemId', updateEstimateItem);
router.post('/measurements/groups/:groupId/link-rate', linkGroupRate);

export default router;
