import express from 'express';
import { createSettlement, getGroupSettlements } from '../controllers/settlementController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { validateBody } from '../middlewares/validationMiddleware.js';
import { createSettlementSchema } from '../utils/joiSchemas.js';

const router = express.Router();

router.use(protect);

router.post('/', validateBody(createSettlementSchema), createSettlement);
router.get('/group/:groupId', getGroupSettlements);

export default router;
