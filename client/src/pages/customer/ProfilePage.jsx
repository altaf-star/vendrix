import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { FiUser, FiSave, FiEye, FiEyeOff } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth.js';
import { updateUser } from '../../store/slices/authSlice.js';
import { userService, authService } from '../../services/api.js';

export default function ProfilePage() {
  const { user } = useAuth();
  const dispatch = useDispatch();

  const [tab, setTab] = useState('profile');
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [saving, setSaving] = useState(false);

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await userService.updateProfile(form);
      dispatch(updateUser(data.user));
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setSaving(false); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) return toast.error('Passwords do not match');
    setPwSaving(true);
    try {
      await authService.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed — please log in again');
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally { setPwSaving(false); }
  };

  const TABS = [
    { id: 'profile', label: 'Profile' },
    { id: 'security', label: 'Security' },
  ];

  return (
    <div className="page-container py-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>

      {/* Avatar */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
          {user?.avatar
            ? <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
            : <FiUser className="w-8 h-8 text-primary-600" />}
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-lg">{user?.name}</p>
          <p className="text-sm text-gray-500">{user?.email}</p>
          <span className="badge-purple mt-1 capitalize">{user?.role}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <form onSubmit={handleProfileSave} className="card p-6 space-y-4">
          <div>
            <label className="label" htmlFor="name">Full Name</label>
            <input id="name" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="emailDisplay">Email</label>
            <input id="emailDisplay" type="email" value={user?.email} disabled className="input bg-gray-50 text-gray-400 cursor-not-allowed" />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed.</p>
          </div>
          <div>
            <label className="label" htmlFor="phone">Phone</label>
            <input id="phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 555 000 0000" className="input" />
          </div>
          <button type="submit" disabled={saving} className="btn-primary gap-2">
            <FiSave className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      )}

      {tab === 'security' && (
        <form onSubmit={handlePasswordChange} className="card p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Change Password</h3>
          {[
            { id: 'currentPassword', label: 'Current Password', key: 'currentPassword' },
            { id: 'newPassword',     label: 'New Password',     key: 'newPassword' },
            { id: 'confirm',         label: 'Confirm New Password', key: 'confirm' },
          ].map(({ id, label, key }) => (
            <div key={id}>
              <label className="label" htmlFor={id}>{label}</label>
              <div className="relative">
                <input
                  id={id}
                  type={showPw ? 'text' : 'password'}
                  value={pwForm[key]}
                  onChange={(e) => setPwForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="input pr-10"
                />
                <button type="button" onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPw ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
          <button type="submit" disabled={pwSaving} className="btn-primary gap-2">
            <FiSave className="w-4 h-4" /> {pwSaving ? 'Changing…' : 'Change Password'}
          </button>
        </form>
      )}
    </div>
  );
}
