import { Router } from 'express';
import * as firController from '../controllers/fir.controller';
import { authenticate } from '../middleware/auth.middleware';
import { aiRateLimit } from '../middleware/rateLimit.middleware';

const router = Router();

router.use(authenticate);

router.get('/', firController.list);
router.post('/', aiRateLimit, firController.create);
router.get('/:id', firController.getOne);
router.patch('/:id', firController.update);
router.post('/:id/finalize', firController.finalize);

export default router;
