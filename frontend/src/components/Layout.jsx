import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import Navbar from './Navbar';

const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-brand-charcoal-dark text-gray-900">
      <Navbar />

      <div className="flex-1 flex flex-row">
        {/* Sidebar */}
        <aside className="w-64 bg-brand-charcoal-medium border-r border-brand-charcoal-light flex flex-col p-4 space-y-2">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-3 text-sm font-bold uppercase tracking-wider transition-colors border ${
                isActive
                  ? 'bg-brand-charcoal-dark border-brand-orange text-brand-orange'
                  : 'border-transparent text-gray-500 hover:text-brand-orange hover:bg-gray-100'
              }`
            }
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/groups"
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-3 text-sm font-bold uppercase tracking-wider transition-colors border ${
                isActive
                  ? 'bg-brand-charcoal-dark border-brand-orange text-brand-orange'
                  : 'border-transparent text-gray-500 hover:text-brand-orange hover:bg-gray-100'
              }`
            }
          >
            Groups
          </NavLink>
        </aside>

        {/* Content area */}
        <main className="flex-1 p-8 overflow-y-auto max-w-6xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
