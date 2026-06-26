import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  FiShoppingCart, FiHeart, FiUser, FiSearch,
  FiMenu, FiX, FiLogOut, FiPackage, FiSettings,
} from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth.js';
import { selectCartCount } from '../../store/slices/cartSlice.js';
import { setSearchQuery, setSearchOpen } from '../../store/slices/uiSlice.js';

export default function Navbar() {
  const { user, isAuthenticated, logout, isAdmin, isVendor } = useAuth();
  const cartCount = useSelector(selectCartCount);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchValue.trim()) return;
    dispatch(setSearchQuery(searchValue.trim()));
    navigate(`/products?keyword=${encodeURIComponent(searchValue.trim())}`);
    setSearchValue('');
  };

  const dashboardLink = isAdmin ? '/admin' : isVendor ? '/vendor' : '/profile';

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="page-container">
        <div className="flex items-center justify-between h-16 gap-4">

          {/* Logo */}
          <Link to="/" className="flex items-center shrink-0">
            <img src="/vendrix-logo.jpg" alt="Vendrix" className="h-10 w-auto rounded-md" />
          </Link>

          {/* Search bar — hidden on mobile */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl">
            <div className="relative w-full">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search products or try AI search…"
                className="input pl-9 pr-4"
              />
            </div>
          </form>

          {/* Right actions */}
          <div className="flex items-center gap-1">
            {/* Mobile search toggle */}
            <button
              onClick={() => dispatch(setSearchOpen(true))}
              className="btn-ghost p-2 md:hidden"
              aria-label="Search"
            >
              <FiSearch className="w-5 h-5" />
            </button>

            {/* Wishlist — customer only */}
            {isAuthenticated && !isAdmin && !isVendor && (
              <Link to="/wishlist" className="btn-ghost p-2 hidden sm:flex" aria-label="Wishlist">
                <FiHeart className="w-5 h-5" />
              </Link>
            )}

            {/* Cart */}
            {!isAdmin && !isVendor && (
              <Link to="/cart" className="btn-ghost p-2 relative" aria-label="Cart">
                <FiShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Link>
            )}

            {/* User menu */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 btn-ghost px-2 py-1.5 rounded-lg"
                >
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center">
                      <span className="text-primary-700 text-xs font-semibold">
                        {user?.name?.[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="hidden sm:block text-sm font-medium max-w-[100px] truncate">
                    {user?.name?.split(' ')[0]}
                  </span>
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20 animate-fade-in">
                      <div className="px-3 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                      </div>
                      <Link
                        to={dashboardLink}
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <FiSettings className="w-4 h-4" />
                        {isAdmin ? 'Admin Panel' : isVendor ? 'Vendor Panel' : 'My Profile'}
                      </Link>
                      {!isAdmin && !isVendor && (
                        <Link
                          to="/orders"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <FiPackage className="w-4 h-4" />
                          My Orders
                        </Link>
                      )}
                      <button
                        onClick={() => { setUserMenuOpen(false); logout(); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <FiLogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn-secondary btn-sm hidden sm:flex">Sign In</Link>
                <Link to="/register" className="btn-primary btn-sm">Join Free</Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="btn-ghost p-2 md:hidden"
              aria-label="Menu"
            >
              {mobileOpen ? <FiX className="w-5 h-5" /> : <FiMenu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 py-3 space-y-1 animate-slide-up">
            <form onSubmit={handleSearch} className="px-2 pb-2">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Search products…"
                  className="input pl-9"
                />
              </div>
            </form>
            <NavLink to="/products" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">
              Browse Products
            </NavLink>
            {!isAuthenticated && (
              <>
                <Link to="/login" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">Sign In</Link>
                <Link to="/register" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm text-primary-600 font-medium hover:bg-primary-50 rounded-lg">Create Account</Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
