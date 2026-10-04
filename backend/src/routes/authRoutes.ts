import { Router } from 'express';
import { login, register, getMe, listUsers, deleteUser } from '../controllers/authController';
import { authenticateJWT, requireRole } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/register', authenticateJWT, requireRole(['ADMIN']), register);
router.get('/users', authenticateJWT, requireRole(['ADMIN']), listUsers);
router.delete('/users/:id', authenticateJWT, requireRole(['ADMIN']), deleteUser);
router.get('/me', authenticateJWT, getMe);

export default router;
