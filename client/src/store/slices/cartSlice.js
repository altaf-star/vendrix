import { createSlice } from '@reduxjs/toolkit';

const loadCartFromStorage = () => {
  try {
    const raw = localStorage.getItem('vendrix_cart');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveCartToStorage = (items) => {
  localStorage.setItem('vendrix_cart', JSON.stringify(items));
};

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    items: loadCartFromStorage(),
    isOpen: false,
  },
  reducers: {
    addToCart(state, action) {
      const { product, quantity = 1 } = action.payload;
      const existing = state.items.find((i) => i.product._id === product._id);

      if (existing) {
        existing.quantity = Math.min(existing.quantity + quantity, product.stock);
      } else {
        state.items.push({ product, quantity });
      }
      saveCartToStorage(state.items);
    },

    removeFromCart(state, action) {
      state.items = state.items.filter((i) => i.product._id !== action.payload);
      saveCartToStorage(state.items);
    },

    updateQuantity(state, action) {
      const { productId, quantity } = action.payload;
      const item = state.items.find((i) => i.product._id === productId);
      if (item) {
        if (quantity <= 0) {
          state.items = state.items.filter((i) => i.product._id !== productId);
        } else {
          item.quantity = Math.min(quantity, item.product.stock);
        }
      }
      saveCartToStorage(state.items);
    },

    clearCart(state) {
      state.items = [];
      localStorage.removeItem('vendrix_cart');
    },

    toggleCart(state) {
      state.isOpen = !state.isOpen;
    },

    openCart(state) {
      state.isOpen = true;
    },

    closeCart(state) {
      state.isOpen = false;
    },
  },
});

export const {
  addToCart, removeFromCart, updateQuantity,
  clearCart, toggleCart, openCart, closeCart,
} = cartSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────
export const selectCartItems = (state) => state.cart.items;
export const selectCartOpen = (state) => state.cart.isOpen;
export const selectCartCount = (state) =>
  state.cart.items.reduce((sum, i) => sum + i.quantity, 0);
export const selectCartSubtotal = (state) =>
  state.cart.items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

export default cartSlice.reducer;
