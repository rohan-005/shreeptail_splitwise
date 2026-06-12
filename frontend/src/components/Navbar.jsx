import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    <nav className="h-16 bg-brand-charcoal-medium border-b border-brand-charcoal-light flex items-center justify-between px-6 z-10">
      <div className="flex items-center space-x-2">
        <span className="text-xl font-black tracking-widest text-brand-orange uppercase">
          Splitwise
        </span>
      </div>

      {user && (
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <img
              src={user.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=default'}
              alt="Avatar"
              className="w-8 h-8 bg-brand-charcoal-dark border border-brand-charcoal-light p-0.5"
            />
            <span className="text-sm font-semibold text-gray-200">{user.name}</span>
          </div>

          <button
            onClick={logout}
            className="text-xs uppercase font-bold tracking-wider text-gray-400 hover:text-brand-orange border border-brand-charcoal-light hover:border-brand-orange px-3 py-1.5 transition-colors cursor-pointer"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
