import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';

// Shows a full-page spinner while the session is restoring
const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
  </div>
);

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, initializing, role } = useAuth();
  const location = useLocation();

  if (initializing) return <Spinner />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    const redirect = role === 'admin' ? '/admin' : role === 'vendor' ? '/vendor' : '/';
    return <Navigate to={redirect} replace />;
  }

  return children;
};

// Redirect already-logged-in users away from auth pages
export const GuestRoute = ({ children }) => {
  const { isAuthenticated, initializing, role } = useAuth();

  if (initializing) return <Spinner />;

  if (isAuthenticated) {
    const redirect = role === 'admin' ? '/admin' : role === 'vendor' ? '/vendor' : '/';
    return <Navigate to={redirect} replace />;
  }

  return children;
};
