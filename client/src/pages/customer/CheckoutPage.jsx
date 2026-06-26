import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FiCheck, FiChevronRight, FiTruck, FiShoppingBag } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { selectCartItems, selectCartSubtotal, clearCart } from '../../store/slices/cartSlice.js';
import { orderService } from '../../services/api.js';
import { formatPrice, PK_PROVINCES } from '../../utils/helpers.js';

const STEPS = ['Shipping', 'Review', 'Done'];

// ─── Shipping form ────────────────────────────────────────────────────────────
function ShippingForm({ onNext }) {
  const [form, setForm] = useState({
    fullName:   '',
    phone:      '',
    street:     '',
    city:       '',
    province:   '',
    postalCode: '',
    country:    'Pakistan',
  });
  const [errors, setErrors] = useState({});

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!form.fullName.trim())   errs.fullName   = 'Required';
    if (!form.phone.trim())      errs.phone      = 'Required';
    if (!form.street.trim())     errs.street     = 'Required';
    if (!form.city.trim())       errs.city       = 'Required';
    if (!form.province)          errs.province   = 'Required';
    if (!form.postalCode.trim()) errs.postalCode = 'Required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (validate()) onNext(form);
  };

  const Field = ({ id, label, ...props }) => (
    <div>
      <label className="label" htmlFor={id}>
        {label} <span className="text-red-500">*</span>
      </label>
      <input id={id} className={`input ${errors[id] ? 'input-error' : ''}`} {...props} />
      {errors[id] && <p className="error-msg">{errors[id]}</p>}
    </div>
  );

  return (
    <form onSubmit={handleNext} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field id="fullName" label="Full Name"    value={form.fullName}   onChange={set('fullName')}   placeholder="Ali Raza" />
        <Field id="phone"    label="Phone Number" value={form.phone}      onChange={set('phone')}      placeholder="+92 300 0000000" type="tel" />
      </div>
      <Field id="street" label="Street / Area" value={form.street} onChange={set('street')} placeholder="House 12, Street 4, G-10/2" />
      <div className="grid grid-cols-2 gap-4">
        <Field id="city" label="City" value={form.city} onChange={set('city')} placeholder="Islamabad" />
        <div>
          <label className="label" htmlFor="province">
            Province <span className="text-red-500">*</span>
          </label>
          <select
            id="province"
            value={form.province}
            onChange={set('province')}
            className={`input ${errors.province ? 'input-error' : ''}`}
          >
            <option value="">Select province</option>
            {PK_PROVINCES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          {errors.province && <p className="error-msg">{errors.province}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field id="postalCode" label="Postal Code" value={form.postalCode} onChange={set('postalCode')} placeholder="44000" />
        <div>
          <label className="label">Country</label>
          <input className="input bg-gray-50" value="Pakistan" readOnly />
        </div>
      </div>
      <button type="submit" className="btn-primary btn-lg w-full gap-2 mt-2">
        Continue to Review <FiChevronRight className="w-4 h-4" />
      </button>
    </form>
  );
}

// ─── Review & place order ─────────────────────────────────────────────────────
function ReviewStep({ shipping, cartItems, subtotal, onBack, onPlace, placing }) {
  return (
    <div className="space-y-6">
      {/* Delivery address */}
      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Delivering to</p>
        <p className="font-semibold text-gray-900">{shipping.fullName}</p>
        <p className="text-sm text-gray-600">{shipping.phone}</p>
        <p className="text-sm text-gray-600">{shipping.street}</p>
        <p className="text-sm text-gray-600">{shipping.city}, {shipping.province} {shipping.postalCode}</p>
        <p className="text-sm text-gray-600">Pakistan</p>
      </div>

      {/* Payment method */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
        <FiTruck className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-amber-800">Cash on Delivery (COD)</p>
          <p className="text-sm text-amber-700 mt-0.5">
            Pay in cash when your order arrives. No advance payment required.
          </p>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="btn-secondary flex-1">Back</button>
        <button
          onClick={onPlace}
          disabled={placing}
          className="btn-primary flex-1 gap-2"
        >
          {placing ? (
            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Placing…</>
          ) : (
            <><FiShoppingBag className="w-4 h-4" /> Place Order</>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Main checkout ────────────────────────────────────────────────────────────
export default function CheckoutPage() {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const cartItems = useSelector(selectCartItems);
  const subtotal  = useSelector(selectCartSubtotal);

  const [step, setStep]           = useState(0);
  const [shipping, setShipping]   = useState(null);
  const [placing, setPlacing]     = useState(false);
  const [orderNumber, setOrderNumber] = useState(null);

  const SHIPPING_FEE = subtotal >= 5000 ? 0 : 250;
  const TOTAL = subtotal + SHIPPING_FEE;

  useEffect(() => {
    if (cartItems.length === 0 && step < 2) navigate('/cart');
  }, [cartItems]);

  const handleShippingDone = (address) => {
    setShipping(address);
    setStep(1);
  };

  const handlePlaceOrder = async () => {
    setPlacing(true);
    try {
      const { data } = await orderService.create({
        cartItems: cartItems.map((i) => ({ product: i.product._id, quantity: i.quantity })),
        shippingAddress: shipping,
        paymentMethod: 'cod',
      });
      setOrderNumber(data.order.orderNumber);
      dispatch(clearCart());
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  // ── Success screen ──
  if (step === 2) {
    return (
      <div className="page-container py-20 text-center max-w-md mx-auto">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <FiCheck className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Placed!</h1>
        <p className="text-gray-500 mb-1">Thank you! Your order has been received.</p>
        <p className="text-sm text-gray-400 mb-2">Order <strong>{orderNumber}</strong></p>
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 mb-8">
          Pay in cash when your order is delivered.
        </p>
        <div className="flex flex-col gap-3">
          <Link to="/orders" className="btn-primary btn-lg w-full">Track My Order</Link>
          <Link to="/products" className="btn-secondary btn-lg w-full">Continue Shopping</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container py-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Checkout</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              i < step ? 'bg-green-500 text-white' : i === step ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {i < step ? <FiCheck className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={`text-sm font-medium ${i === step ? 'text-gray-900' : 'text-gray-400'}`}>{s}</span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-gray-200 mx-1" />}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-8">
        {/* Form area */}
        <div className="lg:col-span-3 card p-6">
          {step === 0 && (
            <>
              <h2 className="font-semibold text-gray-900 mb-5">Shipping Address</h2>
              <ShippingForm onNext={handleShippingDone} />
            </>
          )}
          {step === 1 && (
            <>
              <h2 className="font-semibold text-gray-900 mb-5">Review Your Order</h2>
              <ReviewStep
                shipping={shipping}
                cartItems={cartItems}
                subtotal={subtotal}
                onBack={() => setStep(0)}
                onPlace={handlePlaceOrder}
                placing={placing}
              />
            </>
          )}
        </div>

        {/* Order summary */}
        <div className="lg:col-span-2">
          <div className="card p-5 sticky top-24">
            <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
            <div className="space-y-3 mb-4 max-h-64 overflow-y-auto scrollbar-hide">
              {cartItems.map(({ product, quantity }) => (
                <div key={product._id} className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <img
                      src={product.images?.[0]?.url || `https://placehold.co/48x48/f3f4f6/a821d4?text=${product.name[0]}`}
                      alt={product.name}
                      className="w-12 h-12 rounded-lg object-cover bg-gray-100"
                    />
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-gray-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {quantity}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{product.name}</p>
                    <p className="text-xs text-gray-400">{formatPrice(product.price)} × {quantity}</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 shrink-0">
                    {formatPrice(product.price * quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span><span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span className={SHIPPING_FEE === 0 ? 'text-green-600' : ''}>
                  {SHIPPING_FEE === 0 ? 'Free' : formatPrice(SHIPPING_FEE)}
                </span>
              </div>
              {subtotal < 5000 && (
                <p className="text-xs text-gray-400">Free shipping on orders over Rs 5,000</p>
              )}
              <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-100">
                <span>Total</span><span>{formatPrice(TOTAL)}</span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-xs text-amber-700 font-medium">Cash on Delivery</p>
              <p className="text-xs text-amber-600 mt-0.5">Pay when your order arrives</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
