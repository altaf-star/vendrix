import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  selectCurrentUser, selectIsAuthenticated, selectAuthLoading,
  selectAuthError, selectUserRole, selectInitializing,
  loginUser, registerUser, logoutUser, clearError,
} from '../store/slices/authSlice.js';
import { clearCart } from '../store/slices/cartSlice.js';

export const useAuth = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const user            = useSelector(selectCurrentUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const loading         = useSelector(selectAuthLoading);
  const error           = useSelector(selectAuthError);
  const role            = useSelector(selectUserRole);
  const initializing    = useSelector(selectInitializing);

  const login = async (credentials) => {
    const result = await dispatch(loginUser(credentials));
    if (loginUser.fulfilled.match(result)) {
      toast.success(`Welcome back, ${result.payload.user.name.split(' ')[0]}!`);
      const { role } = result.payload.user;
      navigate(role === 'admin' ? '/admin' : role === 'vendor' ? '/vendor' : '/');
      return true;
    }
    return false;
  };

  const register = async (data) => {
    const result = await dispatch(registerUser(data));
    if (registerUser.fulfilled.match(result)) {
      const { role } = result.payload.user;
      if (role === 'vendor') {
        toast.success('Application submitted! We\'ll review your shop shortly.');
        navigate('/vendor/pending');
      } else {
        toast.success('Account created — welcome to Vendrix!');
        navigate('/');
      }
      return true;
    }
    return false;
  };

  const logout = async () => {
    await dispatch(logoutUser());
    dispatch(clearCart());
    navigate('/login');
    toast.success('Logged out');
  };

  const clearAuthError = () => dispatch(clearError());

  return {
    user, isAuthenticated, loading, error, role, initializing,
    login, register, logout, clearAuthError,
    isAdmin: role === 'admin',
    isVendor: role === 'vendor',
    isCustomer: role === 'customer',
    isApprovedVendor: role === 'vendor' && user?.vendorInfo?.applicationStatus === 'approved',
  };
};
