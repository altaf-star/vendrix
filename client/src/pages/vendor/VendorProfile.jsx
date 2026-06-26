import { useState, useEffect } from 'react';
import { FiUpload, FiSave } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { vendorService, uploadService } from '../../services/api.js';
import { updateUser } from '../../store/slices/authSlice.js';

export default function VendorProfile() {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const [form, setForm] = useState({
    name: '', phone: '',
    shopName: '', shopDescription: '',
    businessEmail: '', businessPhone: '',
    shopLogo: '', shopBanner: '',
  });

  useEffect(() => {
    vendorService.getProfile()
      .then(({ data }) => {
        const v = data.vendor;
        setForm({
          name: v.name || '', phone: v.phone || '',
          shopName: v.vendorInfo?.shopName || '',
          shopDescription: v.vendorInfo?.shopDescription || '',
          businessEmail: v.vendorInfo?.businessEmail || '',
          businessPhone: v.vendorInfo?.businessPhone || '',
          shopLogo: v.vendorInfo?.shopLogo || '',
          shopBanner: v.vendorInfo?.shopBanner || '',
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const uploadShopAsset = async (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append(field, file);
    if (field === 'shopLogo') setUploadingLogo(true); else setUploadingBanner(true);
    try {
      const { data } = await uploadService.uploadShopAssets(fd);
      const url = data[field]?.url;
      if (url) setForm((f) => ({ ...f, [field]: url }));
    } catch { toast.error('Upload failed'); }
    finally { setUploadingLogo(false); setUploadingBanner(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await vendorService.updateProfile(form);
      dispatch(updateUser(data.vendor));
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="space-y-4 animate-pulse">{[...Array(3)].map((_, i) => <div key={i} className="card h-40" />)}</div>;

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Shop Profile</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Shop visuals */}
        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-gray-900">Shop Branding</h2>

          {/* Banner */}
          <div>
            <label className="label">Shop Banner</label>
            <div className="relative h-36 rounded-xl overflow-hidden bg-gray-100 border-2 border-dashed border-gray-300 hover:border-primary-400 transition-colors cursor-pointer group">
              {form.shopBanner ? (
                <img src={form.shopBanner} alt="Banner" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <FiUpload className="w-6 h-6 mb-1" />
                  <span className="text-sm">Upload banner (1500×500)</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                <span className="text-white text-sm font-medium bg-black/50 px-3 py-1.5 rounded-lg">Change Banner</span>
              </div>
              <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={(e) => uploadShopAsset(e, 'shopBanner')} disabled={uploadingBanner} />
            </div>
            {uploadingBanner && <p className="text-xs text-primary-600 mt-1">Uploading…</p>}
          </div>

          {/* Logo */}
          <div className="flex items-start gap-4">
            <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-100 border-2 border-dashed border-gray-300 hover:border-primary-400 transition-colors cursor-pointer group shrink-0">
              {form.shopLogo ? (
                <img src={form.shopLogo} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <FiUpload className="w-5 h-5 text-gray-400" />
                </div>
              )}
              <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={(e) => uploadShopAsset(e, 'shopLogo')} disabled={uploadingLogo} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Shop Logo</p>
              <p className="text-xs text-gray-400 mt-0.5">400×400px recommended</p>
              {uploadingLogo && <p className="text-xs text-primary-600 mt-1">Uploading…</p>}
            </div>
          </div>
        </div>

        {/* Shop info */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Shop Details</h2>
          <div>
            <label className="label" htmlFor="shopName">Shop Name *</label>
            <input id="shopName" type="text" value={form.shopName} onChange={set('shopName')} required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="shopDescription">Shop Description</label>
            <textarea id="shopDescription" rows={3} value={form.shopDescription}
              onChange={set('shopDescription')} placeholder="Tell customers what you sell…" className="input resize-none" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="businessEmail">Business Email</label>
              <input id="businessEmail" type="email" value={form.businessEmail} onChange={set('businessEmail')} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="businessPhone">Business Phone</label>
              <input id="businessPhone" type="tel" value={form.businessPhone} onChange={set('businessPhone')} className="input" />
            </div>
          </div>
        </div>

        {/* Personal */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Personal Info</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="name">Full Name</label>
              <input id="name" type="text" value={form.name} onChange={set('name')} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="phone">Phone</label>
              <input id="phone" type="tel" value={form.phone} onChange={set('phone')} className="input" />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn-primary btn-lg gap-2">
            <FiSave className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
