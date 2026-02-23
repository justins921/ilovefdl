'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  ShoppingBag,
  Shield,
  Loader2,
  MapPin,
  AlertCircle,
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import api from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { useCart, type CartItem } from '@/components/CartProvider';

interface ShippingForm {
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

export default function CheckoutPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { items: cart, clearCart } = useCart();
  const [cartLoaded, setCartLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ShippingForm, string>>>({});

  const [shipping, setShipping] = useState<ShippingForm>({
    name: '',
    line1: '',
    line2: '',
    city: '',
    state: 'WI',
    postalCode: '',
    country: 'US',
  });

  // Mark cart as loaded after mount (CartProvider hydrates from localStorage)
  useEffect(() => {
    setCartLoaded(true);
  }, []);

  // Pre-fill name from user profile
  useEffect(() => {
    if (user?.name && !shipping.name) {
      setShipping((prev) => ({ ...prev, name: user.name || '' }));
    }
  }, [user, shipping.name]);

  // Redirect to cart if empty (after cart loads)
  useEffect(() => {
    if (cartLoaded && cart.length === 0) {
      router.replace('/cart');
    }
  }, [cartLoaded, cart.length, router]);

  // Group items by vendor
  const itemsByVendor = cart.reduce<
    Record<string, { vendorName: string; items: CartItem[] }>
  >((acc, item) => {
    if (!acc[item.vendorId]) {
      acc[item.vendorId] = { vendorName: item.vendorName, items: [] };
    }
    acc[item.vendorId].items.push(item);
    return acc;
  }, {});

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const updateField = (field: keyof ShippingForm, value: string) => {
    setShipping((prev) => ({ ...prev, [field]: value }));
    // Clear field error when user types
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof ShippingForm, string>> = {};

    if (!shipping.name.trim()) errors.name = 'Full name is required';
    if (!shipping.line1.trim()) errors.line1 = 'Address is required';
    if (!shipping.city.trim()) errors.city = 'City is required';
    if (!shipping.state.trim()) errors.state = 'State is required';
    if (!shipping.postalCode.trim()) {
      errors.postalCode = 'ZIP code is required';
    } else if (!/^\d{5}(-\d{4})?$/.test(shipping.postalCode.trim())) {
      errors.postalCode = 'Enter a valid ZIP code';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    setLoading(true);
    try {
      const items = cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      }));

      const shippingAddress = {
        line1: shipping.line1.trim(),
        line2: shipping.line2.trim() || undefined,
        city: shipping.city.trim(),
        state: shipping.state.trim(),
        postalCode: shipping.postalCode.trim(),
        country: shipping.country,
      };

      const res = await api.createMultiVendorCheckout(
        items,
        shippingAddress,
        notes.trim() || undefined
      );

      // Clear cart via context (also clears localStorage)
      clearCart();

      // Redirect to Stripe Checkout
      window.location.href = res.data.sessionUrl;
    } catch (err: any) {
      setError(
        err?.message || 'Something went wrong. Please try again.'
      );
      setLoading(false);
    }
  };

  // Show loading while checking auth and cart
  if (authLoading || !cartLoaded) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="animate-pulse text-primary/40">Loading...</div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-light">
        <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="bg-white rounded-xl border border-light p-8">
            <AlertCircle className="w-12 h-12 text-accent mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-primary mb-2">
              Sign In Required
            </h1>
            <p className="text-primary/60 mb-6">
              Please sign in or create an account to continue with checkout.
            </p>
            <Link
              href="/auth?redirect=/checkout"
              className="btn-primary text-lg inline-flex items-center"
            >
              Sign In to Continue
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            <Link
              href="/cart"
              className="flex items-center justify-center gap-2 text-sm text-teal hover:underline mt-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Cart
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Cart is empty (will redirect, but show nothing while redirecting)
  if (cart.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-light">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/cart"
            className="flex items-center gap-2 text-sm text-teal hover:underline mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Cart
          </Link>
          <h1 className="text-3xl font-bold text-primary">Checkout</h1>
          <p className="text-primary/60 mt-1">
            Complete your order details below
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Shipping Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Shipping Address */}
              <div className="bg-white rounded-xl border border-light p-6">
                <div className="flex items-center gap-3 mb-6">
                  <MapPin className="w-5 h-5 text-teal" />
                  <h2 className="text-lg font-bold text-primary">
                    Shipping Address
                  </h2>
                </div>

                <div className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-primary mb-2"
                    >
                      Full Name
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={shipping.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      placeholder="John Doe"
                      className={`input-field ${formErrors.name ? 'border-accent' : ''}`}
                    />
                    {formErrors.name && (
                      <p className="text-accent text-sm mt-1">{formErrors.name}</p>
                    )}
                  </div>

                  {/* Address Line 1 */}
                  <div>
                    <label
                      htmlFor="line1"
                      className="block text-sm font-medium text-primary mb-2"
                    >
                      Address Line 1
                    </label>
                    <input
                      id="line1"
                      type="text"
                      value={shipping.line1}
                      onChange={(e) => updateField('line1', e.target.value)}
                      placeholder="123 Main Street"
                      className={`input-field ${formErrors.line1 ? 'border-accent' : ''}`}
                    />
                    {formErrors.line1 && (
                      <p className="text-accent text-sm mt-1">{formErrors.line1}</p>
                    )}
                  </div>

                  {/* Address Line 2 */}
                  <div>
                    <label
                      htmlFor="line2"
                      className="block text-sm font-medium text-primary mb-2"
                    >
                      Address Line 2{' '}
                      <span className="text-primary/40 font-normal">(optional)</span>
                    </label>
                    <input
                      id="line2"
                      type="text"
                      value={shipping.line2}
                      onChange={(e) => updateField('line2', e.target.value)}
                      placeholder="Apt, Suite, Unit, etc."
                      className="input-field"
                    />
                  </div>

                  {/* City, State, ZIP row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* City */}
                    <div>
                      <label
                        htmlFor="city"
                        className="block text-sm font-medium text-primary mb-2"
                      >
                        City
                      </label>
                      <input
                        id="city"
                        type="text"
                        value={shipping.city}
                        onChange={(e) => updateField('city', e.target.value)}
                        placeholder="Fond du Lac"
                        className={`input-field ${formErrors.city ? 'border-accent' : ''}`}
                      />
                      {formErrors.city && (
                        <p className="text-accent text-sm mt-1">{formErrors.city}</p>
                      )}
                    </div>

                    {/* State */}
                    <div>
                      <label
                        htmlFor="state"
                        className="block text-sm font-medium text-primary mb-2"
                      >
                        State
                      </label>
                      <select
                        id="state"
                        value={shipping.state}
                        onChange={(e) => updateField('state', e.target.value)}
                        className={`input-field ${formErrors.state ? 'border-accent' : ''}`}
                      >
                        <option value="">Select state</option>
                        {US_STATES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                      {formErrors.state && (
                        <p className="text-accent text-sm mt-1">{formErrors.state}</p>
                      )}
                    </div>

                    {/* ZIP Code */}
                    <div>
                      <label
                        htmlFor="postalCode"
                        className="block text-sm font-medium text-primary mb-2"
                      >
                        ZIP Code
                      </label>
                      <input
                        id="postalCode"
                        type="text"
                        value={shipping.postalCode}
                        onChange={(e) => updateField('postalCode', e.target.value)}
                        placeholder="54935"
                        className={`input-field ${formErrors.postalCode ? 'border-accent' : ''}`}
                        maxLength={10}
                      />
                      {formErrors.postalCode && (
                        <p className="text-accent text-sm mt-1">
                          {formErrors.postalCode}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Country (hidden, default US) */}
                  <input type="hidden" name="country" value={shipping.country} />
                </div>
              </div>

              {/* Order Notes */}
              <div className="bg-white rounded-xl border border-light p-6">
                <h2 className="text-lg font-bold text-primary mb-4">
                  Order Notes{' '}
                  <span className="text-primary/40 font-normal text-sm">(optional)</span>
                </h2>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special instructions for your order..."
                  rows={3}
                  maxLength={1000}
                  className="input-field resize-none"
                />
                <p className="text-xs text-primary/40 mt-1 text-right">
                  {notes.length}/1000
                </p>
              </div>
            </div>

            {/* Right Column - Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl border border-light p-6 sticky top-24">
                <h3 className="text-lg font-bold text-primary mb-4">
                  Order Summary
                </h3>

                {/* Items grouped by vendor */}
                <div className="space-y-4 mb-6">
                  {Object.entries(itemsByVendor).map(([vendorId, group]) => (
                    <div key={vendorId}>
                      <p className="text-xs font-semibold text-teal mb-2">
                        {group.vendorName}
                      </p>
                      <div className="space-y-2">
                        {group.items.map((item) => (
                          <div
                            key={item.productId}
                            className="flex items-start gap-3"
                          >
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-light flex items-center justify-center flex-shrink-0">
                                <ShoppingBag className="w-4 h-4 text-primary/20" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-primary line-clamp-1">
                                {item.name}
                              </p>
                              <p className="text-xs text-primary/50">
                                Qty: {item.quantity}
                              </p>
                            </div>
                            <p className="text-sm font-medium text-primary">
                              {formatPrice(item.price * item.quantity)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-light pt-4 space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-primary/60">
                      Subtotal ({totalItems} item{totalItems !== 1 ? 's' : ''})
                    </span>
                    <span className="text-primary font-medium">
                      {formatPrice(subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-primary/60">Shipping</span>
                    <span className="text-primary/60">
                      Calculated at payment
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-primary/60">Tax</span>
                    <span className="text-primary/60">
                      Calculated at payment
                    </span>
                  </div>
                  <div className="border-t border-light pt-3 flex justify-between">
                    <span className="font-bold text-primary">Estimated Total</span>
                    <span className="font-bold text-primary text-lg">
                      {formatPrice(subtotal)}
                    </span>
                  </div>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-accent/5 border border-accent/20 rounded-lg text-accent text-sm flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Place Order
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-2 text-xs text-primary/40 mt-4">
                  <Shield className="w-3 h-3" />
                  <span>Secure checkout powered by Stripe</span>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
