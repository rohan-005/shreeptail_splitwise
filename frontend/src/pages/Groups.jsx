import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';

const Groups = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  // Modal creation state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupCategory, setGroupCategory] = useState('home');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const res = await API.get('/api/groups');
      if (res.data.success) {
        setGroups(res.data.data);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
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
        await fetchGroups();
      }
    } catch (err) {
      console.error(err);
      setCreateError(err.response?.data?.error || 'Failed to create group');
    } finally {
      setCreateLoading(false);
    }
  };

  const filteredGroups = groups.filter((g) => {
    if (filter === 'all') return true;
    return g.category === filter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 font-bold uppercase tracking-wider">
        Loading Groups...
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-brand-charcoal-light pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-wider text-gray-900">Groups</h1>
          <p className="text-gray-400 text-sm mt-1">Manage and filter your shared expense groups</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-brand-orange hover:bg-brand-orange/90 text-white font-bold uppercase px-6 py-3 tracking-wider transition-colors cursor-pointer text-sm"
        >
          Create a Group
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-brand-charcoal-light pb-4">
        {['all', 'home', 'trip', 'couple', 'other'].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-2 text-xs uppercase font-bold tracking-wider border transition-colors cursor-pointer ${
              filter === cat
                ? 'bg-brand-orange border-brand-orange text-white'
                : 'bg-brand-charcoal-medium border-brand-charcoal-light text-gray-500 hover:text-brand-orange'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Groups Grid */}
      {filteredGroups.length === 0 ? (
        <div className="border border-brand-charcoal-light p-12 text-center text-gray-500 text-sm">
          No groups found under category: "{filter}"
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map((g) => (
            <div
              key={g._id}
              className="bg-brand-charcoal-medium border border-brand-charcoal-light p-6 flex flex-col justify-between hover:border-brand-orange transition-colors"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-gray-900 line-clamp-1">{g.name}</h3>
                  <span className="text-xs uppercase bg-brand-charcoal-light text-gray-400 px-2 py-0.5 font-bold">
                    {g.category}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-6">
                  Created on {new Date(g.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-brand-charcoal-light">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  View Balance & Activity
                </span>
                <Link
                  to={`/groups/${g._id}`}
                  className="text-xs uppercase font-bold text-brand-orange hover:underline"
                >
                  Details →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-brand-charcoal-medium border border-brand-charcoal-light p-6 w-full max-w-md">
            <h3 className="text-lg font-black uppercase tracking-wider text-gray-900 mb-4 border-b border-brand-charcoal-light pb-2">
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
                  className="w-full bg-brand-charcoal-dark border border-brand-charcoal-light focus:border-brand-orange text-gray-800 px-4 py-2 outline-none"
                  placeholder="e.g. Vacation 2026"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={groupCategory}
                  onChange={(e) => setGroupCategory(e.target.value)}
                  className="w-full bg-brand-charcoal-dark border border-brand-charcoal-light focus:border-brand-orange text-gray-800 px-4 py-2 outline-none"
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

export default Groups;
