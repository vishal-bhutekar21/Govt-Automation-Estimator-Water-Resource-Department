import { Router } from 'express';
import { getRates, getRateSchedules, createRateItem, updateRateItem } from '../controllers/rateController';
import { authenticateJWT, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/', getRates);
router.get('/schedules', getRateSchedules);
router.post('/', requireRole(['ADMIN']), createRateItem);
router.put('/:id', requireRole(['ADMIN']), updateRateItem);

export default router;
