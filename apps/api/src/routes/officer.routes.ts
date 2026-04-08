import { Router } from 'express';
import * as officerController from '../controllers/officer.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { OfficerRole } from '@fir/shared';

const router = Router();

// All officer management routes require authentication
router.use(authenticate);

// STATION_ADMIN+ can manage officers
router.post('/', requireRole(OfficerRole.STATION_ADMIN), officerController.create);
router.get('/', requireRole(OfficerRole.SENIOR_OFFICER), officerController.list);
router.get('/:id', requireRole(OfficerRole.SENIOR_OFFICER), officerController.getOne);
router.patch('/:id', requireRole(OfficerRole.STATION_ADMIN), officerController.update);
router.delete('/:id', requireRole(OfficerRole.STATION_ADMIN), officerController.deactivate);

export default router;
