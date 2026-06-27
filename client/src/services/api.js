import axios from 'axios';

// Injected after store creation to avoid circular dependency:
// store/index.js → authSlice.js → api.js → store/index.js
let _store;
export const injectStore = (s) => { _store = s; };

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,       // send refresh token cookie
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor — attach access token ────────────────────────────────
api.interceptors.request.use((config) => {
  const token = _store?.getState().auth.accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Response interceptor — transparent token refresh ────────────────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => (error ? prom.reject(error) : prom.resolve(token)));
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Only attempt refresh on 401 that hasn't already been retried
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    // Don't refresh on auth endpoints themselves
    if (original.url?.includes('/auth/login') || original.url?.includes('/auth/refresh')) {
      _store?.dispatch({ type: 'auth/logout' });
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        })
        .catch(Promise.reject);
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post(
        `${BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true }
      );
      const { accessToken, user } = data;
      _store?.dispatch({ type: 'auth/setCredentials', payload: { accessToken, user } });
      processQueue(null, accessToken);
      original.headers.Authorization = `Bearer ${accessToken}`;
      return api(original);
    } catch (refreshError) {
      processQueue(refreshError, null);
      _store?.dispatch({ type: 'auth/logout' });
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// ─── Named service modules ────────────────────────────────────────────────────

export const authService = {
  register: (data)              => api.post('/auth/register', data),
  login: (data)                 => api.post('/auth/login', data),
  logout: ()                    => api.post('/auth/logout'),
  getMe: ()                     => api.get('/auth/me'),
  changePassword: (data)        => api.put('/auth/change-password', data),
  forgotPassword: (email)       => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, data)  => api.post(`/auth/reset-password/${token}`, data),
  verifyEmail: (token)          => api.get(`/auth/verify-email/${token}`),
  resendVerification: ()        => api.post('/auth/resend-verification'),
  resendVerificationByEmail: (email) => api.post('/auth/resend-verification-by-email', { email }),
};

export const productService = {
  getProducts: (params)         => api.get('/products', { params }),
  getFeatured: ()               => api.get('/products/featured'),
  getCategories: ()             => api.get('/products/categories'),
  getBySlug: (slug)             => api.get(`/products/${slug}`),
  getById: (id)                 => api.get(`/products/id/${id}`),
  create: (data)                => api.post('/products', data),
  update: (id, data)            => api.put(`/products/${id}`, data),
  delete: (id)                  => api.delete(`/products/${id}`),
  getVendorProducts: (params)   => api.get('/products/vendor/mine', { params }),
  addReview: (id, data)         => api.post(`/products/${id}/reviews`, data),
  deleteReview: (id, rid)       => api.delete(`/products/${id}/reviews/${rid}`),
  markHelpful: (id, rid)        => api.put(`/products/${id}/reviews/${rid}/helpful`),
};

export const orderService = {
  create: (data)                => api.post('/orders', data),
  getAll: (params)              => api.get('/orders', { params }),
  getById: (id)                 => api.get(`/orders/${id}`),
  cancel: (id, reason)          => api.patch(`/orders/${id}/cancel`, { reason }),
  getVendorOrders: (params)     => api.get('/orders/vendor/mine', { params }),
  updateVendorStatus: (id, data)=> api.patch(`/orders/${id}/vendor-status`, data),
  getStats: ()                  => api.get('/orders/admin/stats'),
};

export const paymentService = {
  getConfig: ()                 => api.get('/payments/config'),
  createIntent: (orderId)       => api.post('/payments/create-intent', { orderId }),
};

export const userService = {
  getProfile: ()                => api.get('/users/profile'),
  updateProfile: (data)         => api.put('/users/profile', data),
  addAddress: (data)            => api.post('/users/addresses', data),
  updateAddress: (id, data)     => api.put(`/users/addresses/${id}`, data),
  deleteAddress: (id)           => api.delete(`/users/addresses/${id}`),
  getWishlist: ()               => api.get('/users/wishlist'),
  toggleWishlist: (productId)   => api.post(`/users/wishlist/${productId}`),
};

export const vendorService = {
  getDashboard: ()              => api.get('/vendor/dashboard'),
  getProfile: ()                => api.get('/vendor/profile'),
  updateProfile: (data)         => api.put('/vendor/profile', data),
  getEarnings: (params)         => api.get('/vendor/earnings', { params }),
  getPublicProfile: (id)        => api.get(`/vendor/public/${id}`),
};

export const adminService = {
  getDashboard: ()              => api.get('/admin/dashboard'),
  getUsers: (params)            => api.get('/admin/users', { params }),
  toggleUserActive: (id)        => api.patch(`/admin/users/${id}/toggle-active`),
  deleteUser: (id)              => api.delete(`/admin/users/${id}`),
  getPendingVendors: ()         => api.get('/admin/vendors/pending'),
  approveVendor: (id, note)     => api.patch(`/admin/vendors/${id}/approve`, { note }),
  rejectVendor: (id, note)      => api.patch(`/admin/vendors/${id}/reject`, { note }),
  getAllProducts: (params)       => api.get('/admin/products', { params }),
  approveProduct: (id)          => api.patch(`/admin/products/${id}/approve`),
  rejectProduct: (id)           => api.patch(`/admin/products/${id}/reject`),
  deleteProduct: (id)           => api.delete(`/admin/products/${id}`),
  getAllOrders: (params)         => api.get('/admin/orders', { params }),
  updateOrderStatus: (id, status) => api.patch(`/admin/orders/${id}/status`, { status }),
};

export const aiService = {
  search: (query)               => api.post('/ai/search', { query }),
  getReviewSummary: (productId) => api.get(`/ai/review-summary/${productId}`),
  generateDescription: (data)   => api.post('/ai/generate-description', data),
  generateMeta: (data)          => api.post('/ai/generate-meta', data),
  chat: (messages)              => api.post('/ai/chat', { messages }),
};

export const uploadService = {
  uploadProductImages: (formData) =>
    api.post('/upload/products', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  uploadAvatar: (formData) =>
    api.post('/upload/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  uploadShopAssets: (formData) =>
    api.post('/upload/shop', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteImage: (publicId) =>
    api.delete('/upload', { data: { publicId } }),
};

export default api;
