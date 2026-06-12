import express from 'express';
import { createComment, getExpenseComments } from '../controllers/commentController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { validateBody } from '../middlewares/validationMiddleware.js';
import { createCommentSchema } from '../utils/joiSchemas.js';

const router = express.Router();

router.use(protect);

router.route('/expense/:expenseId')
  .get(getExpenseComments)
  .post(validateBody(createCommentSchema), createComment);

export default router;
