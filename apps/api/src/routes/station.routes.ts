import { Router } from 'express';
import * as stationController from '../controllers/station.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { OfficerRole } from '@fir/shared';

const router = Router();

// Public: station registration (creates first STATION_ADMIN)
router.post('/register', stationController.register);

// Protected: get/update own station
router.get('/me', authenticate, stationController.getMyStation);
router.patch('/me', authenticate, requireRole(OfficerRole.STATION_ADMIN), stationController.update);

export default router;
