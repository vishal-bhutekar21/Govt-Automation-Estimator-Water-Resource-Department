import { Router } from 'express';
import { login, register, getMe, listUsers, deleteUser } from '../controllers/authController';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.get('/users', listUsers);
router.delete('/users/:id', deleteUser);
router.get('/me', authenticateJWT, getMe);

export default router;
