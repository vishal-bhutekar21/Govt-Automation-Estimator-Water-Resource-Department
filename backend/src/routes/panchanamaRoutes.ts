import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import {
  getPanchanama,
  updatePanchanama,
  addPhoto,
  deletePhoto,
} from '../controllers/panchanamaController';

const router = Router();

router.get('/:id/panchanama', authenticateJWT, getPanchanama);
router.post('/:id/panchanama', authenticateJWT, updatePanchanama);
router.post('/:id/panchanama/photos', authenticateJWT, addPhoto);
router.delete('/panchanama/photos/:photoId', authenticateJWT, deletePhoto);

export default router;
