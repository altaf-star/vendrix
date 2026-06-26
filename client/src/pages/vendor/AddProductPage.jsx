import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiZap, FiUpload, FiX, FiArrowLeft, FiSave } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { productService, aiService, uploadService } from '../../services/api.js';
import { CATEGORIES } from '../../utils/helpers.js';

const SHIPPING_CLASSES = ['free', 'standard', 'express', 'heavy'];

export default function AddProductPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '', description: '', shortDescription: '',
    category: '', subcategory: '', brand: '',
    price: '', compareAtPrice: '', stock: '',
    sku: '', weight: '',
    shippingClass: 'standard', shippingCost: '0',
    metaTitle: '', metaDescription: '',
    isPublished: false,
    tags: '',
    specifications: [],
  });

  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // AI description generator
  const [aiFeatures, setAiFeatures] = useState('');
  const [aiTone, setAiTone] = useState('professional and engaging');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);

  // Specifications
  const [specKey, setSpecKey] = useState('');
  const [specVal, setSpecVal] = useState('');

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
      toast.success(`${data.images.length} image${data.images.length !== 1 ? 's' : ''} uploaded`);
    } catch { toast.error('Image upload failed'); }
    finally { setUploading(false); }
  };

  const removeImage = (idx) => setImages((prev) => prev.filter((_, i) => i !== idx));

  const generateDescription = async () => {
    if (!form.name) return toast.error('Enter a product name first');
    const features = aiFeatures.split('\n').filter((l) => l.trim());
    if (features.length === 0) return toast.error('Add at least one feature bullet');
    setAiLoading(true);
    try {
      const { data } = await aiService.generateDescription({
        productName: form.name,
        features,
        category: form.category,
        tone: aiTone,
      });
      setForm((f) => ({ ...f, description: data.description }));
      setAiPanelOpen(false);
      toast.success('Description generated!');
    } catch { toast.error('AI generation failed'); }
    finally { setAiLoading(false); }
  };

  const generateMeta = async () => {
    if (!form.name || !form.description) return toast.error('Add a name and description first');
    try {
      const { data } = await aiService.generateMeta({ productName: form.name, description: form.description, category: form.category });
      setForm((f) => ({ ...f, metaTitle: data.metaTitle, metaDescription: data.metaDescription }));
      toast.success('SEO tags generated');
    } catch { toast.error('Failed to generate meta tags'); }
  };

  const addSpec = () => {
    if (!specKey.trim() || !specVal.trim()) return;
    setForm((f) => ({ ...f, specifications: [...f.specifications, { key: specKey.trim(), value: specVal.trim() }] }));
    setSpecKey(''); setSpecVal('');
  };

  const removeSpec = (i) => setForm((f) => ({ ...f, specifications: f.specifications.filter((_, idx) => idx !== i) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.description || !form.category || !form.price || !form.stock) {
      return toast.error('Fill in all required fields');
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : undefined,
        stock: Number(form.stock),
        shippingCost: Number(form.shippingCost || 0),
        weight: form.weight ? Number(form.weight) : undefined,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        images,
      };
      await productService.create(payload);
      toast.success('Product created!');
      navigate('/vendor/products');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create product');
    } finally { setSaving(false); }
  };

  const Field = ({ id, label, required, hint, children }) => (
    <div>
      <label className="label" htmlFor={id}>
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/vendor/products" className="btn-ghost p-2"><FiArrowLeft className="w-4 h-4" /></Link>
        <h1 className="text-xl font-bold text-gray-900">Add New Product</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Basic Information</h2>

          <Field id="name" label="Product Name" required>
            <input id="name" type="text" value={form.name} onChange={set('name')}
              placeholder="e.g. Wireless Noise-Cancelling Headphones" className="input" required />
          </Field>

          {/* Description with AI generator */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label mb-0">Description <span className="text-red-500">*</span></label>
              <button type="button" onClick={() => setAiPanelOpen((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium">
                <FiZap className="w-3.5 h-3.5" /> AI Generate
              </button>
            </div>

            {aiPanelOpen && (
              <div className="mb-3 p-4 border border-primary-200 bg-primary-50 rounded-xl space-y-3">
                <p className="text-xs font-semibold text-primary-800 flex items-center gap-1.5">
                  <FiZap className="w-3.5 h-3.5" /> AI Description Generator
                </p>
                <div>
                  <label className="label text-xs">Feature Bullets (one per line)</label>
                  <textarea
                    rows={4} value={aiFeatures}
                    onChange={(e) => setAiFeatures(e.target.value)}
                    placeholder={"40-hour battery life\nActive noise cancellation\nFoldable design"}
                    className="input text-sm resize-none"
                  />
                </div>
                <div>
                  <label className="label text-xs">Tone</label>
                  <select value={aiTone} onChange={(e) => setAiTone(e.target.value)} className="input text-sm py-2">
                    <option value="professional and engaging">Professional & Engaging</option>
                    <option value="friendly and conversational">Friendly & Conversational</option>
                    <option value="luxury and premium">Luxury & Premium</option>
                    <option value="playful and fun">Playful & Fun</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={generateDescription} disabled={aiLoading} className="btn-primary btn-sm gap-1.5">
                    <FiZap className="w-3.5 h-3.5" /> {aiLoading ? 'Generating…' : 'Generate'}
                  </button>
                  <button type="button" onClick={() => setAiPanelOpen(false)} className="btn-secondary btn-sm">Cancel</button>
                </div>
              </div>
            )}

            <textarea
              id="description" rows={6} value={form.description}
              onChange={set('description')} required
              placeholder="Describe your product in detail…"
              className="input resize-none"
            />
          </div>

          <Field id="shortDescription" label="Short Description" hint="Shown below the product title (max 300 chars)">
            <textarea id="shortDescription" rows={2} maxLength={300} value={form.shortDescription}
              onChange={set('shortDescription')} placeholder="One-sentence product summary…" className="input resize-none" />
          </Field>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field id="category" label="Category" required>
              <select id="category" value={form.category} onChange={set('category')} className="input" required>
                <option value="">Select a category</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field id="brand" label="Brand">
              <input id="brand" type="text" value={form.brand} onChange={set('brand')} placeholder="e.g. Sony" className="input" />
            </Field>
          </div>

          <Field id="tags" label="Tags" hint="Comma-separated keywords to aid search (e.g. wireless, headphones, noise-cancelling)">
            <input id="tags" type="text" value={form.tags} onChange={set('tags')} placeholder="wireless, audio, gift" className="input" />
          </Field>
        </div>

        {/* Pricing & Inventory */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Pricing & Inventory</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field id="price" label="Price" required>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input id="price" type="number" min="0" step="0.01" value={form.price}
                  onChange={set('price')} required placeholder="0.00" className="input pl-7" />
              </div>
            </Field>
            <Field id="compareAtPrice" label="Compare-at Price" hint="Shows as strikethrough">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input id="compareAtPrice" type="number" min="0" step="0.01" value={form.compareAtPrice}
                  onChange={set('compareAtPrice')} placeholder="0.00" className="input pl-7" />
              </div>
            </Field>
            <Field id="stock" label="Stock Quantity" required>
              <input id="stock" type="number" min="0" value={form.stock}
                onChange={set('stock')} required placeholder="0" className="input" />
            </Field>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field id="sku" label="SKU">
              <input id="sku" type="text" value={form.sku} onChange={set('sku')} placeholder="PROD-001" className="input" />
            </Field>
            <Field id="shippingClass" label="Shipping Class">
              <select id="shippingClass" value={form.shippingClass} onChange={set('shippingClass')} className="input">
                {SHIPPING_CLASSES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </Field>
            <Field id="shippingCost" label="Shipping Cost ($)">
              <input id="shippingCost" type="number" min="0" step="0.01" value={form.shippingCost} onChange={set('shippingCost')} className="input" />
            </Field>
          </div>
        </div>

        {/* Images */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Product Images</h2>
          <div className="flex flex-wrap gap-3">
            {images.map((img, i) => (
              <div key={i} className="relative w-24 h-24">
                <img src={img.url} alt={`Product ${i}`} className="w-full h-full object-cover rounded-xl border border-gray-200" />
                <button type="button" onClick={() => removeImage(i)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                  <FiX className="w-3 h-3" />
                </button>
                {i === 0 && <span className="absolute bottom-1 left-1 text-[9px] bg-black/60 text-white px-1 rounded">Main</span>}
              </div>
            ))}
            {images.length < 8 && (
              <label className={`w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                <FiUpload className="w-5 h-5 text-gray-400 mb-1" />
                <span className="text-xs text-gray-400">{uploading ? 'Uploading…' : 'Upload'}</span>
                <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            )}
          </div>
          <p className="text-xs text-gray-400">Up to 8 images. First image is the main product photo.</p>
        </div>

        {/* Specifications */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Specifications</h2>
          {form.specifications.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 flex-1">{s.key}</span>
              <span className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 flex-1">{s.value}</span>
              <button type="button" onClick={() => removeSpec(i)} className="text-gray-400 hover:text-red-500 p-1">
                <FiX className="w-4 h-4" />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input placeholder="Key (e.g. Color)" value={specKey} onChange={(e) => setSpecKey(e.target.value)} className="input text-sm py-2 flex-1" />
            <input placeholder="Value (e.g. Black)" value={specVal} onChange={(e) => setSpecVal(e.target.value)} className="input text-sm py-2 flex-1" />
            <button type="button" onClick={addSpec} className="btn-secondary btn-sm shrink-0">Add</button>
          </div>
        </div>

        {/* SEO */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">SEO</h2>
            <button type="button" onClick={generateMeta} className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium">
              <FiZap className="w-3.5 h-3.5" /> AI Generate
            </button>
          </div>
          <Field id="metaTitle" label="Meta Title" hint={`${form.metaTitle.length}/60 characters`}>
            <input id="metaTitle" type="text" maxLength={60} value={form.metaTitle} onChange={set('metaTitle')} placeholder="Optimised page title for search engines" className="input" />
          </Field>
          <Field id="metaDescription" label="Meta Description" hint={`${form.metaDescription.length}/155 characters`}>
            <textarea id="metaDescription" rows={2} maxLength={155} value={form.metaDescription}
              onChange={set('metaDescription')} placeholder="Brief description shown in search results…" className="input resize-none" />
          </Field>
        </div>

        {/* Publish toggle + submit */}
        <div className="card p-5 flex items-center justify-between">
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input type="checkbox" className="sr-only" checked={form.isPublished} onChange={setCheck('isPublished')} />
              <div className={`w-10 h-5 rounded-full transition-colors ${form.isPublished ? 'bg-primary-600' : 'bg-gray-200'}`} />
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isPublished ? 'left-[22px]' : 'left-0.5'}`} />
            </div>
            <span className="text-sm font-medium text-gray-700">
              {form.isPublished ? 'Published — visible to customers' : 'Draft — only visible to you'}
            </span>
          </label>
          <button type="submit" disabled={saving} className="btn-primary gap-2">
            <FiSave className="w-4 h-4" /> {saving ? 'Creating…' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  );
}
