import { useState, useEffect } from 'react';
import { FiDollarSign, FiTrendingUp } from 'react-icons/fi';
import { vendorService } from '../../services/api.js';
import { formatPrice, formatDate } from '../../utils/helpers.js';
import Pagination from '../../components/common/Pagination.jsx';

export default function VendorEarnings() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchEarnings = async (p = 1) => {
    setLoading(true);
    try {
      const { data: res } = await vendorService.getEarnings({ page: p, limit: 20 });
      setData(res);
    } catch { setData(null); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchEarnings(page); }, [page]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Earnings</h1>

      {/* Summary cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">Lifetime Earnings</span>
            <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center">
              <FiDollarSign className="w-4 h-4 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {loading ? '—' : formatPrice(data?.summary?.lifetimeEarnings || 0)}
          </p>
          <p className="text-xs text-gray-400 mt-1">After 10% platform commission</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">This Month</span>
            <div className="w-9 h-9 bg-primary-50 rounded-xl flex items-center justify-center">
              <FiTrendingUp className="w-4 h-4 text-primary-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {loading ? '—' : formatPrice(data?.summary?.thisMonthEarnings || 0)}
          </p>
        </div>
      </div>

      {/* Earnings table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Transaction History</h2>
        </div>
        {loading ? (
          <div className="divide-y divide-gray-50">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
                <div className="flex-1 h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-4 bg-gray-200 rounded w-24" />
              </div>
            ))}
          </div>
        ) : !data?.earnings?.length ? (
          <div className="py-16 text-center text-gray-400 text-sm">No earnings yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Order', 'Item', 'Qty', 'Price', 'Your Earnings', 'Date'].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.earnings.map((e, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{e.orderNumber}</td>
                    <td className="px-4 py-3 text-gray-700 max-w-[180px] truncate">{e.itemName}</td>
                    <td className="px-4 py-3 text-gray-600">{e.itemQty}</td>
                    <td className="px-4 py-3 text-gray-600">{formatPrice(e.itemPrice)}</td>
                    <td className="px-4 py-3 font-semibold text-green-700">{formatPrice(e.vendorEarnings)}</td>
                    <td className="px-4 py-3 text-gray-400">{formatDate(e.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && <Pagination page={data.pagination.page} pages={data.pagination.pages} onPageChange={setPage} />}
    </div>
  );
}
