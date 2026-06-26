import { Link } from 'react-router-dom';
import { FiClock, FiArrowRight } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth.js';

export default function VendorPending() {
  const { user, logout } = useAuth();
  const status = user?.vendorInfo?.applicationStatus;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="card p-10 w-full max-w-md text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <FiClock className="w-8 h-8 text-amber-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {status === 'rejected' ? 'Application Rejected' : 'Application Under Review'}
        </h2>
        <p className="text-gray-500 text-sm mb-6 leading-relaxed">
          {status === 'rejected'
            ? `Your vendor application was not approved. ${user?.vendorInfo?.applicationNote || 'Please contact support for details.'}`
            : "We're reviewing your shop application. This usually takes less than 24 hours. You'll receive an email once approved."}
        </p>
        <div className="space-y-3">
          <Link to="/" className="btn-primary w-full flex items-center justify-center gap-2">
            Browse Products <FiArrowRight className="w-4 h-4" />
          </Link>
          <button onClick={logout} className="btn-secondary w-full">Sign Out</button>
        </div>
      </div>
    </div>
  );
}
