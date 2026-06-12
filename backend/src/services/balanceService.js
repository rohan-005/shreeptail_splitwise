import Expense from '../models/Expense.js';
import Settlement from '../models/Settlement.js';
import GroupMember from '../models/GroupMember.js';

/**
 * Calculates net balances and pairwise debts for a group.
 * @param {string} groupId - The ID of the group
 * @returns {Promise<object>} - Pairwise debts and user net balance summary
 */
export const calculateGroupBalances = async (groupId) => {
  // 1. Fetch all active members in the group
  const membersList = await GroupMember.find({ groupId })
    .populate('userId', 'name email avatarUrl')
    .lean();
  
  const members = membersList.map((m) => m.userId).filter(Boolean);
  const memberIds = members.map((m) => m._id.toString());

  // Initialize balance maps
  const userNetBalances = {}; // userId -> net balance (positive means owed, negative means owes)
  const pairwiseDebts = {}; // u1_u2 -> amount (u1 owes u2)

  memberIds.forEach((id) => {
    userNetBalances[id] = 0;
    memberIds.forEach((otherId) => {
      if (id !== otherId) {
        pairwiseDebts[`${id}_${otherId}`] = 0;
      }
    });
  });

  // 2. Fetch all active (non-deleted) expenses
  const expenses = await Expense.find({ groupId, isDeleted: false }).lean();

  // 3. Fetch all settlements
  const settlements = await Settlement.find({ groupId }).lean();

  // 4. Process Expenses
  expenses.forEach((expense) => {
    const payerId = expense.paidBy.toString();
    
    // Add to payer's net balance
    if (userNetBalances[payerId] !== undefined) {
      userNetBalances[payerId] += expense.amount;
    }

    expense.splits.forEach((split) => {
      const owerId = split.user.toString();
      
      // Subtract from ower's net balance
      if (userNetBalances[owerId] !== undefined) {
        userNetBalances[owerId] -= split.amount;
      }

      // Add to pairwise debt (ower owes payer)
      if (payerId !== owerId) {
        const key = `${owerId}_${payerId}`;
        if (pairwiseDebts[key] !== undefined) {
          pairwiseDebts[key] += split.amount;
        }
      }
    });
  });

  // 5. Process Settlements
  settlements.forEach((settlement) => {
    const fromId = settlement.fromUser.toString();
    const toId = settlement.toUser.toString();

    // Adjust net balances
    if (userNetBalances[fromId] !== undefined) {
      userNetBalances[fromId] += settlement.amount; // Reduced debt, effectively increases balance
    }
    if (userNetBalances[toId] !== undefined) {
      userNetBalances[toId] -= settlement.amount; // Received money, reduces what they are owed
    }

    // Offset pairwise debt (fromUser paid toUser, reducing what fromUser owes toUser)
    const key = `${fromId}_${toId}`;
    if (pairwiseDebts[key] !== undefined) {
      pairwiseDebts[key] -= settlement.amount;
    }
  });

  // 6. Simplify pairwise debts (if A owes B X and B owes A Y, net them out)
  const simplifiedDebts = [];
  const processedPairs = new Set();

  memberIds.forEach((u1) => {
    memberIds.forEach((u2) => {
      if (u1 === u2) return;

      const pairKey = [u1, u2].sort().join('_');
      if (processedPairs.has(pairKey)) return;
      processedPairs.add(pairKey);

      const u1OwesU2 = pairwiseDebts[`${u1}_${u2}`] || 0;
      const u2OwesU1 = pairwiseDebts[`${u2}_${u1}`] || 0;

      const u1UserObj = members.find((m) => m._id.toString() === u1);
      const u2UserObj = members.find((m) => m._id.toString() === u2);

      if (!u1UserObj || !u2UserObj) return;

      if (u1OwesU2 > u2OwesU1) {
        const netOwed = u1OwesU2 - u2OwesU1;
        if (netOwed > 0.01) { // ignore floating point dust
          simplifiedDebts.push({
            fromUser: {
              _id: u1UserObj._id,
              name: u1UserObj.name,
              email: u1UserObj.email,
              avatarUrl: u1UserObj.avatarUrl,
            },
            toUser: {
              _id: u2UserObj._id,
              name: u2UserObj.name,
              email: u2UserObj.email,
              avatarUrl: u2UserObj.avatarUrl,
            },
            amount: parseFloat(netOwed.toFixed(2)),
          });
        }
      } else if (u2OwesU1 > u1OwesU2) {
        const netOwed = u2OwesU1 - u1OwesU2;
        if (netOwed > 0.01) {
          simplifiedDebts.push({
            fromUser: {
              _id: u2UserObj._id,
              name: u2UserObj.name,
              email: u2UserObj.email,
              avatarUrl: u2UserObj.avatarUrl,
            },
            toUser: {
              _id: u1UserObj._id,
              name: u1UserObj.name,
              email: u1UserObj.email,
              avatarUrl: u1UserObj.avatarUrl,
            },
            amount: parseFloat(netOwed.toFixed(2)),
          });
        }
      }
    });
  });

  // Map net balances back to user details
  const netBalancesSummary = members.map((member) => {
    const id = member._id.toString();
    return {
      user: {
        _id: member._id,
        name: member.name,
        email: member.email,
        avatarUrl: member.avatarUrl,
      },
      netBalance: parseFloat((userNetBalances[id] || 0).toFixed(2)),
    };
  });

  return {
    netBalances: netBalancesSummary,
    debts: simplifiedDebts,
  };
};

/**
 * Calculates a single user's total net balance across all active groups they belong to.
 * @param {string} userId - The ID of the user
 * @returns {Promise<object>} - Total owes, total owed, and summary of group balances
 */
export const calculateUserDashboardBalances = async (userId) => {
  // 1. Get all active group memberships for this user
  const memberships = await GroupMember.find({ userId }).lean();
  const groupIds = memberships.map((m) => m.groupId.toString());

  let totalOwed = 0; // user is owed this much (positive net balance)
  let totalOwes = 0; // user owes this much (negative net balance)
  const groupSummaries = [];

  for (const groupId of groupIds) {
    // Check if group is soft-deleted
    const groupMemberInfo = await GroupMember.findOne({ groupId, userId }).populate('groupId').lean();
    if (!groupMemberInfo || !groupMemberInfo.groupId || groupMemberInfo.groupId.isDeleted) {
      continue;
    }

    const { netBalances, debts } = await calculateGroupBalances(groupId);
    const userBalanceObj = netBalances.find((nb) => nb.user._id.toString() === userId.toString());
    const netBalance = userBalanceObj ? userBalanceObj.netBalance : 0;

    if (netBalance > 0) {
      totalOwed += netBalance;
    } else if (netBalance < 0) {
      totalOwes += Math.abs(netBalance);
    }

    groupSummaries.push({
      groupId,
      name: groupMemberInfo.groupId.name,
      category: groupMemberInfo.groupId.category,
      netBalance,
    });
  }

  return {
    totalOwed: parseFloat(totalOwed.toFixed(2)),
    totalOwes: parseFloat(totalOwes.toFixed(2)),
    netBalance: parseFloat((totalOwed - totalOwes).toFixed(2)),
    groups: groupSummaries,
  };
};
