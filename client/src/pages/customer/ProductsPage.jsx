import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { FiFilter, FiX, FiZap, FiGrid, FiList } from 'react-icons/fi';
import { productService } from '../../services/api.js';
import ProductCard from '../../components/common/ProductCard.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import { CATEGORIES, formatPrice } from '../../utils/helpers.js';

const SORT_OPTIONS = [
  { value: 'newest',     label: 'Newest' },
  { value: 'popular',    label: 'Best Selling' },
  { value: 'rating',     label: 'Top Rated' },
  { value: 'price-asc',  label: 'Price: Low → High' },
  { value: 'price-desc', label: 'Price: High → Low' },
];

const RATING_OPTIONS = [4, 3, 2, 1];

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  // AI results passed from HomePage
  const aiResults = location.state?.aiResults;
  const aiIntent  = location.state?.aiIntent;
  const aiQuery   = location.state?.aiQuery;

  const [products, setProducts]   = useState(aiResults || []);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading]     = useState(!aiResults);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filter state — pulled from URL
  const keyword   = searchParams.get('keyword') || '';
  const category  = searchParams.get('category') || '';
  const sort      = searchParams.get('sort') || 'newest';
  const minPrice  = searchParams.get('minPrice') || '';
  const maxPrice  = searchParams.get('maxPrice') || '';
  const minRating = searchParams.get('minRating') || '';
  const inStock   = searchParams.get('inStock') || '';
  const page      = parseInt(searchParams.get('page') || '1');

  const [priceMin, setPriceMin] = useState(minPrice);
  const [priceMax, setPriceMax] = useState(maxPrice);

  const fetchProducts = useCallback(async () => {
    if (aiResults && page === 1 && !keyword && !category) return; // already have AI results
    setLoading(true);
    try {
      const params = { page, limit: 12, sort };
      if (keyword)   params.keyword   = keyword;
      if (category)  params.category  = category;
      if (minPrice)  params.minPrice  = minPrice;
      if (maxPrice)  params.maxPrice  = maxPrice;
      if (minRating) params.minRating = minRating;
      if (inStock)   params.inStock   = inStock;

      const { data } = await productService.getProducts(params);
      setProducts(data.products);
      setPagination(data.pagination);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    next.delete('page');
    setSearchParams(next);
  };

  const applyPrice = () => {
    const next = new URLSearchParams(searchParams);
    if (priceMin) next.set('minPrice', priceMin); else next.delete('minPrice');
    if (priceMax) next.set('maxPrice', priceMax); else next.delete('maxPrice');
    next.delete('page');
    setSearchParams(next);
    setFiltersOpen(false);
  };

  const clearFilters = () => {
    setPriceMin(''); setPriceMax('');
    setSearchParams(new URLSearchParams());
  };

  const activeFilterCount = [category, minPrice, maxPrice, minRating, inStock].filter(Boolean).length;

  const FilterPanel = () => (
    <div className="space-y-6">
      {/* Category */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Category</h4>
        <div className="space-y-1.5">
          <button
            onClick={() => setParam('category', '')}
            className={`w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors ${!category ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            All Categories
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setParam('category', cat)}
              className={`w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors ${category === cat ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Price range */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Price Range</h4>
        <div className="flex gap-2 items-center">
          <input
            type="number" min="0" placeholder="Min"
            value={priceMin} onChange={(e) => setPriceMin(e.target.value)}
            className="input text-sm py-2"
          />
          <span className="text-gray-400 shrink-0">—</span>
          <input
            type="number" min="0" placeholder="Max"
            value={priceMax} onChange={(e) => setPriceMax(e.target.value)}
            className="input text-sm py-2"
          />
        </div>
        <button onClick={applyPrice} className="btn-primary btn-sm w-full mt-2">Apply</button>
      </div>

      {/* Rating */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Min. Rating</h4>
        <div className="space-y-1.5">
          {RATING_OPTIONS.map((r) => (
            <button
              key={r}
              onClick={() => setParam('minRating', minRating === String(r) ? '' : String(r))}
              className={`w-full flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg transition-colors ${minRating === String(r) ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              {'★'.repeat(r)}{'☆'.repeat(5 - r)}{' '}&amp; up
            </button>
          ))}
        </div>
      </div>

      {/* In Stock */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={inStock === 'true'}
            onChange={(e) => setParam('inStock', e.target.checked ? 'true' : '')}
            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">In Stock Only</span>
        </label>
      </div>

      {activeFilterCount > 0 && (
        <button onClick={clearFilters} className="btn-secondary btn-sm w-full text-red-600 border-red-200 hover:bg-red-50">
          Clear All Filters
        </button>
      )}
    </div>
  );

  return (
    <div className="page-container py-8">
      {/* AI intent banner */}
      {aiIntent && (
        <div className="mb-6 flex items-start gap-3 bg-primary-50 border border-primary-200 rounded-xl p-4">
          <FiZap className="w-5 h-5 text-primary-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-primary-800">AI Search: "{aiQuery}"</p>
            <p className="text-sm text-primary-600 mt-0.5">{aiIntent}</p>
          </div>
          <button onClick={() => window.history.replaceState({}, '')} className="ml-auto text-primary-400 hover:text-primary-700">
            <FiX className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {category || keyword ? (category || `"${keyword}"`) : 'All Products'}
          </h1>
          {!loading && (
            <p className="text-sm text-gray-500 mt-0.5">
              {pagination.total} product{pagination.total !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setParam('sort', e.target.value)}
            className="input py-2 text-sm w-auto pr-8"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {/* Filter toggle (mobile) */}
          <button
            onClick={() => setFiltersOpen(true)}
            className="btn-secondary btn-sm lg:hidden flex items-center gap-1.5"
          >
            <FiFilter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-primary-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Sidebar — desktop */}
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="card p-5 sticky top-24">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Filters</h3>
              {activeFilterCount > 0 && (
                <span className="badge-purple">{activeFilterCount}</span>
              )}
            </div>
            <FilterPanel />
          </div>
        </aside>

        {/* Product grid */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="card overflow-hidden animate-pulse">
                  <div className="aspect-square bg-gray-200" />
                  <div className="p-4 space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                    <div className="h-4 bg-gray-200 rounded" />
                    <div className="h-5 bg-gray-200 rounded w-1/3 mt-3" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-5xl mb-4">🔍</p>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-500 text-sm mb-6">Try adjusting your filters or search term</p>
              <button onClick={clearFilters} className="btn-primary">Clear Filters</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-5">
                {products.map((p) => <ProductCard key={p._id} product={p} />)}
              </div>
              <Pagination
                page={pagination.page}
                pages={pagination.pages}
                onPageChange={(p) => setParam('page', String(p))}
              />
            </>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {filtersOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setFiltersOpen(false)} />
          <div className="fixed inset-y-0 right-0 w-80 bg-white z-50 p-6 overflow-y-auto shadow-xl animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-gray-900 text-lg">Filters</h3>
              <button onClick={() => setFiltersOpen(false)}><FiX className="w-5 h-5 text-gray-500" /></button>
            </div>
            <FilterPanel />
          </div>
        </>
      )}
    </div>
  );
}
