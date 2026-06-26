import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMe } from './store/slices/authSlice.js';
import { selectInitializing } from './store/slices/authSlice.js';
import { ProtectedRoute, GuestRoute } from './components/common/ProtectedRoute.jsx';
import MainLayout from './components/layout/MainLayout.jsx';
import DashboardLayout from './components/layout/DashboardLayout.jsx';
import SplashScreen from './components/common/SplashScreen.jsx';

// ─── Lazy-loaded pages ────────────────────────────────────────────────────────
const HomePage          = lazy(() => import('./pages/customer/HomePage.jsx'));
const ProductsPage      = lazy(() => import('./pages/customer/ProductsPage.jsx'));
const ProductDetailPage = lazy(() => import('./pages/customer/ProductDetailPage.jsx'));
const CartPage          = lazy(() => import('./pages/customer/CartPage.jsx'));
const CheckoutPage      = lazy(() => import('./pages/customer/CheckoutPage.jsx'));
const OrdersPage        = lazy(() => import('./pages/customer/OrdersPage.jsx'));
const OrderDetailPage   = lazy(() => import('./pages/customer/OrderDetailPage.jsx'));
const WishlistPage      = lazy(() => import('./pages/customer/WishlistPage.jsx'));
const ProfilePage       = lazy(() => import('./pages/customer/ProfilePage.jsx'));

const LoginPage         = lazy(() => import('./pages/auth/LoginPage.jsx'));
const RegisterPage      = lazy(() => import('./pages/auth/RegisterPage.jsx'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage.jsx'));
const ResetPasswordPage  = lazy(() => import('./pages/auth/ResetPasswordPage.jsx'));

const VendorDashboard   = lazy(() => import('./pages/vendor/VendorDashboard.jsx'));
const VendorProducts    = lazy(() => import('./pages/vendor/VendorProducts.jsx'));
const VendorOrders      = lazy(() => import('./pages/vendor/VendorOrders.jsx'));
const VendorEarnings    = lazy(() => import('./pages/vendor/VendorEarnings.jsx'));
const VendorProfile     = lazy(() => import('./pages/vendor/VendorProfile.jsx'));
const AddProductPage    = lazy(() => import('./pages/vendor/AddProductPage.jsx'));
const EditProductPage   = lazy(() => import('./pages/vendor/EditProductPage.jsx'));
const VendorPending     = lazy(() => import('./pages/vendor/VendorPending.jsx'));

const AdminDashboard    = lazy(() => import('./pages/admin/AdminDashboard.jsx'));
const AdminUsers        = lazy(() => import('./pages/admin/AdminUsers.jsx'));
const AdminVendors      = lazy(() => import('./pages/admin/AdminVendors.jsx'));
const AdminProducts     = lazy(() => import('./pages/admin/AdminProducts.jsx'));
const AdminOrders       = lazy(() => import('./pages/admin/AdminOrders.jsx'));

const NotFoundPage      = lazy(() => import('./pages/NotFoundPage.jsx'));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
  </div>
);

export default function App() {
  const dispatch = useDispatch();
  const initializing = useSelector(selectInitializing);
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    dispatch(fetchMe());
  }, [dispatch]);

  // Keep splash visible until both auth check AND minimum display time are done
  const showSplash = !splashDone || initializing;

  return (
    <>
      {showSplash && <SplashScreen onDone={() => setSplashDone(true)} />}
      <Suspense fallback={<PageLoader />}>
        <Routes>
        {/* ── Auth (guest-only) ───────────────────────────────────────────── */}
        <Route path="/login"          element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register"       element={<GuestRoute><RegisterPage /></GuestRoute>} />
        <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
        <Route path="/reset-password/:token" element={<GuestRoute><ResetPasswordPage /></GuestRoute>} />

        {/* ── Public storefront ───────────────────────────────────────────── */}
        <Route element={<MainLayout />}>
          <Route index               element={<HomePage />} />
          <Route path="products"     element={<ProductsPage />} />
          <Route path="products/:slug" element={<ProductDetailPage />} />
          <Route path="cart"         element={<CartPage />} />

          {/* Customer-protected */}
          <Route path="checkout"     element={<ProtectedRoute allowedRoles={['customer']}><CheckoutPage /></ProtectedRoute>} />
          <Route path="orders"       element={<ProtectedRoute allowedRoles={['customer']}><OrdersPage /></ProtectedRoute>} />
          <Route path="orders/:id"   element={<ProtectedRoute allowedRoles={['customer']}><OrderDetailPage /></ProtectedRoute>} />
          <Route path="wishlist"     element={<ProtectedRoute allowedRoles={['customer']}><WishlistPage /></ProtectedRoute>} />
          <Route path="profile"      element={<ProtectedRoute allowedRoles={['customer']}><ProfilePage /></ProtectedRoute>} />
        </Route>

        {/* ── Vendor panel ────────────────────────────────────────────────── */}
        <Route path="/vendor/pending" element={<VendorPending />} />
        <Route
          path="/vendor"
          element={<ProtectedRoute allowedRoles={['vendor']}><DashboardLayout role="vendor" /></ProtectedRoute>}
        >
          <Route index               element={<VendorDashboard />} />
          <Route path="products"     element={<VendorProducts />} />
          <Route path="products/new" element={<AddProductPage />} />
          <Route path="products/:id/edit" element={<EditProductPage />} />
          <Route path="orders"       element={<VendorOrders />} />
          <Route path="earnings"     element={<VendorEarnings />} />
          <Route path="profile"      element={<VendorProfile />} />
        </Route>

        {/* ── Admin panel ─────────────────────────────────────────────────── */}
        <Route
          path="/admin"
          element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout role="admin" /></ProtectedRoute>}
        >
          <Route index               element={<AdminDashboard />} />
          <Route path="users"        element={<AdminUsers />} />
          <Route path="vendors"      element={<AdminVendors />} />
          <Route path="products"     element={<AdminProducts />} />
          <Route path="orders"       element={<AdminOrders />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  );
}
