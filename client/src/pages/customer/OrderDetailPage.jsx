import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiPackage, FiArrowLeft, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { orderService } from '../../services/api.js';
import { formatPrice, formatDate, ORDER_STATUS_CONFIG } from '../../utils/helpers.js';

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    orderService.getById(id)
      .then((r) => setOrder(r.data.order))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleCancel = async () => {
    if (!window.confirm('Cancel this order?')) return;
    setCancelling(true);
    try {
      const { data } = await orderService.cancel(id, 'Cancelled by customer');
      setOrder(data.order);
      toast.success('Order cancelled');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not cancel order');
    } finally { setCancelling(false); }
  };

  if (loading) return (
    <div className="page-container py-8 max-w-3xl mx-auto animate-pulse space-y-4">
      <div className="h-6 bg-gray-200 rounded w-1/3" />
      <div className="card p-6 space-y-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-4 bg-gray-200 rounded" />)}
      </div>
    </div>
  );

  if (!order) return (
    <div className="page-container py-20 text-center">
      <p className="text-gray-500">Order not found.</p>
      <Link to="/orders" className="btn-primary mt-4">Back to Orders</Link>
    </div>
  );

  const sc = ORDER_STATUS_CONFIG[order.status] || { label: order.status, color: 'badge-gray' };
  const canCancel = ['pending', 'confirmed'].includes(order.status);

  return (
    <div className="page-container py-8 max-w-3xl mx-auto">
      <Link to="/orders" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
        <FiArrowLeft className="w-4 h-4" /> Back to Orders
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{order.orderNumber}</h1>
          <p className="text-sm text-gray-500 mt-0.5">Placed {formatDate(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={sc.color}>{sc.label}</span>
          {canCancel && (
            <button onClick={handleCancel} disabled={cancelling} className="btn-danger btn-sm gap-1">
              <FiX className="w-3.5 h-3.5" /> {cancelling ? 'Cancelling…' : 'Cancel'}
            </button>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="card p-5 mb-5">
        <h2 className="font-semibold text-gray-900 mb-4">Items</h2>
        <div className="space-y-4">
          {order.items?.map((item, i) => (
            <div key={i} className="flex items-center gap-4">
              <img
                src={item.image || `https://placehold.co/56x56/f3f4f6/a821d4?text=${item.name[0]}`}
                alt={item.name}
                className="w-14 h-14 rounded-xl object-cover bg-gray-100 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                <p className="text-xs text-gray-400">Qty: {item.quantity} · {formatPrice(item.price)} each</p>
              </div>
              <span className="font-semibold text-gray-900">{formatPrice(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-5 mb-5">
        {/* Shipping address */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Shipping Address</h2>
          <address className="not-italic text-sm text-gray-600 space-y-0.5">
            <p className="font-medium text-gray-900">{order.shippingAddress?.fullName}</p>
            <p>{order.shippingAddress?.street}</p>
            <p>{order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.zipCode}</p>
            <p>{order.shippingAddress?.country}</p>
            {order.shippingAddress?.phone && <p className="text-gray-400">{order.shippingAddress.phone}</p>}
          </address>
        </div>

        {/* Price summary */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Payment Summary</h2>
          <dl className="space-y-2 text-sm">
            {[
              ['Subtotal', formatPrice(order.subtotal)],
              ['Shipping', 'Free'],
              ['Tax', formatPrice(order.taxAmount)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-gray-600">
                <dt>{k}</dt><dd>{v}</dd>
              </div>
            ))}
            <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100">
              <dt>Total</dt><dd>{formatPrice(order.totalAmount)}</dd>
            </div>
          </dl>
          <p className={`text-xs mt-3 font-medium ${order.isPaid ? 'text-green-600' : 'text-amber-600'}`}>
            {order.isPaid ? `Paid ${order.paidAt ? formatDate(order.paidAt) : ''}` : 'Payment pending'}
          </p>
        </div>
      </div>

      {/* Tracking timeline */}
      {order.trackingHistory?.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Tracking History</h2>
          <ol className="relative border-l border-gray-200 space-y-4 pl-5">
            {[...order.trackingHistory].reverse().map((event, i) => (
              <li key={i} className="relative">
                <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-primary-600 bg-white" />
                <p className="text-sm font-medium text-gray-900 capitalize">{event.status.replace(/_/g, ' ')}</p>
                {event.description && <p className="text-xs text-gray-500">{event.description}</p>}
                <p className="text-xs text-gray-400">{formatDate(event.timestamp, { dateStyle: 'medium', timeStyle: 'short' })}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
