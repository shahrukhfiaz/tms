import { Router } from 'express';
import { authRoutes } from './auth.routes';
import { userRoutes } from './user.routes';
import { domainRoutes } from './domain.routes';
import { sessionRoutes } from './session.routes';
import { auditRoutes } from './audit.routes';

const router = Router();

// API health check
router.get('/healthz', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    api: 'v1'
  });
});

// Register all routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/domains', domainRoutes);
router.use('/sessions', sessionRoutes);
router.use('/audits', auditRoutes);

export default router;
