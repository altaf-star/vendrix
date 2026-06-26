import { useState, useEffect } from 'react';
import { FiCheck, FiX, FiSearch, FiUsers } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { adminService } from '../../services/api.js';
import { formatDate, VENDOR_STATUS_CONFIG } from '../../utils/helpers.js';

export default function AdminVendors() {
  const [vendors, setVendors] = useState([]);
  const [allVendors, setAllVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [noteModal, setNoteModal] = useState(null); // { id, action }
  const [note, setNote] = useState('');

  useEffect(() => {
    if (tab === 'pending') {
      setLoading(true);
      adminService.getPendingVendors()
        .then((r) => { setVendors(r.data.vendors); setAllVendors(r.data.vendors); })
        .finally(() => setLoading(false));
    } else {
      setLoading(true);
      adminService.getUsers({ role: 'vendor', limit: 100 })
        .then((r) => { setVendors(r.data.users); setAllVendors(r.data.users); })
        .finally(() => setLoading(false));
    }
  }, [tab]);

  const filtered = search
    ? allVendors.filter((v) =>
        v.name.toLowerCase().includes(search.toLowerCase()) ||
        v.email.toLowerCase().includes(search.toLowerCase()) ||
        v.vendorInfo?.shopName?.toLowerCase().includes(search.toLowerCase()))
    : allVendors;

  const openNote = (id, action) => { setNoteModal({ id, action }); setNote(''); };

  const confirmAction = async () => {
    const { id, action } = noteModal;
    setActionLoading(id);
    setNoteModal(null);
    try {
      if (action === 'approve') {
        await adminService.approveVendor(id, note);
        toast.success('Vendor approved');
      } else {
        await adminService.rejectVendor(id, note);
        toast.success('Vendor rejected');
      }
      setVendors((prev) => prev.filter((v) => v._id !== id));
      setAllVendors((prev) => prev.filter((v) => v._id !== id));
    } catch { toast.error('Action failed'); }
    finally { setActionLoading(null); }
  };

  const TABS = [{ id: 'pending', label: 'Pending Applications' }, { id: 'all', label: 'All Vendors' }];

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Vendor Management</h1>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex border-b border-gray-200">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input type="text" placeholder="Search vendors…" value={search}
            onChange={(e) => setSearch(e.target.value)} className="input pl-9 text-sm py-2 w-64" />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="card h-20 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card py-16 text-center">
          <FiUsers className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">{tab === 'pending' ? 'No pending applications.' : 'No vendors found.'}</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Vendor','Shop','Status','Applied','Actions'].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((v) => {
                  const vs = VENDOR_STATUS_CONFIG[v.vendorInfo?.applicationStatus] || { label: 'Unknown', color: 'badge-gray' };
                  return (
                    <tr key={v._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{v.name}</p>
                        <p className="text-xs text-gray-400">{v.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{v.vendorInfo?.shopName}</p>
                        <p className="text-xs text-gray-400 max-w-[200px] truncate">{v.vendorInfo?.shopDescription}</p>
                      </td>
                      <td className="px-4 py-3"><span className={vs.color}>{vs.label}</span></td>
                      <td className="px-4 py-3 text-gray-400">{formatDate(v.createdAt)}</td>
                      <td className="px-4 py-3">
                        {v.vendorInfo?.applicationStatus === 'pending' && (
                          <div className="flex gap-2">
                            <button onClick={() => openNote(v._id, 'approve')} disabled={actionLoading === v._id}
                              className="btn-sm flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white rounded-lg px-3 py-1.5">
                              <FiCheck className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button onClick={() => openNote(v._id, 'reject')} disabled={actionLoading === v._id}
                              className="btn-sm flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white rounded-lg px-3 py-1.5">
                              <FiX className="w-3.5 h-3.5" /> Reject
                            </button>
                          </div>
                        )}
                        {v.vendorInfo?.applicationNote && (
                          <p className="text-xs text-gray-400 mt-1 italic max-w-[180px] truncate">{v.vendorInfo.applicationNote}</p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Note modal */}
      {noteModal && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setNoteModal(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md animate-slide-up">
              <h3 className="font-bold text-gray-900 mb-1 capitalize">{noteModal.action} Vendor</h3>
              <p className="text-sm text-gray-500 mb-4">Add an optional note for the vendor.</p>
              <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)}
                placeholder={noteModal.action === 'approve' ? 'Welcome to Vendrix!' : 'Reason for rejection…'}
                className="input resize-none mb-4" />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setNoteModal(null)} className="btn-secondary">Cancel</button>
                <button onClick={confirmAction}
                  className={`btn-sm px-4 py-2 text-white rounded-lg font-medium ${noteModal.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                  Confirm {noteModal.action}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
