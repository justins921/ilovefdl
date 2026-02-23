'use client';

import Link from 'next/link';
import { XCircle, ShoppingCart, ShoppingBag } from 'lucide-react';

export default function OrderCancelPage() {
  return (
    <div className="min-h-screen bg-light">
      <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-white rounded-xl border border-light p-8 text-center">
          {/* Cancel Icon */}
          <div className="flex items-center justify-center mb-6">
            <XCircle className="w-20 h-20 text-amber-500" />
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-bold text-primary mb-3">
            Order Cancelled
          </h1>

          {/* Subtext */}
          <p className="text-primary/60 text-lg mb-2">
            Your order was not completed.
          </p>
          <p className="text-primary/40 text-sm mb-8">
            No charges were made. Your cart items are still saved if you&apos;d like to try again.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/cart"
              className="btn-primary inline-flex items-center justify-center"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Return to Cart
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
