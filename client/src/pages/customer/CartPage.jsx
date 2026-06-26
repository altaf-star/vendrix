import { Link, useNavigate } from 'react-router-dom';
import { FiTrash2, FiShoppingBag, FiArrowRight } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectCartItems, selectCartSubtotal,
  removeFromCart, updateQuantity, clearCart,
} from '../../store/slices/cartSlice.js';
import { selectIsAuthenticated } from '../../store/slices/authSlice.js';
import { formatPrice } from '../../utils/helpers.js';

export default function CartPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const items = useSelector(selectCartItems);
  const subtotal = useSelector(selectCartSubtotal);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  const shippingFee = subtotal >= 5000 ? 0 : 250;
  const total = subtotal + shippingFee;

  const handleCheckout = () => {
    if (!isAuthenticated) return navigate('/login', { state: { from: { pathname: '/checkout' } } });
    navigate('/checkout');
  };

  if (items.length === 0) {
    return (
      <div className="page-container py-20 text-center">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <FiShoppingBag className="w-10 h-10 text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-8">Browse products and add items to get started</p>
        <Link to="/products" className="btn-primary btn-lg">Browse Products</Link>
      </div>
    );
  }

  return (
    <div className="page-container py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">
        Shopping Cart <span className="text-gray-400 font-normal text-lg">({items.length} item{items.length !== 1 ? 's' : ''})</span>
      </h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map(({ product, quantity }) => {
            const image = product.images?.[0]?.url || `https://placehold.co/100x100/f3f4f6/a821d4?text=${encodeURIComponent(product.name[0])}`;
            return (
              <div key={product._id} className="card p-4 flex gap-4">
                <Link to={`/products/${product.slug}`} className="shrink-0">
                  <img src={image} alt={product.name} className="w-24 h-24 rounded-xl object-cover bg-gray-100" />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/products/${product.slug}`} className="text-sm font-semibold text-gray-900 hover:text-primary-600 line-clamp-2 leading-snug">
                    {product.name}
                  </Link>
                  <p className="text-xs text-gray-400 mt-0.5 mb-3">{product.vendor?.vendorInfo?.shopName}</p>

                  <div className="flex items-center justify-between">
                    {/* Qty control */}
                    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => dispatch(updateQuantity({ productId: product._id, quantity: quantity - 1 }))}
                        className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-50 text-sm"
                      >−</button>
                      <span className="w-8 text-center text-sm font-medium">{quantity}</span>
                      <button
                        onClick={() => dispatch(updateQuantity({ productId: product._id, quantity: quantity + 1 }))}
                        disabled={quantity >= product.stock}
                        className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-50 text-sm disabled:opacity-40"
                      >+</button>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="font-bold text-gray-900">{formatPrice(product.price * quantity)}</span>
                      <button
                        onClick={() => dispatch(removeFromCart(product._id))}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                        aria-label="Remove item"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <button
            onClick={() => dispatch(clearCart())}
            className="text-sm text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1.5 mt-2"
          >
            <FiTrash2 className="w-3.5 h-3.5" /> Clear cart
          </button>
        </div>

        {/* Order summary */}
        <div>
          <div className="card p-6 sticky top-24">
            <h2 className="font-bold text-gray-900 text-lg mb-5">Order Summary</h2>
            <div className="space-y-3 mb-5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shipping</span>
                <span className={shippingFee === 0 ? 'text-green-600 font-medium' : 'font-medium'}>
                  {shippingFee === 0 ? 'Free' : formatPrice(shippingFee)}
                </span>
              </div>
              {subtotal < 5000 && (
                <p className="text-xs text-gray-400">Free shipping on orders over Rs 5,000</p>
              )}
              <div className="border-t border-gray-100 pt-3 flex justify-between">
                <span className="font-bold text-gray-900">Total</span>
                <span className="font-bold text-gray-900 text-lg">{formatPrice(total)}</span>
              </div>
            </div>

            <button onClick={handleCheckout} className="btn-primary btn-lg w-full gap-2">
              Proceed to Checkout <FiArrowRight className="w-4 h-4" />
            </button>

            <Link to="/products" className="btn-ghost btn-sm w-full mt-3 justify-center">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
