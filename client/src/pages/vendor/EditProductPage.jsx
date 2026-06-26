import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FiArrowLeft, FiSave, FiX, FiUpload, FiZap } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { productService, aiService, uploadService } from '../../services/api.js';
import { CATEGORIES } from '../../utils/helpers.js';

export default function EditProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState(null);
  const [images, setImages] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFeatures, setAiFeatures] = useState('');

  useEffect(() => {
    productService.getById(id)
      .then(({ data }) => {
        const p = data.product;
        setForm({
          name: p.name || '', description: p.description || '',
          shortDescription: p.shortDescription || '',
          category: p.category || '', brand: p.brand || '',
          price: String(p.price || ''), compareAtPrice: String(p.compareAtPrice || ''),
          stock: String(p.stock || ''), sku: p.sku || '',
          shippingClass: p.shippingClass || 'standard',
          shippingCost: String(p.shippingCost || '0'),
          metaTitle: p.metaTitle || '', metaDescription: p.metaDescription || '',
          isPublished: p.isPublished || false,
          tags: (p.tags || []).join(', '),
          specifications: p.specifications || [],
        });
        setImages(p.images || []);
      })
      .catch(() => toast.error('Product not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setCheck = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.checked }));

  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append('images', f));
    setUploading(true);
    try {
      const { data } = await uploadService.uploadProductImages(fd);
      setImages((prev) => [...prev, ...data.images].slice(0, 8));
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); }
  };

  const generateDescription = async () => {
    if (!form.name) return toast.error('Product name required');
    const features = aiFeatures.split('\n').filter((l) => l.trim());
    if (!features.length) return toast.error('Add at least one feature');
    setAiLoading(true);
    try {
      const { data } = await aiService.generateDescription({ productName: form.name, features, category: form.category });
      setForm((f) => ({ ...f, description: data.description }));
      toast.success('Description generated');
    } catch { toast.error('AI failed'); }
    finally { setAiLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : undefined,
        stock: Number(form.stock),
        shippingCost: Number(form.shippingCost || 0),
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        images,
      };
      await productService.update(id, payload);
      toast.success('Product updated');
      navigate('/vendor/products');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="animate-pulse space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="card h-32" />)}</div>;
  if (!form) return <div className="text-center py-12 text-gray-400">Product not found.</div>;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/vendor/products" className="btn-ghost p-2"><FiArrowLeft className="w-4 h-4" /></Link>
        <h1 className="text-xl font-bold text-gray-900">Edit Product</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Basic Information</h2>
          <div>
            <label className="label" htmlFor="name">Product Name *</label>
            <input id="name" type="text" value={form.name} onChange={set('name')} required className="input" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label mb-0">Description *</label>
              <div className="flex items-center gap-2">
                <input placeholder="Feature bullets (one per line)" value={aiFeatures}
                  onChange={(e) => setAiFeatures(e.target.value)}
                  className="input text-xs py-1 px-2 w-48" />
                <button type="button" onClick={generateDescription} disabled={aiLoading}
                  className="flex items-center gap-1 text-xs text-primary-600 font-medium hover:text-primary-800">
                  <FiZap className="w-3.5 h-3.5" /> {aiLoading ? 'Generating…' : 'AI Rewrite'}
                </button>
              </div>
            </div>
            <textarea rows={6} value={form.description} onChange={set('description')} required className="input resize-none" />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Category *</label>
              <select value={form.category} onChange={set('category')} className="input" required>
                <option value="">Select category</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Brand</label>
              <input type="text" value={form.brand} onChange={set('brand')} className="input" />
            </div>
          </div>

          <div>
            <label className="label">Tags (comma-separated)</label>
            <input type="text" value={form.tags} onChange={set('tags')} className="input" />
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Pricing & Inventory</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[['price','Price *','0.00'],['compareAtPrice','Compare-at','0.00'],['stock','Stock *','0']].map(([k, l, p]) => (
              <div key={k}>
                <label className="label">{l}</label>
                <input type="number" min="0" step={k === 'stock' ? '1' : '0.01'} value={form[k]}
                  onChange={set(k)} placeholder={p} required={k !== 'compareAtPrice'} className="input" />
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="label">SKU</label><input type="text" value={form.sku} onChange={set('sku')} className="input" /></div>
            <div>
              <label className="label">Shipping Class</label>
              <select value={form.shippingClass} onChange={set('shippingClass')} className="input">
                {['free','standard','express','heavy'].map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Images</h2>
          <div className="flex flex-wrap gap-3">
            {images.map((img, i) => (
              <div key={i} className="relative w-24 h-24">
                <img src={img.url} alt="" className="w-full h-full object-cover rounded-xl border border-gray-200" />
                <button type="button" onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                  <FiX className="w-3 h-3" />
                </button>
              </div>
            ))}
            {images.length < 8 && (
              <label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary-400 transition-colors">
                <FiUpload className="w-5 h-5 text-gray-400 mb-1" />
                <span className="text-xs text-gray-400">{uploading ? 'Uploading…' : 'Upload'}</span>
                <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            )}
          </div>
        </div>

        <div className="card p-5 flex items-center justify-between">
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input type="checkbox" className="sr-only" checked={form.isPublished} onChange={setCheck('isPublished')} />
              <div className={`w-10 h-5 rounded-full transition-colors ${form.isPublished ? 'bg-primary-600' : 'bg-gray-200'}`} />
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isPublished ? 'left-[22px]' : 'left-0.5'}`} />
            </div>
            <span className="text-sm font-medium text-gray-700">{form.isPublished ? 'Published' : 'Draft'}</span>
          </label>
          <button type="submit" disabled={saving} className="btn-primary gap-2">
            <FiSave className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
