'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Heart,
  ShoppingBag,
  ShoppingCart,
  ArrowRight,
  User,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { useCart } from '@/components/CartProvider';
import { formatPrice, formatDate } from '@/lib/utils';
import type { WishlistItem } from '@ilovefdl/shared';

export default function WishlistPage() {
  const { user, loading: authLoading } = useAuth();
  const { addItem } = useCart();
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [addedToCartIds, setAddedToCartIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    async function fetchWishlist() {
      try {
        const res = await api.getWishlist();
        setWishlistItems(res.data);
      } catch {
        // Failed to fetch wishlist
      } finally {
        setLoading(false);
      }
    }
    fetchWishlist();
  }, [user, authLoading]);

  const handleRemove = async (productId: string) => {
    setRemovingIds((prev) => new Set(prev).add(productId));
    try {
      await api.removeFromWishlist(productId);
      setWishlistItems((prev) =>
        prev.filter((item) => item.productId !== productId),
      );
    } catch {
      // Failed to remove — revert optimistic UI
    } finally {
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  const handleAddToCart = (item: WishlistItem) => {
    const product = item.product;
    if (!product) return;

    addItem(
      {
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.images[0] || null,
        vendorId: product.vendorId,
        vendorName: product.vendor?.businessName || 'Local Vendor',
        slug: product.slug,
      },
      1,
    );

    setAddedToCartIds((prev) => new Set(prev).add(product.id));
    setTimeout(() => {
      setAddedToCartIds((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }, 2000);
  };

  // Auth loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="animate-pulse text-primary/40">Loading...</div>
      </div>
    );
  }

  // Auth required state
  if (!user) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="text-center max-w-md">
          <User className="w-16 h-16 text-primary/20 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-primary mb-3">
            Sign In Required
          </h1>
          <p className="text-primary/60 mb-6">
            Please sign in to view your wishlist and save your favorite products.
          </p>
          <Link href="/auth" className="btn-primary">
            Sign In
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light">
      {/* Page Header */}
      <div className="bg-white border-b border-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-2">
            My Wishlist
          </h1>
          <p className="text-primary/60 text-sm sm:text-lg">
            {wishlistItems.length > 0
              ? `${wishlistItems.length} saved item${wishlistItems.length !== 1 ? 's' : ''}`
              : 'Products you love from local vendors'}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading Skeleton */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="aspect-square bg-light" />
                <div className="p-4 space-y-3">
                  <div className="h-3 bg-light rounded w-1/3" />
                  <div className="h-4 bg-light rounded w-2/3" />
                  <div className="h-5 bg-light rounded w-1/4" />
                  <div className="flex gap-2 mt-4">
                    <div className="h-9 bg-light rounded flex-1" />
                    <div className="h-9 bg-light rounded w-9" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : wishlistItems.length > 0 ? (
          /* Product Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {wishlistItems.map((item) => {
              const product = item.product;
              if (!product) return null;

              const isRemoving = removingIds.has(item.productId);
              const justAddedToCart = addedToCartIds.has(product.id);

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-xl border border-light overflow-hidden hover:shadow-md transition-all ${
                    isRemoving ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  {/* Product Image */}
                  <Link href={`/marketplace/${product.slug}`}>
                    {product.images[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="aspect-square w-full object-cover"
                      />
                    ) : (
                      <div className="aspect-square w-full bg-light flex items-center justify-center">
                        <ShoppingBag className="w-12 h-12 text-primary/15" />
                      </div>
                    )}
                  </Link>

                  {/* Product Info */}
                  <div className="p-4">
                    {/* Vendor Name */}
                    {product.vendor && (
                      <p className="text-xs font-medium text-teal mb-1 truncate">
                        {product.vendor.businessName}
                      </p>
                    )}

                    {/* Product Name */}
                    <Link
                      href={`/marketplace/${product.slug}`}
                      className="font-semibold text-primary hover:text-accent transition-colors line-clamp-2 text-sm leading-snug"
                    >
                      {product.name}
                    </Link>

                    {/* Price */}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="font-bold text-accent">
                        {formatPrice(product.price)}
                      </span>
                      {product.compareAtPrice && product.compareAtPrice > product.price && (
                        <span className="text-xs text-primary/40 line-through">
                          {formatPrice(product.compareAtPrice)}
                        </span>
                      )}
                    </div>

                    {/* Added Date */}
                    <p className="text-xs text-primary/40 mt-1">
                      Added {formatDate(item.createdAt)}
                    </p>

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => handleAddToCart(item)}
                        disabled={justAddedToCart}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          justAddedToCart
                            ? 'bg-teal/10 text-teal'
                            : 'btn-primary'
                        }`}
                      >
                        <ShoppingCart className="w-4 h-4" />
                        {justAddedToCart ? 'Added!' : 'Add to Cart'}
                      </button>
                      <button
                        onClick={() => handleRemove(item.productId)}
                        disabled={isRemoving}
                        className="p-2.5 rounded-lg border border-light text-accent hover:bg-accent/5 transition-colors"
                        aria-label="Remove from wishlist"
                      >
                        <Heart className="w-4 h-4 fill-current" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-20">
            <Heart className="w-16 h-16 text-primary/20 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-primary mb-2">
              Your wishlist is empty
            </h3>
            <p className="text-primary/60 mb-6 max-w-md mx-auto">
              Browse the marketplace and tap the heart icon on products you love
              to save them here.
            </p>
            <Link href="/marketplace" className="btn-primary">
              <ShoppingBag className="w-5 h-5 mr-2" />
              Browse Marketplace
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
