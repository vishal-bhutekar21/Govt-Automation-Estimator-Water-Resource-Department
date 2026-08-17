import { Router } from 'express';
import { getProjects, getProjectById, createProject } from '../controllers/projectController';
import { authenticateJWT, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/', getProjects);
router.get('/:id', getProjectById);
router.post('/', requireRole(['ADMIN']), createProject);

export default router;
