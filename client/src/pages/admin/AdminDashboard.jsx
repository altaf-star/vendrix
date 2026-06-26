import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FiUsers, FiShoppingBag, FiPackage, FiDollarSign,
  FiClock, FiArrowRight,
} from 'react-icons/fi';
import {
  ResponsiveContainer, AreaChart, Area,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { adminService } from '../../services/api.js';
import { formatPrice, formatDate, ORDER_STATUS_CONFIG } from '../../utils/helpers.js';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const StatCard = ({ icon: Icon, label, value, sub, color = 'primary', to }) => {
  const colors = {
    primary: 'bg-primary-50 text-primary-600',
    green:   'bg-green-50  text-green-600',
    blue:    'bg-blue-50   text-blue-600',
    amber:   'bg-amber-50  text-amber-600',
    red:     'bg-red-50    text-red-600',
  };
  const content = (
    <div className={`card p-5 ${to ? 'hover:shadow-card-hover transition-shadow cursor-pointer' : ''}`}>
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
  return to ? <Link to={to}>{content}</Link> : content;
};

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getDashboard()
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const revenueChart = data?.revenueByMonth?.map((m) => ({
    name: MONTH_NAMES[m._id.month - 1],
    revenue: +m.revenue.toFixed(2),
    orders: m.orders,
  })) || [];

  const userChart = data?.userGrowth?.map((m) => ({
    name: MONTH_NAMES[m._id.month - 1],
    users: m.users,
  })) || [];

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(6)].map((_, i) => <div key={i} className="card h-28" />)}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card h-72" /><div className="card h-72" />
      </div>
    </div>
  );

  const { stats, recentOrders = [] } = data || {};

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Platform Overview</h1>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={FiDollarSign} label="Total GMV"         value={formatPrice(stats?.totalRevenue || 0)}     color="green" />
        <StatCard icon={FiDollarSign} label="Platform Revenue"  value={formatPrice(stats?.platformRevenue || 0)}  color="primary" />
        <StatCard icon={FiShoppingBag} label="Total Orders"     value={stats?.totalOrders || 0}                   color="blue" to="/admin/orders" />
        <StatCard icon={FiUsers}      label="Customers"         value={stats?.totalUsers || 0}                    to="/admin/users" />
        <StatCard icon={FiPackage}    label="Active Products"   value={stats?.totalProducts || 0}                 to="/admin/products" />
        <StatCard icon={FiClock}      label="Pending Vendors"   value={stats?.pendingVendors || 0}                color={stats?.pendingVendors > 0 ? 'amber' : 'primary'} to="/admin/vendors" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue chart */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-5">GMV (Last 12 Months)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueChart}>
              <defs>
                <linearGradient id="adminGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#a821d4" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#a821d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v) => [`$${v}`, 'Revenue']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Area type="monotone" dataKey="revenue" stroke="#a821d4" strokeWidth={2} fill="url(#adminGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* User growth chart */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-5">New Users (Last 12 Months)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={userChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Line type="monotone" dataKey="users" stroke="#2563eb" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent orders */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Recent Orders</h2>
          <Link to="/admin/orders" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
            View all <FiArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                {['Order','Customer','Status','Amount','Date'].map((h) => (
                  <th key={h} className="text-left pb-3 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentOrders.map((o) => {
                const sc = ORDER_STATUS_CONFIG[o.status] || { label: o.status, color: 'badge-gray' };
                return (
                  <tr key={o._id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 pr-4 font-medium text-gray-900">{o.orderNumber}</td>
                    <td className="py-3 pr-4 text-gray-600">{o.customer?.name}</td>
                    <td className="py-3 pr-4"><span className={sc.color}>{sc.label}</span></td>
                    <td className="py-3 pr-4 font-semibold">{formatPrice(o.totalAmount)}</td>
                    <td className="py-3 text-gray-400">{formatDate(o.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
