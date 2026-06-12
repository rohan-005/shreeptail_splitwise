import express from 'express';
import {
  createGroup,
  getGroups,
  getGroupById,
  addGroupMember,
  removeGroupMember,
  leaveGroup,
  deleteGroup,
} from '../controllers/groupController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { validateBody } from '../middlewares/validationMiddleware.js';
import { createGroupSchema, addMemberSchema } from '../utils/joiSchemas.js';

const router = express.Router();

// Apply protect middleware to all group routes
router.use(protect);

router.route('/')
  .post(validateBody(createGroupSchema), createGroup)
  .get(getGroups);

router.route('/:groupId')
  .get(getGroupById)
  .delete(deleteGroup);

router.post('/:groupId/members', validateBody(addMemberSchema), addGroupMember);
router.delete('/:groupId/members/:userId', removeGroupMember);
router.post('/:groupId/leave', leaveGroup);

export default router;
