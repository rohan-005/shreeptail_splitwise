import Settlement from '../models/Settlement.js';
import Group from '../models/Group.js';
import GroupMember from '../models/GroupMember.js';

// @desc    Record a manual cash payment between two users
// @route   POST /api/settlements
// @access  Private
export const createSettlement = async (req, res, next) => {
  const { toUser, groupId, amount } = req.body;
  const fromUser = req.user._id;

  try {
    const group = await Group.findOne({ _id: groupId, isDeleted: false });
    if (!group) {
      res.status(404);
      return next(new Error('Group not found'));
    }

    // Verify current user is a member
    const isFromMember = await GroupMember.findOne({ groupId, userId: fromUser });
    if (!isFromMember) {
      res.status(403);
      return next(new Error('Access denied. You are not a member of this group.'));
    }

    // Verify recipient user is a member
    const isToMember = await GroupMember.findOne({ groupId, userId: toUser });
    if (!isToMember) {
      res.status(400);
      return next(new Error('Recipient user is not a member of this group'));
    }

    if (fromUser.toString() === toUser) {
      res.status(400);
      return next(new Error('You cannot settle a balance with yourself'));
    }

    // Create settlement record
    const settlement = await Settlement.create({
      fromUser,
      toUser,
      groupId,
      amount,
    });

    // Populate user names for response
    const populated = await Settlement.findById(settlement._id)
      .populate('fromUser', 'name email avatarUrl')
      .populate('toUser', 'name email avatarUrl')
      .lean();

    res.status(201).json({
      success: true,
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all settlements for a group
// @route   GET /api/settlements/group/:groupId
// @access  Private
export const getGroupSettlements = async (req, res, next) => {
  const { groupId } = req.params;

  try {
    const group = await Group.findOne({ _id: groupId, isDeleted: false });
    if (!group) {
      res.status(404);
      return next(new Error('Group not found'));
    }

    // Verify user membership
    const isMember = await GroupMember.findOne({ groupId, userId: req.user._id });
    if (!isMember) {
      res.status(403);
      return next(new Error('Access denied. You are not a member of this group.'));
    }

    const settlements = await Settlement.find({ groupId })
      .populate('fromUser', 'name email avatarUrl')
      .populate('toUser', 'name email avatarUrl')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: settlements,
    });
  } catch (error) {
    next(error);
  }
};
