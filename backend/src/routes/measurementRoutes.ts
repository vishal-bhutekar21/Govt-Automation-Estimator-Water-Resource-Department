import { Router } from 'express';
import {
  getMeasurements,
  createMeasurementGroup,
  deleteMeasurementGroup,
  addMeasurementItem,
  updateMeasurementItem,
  deleteMeasurementItem,
  addDeduction,
  deleteDeduction,
} from '../controllers/measurementController';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/:id/measurements', getMeasurements);
router.post('/:id/measurements/groups', createMeasurementGroup);
router.delete('/measurements/groups/:groupId', deleteMeasurementGroup);
router.post('/:id/measurements/items', addMeasurementItem);
router.put('/measurements/items/:itemId', updateMeasurementItem);
router.delete('/measurements/items/:itemId', deleteMeasurementItem);
router.post('/measurements/items/:itemId/deductions', addDeduction);
router.delete('/measurements/deductions/:deductionId', deleteDeduction);

export default router;
