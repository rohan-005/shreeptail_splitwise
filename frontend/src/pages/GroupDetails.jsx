import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import API from '../services/api';
import ExpenseDetailsDrawer from '../components/ExpenseDetailsDrawer';

const GroupDetails = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Selected Expense for Detail Drawer
  const [selectedExpenseId, setSelectedExpenseId] = useState(null);

  // Add Member form state
  const [memberEmail, setMemberEmail] = useState('');
  const [addMemberLoading, setAddMemberLoading] = useState(false);
  const [addMemberError, setAddMemberError] = useState('');
  const [addMemberSuccess, setAddMemberSuccess] = useState('');

  // Modal States
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);

  // Add Expense form state
  const [expDescription, setExpDescription] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expPaidBy, setExpPaidBy] = useState(user?._id || '');
  const [expSplitType, setExpSplitType] = useState('equal');
  // For each member, store whether they participate and their split value (shares/percentages/amounts)
  const [expSplits, setExpSplits] = useState({});
  const [expError, setExpError] = useState('');
  const [expLoading, setExpLoading] = useState(false);

  // Settle Up form state
  const [settleToUser, setSettleToUser] = useState('');
  const [settleAmount, setSettleAmount] = useState('');
  const [settleError, setSettleError] = useState('');
  const [settleLoading, setSettleLoading] = useState(false);

  // Group Management action messages
  const [mgmtError, setMgmtError] = useState('');

  const fetchGroupDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await API.get(`/api/groups/${groupId}`);
      if (res.data.success) {
        const { group, members, debts } = res.data.data;
        setGroup(group);
        setMembers(members);
        setDebts(debts);

        // Fetch Group Expenses
        const expRes = await API.get(`/api/expenses/group/${groupId}`);
        if (expRes.data.success) {
          setExpenses(expRes.data.data);
        }

        // Initialize split values for Add Expense form
        const initialSplits = {};
        members.forEach((m) => {
          initialSplits[m.userId._id] = {
            checked: true,
            value: '',
          };
        });
        setExpSplits(initialSplits);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to fetch group details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupDetails();
  }, [groupId]);

  // Set default payee once user is loaded
  useEffect(() => {
    if (user) {
      setExpPaidBy(user._id);
    }
  }, [user]);

  // Handle Add Member
  const handleAddMember = async (e) => {
    e.preventDefault();
    setAddMemberError('');
    setAddMemberSuccess('');
    setAddMemberLoading(true);

    try {
      const res = await API.post(`/api/groups/${groupId}/members`, {
        email: memberEmail,
      });

      if (res.data.success) {
        setAddMemberSuccess('Member added successfully!');
        setMemberEmail('');
        await fetchGroupDetails();
      }
    } catch (err) {
      console.error(err);
      setAddMemberError(err.response?.data?.error || 'Failed to add member');
    } finally {
      setAddMemberLoading(false);
    }
  };

  // Toggle checkbox for equal splits
  const handleSplitCheckboxChange = (userId) => {
    setExpSplits((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        checked: !prev[userId].checked,
      },
    }));
  };

  // Handle split value changes (percentages, shares, unequal amount values)
  const handleSplitValueChange = (userId, value) => {
    setExpSplits((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        value,
      },
    }));
  };

  // Submit Expense
  const handleAddExpenseSubmit = async (e) => {
    e.preventDefault();
    setExpError('');
    setExpLoading(true);

    const amountNum = parseFloat(expAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setExpError('Amount must be greater than zero');
      setExpLoading(false);
      return;
    }

    // Prepare splits list for payload
    const finalSplits = [];
    const activeMembers = Object.keys(expSplits).filter((uid) => expSplits[uid].checked);

    if (activeMembers.length === 0) {
      setExpError('At least one member must participate in the split');
      setExpLoading(false);
      return;
    }

    try {
      if (expSplitType === 'equal') {
        activeMembers.forEach((uid) => {
          finalSplits.push({ user: uid });
        });
      } else {
        // Validation for values
        let sumValues = 0;
        for (const uid of activeMembers) {
          const val = parseFloat(expSplits[uid].value);
          if (isNaN(val) || val <= 0) {
            throw new Error('All split shares/amounts/percentages must be greater than 0');
          }
          sumValues += val;
          finalSplits.push({ user: uid, value: val });
        }

        if (expSplitType === 'percentage' && Math.abs(sumValues - 100) > 0.01) {
          throw new Error('Sum of percentages must equal 100%');
        }
        if (expSplitType === 'unequal' && Math.abs(sumValues - amountNum) > 0.01) {
          throw new Error(`Sum of unequal splits (${sumValues}) must equal total amount (${amountNum})`);
        }
      }

      const res = await API.post('/api/expenses', {
        description: expDescription,
        amount: amountNum,
        paidBy: expPaidBy,
        splitType: expSplitType,
        groupId,
        splits: finalSplits,
      });

      if (res.data.success) {
        setShowExpenseModal(false);
        setExpDescription('');
        setExpAmount('');
        setExpSplitType('equal');
        await fetchGroupDetails();
      }
    } catch (err) {
      console.error(err);
      setExpError(err.message || err.response?.data?.error || 'Failed to add expense');
    } finally {
      setExpLoading(false);
    }
  };

  // Submit Settlement
  const handleSettleSubmit = async (e) => {
    e.preventDefault();
    setSettleError('');
    setSettleLoading(true);

    const amountNum = parseFloat(settleAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setSettleError('Amount must be greater than zero');
      setSettleLoading(false);
      return;
    }

    if (!settleToUser) {
      setSettleError('Select a member to settle with');
      setSettleLoading(false);
      return;
    }

    try {
      const res = await API.post('/api/settlements', {
        toUser: settleToUser,
        groupId,
        amount: amountNum,
      });

      if (res.data.success) {
        setShowSettleModal(false);
        setSettleToUser('');
        setSettleAmount('');
        await fetchGroupDetails();
      }
    } catch (err) {
      console.error(err);
      setSettleError(err.response?.data?.error || 'Failed to record settlement');
    } finally {
      setSettleLoading(false);
    }
  };

  // Leave Group
  const handleLeaveGroup = async () => {
    setMgmtError('');
    if (!window.confirm('Are you sure you want to leave this group?')) return;

    try {
      const res = await API.post(`/api/groups/${groupId}/leave`);
      if (res.data.success) {
        navigate('/groups');
      }
    } catch (err) {
      console.error(err);
      setMgmtError(err.response?.data?.error || 'Failed to leave group');
    }
  };

  // Delete Group
  const handleDeleteGroup = async () => {
    setMgmtError('');
    if (!window.confirm('Are you sure you want to delete (soft-delete) this group? This cannot be undone.')) return;

    try {
      const res = await API.delete(`/api/groups/${groupId}`);
      if (res.data.success) {
        navigate('/groups');
      }
    } catch (err) {
      console.error(err);
      setMgmtError(err.response?.data?.error || 'Failed to delete group');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 font-bold uppercase tracking-wider">
        Loading Group Details...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-brand-red/10 border border-brand-red text-brand-red p-4">
        {error}
      </div>
    );
  }

  const isGroupCreator = group.createdBy === user?._id;

  return (
    <div className="space-y-8">
      {/* Header Panel */}
      <div className="border border-brand-charcoal-light bg-brand-charcoal-medium p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-black uppercase tracking-wider text-white">
              {group.name}
            </h1>
            <span className="text-xs uppercase bg-brand-charcoal-dark border border-brand-charcoal-light text-gray-400 px-3 py-1 font-bold">
              {group.category}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Created by {group.createdBy === user?._id ? 'You' : 'an admin'} on{' '}
            {new Date(group.createdAt).toLocaleDateString()}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowExpenseModal(true)}
            className="bg-brand-orange hover:bg-brand-orange/90 text-white font-bold uppercase px-5 py-2.5 tracking-wider transition-colors cursor-pointer text-xs"
          >
            Add Expense
          </button>
          <button
            onClick={() => setShowSettleModal(true)}
            className="bg-brand-charcoal-dark border border-brand-charcoal-light hover:border-brand-orange hover:text-brand-orange text-gray-300 font-bold uppercase px-5 py-2.5 tracking-wider transition-colors cursor-pointer text-xs"
          >
            Settle Up
          </button>
          <button
            onClick={handleLeaveGroup}
            className="bg-brand-charcoal-dark border border-brand-charcoal-light hover:border-brand-red hover:text-brand-red text-gray-300 font-bold uppercase px-5 py-2.5 tracking-wider transition-colors cursor-pointer text-xs"
          >
            Leave Group
          </button>
          {isGroupCreator && (
            <button
              onClick={handleDeleteGroup}
              className="bg-brand-red/20 border border-brand-red/50 hover:bg-brand-red hover:text-white text-brand-red font-bold uppercase px-5 py-2.5 tracking-wider transition-colors cursor-pointer text-xs"
            >
              Delete Group
            </button>
          )}
        </div>
      </div>

      {mgmtError && (
        <div className="bg-brand-red/10 border border-brand-red text-brand-red p-3 text-sm">
          {mgmtError}
        </div>
      )}

      {/* Main Grid split: Left (Expenses), Right (Balances & Members) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Expenses Activity */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-lg font-bold uppercase tracking-wider text-white border-b border-brand-charcoal-light pb-2">
            Expenses log
          </h2>

          {expenses.length === 0 ? (
            <div className="border border-brand-charcoal-light p-12 text-center text-gray-500 text-sm bg-brand-charcoal-medium">
              No expenses logged yet.
            </div>
          ) : (
            <div className="space-y-3">
              {expenses.map((exp) => (
                <div
                  key={exp._id}
                  onClick={() => setSelectedExpenseId(exp._id)}
                  className="p-4 bg-brand-charcoal-medium border border-brand-charcoal-light hover:border-brand-orange transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <span className="font-bold text-sm text-gray-200">{exp.description}</span>
                    <p className="text-xs text-gray-400">
                      Paid by{' '}
                      <strong className="text-gray-300">
                        {exp.paidBy?._id === user?._id ? 'You' : exp.paidBy?.name}
                      </strong>{' '}
                      • {new Date(exp.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-black text-brand-orange">
                      ₹{exp.amount.toFixed(2)}
                    </span>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">
                      {exp.splitType} split
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Members & Balances */}
        <div className="lg:col-span-5 space-y-8">
          {/* Debts Balances */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold uppercase tracking-wider text-white border-b border-brand-charcoal-light pb-2">
              Group balances
            </h2>

            {debts.length === 0 ? (
              <div className="p-4 border border-brand-charcoal-light bg-brand-charcoal-medium text-gray-500 text-sm text-center">
                Everyone is settled up in this group!
              </div>
            ) : (
              <div className="border border-brand-charcoal-light bg-brand-charcoal-medium divide-y divide-brand-charcoal-light">
                {debts.map((d, index) => (
                  <div key={index} className="p-4 flex justify-between items-center text-sm">
                    <div>
                      <span className="font-bold text-gray-200">
                        {d.fromUser._id === user?._id ? 'You' : d.fromUser.name}
                      </span>{' '}
                      owes{' '}
                      <span className="font-bold text-gray-200">
                        {d.toUser._id === user?._id ? 'You' : d.toUser.name}
                      </span>
                    </div>
                    <span className="font-black text-brand-orange">
                      ₹{d.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Members list */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold uppercase tracking-wider text-white border-b border-brand-charcoal-light pb-2">
              Group Members
            </h2>

            <div className="border border-brand-charcoal-light bg-brand-charcoal-medium divide-y divide-brand-charcoal-light">
              {members.map((m) => (
                <div key={m._id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img
                      src={m.userId.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=default'}
                      alt="Avatar"
                      className="w-6 h-6 border border-brand-charcoal-light bg-brand-charcoal-dark p-0.5"
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-200">{m.userId.name}</p>
                      <p className="text-[10px] text-gray-400">{m.userId.email}</p>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                    {m.role}
                  </span>
                </div>
              ))}
            </div>

            {/* Add Member form */}
            <form onSubmit={handleAddMember} className="border border-brand-charcoal-light bg-brand-charcoal-medium p-4 space-y-3">
              <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
                Add Member by Email
              </span>

              {addMemberError && (
                <p className="text-xs text-brand-red font-semibold">{addMemberError}</p>
              )}
              {addMemberSuccess && (
                <p className="text-xs text-brand-orange font-semibold">{addMemberSuccess}</p>
              )}

              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  className="flex-1 bg-brand-charcoal-dark border border-brand-charcoal-light focus:border-brand-orange text-white text-xs px-3 py-2 outline-none"
                  placeholder="e.g. member@email.com"
                />
                <button
                  type="submit"
                  disabled={addMemberLoading}
                  className="bg-brand-orange hover:bg-brand-orange/90 text-white font-bold uppercase px-4 py-2 text-xs tracking-wider transition-colors cursor-pointer"
                >
                  {addMemberLoading ? 'Adding...' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-brand-charcoal-medium border border-brand-charcoal-light p-6 w-full max-w-lg my-8">
            <h3 className="text-lg font-black uppercase tracking-wider text-white mb-4 border-b border-brand-charcoal-light pb-2">
              Add an Expense
            </h3>

            {expError && (
              <div className="mb-4 bg-brand-red/10 border border-brand-red text-brand-red p-3 text-sm">
                {expError}
              </div>
            )}

            <form onSubmit={handleAddExpenseSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    required
                    value={expDescription}
                    onChange={(e) => setExpDescription(e.target.value)}
                    className="w-full bg-brand-charcoal-dark border border-brand-charcoal-light focus:border-brand-orange text-white px-4 py-2 outline-none text-sm"
                    placeholder="e.g. Dinner party"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    className="w-full bg-brand-charcoal-dark border border-brand-charcoal-light focus:border-brand-orange text-white px-4 py-2 outline-none text-sm"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Paid By
                  </label>
                  <select
                    value={expPaidBy}
                    onChange={(e) => setExpPaidBy(e.target.value)}
                    className="w-full bg-brand-charcoal-dark border border-brand-charcoal-light focus:border-brand-orange text-white px-4 py-2 outline-none text-sm"
                  >
                    {members.map((m) => (
                      <option key={m.userId._id} value={m.userId._id}>
                        {m.userId._id === user?._id ? 'You' : m.userId.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Split Type
                  </label>
                  <select
                    value={expSplitType}
                    onChange={(e) => setExpSplitType(e.target.value)}
                    className="w-full bg-brand-charcoal-dark border border-brand-charcoal-light focus:border-brand-orange text-white px-4 py-2 outline-none text-sm"
                  >
                    <option value="equal">Equally</option>
                    <option value="unequal">Unequally (Exact amounts)</option>
                    <option value="percentage">By percentages</option>
                    <option value="shares">By shares</option>
                  </select>
                </div>
              </div>

              {/* Splits setup */}
              <div className="border border-brand-charcoal-light bg-brand-charcoal-dark p-4 space-y-3">
                <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-brand-charcoal-light pb-1 mb-2">
                  Split Details
                </span>

                <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                  {members.map((m) => {
                    const uid = m.userId._id;
                    const splitState = expSplits[uid] || { checked: true, value: '' };

                    return (
                      <div key={uid} className="flex items-center justify-between text-xs">
                        <label className="flex items-center space-x-2 text-gray-300 font-semibold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={splitState.checked}
                            onChange={() => handleSplitCheckboxChange(uid)}
                            className="bg-brand-charcoal-dark border-brand-charcoal-light text-brand-orange focus:ring-0 rounded-none w-4 h-4 cursor-pointer"
                          />
                          <span>{m.userId.name}</span>
                        </label>

                        {/* Value input for other splitTypes */}
                        {expSplitType !== 'equal' && splitState.checked && (
                          <div className="flex items-center space-x-1.5">
                            <input
                              type="number"
                              step="any"
                              required
                              value={splitState.value}
                              onChange={(e) => handleSplitValueChange(uid, e.target.value)}
                              className="w-20 bg-brand-charcoal-medium border border-brand-charcoal-light focus:border-brand-orange text-white px-2 py-1 outline-none text-center"
                              placeholder={
                                expSplitType === 'unequal' ? '₹' : expSplitType === 'percentage' ? '%' : 'shares'
                              }
                            />
                            <span className="text-gray-400 text-[10px]">
                              {expSplitType === 'unequal' ? '₹' : expSplitType === 'percentage' ? '%' : 'sh.'}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="flex-1 bg-brand-charcoal-dark border border-brand-charcoal-light text-gray-300 font-bold uppercase py-2.5 text-xs hover:bg-brand-charcoal-light transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={expLoading}
                  className="flex-1 bg-brand-orange text-white font-bold uppercase py-2.5 text-xs hover:bg-brand-orange/90 transition-colors"
                >
                  {expLoading ? 'Adding...' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle Up Modal */}
      {showSettleModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-brand-charcoal-medium border border-brand-charcoal-light p-6 w-full max-w-md">
            <h3 className="text-lg font-black uppercase tracking-wider text-white mb-4 border-b border-brand-charcoal-light pb-2">
              Settle Balance (Record Payment)
            </h3>

            {settleError && (
              <div className="mb-4 bg-brand-red/10 border border-brand-red text-brand-red p-3 text-sm">
                {settleError}
              </div>
            )}

            <form onSubmit={handleSettleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Recipient (To member)
                </label>
                <select
                  required
                  value={settleToUser}
                  onChange={(e) => setSettleToUser(e.target.value)}
                  className="w-full bg-brand-charcoal-dark border border-brand-charcoal-light focus:border-brand-orange text-white px-4 py-2 outline-none text-sm"
                >
                  <option value="">-- Select member --</option>
                  {members
                    .filter((m) => m.userId._id !== user?._id)
                    .map((m) => (
                      <option key={m.userId._id} value={m.userId._id}>
                        {m.userId.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full bg-brand-charcoal-dark border border-brand-charcoal-light focus:border-brand-orange text-white px-4 py-2 outline-none text-sm"
                  placeholder="0.00"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSettleModal(false)}
                  className="flex-1 bg-brand-charcoal-dark border border-brand-charcoal-light text-gray-300 font-bold uppercase py-2.5 text-xs hover:bg-brand-charcoal-light transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={settleLoading}
                  className="flex-1 bg-brand-orange text-white font-bold uppercase py-2.5 text-xs hover:bg-brand-orange/90 transition-colors"
                >
                  {settleLoading ? 'Recording...' : 'Settle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Detail Side Drawer (WebSocket comments engine) */}
      {selectedExpenseId && (
        <ExpenseDetailsDrawer
          expenseId={selectedExpenseId}
          groupId={groupId}
          members={members}
          onClose={() => setSelectedExpenseId(null)}
          onExpenseDeleted={() => {
            setSelectedExpenseId(null);
            fetchGroupDetails();
          }}
        />
      )}
    </div>
  );
};

export default GroupDetails;
