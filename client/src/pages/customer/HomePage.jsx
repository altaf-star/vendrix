import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiSearch, FiArrowRight, FiZap, FiShield, FiTruck } from 'react-icons/fi';
import { productService, aiService } from '../../services/api.js';
import ProductCard from '../../components/common/ProductCard.jsx';
import { CATEGORIES } from '../../utils/helpers.js';

const CATEGORY_ICONS = {
  'Electronics': '💻', 'Clothing': '👕', 'Home & Garden': '🏡',
  'Sports & Outdoors': '⚽', 'Health & Beauty': '💄', 'Toys & Games': '🎮',
  'Books': '📚', 'Automotive': '🚗', 'Food & Grocery': '🛒',
  'Jewelry': '💍', 'Art & Crafts': '🎨', 'Pet Supplies': '🐾',
  'Office Supplies': '📎', 'Other': '📦',
};

export default function HomePage() {
  const navigate = useNavigate();
  const [aiQuery, setAiQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [featured, setFeatured] = useState([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);

  useEffect(() => {
    productService.getFeatured()
      .then((r) => setFeatured(r.data.products))
      .catch(() => {})
      .finally(() => setFeaturedLoading(false));
  }, []);

  const handleAiSearch = async (e) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    try {
      const { data } = await aiService.search(aiQuery);
      navigate('/products', {
        state: { aiResults: data.products, aiIntent: data.intent, aiQuery },
      });
    } catch {
      navigate(`/products?keyword=${encodeURIComponent(aiQuery)}`);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 text-white">
        <div className="page-container py-20 md:py-28">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm mb-6">
              <FiZap className="w-3.5 h-3.5 text-yellow-300" />
              AI-powered shopping — just describe what you need
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
              Shop smarter with <span className="text-yellow-300">AI search</span>
            </h1>
            <p className="text-primary-200 text-lg md:text-xl mb-10 leading-relaxed">
              Find anything in plain English. "Gift under $50 for a teenage gamer" — we'll handle the rest.
            </p>

            {/* AI Search */}
            <form onSubmit={handleAiSearch} className="flex gap-2 max-w-xl mx-auto">
              <div className="relative flex-1">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  placeholder="e.g. wireless headphones under $100..."
                  className="w-full pl-12 pr-4 py-4 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 shadow-lg"
                />
              </div>
              <button
                type="submit"
                disabled={aiLoading}
                className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold px-6 py-4 rounded-xl transition-colors shrink-0 shadow-lg disabled:opacity-70"
              >
                {aiLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-gray-900/30 border-t-gray-900 rounded-full animate-spin" />
                    Searching
                  </span>
                ) : 'Search'}
              </button>
            </form>

            <p className="mt-4 text-primary-300 text-xs">
              Or{' '}
              <Link to="/products" className="underline hover:text-white">browse all products</Link>
            </p>
          </div>
        </div>
      </section>

      {/* ── Trust badges ─────────────────────────────────────────────────── */}
      <section className="border-b border-gray-100 bg-white">
        <div className="page-container py-5">
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-500">
            {[
              { icon: FiShield, text: 'Secure Checkout' },
              { icon: FiTruck, text: 'Fast Shipping' },
              { icon: FiZap, text: 'AI-Powered Search' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-primary-500" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Categories ───────────────────────────────────────────────────── */}
      <section className="section bg-gray-50">
        <div className="page-container">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Shop by Category</h2>
            <Link to="/products" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
              View all <FiArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3">
            {CATEGORIES.slice(0, 7).map((cat) => (
              <Link
                key={cat}
                to={`/products?category=${encodeURIComponent(cat)}`}
                className="card-hover p-4 text-center group"
              >
                <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">
                  {CATEGORY_ICONS[cat] || '📦'}
                </div>
                <p className="text-xs font-medium text-gray-700 leading-tight">{cat}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Products ─────────────────────────────────────────────── */}
      <section className="section">
        <div className="page-container">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Featured Products</h2>
              <p className="text-gray-500 text-sm mt-1">Handpicked top-rated items</p>
            </div>
            <Link to="/products?sort=rating" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
              See all <FiArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {featuredLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="card overflow-hidden animate-pulse">
                  <div className="aspect-square bg-gray-200" />
                  <div className="p-4 space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                    <div className="h-4 bg-gray-200 rounded" />
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-5 bg-gray-200 rounded w-1/3 mt-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : featured.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>No featured products yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {featured.map((p) => <ProductCard key={p._id} product={p} />)}
            </div>
          )}
        </div>
      </section>

      {/* ── Vendor CTA ────────────────────────────────────────────────────── */}
      <section className="section bg-gray-900">
        <div className="page-container text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Start selling on Vendrix</h2>
          <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">
            Reach thousands of customers. Use AI tools to write descriptions, manage orders, and track your earnings.
          </p>
          <Link to="/register?role=vendor" className="btn-primary btn-lg bg-primary-500 hover:bg-primary-400">
            Open Your Shop <FiArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
