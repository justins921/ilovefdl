'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShoppingCart,
  Trash2,
  Minus,
  Plus,
  ArrowLeft,
  ArrowRight,
  ShoppingBag,
  Shield,
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import api from '@/lib/api';

interface CartItem {
  productId: string;
  name: string;
  price: number;
  image: string | null;
  vendorId: string;
  vendorName: string;
  quantity: number;
  slug: string;
}

export default function CartPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('ilovefdl_cart');
    if (stored) {
      try {
        setCart(JSON.parse(stored));
      } catch {
        setCart([]);
      }
    }
  }, []);

  const updateCart = (newCart: CartItem[]) => {
    setCart(newCart);
    localStorage.setItem('ilovefdl_cart', JSON.stringify(newCart));
  };

  const updateQuantity = (productId: string, delta: number) => {
    const newCart = cart
      .map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.max(0, item.quantity + delta) }
          : item
      )
      .filter((item) => item.quantity > 0);
    updateCart(newCart);
  };

  const removeItem = (productId: string) => {
    updateCart(cart.filter((item) => item.productId !== productId));
  };

  const clearCart = () => {
    updateCart([]);
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

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

  const handleCheckout = async () => {
    setLoading(true);
    try {
      // Create checkout sessions grouped by vendor
      for (const [vendorId, group] of Object.entries(itemsByVendor)) {
        const items = group.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        }));
        const res = await api.createCheckoutSession(vendorId, items);
        if (res.data.url) {
          window.location.href = res.data.url;
          return;
        }
      }
    } catch (err) {
      alert('Please sign in to checkout.');
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-light">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <ShoppingCart className="w-20 h-20 text-primary/15 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-primary mb-3">
            Your Cart is Empty
          </h1>
          <p className="text-primary/60 text-lg mb-8 max-w-md mx-auto">
            Discover unique products from Fond du Lac&apos;s local vendors and
            add something special to your cart.
          </p>
          <Link href="/marketplace" className="btn-primary text-lg">
            <ShoppingBag className="w-5 h-5 mr-2" />
            Browse Marketplace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-1">
              Shopping Cart
            </h1>
            <p className="text-primary/60">
              {cart.reduce((sum, item) => sum + item.quantity, 0)} item
              {cart.reduce((sum, item) => sum + item.quantity, 0) !== 1
                ? 's'
                : ''}{' '}
              in your cart
            </p>
          </div>
          <button
            onClick={clearCart}
            className="text-sm text-primary/50 hover:text-accent transition-colors"
          >
            Clear Cart
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            {Object.entries(itemsByVendor).map(([vendorId, group]) => (
              <div key={vendorId}>
                <h3 className="text-sm font-semibold text-teal mb-3">
                  {group.vendorName}
                </h3>
                <div className="space-y-3">
                  {group.items.map((item) => (
                    <div
                      key={item.productId}
                      className="bg-white rounded-xl border border-light p-4 flex gap-4"
                    >
                      {/* Image */}
                      <Link
                        href={`/marketplace/${item.slug}`}
                        className="flex-shrink-0"
                      >
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-20 h-20 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-lg bg-light flex items-center justify-center">
                            <ShoppingBag className="w-6 h-6 text-primary/20" />
                          </div>
                        )}
                      </Link>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/marketplace/${item.slug}`}
                          className="font-semibold text-primary hover:text-accent transition-colors line-clamp-1"
                        >
                          {item.name}
                        </Link>
                        <p className="text-accent font-bold mt-1">
                          {formatPrice(item.price)}
                        </p>

                        {/* Quantity Controls */}
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center border border-light rounded-lg">
                            <button
                              onClick={() =>
                                updateQuantity(item.productId, -1)
                              }
                              className="p-1.5 hover:bg-light transition-colors rounded-l-lg"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-3 py-1 text-sm font-medium min-w-[2rem] text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateQuantity(item.productId, 1)
                              }
                              className="p-1.5 hover:bg-light transition-colors rounded-r-lg"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-semibold text-primary">
                              {formatPrice(item.price * item.quantity)}
                            </span>
                            <button
                              onClick={() => removeItem(item.productId)}
                              className="p-1.5 text-primary/40 hover:text-accent transition-colors"
                              aria-label="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-light p-6 sticky top-24">
              <h3 className="text-lg font-bold text-primary mb-4">
                Order Summary
              </h3>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-primary/60">Subtotal</span>
                  <span className="text-primary font-medium">
                    {formatPrice(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-primary/60">Shipping</span>
                  <span className="text-primary/60">Calculated at checkout</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-primary/60">Tax</span>
                  <span className="text-primary/60">Calculated at checkout</span>
                </div>
                <div className="border-t border-light pt-3 flex justify-between">
                  <span className="font-bold text-primary">Estimated Total</span>
                  <span className="font-bold text-primary text-lg">
                    {formatPrice(subtotal)}
                  </span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={loading}
                className="w-full btn-primary py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  'Processing...'
                ) : (
                  <>
                    Checkout
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-xs text-primary/40 mt-4">
                <Shield className="w-3 h-3" />
                <span>Secure checkout powered by Stripe</span>
              </div>

              <Link
                href="/marketplace"
                className="flex items-center justify-center gap-2 text-sm text-teal hover:underline mt-4"
              >
                <ArrowLeft className="w-4 h-4" />
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
