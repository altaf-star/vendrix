import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 mt-auto">
      <div className="page-container py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="mb-3">
              <img src="/vendrix-logo.jpg" alt="Vendrix" className="h-12 w-auto rounded-md" />
            </div>
            <p className="text-sm leading-relaxed">
              AI-powered multi-vendor marketplace. Discover unique products from independent sellers worldwide.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Shop</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/products" className="hover:text-white transition-colors">All Products</Link></li>
              <li><Link to="/products?category=Electronics" className="hover:text-white transition-colors">Electronics</Link></li>
              <li><Link to="/products?category=Clothing" className="hover:text-white transition-colors">Clothing</Link></li>
              <li><Link to="/products?sort=popular" className="hover:text-white transition-colors">Best Sellers</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Sell</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/register?role=vendor" className="hover:text-white transition-colors">Start Selling</Link></li>
              <li><Link to="/vendor" className="hover:text-white transition-colors">Vendor Dashboard</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Account</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/login" className="hover:text-white transition-colors">Sign In</Link></li>
              <li><Link to="/register" className="hover:text-white transition-colors">Create Account</Link></li>
              <li><Link to="/orders" className="hover:text-white transition-colors">My Orders</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs">
          <p>© {new Date().getFullYear()} Vendrix. All rights reserved.</p>
          <p>vendrix.store</p>
        </div>
      </div>
    </footer>
  );
}
