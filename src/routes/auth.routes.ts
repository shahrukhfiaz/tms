import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { loginHandler, meHandler, refreshHandler } from '../controllers/auth.controller';

const router = Router();

router.post('/login', loginHandler);
router.post('/refresh', refreshHandler);
router.get('/me', authenticate(), meHandler);

export const authRoutes = router;
