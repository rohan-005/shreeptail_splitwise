import Comment from '../models/Comment.js';
import Expense from '../models/Expense.js';
import GroupMember from '../models/GroupMember.js';
import { getIO } from '../config/socket.js';

// @desc    Add a comment to an expense
// @route   POST /api/comments/expense/:expenseId
// @access  Private
export const createComment = async (req, res, next) => {
  const { expenseId } = req.params;
  const { message } = req.body;

  try {
    const expense = await Expense.findOne({ _id: expenseId, isDeleted: false });
    if (!expense) {
      res.status(404);
      return next(new Error('Expense not found'));
    }

    // Verify user is member of group
    const isMember = await GroupMember.findOne({ groupId: expense.groupId, userId: req.user._id });
    if (!isMember) {
      res.status(403);
      return next(new Error('Access denied. You are not a member of this group.'));
    }

    const comment = await Comment.create({
      expenseId,
      userId: req.user._id,
      message,
    });

    const populated = await Comment.findById(comment._id)
      .populate('userId', 'name email avatarUrl')
      .lean();

    // Broadcast comment via socket room
    const io = getIO();
    if (io) {
      io.to(`expense_${expenseId}`).emit('receive_comment', populated);
    }

    res.status(201).json({
      success: true,
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get comments for a specific expense
// @route   GET /api/comments/expense/:expenseId
// @access  Private
export const getExpenseComments = async (req, res, next) => {
  const { expenseId } = req.params;

  try {
    const expense = await Expense.findOne({ _id: expenseId, isDeleted: false });
    if (!expense) {
      res.status(404);
      return next(new Error('Expense not found'));
    }

    // Verify membership
    const isMember = await GroupMember.findOne({ groupId: expense.groupId, userId: req.user._id });
    if (!isMember) {
      res.status(403);
      return next(new Error('Access denied. You are not a member of this group.'));
    }

    const comments = await Comment.find({ expenseId })
      .populate('userId', 'name email avatarUrl')
      .sort({ createdAt: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: comments,
    });
  } catch (error) {
    next(error);
  }
};
