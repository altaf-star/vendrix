import { useState, useEffect } from 'react';
import { FiSearch, FiToggleLeft, FiToggleRight, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { adminService } from '../../services/api.js';
import { formatDate } from '../../utils/helpers.js';
import Pagination from '../../components/common/Pagination.jsx';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (roleFilter) params.role = roleFilter;
      if (search) params.search = search;
      const { data } = await adminService.getUsers(params);
      setUsers(data.users); setPagination(data.pagination);
    } catch { setUsers([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, [page, roleFilter]);

  const handleSearch = (e) => { e.preventDefault(); setPage(1); fetchUsers(); };

  const toggleActive = async (user) => {
    setActionLoading(user._id);
    try {
      const { data } = await adminService.toggleUserActive(user._id);
      setUsers((prev) => prev.map((u) => u._id === user._id ? { ...u, isActive: data.isActive } : u));
      toast.success(`User ${data.isActive ? 'activated' : 'deactivated'}`);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setActionLoading(null); }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Delete this user permanently?')) return;
    setActionLoading(id);
    try {
      await adminService.deleteUser(id);
      setUsers((prev) => prev.filter((u) => u._id !== id));
      toast.success('User deleted');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setActionLoading(null); }
  };

  const ROLE_COLORS = { admin: 'badge-purple', vendor: 'badge-blue', customer: 'badge-gray' };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Users</h1>

      <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input type="text" placeholder="Search name or email…" value={search}
            onChange={(e) => setSearch(e.target.value)} className="input pl-9 text-sm py-2" />
        </div>
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} className="input text-sm py-2 w-auto">
          <option value="">All Roles</option>
          <option value="customer">Customer</option>
          <option value="vendor">Vendor</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit" className="btn-primary btn-sm">Search</button>
      </form>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="divide-y divide-gray-50">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex gap-4 p-4 animate-pulse">
                <div className="w-9 h-9 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-gray-400">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['User','Role','Status','Joined','Actions'].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                          {u.avatar
                            ? <img src={u.avatar} alt={u.name} className="w-full h-full rounded-full object-cover" />
                            : <span className="text-primary-700 text-xs font-semibold">{u.name?.[0]}</span>}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{u.name}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className={ROLE_COLORS[u.role] || 'badge-gray'}>{u.role}</span></td>
                    <td className="px-4 py-3">
                      <span className={u.isActive ? 'badge-green' : 'badge-red'}>{u.isActive ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      {u.role !== 'admin' && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => toggleActive(u)} disabled={actionLoading === u._id}
                            title={u.isActive ? 'Deactivate' : 'Activate'}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors">
                            {u.isActive ? <FiToggleRight className="w-5 h-5 text-green-500" /> : <FiToggleLeft className="w-5 h-5" />}
                          </button>
                          <button onClick={() => deleteUser(u._id)} disabled={actionLoading === u._id}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Pagination page={pagination.page} pages={pagination.pages} onPageChange={setPage} />
    </div>
  );
}
