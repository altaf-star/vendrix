import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FiDollarSign, FiShoppingBag, FiPackage, FiTrendingUp,
  FiAlertTriangle, FiArrowRight,
} from 'react-icons/fi';
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { vendorService } from '../../services/api.js';
import { formatPrice, formatDate, ORDER_STATUS_CONFIG } from '../../utils/helpers.js';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const StatCard = ({ icon: Icon, label, value, sub, color = 'primary' }) => {
  const colors = {
    primary: 'bg-primary-50 text-primary-600',
    green:   'bg-green-50  text-green-600',
    blue:    'bg-blue-50   text-blue-600',
    amber:   'bg-amber-50  text-amber-600',
  };
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
};

export default function VendorDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    vendorService.getDashboard()
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const chartData = data?.revenueByMonth?.map((m) => ({
    name: MONTH_NAMES[(m._id.month - 1)],
    revenue: m.revenue,
    orders: m.orders,
  })) || [];

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="card h-28" />)}
      </div>
      <div className="card h-72" />
    </div>
  );

  const { stats, topProducts = [], recentOrders = [] } = data || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <Link to="/vendor/products/new" className="btn-primary btn-sm gap-1.5">
          + New Product
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FiDollarSign} label="Total Revenue"   value={formatPrice(stats?.totalRevenue || 0)}   color="green" />
        <StatCard icon={FiShoppingBag} label="Total Orders"   value={stats?.totalOrders || 0}                 color="blue" />
        <StatCard icon={FiPackage}     label="Total Products"  value={stats?.totalProducts || 0}               />
        <StatCard icon={FiTrendingUp}  label="Units Sold"      value={stats?.totalUnitsSold || 0}              color="amber" />
      </div>

      {/* Stock warnings */}
      {(stats?.lowStockCount > 0 || stats?.outOfStockCount > 0) && (
        <div className="flex flex-wrap gap-3">
          {stats?.outOfStockCount > 0 && (
            <Link to="/vendor/products?status=all" className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm hover:bg-red-100 transition-colors">
              <FiAlertTriangle className="w-4 h-4" />
              {stats.outOfStockCount} product{stats.outOfStockCount !== 1 ? 's' : ''} out of stock
            </Link>
          )}
          {stats?.lowStockCount > 0 && (
            <Link to="/vendor/products?status=all" className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-4 py-2.5 text-sm hover:bg-amber-100 transition-colors">
              <FiAlertTriangle className="w-4 h-4" />
              {stats.lowStockCount} product{stats.lowStockCount !== 1 ? 's' : ''} low on stock
            </Link>
          )}
        </div>
      )}

      {/* Revenue chart */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-5">Revenue (Last 12 Months)</h2>
        {chartData.length === 0 ? (
          <div className="h-56 flex items-center justify-center text-gray-400 text-sm">
            No revenue data yet — make your first sale!
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="vendorGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#a821d4" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#a821d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v) => [`$${v.toFixed(2)}`, 'Revenue']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
              <Area type="monotone" dataKey="revenue" stroke="#a821d4" strokeWidth={2} fill="url(#vendorGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top products */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Top Products</h2>
            <Link to="/vendor/products" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              View all <FiArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {topProducts.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No products yet.</p>
          ) : (
            <ol className="space-y-3">
              {topProducts.map((p, i) => (
                <li key={p._id} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">{i + 1}</span>
                  <img src={p.images?.[0]?.url || 'https://placehold.co/36x36/f3f4f6/a821d4?text=P'} alt={p.name} className="w-9 h-9 rounded-lg object-cover bg-gray-100 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.totalSold} sold · ★ {p.rating?.toFixed(1)}</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 shrink-0">{formatPrice(p.price)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Recent orders */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Orders</h2>
            <Link to="/vendor/orders" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              View all <FiArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No orders yet.</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((o) => {
                const sc = ORDER_STATUS_CONFIG[o.status] || { label: o.status, color: 'badge-gray' };
                return (
                  <div key={o._id} className="flex items-center gap-3 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{o.orderNumber}</p>
                      <p className="text-xs text-gray-400">{o.customer?.name} · {formatDate(o.createdAt)}</p>
                    </div>
                    <span className={sc.color}>{sc.label}</span>
                    <span className="font-semibold text-gray-900 shrink-0">{formatPrice(o.totalAmount)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
