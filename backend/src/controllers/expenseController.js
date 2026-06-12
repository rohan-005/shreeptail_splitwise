import Expense from '../models/Expense.js';
import Group from '../models/Group.js';
import GroupMember from '../models/GroupMember.js';

/**
 * Helper to compute split amounts for participants based on splitType.
 */
const computeSplits = (amount, splitType, rawSplits) => {
  let computedSplits = [];
  let sumComputed = 0;

  if (splitType === 'equal') {
    const n = rawSplits.length;
    const share = Math.floor((amount / n) * 100) / 100;
    
    computedSplits = rawSplits.map((s) => ({
      user: s.user,
      amount: share,
    }));
    
    // Remainder adjustments
    sumComputed = share * n;
    const diff = parseFloat((amount - sumComputed).toFixed(2));
    if (diff !== 0 && computedSplits.length > 0) {
      computedSplits[0].amount = parseFloat((computedSplits[0].amount + diff).toFixed(2));
    }
  } 
  else if (splitType === 'unequal') {
    const sumValues = rawSplits.reduce((acc, curr) => acc + (curr.value || 0), 0);
    if (Math.abs(sumValues - amount) > 0.01) {
      throw new Error(`Sum of split amounts (${sumValues}) must equal the total expense amount (${amount})`);
    }
    computedSplits = rawSplits.map((s) => ({
      user: s.user,
      amount: parseFloat(s.value.toFixed(2)),
    }));
  } 
  else if (splitType === 'percentage') {
    const sumPct = rawSplits.reduce((acc, curr) => acc + (curr.value || 0), 0);
    if (Math.abs(sumPct - 100) > 0.01) {
      throw new Error('Sum of percentages must equal 100%');
    }
    
    computedSplits = rawSplits.map((s) => ({
      user: s.user,
      amount: Math.floor(((s.value / 100) * amount) * 100) / 100,
    }));
    
    sumComputed = computedSplits.reduce((acc, curr) => acc + curr.amount, 0);
    const diff = parseFloat((amount - sumComputed).toFixed(2));
    if (diff !== 0 && computedSplits.length > 0) {
      computedSplits[0].amount = parseFloat((computedSplits[0].amount + diff).toFixed(2));
    }
  } 
  else if (splitType === 'shares') {
    const totalShares = rawSplits.reduce((acc, curr) => acc + (curr.value || 0), 0);
    if (totalShares <= 0) {
      throw new Error('Total shares must be greater than zero');
    }
    
    computedSplits = rawSplits.map((s) => ({
      user: s.user,
      amount: Math.floor(((s.value / totalShares) * amount) * 100) / 100,
    }));
    
    sumComputed = computedSplits.reduce((acc, curr) => acc + curr.amount, 0);
    const diff = parseFloat((amount - sumComputed).toFixed(2));
    if (diff !== 0 && computedSplits.length > 0) {
      computedSplits[0].amount = parseFloat((computedSplits[0].amount + diff).toFixed(2));
    }
  }

  return computedSplits;
};

// @desc    Log a new expense
// @route   POST /api/expenses
// @access  Private
export const createExpense = async (req, res, next) => {
  const { description, amount, paidBy, splitType, groupId, splits } = req.body;

  try {
    const group = await Group.findOne({ _id: groupId, isDeleted: false });
    if (!group) {
      res.status(404);
      return next(new Error('Group not found'));
    }

    // Verify creator is a member of the group
    const isCreatorMember = await GroupMember.findOne({ groupId, userId: req.user._id });
    if (!isCreatorMember) {
      res.status(403);
      return next(new Error('Access denied. You are not a member of this group.'));
    }

    // Fetch all group member user IDs for validation
    const groupMembers = await GroupMember.find({ groupId }).lean();
    const memberIdSet = new Set(groupMembers.map((gm) => gm.userId.toString()));

    // Validate that payee is a member
    if (!memberIdSet.has(paidBy)) {
      res.status(400);
      return next(new Error('Payer (paidBy) must be a member of the group'));
    }

    // Validate that all split participants are members
    for (const split of splits) {
      if (!memberIdSet.has(split.user)) {
        res.status(400);
        return next(new Error('All split participants must be members of the group'));
      }
    }

    // Compute splits
    let computedSplits;
    try {
      computedSplits = computeSplits(amount, splitType, splits);
    } catch (err) {
      res.status(400);
      return next(err);
    }

    // Create expense
    const expense = await Expense.create({
      description,
      amount,
      paidBy,
      splitType,
      groupId,
      splits: computedSplits,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update an expense (Creator or Group Admin only)
// @route   PUT /api/expenses/:expenseId
// @access  Private
export const updateExpense = async (req, res, next) => {
  const { expenseId } = req.params;
  const { description, amount, paidBy, splitType, splits } = req.body;

  try {
    const expense = await Expense.findOne({ _id: expenseId, isDeleted: false });
    if (!expense) {
      res.status(404);
      return next(new Error('Expense not found'));
    }

    const group = await Group.findOne({ _id: expense.groupId, isDeleted: false });
    if (!group) {
      res.status(404);
      return next(new Error('Group not found'));
    }

    // Check permissions (expense creator or group creator/admin)
    const groupMember = await GroupMember.findOne({ groupId: expense.groupId, userId: req.user._id });
    const isCreator = expense.createdBy.toString() === req.user._id.toString();
    const isAdmin = groupMember && groupMember.role === 'creator';

    if (!isCreator && !isAdmin) {
      res.status(403);
      return next(new Error('Only the expense creator or group admin can edit this expense'));
    }

    // Fetch group members to validate membership of payee and split participants
    const groupMembers = await GroupMember.find({ groupId: expense.groupId }).lean();
    const memberIdSet = new Set(groupMembers.map((gm) => gm.userId.toString()));

    if (paidBy && !memberIdSet.has(paidBy)) {
      res.status(400);
      return next(new Error('Payer (paidBy) must be a member of the group'));
    }

    if (splits) {
      for (const split of splits) {
        if (!memberIdSet.has(split.user)) {
          res.status(400);
          return next(new Error('All split participants must be members of the group'));
        }
      }
    }

    // Compute updated fields
    if (description) expense.description = description;
    if (paidBy) expense.paidBy = paidBy;
    
    if (amount || splitType || splits) {
      // Use existing values if not provided
      const newAmount = amount !== undefined ? amount : expense.amount;
      const newSplitType = splitType !== undefined ? splitType : expense.splitType;
      const newSplits = splits !== undefined ? splits : expense.splits.map((s) => ({ user: s.user.toString(), value: s.amount })); // Fallback map

      let computedSplits;
      try {
        computedSplits = computeSplits(newAmount, newSplitType, newSplits);
      } catch (err) {
        res.status(400);
        return next(err);
      }

      expense.amount = newAmount;
      expense.splitType = newSplitType;
      expense.splits = computedSplits;
    }

    await expense.save();

    res.status(200).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Soft-delete an expense (Creator or Group Admin only)
// @route   DELETE /api/expenses/:expenseId
// @access  Private
export const deleteExpense = async (req, res, next) => {
  const { expenseId } = req.params;

  try {
    const expense = await Expense.findOne({ _id: expenseId, isDeleted: false });
    if (!expense) {
      res.status(404);
      return next(new Error('Expense not found'));
    }

    const group = await Group.findOne({ _id: expense.groupId, isDeleted: false });
    if (!group) {
      res.status(404);
      return next(new Error('Group not found'));
    }

    // Check permissions (expense creator or group creator/admin)
    const groupMember = await GroupMember.findOne({ groupId: expense.groupId, userId: req.user._id });
    const isCreator = expense.createdBy.toString() === req.user._id.toString();
    const isAdmin = groupMember && groupMember.role === 'creator';

    if (!isCreator && !isAdmin) {
      res.status(403);
      return next(new Error('Only the expense creator or group admin can delete this expense'));
    }

    // Soft delete
    expense.isDeleted = true;
    await expense.save();

    res.status(200).json({
      success: true,
      message: 'Expense deleted successfully (soft-deleted)',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get details of a specific expense
// @route   GET /api/expenses/:expenseId
// @access  Private
export const getExpenseById = async (req, res, next) => {
  const { expenseId } = req.params;

  try {
    const expense = await Expense.findOne({ _id: expenseId, isDeleted: false })
      .populate('paidBy', 'name email avatarUrl')
      .populate('splits.user', 'name email avatarUrl')
      .populate('createdBy', 'name email avatarUrl')
      .lean();

    if (!expense) {
      res.status(404);
      return next(new Error('Expense not found'));
    }

    // Verify user is in the group
    const isMember = await GroupMember.findOne({ groupId: expense.groupId, userId: req.user._id });
    if (!isMember) {
      res.status(403);
      return next(new Error('Access denied. You are not a member of this group.'));
    }

    res.status(200).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all active expenses for a group
// @route   GET /api/expenses/group/:groupId
// @access  Private
export const getGroupExpenses = async (req, res, next) => {
  const { groupId } = req.params;

  try {
    const group = await Group.findOne({ _id: groupId, isDeleted: false });
    if (!group) {
      res.status(404);
      return next(new Error('Group not found'));
    }

    // Check membership
    const isMember = await GroupMember.findOne({ groupId, userId: req.user._id });
    if (!isMember) {
      res.status(403);
      return next(new Error('Access denied. You are not a member of this group.'));
    }

    const expenses = await Expense.find({ groupId, isDeleted: false })
      .populate('paidBy', 'name email avatarUrl')
      .populate('createdBy', 'name email avatarUrl')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: expenses,
    });
  } catch (error) {
    next(error);
  }
};
