import { useState, useEffect, useCallback } from 'react';
import { FiChevronDown, FiChevronUp, FiShoppingBag } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { adminService } from '../../services/api.js';
import { formatPrice, formatDate, ORDER_STATUS_CONFIG } from '../../utils/helpers.js';
import Pagination from '../../components/common/Pagination.jsx';

const STATUS_OPTIONS = [
  'pending', 'confirmed', 'processing',
  'shipped', 'delivered', 'cancelled', 'refunded',
];

const ADMIN_TRANSITIONS = {
  pending:    ['confirmed', 'cancelled'],
  confirmed:  ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped:    ['delivered'],
  delivered:  [],
  cancelled:  ['refunded'],
  refunded:   [],
};

export default function AdminOrders() {
  const [orders, setOrders]         = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [expanded, setExpanded]     = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchOrders = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 15 };
      if (statusFilter) params.status = statusFilter;
      const { data } = await adminService.getAllOrders(params);
      setOrders(data.orders);
      setPagination(data.pagination);
    } catch { setOrders([]); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { fetchOrders(page); }, [page, statusFilter]);

  const updateStatus = async (orderId, newStatus) => {
    setActionLoading(orderId);
    try {
      await adminService.updateOrderStatus(orderId, newStatus);
      setOrders((prev) =>
        prev.map((o) => o._id === orderId ? { ...o, status: newStatus } : o)
      );
      toast.success(`Order marked as ${newStatus}`);
    } catch (err) { toast.error(err.response?.data?.message || 'Update failed'); }
    finally { setActionLoading(null); }
  };

  const toggle = (id) => setExpanded((prev) => (prev === id ? null : id));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">Orders</h1>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="input text-sm py-2 w-auto"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => {
            const cfg = ORDER_STATUS_CONFIG[s];
            return <option key={s} value={s}>{cfg?.label || s}</option>;
          })}
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="divide-y divide-gray-50">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex gap-4 p-4 animate-pulse">
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                </div>
                <div className="h-6 bg-gray-200 rounded w-20" />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="py-20 text-center">
            <FiShoppingBag className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No orders found.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {orders.map((o) => {
              const sc  = ORDER_STATUS_CONFIG[o.status] || { label: o.status, color: 'badge-gray' };
              const isOpen = expanded === o._id;
              const busy   = actionLoading === o._id;
              const nextStatuses = ADMIN_TRANSITIONS[o.status] || [];

              return (
                <div key={o._id}>
                  {/* Row */}
                  <div
                    className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => toggle(o._id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">{o.orderNumber}</span>
                        <span className={sc.color}>{sc.label}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {o.customer?.name} · {o.customer?.email} · {formatDate(o.createdAt)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-gray-900">{formatPrice(o.totalAmount)}</p>
                      <p className="text-xs text-gray-400">{o.orderItems?.length || 0} item(s)</p>
                    </div>
                    <div className="text-gray-400 shrink-0">
                      {isOpen ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div className="bg-gray-50 border-t border-gray-100 px-4 py-4 space-y-4">
                      {/* Items */}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Items</p>
                        <div className="space-y-2">
                          {o.orderItems?.map((item, i) => (
                            <div key={i} className="flex items-center gap-3 bg-white rounded-lg p-3">
                              {item.image && (
                                <img src={item.image} alt={item.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                                <p className="text-xs text-gray-400">
                                  {item.vendor?.vendorInfo?.shopName || item.vendor?.name || '—'} · Qty {item.quantity}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-semibold">{formatPrice(item.price * item.quantity)}</p>
                                <p className="text-xs text-green-700">Earn: {formatPrice(item.vendorEarnings)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Shipping */}
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Shipping Address</p>
                          {o.shippingAddress ? (
                            <p className="text-sm text-gray-700">
                              {o.shippingAddress.street}, {o.shippingAddress.city},{' '}
                              {o.shippingAddress.state} {o.shippingAddress.postalCode},{' '}
                              {o.shippingAddress.country}
                            </p>
                          ) : <p className="text-sm text-gray-400">—</p>}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Payment</p>
                          <p className="text-sm text-gray-700">
                            {o.isPaid ? (
                              <span className="text-green-700 font-medium">Paid · {formatDate(o.paidAt)}</span>
                            ) : (
                              <span className="text-red-600">Not paid</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Order totals */}
                      <div className="bg-white rounded-lg p-3 text-sm flex flex-wrap gap-x-6 gap-y-1">
                        <span className="text-gray-500">Subtotal: <b className="text-gray-900">{formatPrice(o.subtotal)}</b></span>
                        <span className="text-gray-500">Tax: <b className="text-gray-900">{formatPrice(o.tax)}</b></span>
                        <span className="text-gray-500">Shipping: <b className="text-gray-900">{formatPrice(o.shippingCost)}</b></span>
                        <span className="text-gray-500">Total: <b className="text-gray-900">{formatPrice(o.totalAmount)}</b></span>
                      </div>

                      {/* Status update */}
                      {nextStatuses.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Update Status</p>
                          <div className="flex flex-wrap gap-2">
                            {nextStatuses.map((s) => {
                              const cfg = ORDER_STATUS_CONFIG[s] || { label: s };
                              return (
                                <button
                                  key={s}
                                  disabled={busy}
                                  onClick={(e) => { e.stopPropagation(); updateStatus(o._id, s); }}
                                  className="btn-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 text-xs font-medium transition-colors disabled:opacity-50"
                                >
                                  {busy ? 'Updating…' : `→ ${cfg.label}`}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Tracking history */}
                      {o.trackingHistory?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tracking History</p>
                          <div className="space-y-1.5">
                            {[...o.trackingHistory].reverse().map((t, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs">
                                <span className="text-gray-400 whitespace-nowrap pt-0.5">{formatDate(t.timestamp)}</span>
                                <span className="text-gray-700">{t.message}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Pagination
        page={pagination.page}
        pages={pagination.pages}
        onPageChange={(p) => { setPage(p); fetchOrders(p); }}
      />
    </div>
  );
}
