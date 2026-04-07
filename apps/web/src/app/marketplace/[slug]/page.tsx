'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ShoppingCart,
  Minus,
  Plus,
  Store,
  ChevronLeft,
  ChevronRight,
  Heart,
  Share2,
  Truck,
  Shield,
} from 'lucide-react';
import api from '@/lib/api';
import { formatPrice, resolveImageUrl } from '@/lib/utils';
import { useCart } from '@/components/CartProvider';
import ProductReviews from '@/components/ProductReviews';
import type { Product } from '@ilovefdl/shared';

export default function ProductDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    async function fetchProduct() {
      try {
        const res = await api.getProduct(params.slug);
        setProduct(res.data);
      } catch {
        setProduct(null);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [params.slug]);

  const handleAddToCart = () => {
    if (!product) return;
    addItem(
      {
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.images?.[0] || null,
        vendorId: product.vendorId,
        vendorName: product.vendor?.businessName || '',
        slug: product.slug,
      },
      quantity,
    );
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse grid lg:grid-cols-2 gap-12">
            <div className="aspect-square bg-white rounded-xl" />
            <div className="space-y-4">
              <div className="h-4 bg-white rounded w-1/4" />
              <div className="h-8 bg-white rounded w-3/4" />
              <div className="h-10 bg-white rounded w-1/3" />
              <div className="h-32 bg-white rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary mb-4">
            Product Not Found
          </h1>
          <p className="text-primary/60 mb-6">
            This product may have been removed or doesn&apos;t exist.
          </p>
          <Link href="/marketplace" className="btn-primary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  const images = product.images && product.images.length > 0 ? product.images : [];

  return (
    <div className="min-h-screen bg-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-primary/60 mb-8">
          <Link href="/marketplace" className="hover:text-teal transition-colors">
            Marketplace
          </Link>
          <span>/</span>
          <span className="text-primary truncate">{product.name}</span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Image Gallery */}
          <div>
            <div className="relative aspect-square bg-white rounded-xl overflow-hidden mb-4">
              {images.length > 0 ? (
                <>
                  <img
                    src={resolveImageUrl(images[activeImage])}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={() =>
                          setActiveImage(
                            activeImage === 0 ? images.length - 1 : activeImage - 1
                          )
                        }
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors"
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() =>
                          setActiveImage(
                            activeImage === images.length - 1 ? 0 : activeImage + 1
                          )
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors"
                        aria-label="Next image"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-light to-teal/10">
                  <ShoppingCart className="w-24 h-24 text-primary/10" />
                </div>
              )}
            </div>

            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                      activeImage === i
                        ? 'border-teal'
                        : 'border-transparent hover:border-light'
                    }`}
                  >
                    <img
                      src={resolveImageUrl(img)}
                      alt={`${product.name} view ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div>
            {/* Vendor Link */}
            {product.vendor && (
              <Link
                href={`/vendors/${product.vendor.slug}`}
                className="inline-flex items-center gap-2 text-teal text-sm font-medium hover:text-teal/80 transition-colors mb-3"
              >
                <Store className="w-4 h-4" />
                {product.vendor.businessName}
              </Link>
            )}

            <h1 className="text-2xl md:text-3xl font-bold text-primary mb-4">
              {product.name}
            </h1>

            {/* Price */}
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl font-bold text-primary">
                {formatPrice(product.price)}
              </span>
              {product.compareAtPrice &&
                product.compareAtPrice > product.price && (
                  <span className="text-lg text-primary/40 line-through">
                    {formatPrice(product.compareAtPrice)}
                  </span>
                )}
              {product.compareAtPrice &&
                product.compareAtPrice > product.price && (
                  <span className="badge bg-accent text-white">
                    {Math.round(
                      ((product.compareAtPrice - product.price) /
                        product.compareAtPrice) *
                        100
                    )}
                    % off
                  </span>
                )}
            </div>

            {/* Description */}
            {product.description && (
              <div className="prose prose-sm text-primary/70 mb-8 max-w-none">
                <p className="whitespace-pre-wrap">{product.description}</p>
              </div>
            )}

            {/* Category Tags */}
            {product.categoryTags && product.categoryTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {product.categoryTags.map((tag) => (
                  <span key={tag} className="badge-teal">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Add to Cart */}
            <div className="bg-white rounded-xl p-6 border border-light mb-6">
              {product.inventory > 0 ? (
                <>
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-sm font-medium text-primary">
                      Quantity
                    </span>
                    <div className="flex items-center border border-light rounded-lg">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="p-2 hover:bg-light transition-colors rounded-l-lg"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="px-4 py-2 text-center min-w-[3rem] font-medium">
                        {quantity}
                      </span>
                      <button
                        onClick={() =>
                          setQuantity(
                            Math.min(product.inventory, quantity + 1)
                          )
                        }
                        className="p-2 hover:bg-light transition-colors rounded-r-lg"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="text-xs text-primary/50">
                      {product.inventory} available
                    </span>
                  </div>
                  <button
                    onClick={handleAddToCart}
                    className={`w-full py-4 rounded-lg font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                      addedToCart
                        ? 'bg-teal text-white'
                        : 'bg-accent text-white hover:bg-accent/90'
                    }`}
                  >
                    {addedToCart ? (
                      'Added to Cart!'
                    ) : (
                      <>
                        <ShoppingCart className="w-5 h-5" />
                        Add to Cart - {formatPrice(product.price * quantity)}
                      </>
                    )}
                  </button>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-accent font-semibold">
                    Currently Out of Stock
                  </p>
                  <p className="text-primary/50 text-sm mt-1">
                    Check back soon or contact the vendor
                  </p>
                </div>
              )}
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 text-sm text-primary/60">
                <Truck className="w-5 h-5 text-teal flex-shrink-0" />
                <span>Local pickup or shipping available</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-primary/60">
                <Shield className="w-5 h-5 text-teal flex-shrink-0" />
                <span>Secure checkout via Stripe</span>
              </div>
            </div>
          </div>
        </div>

        {/* Product Reviews */}
        <ProductReviews productId={product.id} />
      </div>
    </div>
  );
}
