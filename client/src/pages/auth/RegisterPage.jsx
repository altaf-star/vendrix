import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiShoppingBag, FiShoppingCart } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth.js';

const ROLES = [
  {
    id: 'customer',
    label: 'Customer',
    desc: 'Browse and buy from thousands of vendors',
    icon: FiShoppingCart,
  },
  {
    id: 'vendor',
    label: 'Vendor',
    desc: 'Sell your products to a global audience',
    icon: FiShoppingBag,
  },
];

export default function RegisterPage() {
  const { register, loading, error, clearAuthError } = useAuth();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState(1); // 1 = role select, 2 = form, 3 = check email
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [role, setRole] = useState(searchParams.get('role') || 'customer');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    shopName: '', shopDescription: '', businessEmail: '', businessPhone: '',
  });

  useEffect(() => { if (error) clearAuthError(); }, [form, role]);

  // Skip role selection if URL param was provided
  useEffect(() => {
    if (searchParams.get('role')) setStep(2);
  }, []);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    else if (form.name.trim().length < 2) errs.name = 'Name must be at least 2 characters';

    if (!form.email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email';

    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 8) errs.password = 'Must be at least 8 characters';
    else if (!/[A-Z]/.test(form.password)) errs.password = 'Must contain an uppercase letter';
    else if (!/\d/.test(form.password)) errs.password = 'Must contain a number';

    if (role === 'vendor' && !form.shopName.trim()) {
      errs.shopName = 'Shop name is required';
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = { name: form.name, email: form.email, password: form.password, role };
    if (role === 'vendor') {
      payload.shopName = form.shopName;
      payload.shopDescription = form.shopDescription;
      payload.businessEmail = form.businessEmail || form.email;
      payload.businessPhone = form.businessPhone;
    }
    const result = await register(payload);
    if (result?.success) {
      setRegisteredEmail(form.email);
      setStep(3);
    }
    // vendor case: useAuth handles navigation to /vendor/pending
  };

  if (step === 3) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
          <p className="text-gray-500 mb-1">We sent a verification link to</p>
          <p className="font-semibold text-gray-900 mb-6">{registeredEmail}</p>
          <p className="text-sm text-gray-400">Click the link in the email to activate your account. Check your spam folder if you don't see it.</p>
          <Link to="/login" className="btn-ghost btn-sm mt-6 inline-block">Back to Login</Link>
        </div>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-6">
              <img src="/vendrix-logo.jpg" alt="Vendrix" className="h-9 w-auto rounded-xl" />
              <span className="text-xl font-bold text-gray-900">Vendrix</span>
            </Link>
            <h2 className="text-2xl font-bold text-gray-900">Join Vendrix</h2>
            <p className="text-gray-500 mt-1 text-sm">How will you be using Vendrix?</p>
          </div>

          <div className="space-y-3">
            {ROLES.map(({ id, label, desc, icon: Icon }) => (
              <button
                key={id}
                onClick={() => { setRole(id); setStep(2); }}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all hover:border-primary-400 hover:bg-primary-50 ${
                  role === id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-white'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  id === 'vendor' ? 'bg-primary-100' : 'bg-gray-100'
                }`}>
                  <Icon className={`w-6 h-6 ${id === 'vendor' ? 'text-primary-600' : 'text-gray-600'}`} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{label}</p>
                  <p className="text-sm text-gray-500">{desc}</p>
                </div>
              </button>
            ))}
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Branding panel */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-primary-600 to-primary-900 flex-col justify-center px-16">
        <div className="flex items-center gap-3 mb-8">
          <img src="/vendrix-logo.jpg" alt="Vendrix" className="h-10 w-auto rounded-xl" />
          <span className="text-white font-bold text-2xl">Vendrix</span>
        </div>
        {role === 'vendor' ? (
          <>
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">Start selling today</h1>
            <p className="text-primary-200 text-lg">
              Join thousands of vendors. Use AI tools to write product descriptions, get order insights, and grow your business.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">Shop smarter</h1>
            <p className="text-primary-200 text-lg">
              Use natural language to find exactly what you're looking for. AI-powered search that actually understands you.
            </p>
          </>
        )}
      </div>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <img src="/vendrix-logo.jpg" alt="Vendrix" className="h-8 w-auto rounded-lg" />
            <span className="text-xl font-bold text-gray-900">Vendrix</span>
          </div>

          <div className="flex items-center gap-2 mb-6">
            <button onClick={() => setStep(1)} className="text-gray-400 hover:text-gray-700 text-sm">
              ← Back
            </button>
            <span className="text-sm text-gray-400">|</span>
            <span className={`text-sm font-medium ${role === 'vendor' ? 'text-primary-600' : 'text-gray-700'}`}>
              {role === 'vendor' ? 'Vendor Account' : 'Customer Account'}
            </span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-6">Create your account</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Basic info */}
            <div>
              <label className="label" htmlFor="name">Full Name</label>
              <div className="relative">
                <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  id="name" type="text" autoComplete="name"
                  value={form.name} onChange={set('name')}
                  placeholder="John Doe"
                  className={`input pl-9 ${fieldErrors.name ? 'input-error' : ''}`}
                />
              </div>
              {fieldErrors.name && <p className="error-msg">{fieldErrors.name}</p>}
            </div>

            <div>
              <label className="label" htmlFor="email">Email Address</label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  id="email" type="email" autoComplete="email"
                  value={form.email} onChange={set('email')}
                  placeholder="you@example.com"
                  className={`input pl-9 ${fieldErrors.email ? 'input-error' : ''}`}
                />
              </div>
              {fieldErrors.email && <p className="error-msg">{fieldErrors.email}</p>}
            </div>

            <div>
              <label className="label" htmlFor="password">Password</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  id="password" type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={form.password} onChange={set('password')}
                  placeholder="Min. 8 chars, 1 uppercase, 1 number"
                  className={`input pl-9 pr-10 ${fieldErrors.password ? 'input-error' : ''}`}
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && <p className="error-msg">{fieldErrors.password}</p>}
            </div>

            {/* Vendor-only fields */}
            {role === 'vendor' && (
              <div className="border-t border-gray-100 pt-4 space-y-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Shop Details</p>

                <div>
                  <label className="label" htmlFor="shopName">Shop Name <span className="text-red-500">*</span></label>
                  <input
                    id="shopName" type="text"
                    value={form.shopName} onChange={set('shopName')}
                    placeholder="My Awesome Shop"
                    className={`input ${fieldErrors.shopName ? 'input-error' : ''}`}
                  />
                  {fieldErrors.shopName && <p className="error-msg">{fieldErrors.shopName}</p>}
                </div>

                <div>
                  <label className="label" htmlFor="shopDescription">Shop Description <span className="text-gray-400">(optional)</span></label>
                  <textarea
                    id="shopDescription"
                    value={form.shopDescription} onChange={set('shopDescription')}
                    rows={3}
                    placeholder="Tell customers what you sell…"
                    className="input resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label" htmlFor="businessEmail">Business Email</label>
                    <input
                      id="businessEmail" type="email"
                      value={form.businessEmail} onChange={set('businessEmail')}
                      placeholder="shop@example.com"
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="businessPhone">Phone</label>
                    <input
                      id="businessPhone" type="tel"
                      value={form.businessPhone} onChange={set('businessPhone')}
                      placeholder="+1 555 000 0000"
                      className="input"
                    />
                  </div>
                </div>

                <p className="text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  Vendor applications are reviewed within 24 hours. You'll be notified via email once approved.
                </p>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary btn-lg w-full mt-2">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account…
                </span>
              ) : role === 'vendor' ? 'Submit Application' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
