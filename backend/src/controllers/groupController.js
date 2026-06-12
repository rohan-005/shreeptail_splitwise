import Group from '../models/Group.js';
import GroupMember from '../models/GroupMember.js';
import User from '../models/User.js';
import { calculateGroupBalances } from '../services/balanceService.js';

// @desc    Create a new group
// @route   POST /api/groups
// @access  Private
export const createGroup = async (req, res, next) => {
  const { name, category } = req.body;

  try {
    const group = await Group.create({
      name,
      category,
      createdBy: req.user._id,
    });

    // Add creator as first group member
    await GroupMember.create({
      groupId: group._id,
      userId: req.user._id,
      role: 'creator',
    });

    res.status(201).json({
      success: true,
      data: group,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's active groups with their individual net balance
// @route   GET /api/groups
// @access  Private
export const getGroups = async (req, res, next) => {
  try {
    // Find memberships
    const memberships = await GroupMember.find({ userId: req.user._id }).lean();
    const groupIds = memberships.map((m) => m.groupId);

    // Find groups that are not deleted
    const groups = await Group.find({ _id: { $in: groupIds }, isDeleted: false }).lean();

    // Enrich groups with the current user's net balance
    const enrichedGroups = [];
    for (const group of groups) {
      const { netBalances } = await calculateGroupBalances(group._id);
      const userBal = netBalances.find((nb) => nb.user._id.toString() === req.user._id.toString());
      
      enrichedGroups.push({
        ...group,
        userNetBalance: userBal ? userBal.netBalance : 0,
      });
    }

    res.status(200).json({
      success: true,
      data: enrichedGroups,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get group details, members, expenses, and current balances
// @route   GET /api/groups/:groupId
// @access  Private
export const getGroupById = async (req, res, next) => {
  const { groupId } = req.params;

  try {
    const group = await Group.findOne({ _id: groupId, isDeleted: false }).lean();
    if (!group) {
      res.status(404);
      return next(new Error('Group not found'));
    }

    // Check if user is a member of the group
    const isMember = await GroupMember.findOne({ groupId, userId: req.user._id });
    if (!isMember) {
      res.status(403);
      return next(new Error('Access denied. You are not a member of this group.'));
    }

    // Get members
    const membersList = await GroupMember.find({ groupId })
      .populate('userId', 'name email avatarUrl')
      .lean();
    
    const members = membersList.map((m) => ({
      ...m.userId,
      role: m.role,
      joinedAt: m.joinedAt,
    }));

    // Calculate balances
    const balances = await calculateGroupBalances(groupId);

    res.status(200).json({
      success: true,
      data: {
        group,
        members,
        balances: balances.netBalances,
        debts: balances.debts,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add member to group by email
// @route   POST /api/groups/:groupId/members
// @access  Private
export const addGroupMember = async (req, res, next) => {
  const { groupId } = req.params;
  const { email } = req.body;

  try {
    const group = await Group.findOne({ _id: groupId, isDeleted: false });
    if (!group) {
      res.status(404);
      return next(new Error('Group not found'));
    }

    // Check if the current user is a member of this group
    const isMember = await GroupMember.findOne({ groupId, userId: req.user._id });
    if (!isMember) {
      res.status(403);
      return next(new Error('Access denied. You are not a member of this group.'));
    }

    // Find user by email (registered only)
    const invitee = await User.findOne({ email });
    if (!invitee) {
      res.status(404);
      return next(new Error('No user found with this email. Ask them to register first.'));
    }

    // Check if they are already in the group
    const alreadyMember = await GroupMember.findOne({ groupId, userId: invitee._id });
    if (alreadyMember) {
      res.status(400);
      return next(new Error('User is already a member of this group'));
    }

    // Add member
    const newMembership = await GroupMember.create({
      groupId,
      userId: invitee._id,
      role: 'member',
    });

    res.status(201).json({
      success: true,
      data: {
        _id: invitee._id,
        name: invitee.name,
        email: invitee.email,
        avatarUrl: invitee.avatarUrl,
        role: newMembership.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove member from group (Creator/Admin only)
// @route   DELETE /api/groups/:groupId/members/:userId
// @access  Private
export const removeGroupMember = async (req, res, next) => {
  const { groupId, userId } = req.params;

  try {
    const group = await Group.findOne({ _id: groupId, isDeleted: false });
    if (!group) {
      res.status(404);
      return next(new Error('Group not found'));
    }

    // Check if current user is group creator/admin
    const currentMember = await GroupMember.findOne({ groupId, userId: req.user._id });
    if (!currentMember || currentMember.role !== 'creator') {
      res.status(403);
      return next(new Error('Only the group creator can remove members'));
    }

    // Check if trying to remove self
    if (req.user._id.toString() === userId) {
      res.status(400);
      return next(new Error('You cannot remove yourself. Use leave group instead.'));
    }

    // Check if member exists in group
    const targetMember = await GroupMember.findOne({ groupId, userId });
    if (!targetMember) {
      res.status(404);
      return next(new Error('Member not found in this group'));
    }

    // Check balance of target member: must be zero
    const { netBalances } = await calculateGroupBalances(groupId);
    const targetBal = netBalances.find((nb) => nb.user._id.toString() === userId);
    const balance = targetBal ? targetBal.netBalance : 0;

    if (Math.abs(balance) > 0.01) {
      res.status(400);
      return next(new Error('Cannot remove user with an outstanding non-zero balance'));
    }

    // Delete membership
    await GroupMember.deleteOne({ groupId, userId });

    res.status(200).json({
      success: true,
      message: 'Member removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Leave a group (User leaves voluntarily)
// @route   POST /api/groups/:groupId/leave
// @access  Private
export const leaveGroup = async (req, res, next) => {
  const { groupId } = req.params;

  try {
    const group = await Group.findOne({ _id: groupId, isDeleted: false });
    if (!group) {
      res.status(404);
      return next(new Error('Group not found'));
    }

    // Check membership
    const membership = await GroupMember.findOne({ groupId, userId: req.user._id });
    if (!membership) {
      res.status(404);
      return next(new Error('You are not a member of this group'));
    }

    // Check balance
    const { netBalances } = await calculateGroupBalances(groupId);
    const userBal = netBalances.find((nb) => nb.user._id.toString() === req.user._id.toString());
    const balance = userBal ? userBal.netBalance : 0;

    if (Math.abs(balance) > 0.01) {
      res.status(400);
      return next(new Error('Settle your balance before leaving this group.'));
    }

    // If they are the creator, they cannot leave if there are other members (they must delete or transfer ownership)
    if (membership.role === 'creator') {
      const memberCount = await GroupMember.countDocuments({ groupId });
      if (memberCount > 1) {
        res.status(400);
        return next(
          new Error('As the creator, you cannot leave unless you are the only member left. Try deleting the group instead.')
        );
      }
    }

    // Delete membership
    await GroupMember.deleteOne({ groupId, userId: req.user._id });

    res.status(200).json({
      success: true,
      message: 'You left the group successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Soft-delete a group (Creator only)
// @route   DELETE /api/groups/:groupId
// @access  Private
export const deleteGroup = async (req, res, next) => {
  const { groupId } = req.params;

  try {
    const group = await Group.findOne({ _id: groupId, isDeleted: false });
    if (!group) {
      res.status(404);
      return next(new Error('Group not found'));
    }

    // Check permissions
    const membership = await GroupMember.findOne({ groupId, userId: req.user._id });
    if (!membership || membership.role !== 'creator') {
      res.status(403);
      return next(new Error('Only the group creator can delete this group'));
    }

    // Check balances (all members must have 0 balance)
    const { netBalances } = await calculateGroupBalances(groupId);
    const outstandingBalances = netBalances.filter((nb) => Math.abs(nb.netBalance) > 0.01);

    if (outstandingBalances.length > 0) {
      res.status(400);
      return next(new Error('Cannot delete group. All members must have a zero balance.'));
    }

    // Soft delete
    group.isDeleted = true;
    await group.save();

    res.status(200).json({
      success: true,
      message: 'Group deleted successfully (soft-deleted)',
    });
  } catch (error) {
    next(error);
  }
};
