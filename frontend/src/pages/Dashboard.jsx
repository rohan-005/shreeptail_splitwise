import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Group creation modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupCategory, setGroupCategory] = useState('home');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await API.get('/api/dashboard');
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreateLoading(true);

    try {
      const res = await API.post('/api/groups', {
        name: groupName,
        category: groupCategory,
      });

      if (res.data.success) {
        setShowCreateModal(false);
        setGroupName('');
        setGroupCategory('home');
        // Refresh dashboard to show the new group
        await fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
      setCreateError(err.response?.data?.error || 'Failed to create group');
    } finally {
      setCreateLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 font-bold uppercase tracking-wider">
        Loading Dashboard...
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

  const { totals, groups, recentExpenses } = data || {
    totals: { totalOwed: 0, totalOwes: 0, netBalance: 0 },
    groups: [],
    recentExpenses: [],
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-brand-charcoal-light pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-wider text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Overview of your shared balances and activity</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-brand-orange hover:bg-brand-orange/90 text-white font-bold uppercase px-6 py-3 tracking-wider transition-colors cursor-pointer text-sm"
          >
            Create a Group
          </button>
        </div>
      </div>

      {/* Totals Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 border border-brand-charcoal-light bg-brand-charcoal-medium">
        <div className="p-6 border-b md:border-b-0 md:border-r border-brand-charcoal-light flex flex-col justify-center">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
            Total Balance
          </span>
          <span
            className={`text-2xl font-black ${
              totals.netBalance > 0
                ? 'text-brand-orange'
                : totals.netBalance < 0
                ? 'text-brand-red'
                : 'text-gray-400'
            }`}
          >
            {totals.netBalance > 0 ? '+' : ''}
            ₹{totals.netBalance.toFixed(2)}
          </span>
        </div>

        <div className="p-6 border-b md:border-b-0 md:border-r border-brand-charcoal-light flex flex-col justify-center">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
            You Owe
          </span>
          <span className="text-2xl font-black text-brand-red">
            ₹{totals.totalOwes.toFixed(2)}
          </span>
        </div>

        <div className="p-6 flex flex-col justify-center">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
            You Are Owed
          </span>
          <span className="text-2xl font-black text-brand-orange">
            ₹{totals.totalOwed.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Main Grid: Groups & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Joined Groups */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-lg font-bold uppercase tracking-wider text-white border-b border-brand-charcoal-light pb-2">
            Your Groups
          </h2>

          {groups.length === 0 ? (
            <div className="border border-brand-charcoal-light p-8 text-center text-gray-500 text-sm">
              You are not in any groups yet. Click "Create a Group" to start.
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map((g) => (
                <Link
                  key={g.groupId}
                  to={`/groups/${g.groupId}`}
                  className="block p-4 bg-brand-charcoal-medium border border-brand-charcoal-light hover:border-brand-orange transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white text-base hover:text-brand-orange transition-colors">
                        {g.name}
                      </span>
                      <span className="ml-2 text-xs uppercase bg-brand-charcoal-light text-gray-400 px-2 py-0.5 font-semibold">
                        {g.category}
                      </span>
                    </div>

                    <div className="text-right">
                      {g.netBalance > 0 ? (
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            You are owed
                          </p>
                          <p className="text-sm font-black text-brand-orange">
                            ₹{g.netBalance.toFixed(2)}
                          </p>
                        </div>
                      ) : g.netBalance < 0 ? (
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            You owe
                          </p>
                          <p className="text-sm font-black text-brand-red">
                            ₹{Math.abs(g.netBalance).toFixed(2)}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                          Settled up
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Expenses */}
        <div className="lg:col-span-5 space-y-4">
          <h2 className="text-lg font-bold uppercase tracking-wider text-white border-b border-brand-charcoal-light pb-2">
            Recent Activity
          </h2>

          {recentExpenses.length === 0 ? (
            <div className="border border-brand-charcoal-light p-8 text-center text-gray-500 text-sm">
              No recent activity recorded.
            </div>
          ) : (
            <div className="border border-brand-charcoal-light bg-brand-charcoal-medium divide-y divide-brand-charcoal-light">
              {recentExpenses.map((exp) => (
                <div key={exp._id} className="p-4 flex flex-col space-y-1">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-sm text-gray-200">{exp.description}</span>
                    <span className="text-sm font-black text-brand-orange">
                      ₹{exp.amount.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs text-gray-400">
                    <span>
                      Paid by <strong className="text-gray-300">{exp.paidBy.name}</strong> in{' '}
                      <Link
                        to={`/groups/${exp.groupId._id}`}
                        className="underline hover:text-brand-orange"
                      >
                        {exp.groupId.name}
                      </Link>
                    </span>
                    <span>{new Date(exp.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-brand-charcoal-medium border border-brand-charcoal-light p-6 w-full max-w-md">
            <h3 className="text-lg font-black uppercase tracking-wider text-white mb-4 border-b border-brand-charcoal-light pb-2">
              Create a Group
            </h3>

            {createError && (
              <div className="mb-4 bg-brand-red/10 border border-brand-red text-brand-red p-3 text-sm">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  required
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full bg-brand-charcoal-dark border border-brand-charcoal-light focus:border-brand-orange text-white px-4 py-2 outline-none"
                  placeholder="e.g. Goa Trip"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={groupCategory}
                  onChange={(e) => setGroupCategory(e.target.value)}
                  className="w-full bg-brand-charcoal-dark border border-brand-charcoal-light focus:border-brand-orange text-white px-4 py-2 outline-none"
                >
                  <option value="home">Home / Apartment</option>
                  <option value="trip">Trip / Vacation</option>
                  <option value="couple">Couple</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-brand-charcoal-dark border border-brand-charcoal-light text-gray-300 font-bold uppercase py-2.5 text-xs hover:bg-brand-charcoal-light transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 bg-brand-orange text-white font-bold uppercase py-2.5 text-xs hover:bg-brand-orange/90 transition-colors"
                >
                  {createLoading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
