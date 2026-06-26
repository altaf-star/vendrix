import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { FiLock, FiEye, FiEyeOff, FiArrowLeft } from 'react-icons/fi';
import { authService } from '../../services/api.js';
import { getErrorMessage } from '../../utils/helpers.js';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ newPassword: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (form.newPassword.length < 8) errs.newPassword = 'Must be at least 8 characters';
    else if (!/[A-Z]/.test(form.newPassword)) errs.newPassword = 'Must contain an uppercase letter';
    else if (!/\d/.test(form.newPassword)) errs.newPassword = 'Must contain a number';
    if (form.newPassword !== form.confirm) errs.confirm = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await authService.resetPassword(token, { newPassword: form.newPassword });
      toast.success('Password reset — please sign in');
      navigate('/login');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="card p-8 w-full max-w-md">
        <Link to="/login" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-6">
          <FiArrowLeft className="w-4 h-4" /> Back to Sign In
        </Link>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Set new password</h2>
        <p className="text-gray-500 text-sm mb-6">Choose a strong password for your account.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="newPassword">New Password</label>
            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                id="newPassword" type={showPw ? 'text' : 'password'}
                value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                placeholder="Min. 8 chars, 1 uppercase, 1 number"
                className={`input pl-9 pr-10 ${errors.newPassword ? 'input-error' : ''}`}
              />
              <button type="button" onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
              </button>
            </div>
            {errors.newPassword && <p className="error-msg">{errors.newPassword}</p>}
          </div>

          <div>
            <label className="label" htmlFor="confirm">Confirm Password</label>
            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                id="confirm" type={showPw ? 'text' : 'password'}
                value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                placeholder="Repeat your new password"
                className={`input pl-9 ${errors.confirm ? 'input-error' : ''}`}
              />
            </div>
            {errors.confirm && <p className="error-msg">{errors.confirm}</p>}
          </div>

          <button type="submit" disabled={loading} className="btn-primary btn-lg w-full">
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Resetting…
              </span>
            ) : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
