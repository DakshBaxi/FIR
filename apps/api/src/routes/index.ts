import { Router } from 'express';
import authRoutes from './auth.routes';
import stationRoutes from './station.routes';
import officerRoutes from './officer.routes';
import firRoutes from './fir.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/stations', stationRoutes);
router.use('/officers', officerRoutes);
router.use('/firs', firRoutes);

export default router;
