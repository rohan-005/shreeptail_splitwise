import express from 'express';
import {
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseById,
  getGroupExpenses,
} from '../controllers/expenseController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { validateBody } from '../middlewares/validationMiddleware.js';
import { createExpenseSchema } from '../utils/joiSchemas.js';

const router = express.Router();

router.use(protect);

router.post('/', validateBody(createExpenseSchema), createExpense);

router.route('/:expenseId')
  .get(getExpenseById)
  .put(updateExpense)
  .delete(deleteExpense);

router.get('/group/:groupId', getGroupExpenses);

export default router;
