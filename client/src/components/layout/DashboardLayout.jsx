import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  FiGrid, FiPackage, FiShoppingBag, FiDollarSign,
  FiUser, FiUsers, FiSettings, FiLogOut,
  FiChevronLeft, FiMenu, FiShield,
} from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth.js';
import { Link } from 'react-router-dom';

const VENDOR_NAV = [
  { to: '/vendor',           label: 'Dashboard',  icon: FiGrid,       end: true },
  { to: '/vendor/products',  label: 'Products',   icon: FiPackage },
  { to: '/vendor/orders',    label: 'Orders',     icon: FiShoppingBag },
  { to: '/vendor/earnings',  label: 'Earnings',   icon: FiDollarSign },
  { to: '/vendor/profile',   label: 'Shop Profile', icon: FiSettings },
];

const ADMIN_NAV = [
  { to: '/admin',           label: 'Dashboard', icon: FiGrid,      end: true },
  { to: '/admin/users',     label: 'Users',     icon: FiUsers },
  { to: '/admin/vendors',   label: 'Vendors',   icon: FiShield },
  { to: '/admin/products',  label: 'Products',  icon: FiPackage },
  { to: '/admin/orders',    label: 'Orders',    icon: FiShoppingBag },
];

export default function DashboardLayout({ role }) {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const nav = role === 'admin' ? ADMIN_NAV : VENDOR_NAV;

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`${collapsed ? 'w-16' : 'w-60'} shrink-0 bg-gray-900 flex flex-col transition-all duration-200 min-h-screen`}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-gray-800">
          {!collapsed && (
            <Link to="/">
              <img src="/vendrix-logo.jpg" alt="Vendrix" className="h-9 w-auto rounded-md" />
            </Link>
          )}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="text-gray-400 hover:text-white p-1 rounded ml-auto"
          >
            {collapsed ? <FiMenu className="w-4 h-4" /> : <FiChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-4 space-y-0.5 px-2">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User info + logout */}
        <div className="border-t border-gray-800 p-3">
          {!collapsed && (
            <div className="flex items-center gap-2 mb-2 px-1">
              <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-semibold">{user?.name?.[0]}</span>
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-medium truncate">{user?.name}</p>
                <p className="text-gray-500 text-xs truncate">{role}</p>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className={`flex items-center gap-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg px-2 py-2 text-sm w-full transition-colors ${collapsed ? 'justify-center' : ''}`}
          >
            <FiLogOut className="w-4 h-4 shrink-0" />
            {!collapsed && 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center px-6">
          <h1 className="text-base font-semibold text-gray-900 capitalize">
            {role === 'admin' ? 'Admin Panel' : 'Vendor Panel'}
          </h1>
          <Link to="/" className="ml-auto text-sm text-gray-500 hover:text-primary-600 transition-colors">
            ← Back to Store
          </Link>
        </header>
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
