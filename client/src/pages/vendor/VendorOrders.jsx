import { useState, useEffect } from 'react';
import { FiChevronDown } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../store/slices/authSlice.js';
import { orderService } from '../../services/api.js';
import { formatPrice, formatDate, ORDER_STATUS_CONFIG } from '../../utils/helpers.js';
import Pagination from '../../components/common/Pagination.jsx';

const VENDOR_TRANSITIONS = {
  pending:    ['accepted', 'cancelled'],
  accepted:   ['processing', 'cancelled'],
  processing: ['shipped'],
  shipped:    ['delivered'],
  delivered:  [],
  cancelled:  [],
};

export default function VendorOrders() {
  const currentUser = useSelector(selectCurrentUser);
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [trackingForm, setTrackingForm] = useState({});

  useEffect(() => {
    setLoading(true);
    orderService.getVendorOrders({ page, limit: 15 })
      .then((r) => { setOrders(r.data.orders); setPagination(r.data.pagination); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  const handleStatusUpdate = async (orderId, status) => {
    setUpdating(orderId);
    try {
      const { data } = await orderService.updateVendorStatus(orderId, {
        status,
        ...trackingForm[orderId],
      });
      setOrders((prev) => prev.map((o) => o._id === orderId ? data.order : o));
      toast.success(`Order ${status}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally { setUpdating(null); }
  };

  const getVendorStatus = (order) =>
    order.vendorStatuses?.find((vs) => vs.vendor?.toString() === currentUser?._id?.toString())?.status
    || order.vendorStatuses?.[0]?.status
    || order.status;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Orders</h1>

      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse flex gap-4">
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 card">
          <p className="text-gray-400">No orders yet. Share your shop to start selling!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const vendorStatus = getVendorStatus(order);
            const sc = ORDER_STATUS_CONFIG[vendorStatus] || { label: vendorStatus, color: 'badge-gray' };
            const nextStatuses = VENDOR_TRANSITIONS[vendorStatus] || [];
            const isExpanded = expanded === order._id;
            const tf = trackingForm[order._id] || {};

            return (
              <div key={order._id} className="card overflow-hidden">
                {/* Row */}
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpanded(isExpanded ? null : order._id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-gray-900 text-sm">{order.orderNumber}</p>
                      <span className={sc.color}>{sc.label}</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {order.customer?.name} · {formatDate(order.createdAt)} · {order.items?.length} item{order.items?.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <span className="font-bold text-gray-900 shrink-0">{formatPrice(order.totalAmount)}</span>
                  <FiChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50/50">
                    {/* Items */}
                    <div className="space-y-2">
                      {order.items?.map((item, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <img src={item.image || 'https://placehold.co/40x40'} alt={item.name}
                            className="w-10 h-10 rounded-lg object-cover bg-gray-100 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                            <p className="text-xs text-gray-400">Qty: {item.quantity} · {formatPrice(item.price)}</p>
                          </div>
                          <span className="text-sm font-semibold">{formatPrice(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Shipping address */}
                    <div className="text-xs text-gray-500 bg-white border border-gray-100 rounded-xl p-3">
                      <p className="font-semibold text-gray-700 mb-1">Ship to</p>
                      <p>{order.shippingAddress?.fullName}</p>
                      <p>{order.shippingAddress?.street}, {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.zipCode}</p>
                    </div>

                    {/* Tracking form (shown when transitioning to shipped) */}
                    {nextStatuses.includes('shipped') && (
                      <div className="grid sm:grid-cols-2 gap-2">
                        <input type="text" placeholder="Tracking number"
                          value={tf.trackingNumber || ''} onChange={(e) => setTrackingForm((f) => ({ ...f, [order._id]: { ...tf, trackingNumber: e.target.value } }))}
                          className="input text-sm py-2" />
                        <input type="text" placeholder="Carrier (e.g. UPS)"
                          value={tf.carrier || ''} onChange={(e) => setTrackingForm((f) => ({ ...f, [order._id]: { ...tf, carrier: e.target.value } }))}
                          className="input text-sm py-2" />
                      </div>
                    )}

                    {/* Status action buttons */}
                    {nextStatuses.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {nextStatuses.map((status) => (
                          <button
                            key={status}
                            onClick={() => handleStatusUpdate(order._id, status)}
                            disabled={updating === order._id}
                            className={`btn-sm capitalize ${status === 'cancelled' ? 'btn-danger' : 'btn-primary'}`}
                          >
                            {updating === order._id ? 'Updating…' : `Mark as ${status}`}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <Pagination page={pagination.page} pages={pagination.pages} onPageChange={setPage} />
    </div>
  );
}
