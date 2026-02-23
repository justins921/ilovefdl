'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, ShoppingBag, User } from 'lucide-react';
import { useCart } from '@/components/CartProvider';

export default function OrderSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { items, clearCart } = useCart();
  const clearedRef = useRef(false);

  // Clear cart if it still has items (run once)
  useEffect(() => {
    if (items.length > 0 && !clearedRef.current) {
      clearedRef.current = true;
      clearCart();
    }
  }, [items.length, clearCart]);

  return (
    <div className="min-h-screen bg-light">
      <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-white rounded-xl border border-light p-8 text-center">
          {/* Success Icon */}
          <div className="flex items-center justify-center mb-6">
            <CheckCircle className="w-20 h-20 text-teal" />
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-bold text-primary mb-3">
            Order Confirmed!
          </h1>

          {/* Subtext */}
          <p className="text-primary/60 text-lg mb-2">
            Thank you for supporting local Fond du Lac businesses!
          </p>
          <p className="text-primary/40 text-sm mb-8">
            You will receive an email confirmation with your order details shortly.
          </p>

          {sessionId && (
            <p className="text-xs text-primary/30 mb-6">
              Session: {sessionId.slice(0, 20)}...
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/account"
              className="btn-primary inline-flex items-center justify-center"
            >
              <User className="w-4 h-4 mr-2" />
              View My Orders
            </Link>
            <Link
              href="/marketplace"
              className="btn-outline inline-flex items-center justify-center"
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
