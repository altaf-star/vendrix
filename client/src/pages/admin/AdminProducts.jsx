import { useState, useEffect, useCallback } from 'react';
import { FiSearch, FiCheck, FiX, FiTrash2, FiPackage } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { adminService } from '../../services/api.js';
import { formatPrice, formatDate, CATEGORIES } from '../../utils/helpers.js';
import Pagination from '../../components/common/Pagination.jsx';

const APPROVAL_OPTIONS = [
  { value: '', label: 'All Products' },
  { value: 'approved', label: 'Approved' },
  { value: 'pending', label: 'Pending' },
  { value: 'rejected', label: 'Rejected' },
];

const APPROVAL_BADGE = {
  approved: 'badge-green',
  pending:  'badge-yellow',
  rejected: 'badge-red',
};

export default function AdminProducts() {
  const [products, setProducts]     = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState('');
  const [category, setCategory]     = useState('');
  const [approval, setApproval]     = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchProducts = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 15 };
      if (search)   params.search   = search;
      if (category) params.category = category;
      if (approval) params.approval = approval;
      const { data } = await adminService.getAllProducts(params);
      setProducts(data.products);
      setPagination(data.pagination);
    } catch { setProducts([]); }
    finally { setLoading(false); }
  }, [page, search, category, approval]);

  useEffect(() => { fetchProducts(page); }, [page, category, approval]);

  const handleSearch = (e) => { e.preventDefault(); setPage(1); fetchProducts(1); };

  const approve = async (id) => {
    setActionLoading(id + 'approve');
    try {
      await adminService.approveProduct(id);
      setProducts((prev) => prev.map((p) => p._id === id ? { ...p, approvalStatus: 'approved' } : p));
      toast.success('Product approved');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setActionLoading(null); }
  };

  const reject = async (id) => {
    setActionLoading(id + 'reject');
    try {
      await adminService.rejectProduct(id);
      setProducts((prev) => prev.map((p) => p._id === id ? { ...p, approvalStatus: 'rejected' } : p));
      toast.success('Product rejected');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setActionLoading(null); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this product permanently?')) return;
    setActionLoading(id + 'delete');
    try {
      await adminService.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p._id !== id));
      toast.success('Product deleted');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setActionLoading(null); }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Products</h1>

      {/* Filters */}
      <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text" placeholder="Search products…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 text-sm py-2"
          />
        </div>
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          className="input text-sm py-2 w-auto"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={approval}
          onChange={(e) => { setApproval(e.target.value); setPage(1); }}
          className="input text-sm py-2 w-auto"
        >
          {APPROVAL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button type="submit" className="btn-primary btn-sm">Search</button>
      </form>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="divide-y divide-gray-50">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex gap-4 p-4 animate-pulse">
                <div className="w-12 h-12 bg-gray-200 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 rounded w-1/5" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="py-20 text-center">
            <FiPackage className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No products found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Product', 'Vendor', 'Category', 'Price', 'Stock', 'Status', 'Added', 'Actions'].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.map((p) => {
                  const busy = actionLoading?.startsWith(p._id);
                  const badgeClass = APPROVAL_BADGE[p.approvalStatus] || 'badge-gray';
                  return (
                    <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.images?.[0] ? (
                            <img src={p.images[0]} alt={p.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                              <FiPackage className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                          <span className="font-medium text-gray-900 max-w-[160px] truncate">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-[120px] truncate">
                        {p.vendor?.vendorInfo?.shopName || p.vendor?.name || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{p.category}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                        {formatPrice(p.price)}
                        {p.salePrice && p.salePrice < p.price && (
                          <span className="ml-1 text-xs text-gray-400 line-through">{formatPrice(p.price)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={p.stock === 0 ? 'badge-red' : p.stock < 5 ? 'badge-yellow' : 'badge-green'}>
                          {p.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={badgeClass}>{p.approvalStatus || 'pending'}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{formatDate(p.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {p.approvalStatus !== 'approved' && (
                            <button
                              onClick={() => approve(p._id)} disabled={busy}
                              title="Approve"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                            >
                              <FiCheck className="w-4 h-4" />
                            </button>
                          )}
                          {p.approvalStatus !== 'rejected' && (
                            <button
                              onClick={() => reject(p._id)} disabled={busy}
                              title="Reject"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                            >
                              <FiX className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => remove(p._id)} disabled={busy}
                            title="Delete"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination page={pagination.page} pages={pagination.pages} onPageChange={(p) => { setPage(p); fetchProducts(p); }} />
    </div>
  );
}
