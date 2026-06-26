import { Link } from 'react-router-dom';
import { FiHeart, FiShoppingCart, FiStar } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart } from '../../store/slices/cartSlice.js';
import { selectIsAuthenticated, selectUserRole } from '../../store/slices/authSlice.js';
import { userService } from '../../services/api.js';
import { formatPrice } from '../../utils/helpers.js';
import toast from 'react-hot-toast';

export default function ProductCard({ product }) {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const role = useSelector(selectUserRole);

  const isCustomer = !role || role === 'customer';

  const handleAddToCart = (e) => {
    e.preventDefault();
    dispatch(addToCart({ product, quantity: 1 }));
    toast.success('Added to cart');
  };

  const handleWishlist = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) return toast.error('Sign in to save items');
    try {
      await userService.toggleWishlist(product._id);
      toast.success('Wishlist updated');
    } catch {
      toast.error('Failed to update wishlist');
    }
  };

  const discount = product.compareAtPrice && product.compareAtPrice > product.price
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  const image = product.images?.[0]?.url || `https://placehold.co/400x400/f3f4f6/a821d4?text=${encodeURIComponent(product.name?.[0] || 'P')}`;

  return (
    <Link to={`/products/${product.slug}`} className="card-hover group flex flex-col overflow-hidden">
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <img
          src={image}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {discount > 0 && (
            <span className="badge bg-red-500 text-white font-semibold text-[10px]">-{discount}%</span>
          )}
          {product.stock === 0 && (
            <span className="badge bg-gray-800 text-white text-[10px]">Out of stock</span>
          )}
        </div>

        {/* Hover actions */}
        {isCustomer && (
          <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleWishlist}
              className="w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center text-gray-600 hover:text-red-500 transition-colors"
              aria-label="Add to wishlist"
            >
              <FiHeart className="w-4 h-4" />
            </button>
          </div>
        )}

        {isCustomer && product.stock > 0 && (
          <button
            onClick={handleAddToCart}
            className="absolute bottom-0 inset-x-0 bg-primary-600 text-white text-xs font-medium py-2.5 translate-y-full group-hover:translate-y-0 transition-transform duration-200 flex items-center justify-center gap-1.5"
          >
            <FiShoppingCart className="w-3.5 h-3.5" /> Add to Cart
          </button>
        )}
      </div>

      {/* Info */}
      <div className="p-3.5 flex flex-col flex-1">
        <p className="text-xs text-gray-400 mb-0.5 truncate">
          {product.vendor?.vendorInfo?.shopName || product.vendor?.name || 'Vendrix'}
        </p>
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1.5 leading-snug flex-1">
          {product.name}
        </h3>

        {/* Rating */}
        {product.numReviews > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <FiStar className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-xs font-medium text-gray-700">{product.rating?.toFixed(1)}</span>
            <span className="text-xs text-gray-400">({product.numReviews})</span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-center gap-2 mt-auto">
          <span className="text-base font-bold text-gray-900">{formatPrice(product.price)}</span>
          {discount > 0 && (
            <span className="text-xs text-gray-400 line-through">{formatPrice(product.compareAtPrice)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
