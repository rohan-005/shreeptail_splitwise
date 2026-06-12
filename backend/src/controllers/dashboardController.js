import GroupMember from '../models/GroupMember.js';
import Expense from '../models/Expense.js';
import { calculateUserDashboardBalances } from '../services/balanceService.js';

// @desc    Get dashboard totals, group summaries, and recent expenses
// @route   GET /api/dashboard
// @access  Private
export const getDashboardData = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // 1. Calculate dashboard balances (totals + group net balances)
    const balanceDetails = await calculateUserDashboardBalances(userId);

    // 2. Fetch recent expenses for the user's groups
    const memberships = await GroupMember.find({ userId }).lean();
    const groupIds = memberships.map((m) => m.groupId);

    const recentExpenses = await Expense.find({
      groupId: { $in: groupIds },
      isDeleted: false,
    })
      .populate('paidBy', 'name email avatarUrl')
      .populate('groupId', 'name category')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        totals: {
          totalOwed: balanceDetails.totalOwed,
          totalOwes: balanceDetails.totalOwes,
          netBalance: balanceDetails.netBalance,
        },
        groups: balanceDetails.groups,
        recentExpenses,
      },
    });
  } catch (error) {
    next(error);
  }
};
