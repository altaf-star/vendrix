import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FiShoppingCart, FiHeart, FiShare2, FiZap,
  FiStar, FiChevronLeft, FiChevronRight, FiCheck,
} from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { productService, aiService, userService } from '../../services/api.js';
import { addToCart } from '../../store/slices/cartSlice.js';
import { selectIsAuthenticated, selectUserRole } from '../../store/slices/authSlice.js';
import StarRating from '../../components/common/StarRating.jsx';
import { formatPrice, formatRelativeTime, getInitials } from '../../utils/helpers.js';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const role = useSelector(selectUserRole);
  const isCustomer = !role || role === 'customer';

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

  // AI review summary
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryVisible, setSummaryVisible] = useState(false);

  // Review form
  const [reviewForm, setReviewForm] = useState({ rating: 0, title: '', comment: '' });
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');

  useEffect(() => {
    setLoading(true);
    productService.getBySlug(slug)
      .then((r) => { setProduct(r.data.product); setActiveImg(0); })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleAddToCart = () => {
    if (!product || product.stock === 0) return;
    setAddingToCart(true);
    dispatch(addToCart({ product, quantity: qty }));
    toast.success(`${qty}× "${product.name}" added to cart`);
    setTimeout(() => setAddingToCart(false), 800);
  };

  const handleWishlist = async () => {
    if (!isAuthenticated) return toast.error('Sign in to save items');
    try {
      const { data } = await userService.toggleWishlist(product._id);
      toast.success(data.action === 'added' ? 'Saved to wishlist' : 'Removed from wishlist');
    } catch { toast.error('Failed to update wishlist'); }
  };

  const fetchSummary = async () => {
    if (summary) return setSummaryVisible(true);
    setSummaryLoading(true); setSummaryVisible(true);
    try {
      const { data } = await aiService.getReviewSummary(product._id);
      setSummary(data.summary);
    } catch { setSummary('Could not generate summary. Try again later.'); }
    finally { setSummaryLoading(false); }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) return toast.error('Sign in to leave a review');
    if (reviewForm.rating === 0) return setReviewError('Please select a rating');
    if (!reviewForm.title.trim()) return setReviewError('Title is required');
    if (!reviewForm.comment.trim()) return setReviewError('Comment is required');
    setReviewError('');
    setReviewLoading(true);
    try {
      await productService.addReview(product._id, reviewForm);
      toast.success('Review submitted!');
      // Refresh product to get updated reviews
      const { data } = await productService.getBySlug(slug);
      setProduct(data.product);
      setReviewForm({ rating: 0, title: '', comment: '' });
      setSummary(null); // invalidate cached summary
    } catch (err) {
      setReviewError(err.response?.data?.message || 'Failed to submit review');
    } finally { setReviewLoading(false); }
  };

  if (loading) {
    return (
      <div className="page-container py-10 animate-pulse">
        <div className="grid md:grid-cols-2 gap-12">
          <div className="aspect-square bg-gray-200 rounded-2xl" />
          <div className="space-y-4">
            <div className="h-6 bg-gray-200 rounded w-2/3" />
            <div className="h-8 bg-gray-200 rounded w-1/2" />
            <div className="h-4 bg-gray-200 rounded" />
            <div className="h-4 bg-gray-200 rounded w-5/6" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="page-container py-20 text-center">
        <p className="text-5xl mb-4">🙁</p>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Product not found</h2>
        <Link to="/products" className="btn-primary mt-4">Browse Products</Link>
      </div>
    );
  }

  const images = product.images?.length ? product.images : [{ url: `https://placehold.co/600x600/f3f4f6/a821d4?text=${encodeURIComponent(product.name[0])}`, alt: product.name }];
  const discount = product.compareAtPrice > product.price
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100) : 0;

  return (
    <div className="page-container py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6 flex items-center gap-1.5">
        <Link to="/" className="hover:text-gray-800">Home</Link>
        <span>/</span>
        <Link to="/products" className="hover:text-gray-800">Products</Link>
        <span>/</span>
        <Link to={`/products?category=${product.category}`} className="hover:text-gray-800">{product.category}</Link>
        <span>/</span>
        <span className="text-gray-900 truncate max-w-[200px]">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
        {/* ── Images ─────────────────────────────────────────────────────── */}
        <div>
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 mb-3">
            <img
              src={images[activeImg]?.url}
              alt={images[activeImg]?.alt || product.name}
              className="w-full h-full object-cover"
            />
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setActiveImg((i) => (i - 1 + images.length) % images.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 rounded-full flex items-center justify-center shadow hover:bg-white"
                >
                  <FiChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setActiveImg((i) => (i + 1) % images.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 rounded-full flex items-center justify-center shadow hover:bg-white"
                >
                  <FiChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors ${i === activeImg ? 'border-primary-500' : 'border-transparent'}`}
                >
                  <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Details ────────────────────────────────────────────────────── */}
        <div>
          {/* Vendor + badges */}
          <div className="flex items-center gap-2 mb-2">
            <Link to={`/vendor/public/${product.vendor?._id}`} className="text-sm text-primary-600 hover:underline font-medium">
              {product.vendor?.vendorInfo?.shopName || product.vendor?.name}
            </Link>
            {product.isFeatured && <span className="badge-purple">Featured</span>}
            {product.stock === 0 && <span className="badge-red">Out of Stock</span>}
          </div>

          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-3 leading-snug">
            {product.name}
          </h1>

          {/* Rating summary */}
          {product.numReviews > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <StarRating rating={product.rating} size="md" />
              <span className="text-sm font-medium text-gray-700">{product.rating?.toFixed(1)}</span>
              <span className="text-sm text-gray-400">({product.numReviews} reviews)</span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-end gap-3 mb-6">
            <span className="text-3xl font-extrabold text-gray-900">{formatPrice(product.price)}</span>
            {discount > 0 && (
              <>
                <span className="text-lg text-gray-400 line-through">{formatPrice(product.compareAtPrice)}</span>
                <span className="badge bg-red-500 text-white font-bold">-{discount}%</span>
              </>
            )}
          </div>

          {/* Short description */}
          {product.shortDescription && (
            <p className="text-gray-600 mb-6 leading-relaxed">{product.shortDescription}</p>
          )}

          {/* Qty + Add to cart */}
          {isCustomer && (
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-10 h-11 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
                >−</button>
                <span className="w-10 text-center text-sm font-medium">{qty}</span>
                <button
                  onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                  disabled={qty >= product.stock}
                  className="w-10 h-11 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
                >+</button>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={product.stock === 0 || addingToCart}
                className="btn-primary btn-lg flex-1 gap-2"
              >
                {addingToCart ? (
                  <><FiCheck className="w-4 h-4" /> Added!</>
                ) : (
                  <><FiShoppingCart className="w-4 h-4" /> {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}</>
                )}
              </button>

              <button
                onClick={handleWishlist}
                className="btn-secondary w-11 h-11 p-0 flex items-center justify-center"
                aria-label="Wishlist"
              >
                <FiHeart className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Stock indicator */}
          {product.stock > 0 && product.stock <= 10 && (
            <p className="text-sm text-amber-600 font-medium mb-4">
              ⚠ Only {product.stock} left in stock
            </p>
          )}

          {/* AI Review Summary */}
          {product.numReviews >= 3 && (
            <div className="border border-primary-200 rounded-xl p-4 mb-6 bg-primary-50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FiZap className="w-4 h-4 text-primary-600" />
                  <span className="text-sm font-semibold text-primary-800">AI Review Summary</span>
                </div>
                {!summaryVisible && (
                  <button onClick={fetchSummary} className="text-xs text-primary-600 hover:underline font-medium">
                    Generate
                  </button>
                )}
              </div>
              {summaryVisible && (
                summaryLoading ? (
                  <div className="space-y-2 animate-pulse">
                    {[80, 60, 70].map((w, i) => (
                      <div key={i} className={`h-3 bg-primary-200 rounded`} style={{ width: `${w}%` }} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-primary-700 whitespace-pre-line leading-relaxed">{summary}</p>
                )
              )}
            </div>
          )}

          {/* Specifications */}
          {product.specifications?.length > 0 && (
            <div className="border-t border-gray-100 pt-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Specifications</h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                {product.specifications.map(({ key, value }) => (
                  <div key={key}>
                    <dt className="text-xs text-gray-500">{key}</dt>
                    <dd className="text-sm font-medium text-gray-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>

      {/* ── Full Description ──────────────────────────────────────────────── */}
      <div className="mt-12 border-t border-gray-100 pt-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Product Description</h2>
        <p className="text-gray-600 leading-relaxed whitespace-pre-line max-w-3xl">{product.description}</p>
      </div>

      {/* ── Reviews ──────────────────────────────────────────────────────── */}
      <div className="mt-12 border-t border-gray-100 pt-10">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-gray-900">
            Customer Reviews <span className="text-gray-400 font-normal">({product.numReviews})</span>
          </h2>
          {product.numReviews > 0 && (
            <div className="flex items-center gap-2">
              <StarRating rating={product.rating} size="lg" />
              <span className="text-lg font-bold text-gray-900">{product.rating?.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Review list */}
        {product.reviews?.length > 0 ? (
          <div className="space-y-6 max-w-3xl mb-10">
            {product.reviews.map((review) => (
              <div key={review._id} className="card p-5">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                      {review.avatar
                        ? <img src={review.avatar} alt={review.name} className="w-full h-full rounded-full object-cover" />
                        : <span className="text-primary-700 text-sm font-semibold">{getInitials(review.name)}</span>
                      }
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{review.name}</p>
                      <div className="flex items-center gap-2">
                        <StarRating rating={review.rating} size="sm" />
                        {review.isVerifiedPurchase && (
                          <span className="text-[10px] badge-green flex items-center gap-0.5">
                            <FiCheck className="w-3 h-3" /> Verified
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">{formatRelativeTime(review.createdAt)}</span>
                </div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">{review.title}</h4>
                <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm mb-8">No reviews yet — be the first!</p>
        )}

        {/* Write a review */}
        {isCustomer && isAuthenticated && (
          <div className="card p-6 max-w-xl">
            <h3 className="font-semibold text-gray-900 mb-4">Write a Review</h3>
            {reviewError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{reviewError}</div>
            )}
            <form onSubmit={submitReview} className="space-y-4">
              <div>
                <label className="label">Your Rating</label>
                <StarRating
                  rating={reviewForm.rating}
                  size="lg"
                  interactive
                  onChange={(r) => setReviewForm((f) => ({ ...f, rating: r }))}
                />
              </div>
              <div>
                <label className="label" htmlFor="reviewTitle">Title</label>
                <input
                  id="reviewTitle" type="text" maxLength={100}
                  value={reviewForm.title}
                  onChange={(e) => setReviewForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Summarise your experience"
                  className="input"
                />
              </div>
              <div>
                <label className="label" htmlFor="reviewComment">Review</label>
                <textarea
                  id="reviewComment" rows={4} maxLength={2000}
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                  placeholder="Tell others what you think…"
                  className="input resize-none"
                />
              </div>
              <button type="submit" disabled={reviewLoading} className="btn-primary">
                {reviewLoading ? 'Submitting…' : 'Submit Review'}
              </button>
            </form>
          </div>
        )}

        {!isAuthenticated && (
          <p className="text-sm text-gray-500">
            <Link to="/login" className="text-primary-600 font-medium hover:underline">Sign in</Link> to write a review.
          </p>
        )}
      </div>
    </div>
  );
}
