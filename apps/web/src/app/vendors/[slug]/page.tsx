'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Store,
  Globe,
  Phone,
  MapPin,
  ExternalLink,
  ShoppingBag,
} from 'lucide-react';
import api from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import type { Vendor, Product, PaginatedResponse } from '@ilovefdl/shared';

export default function VendorStorefrontPage({
  params,
}: {
  params: { slug: string };
}) {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const vendorRes = await api.getVendor(params.slug);
        setVendor(vendorRes.data);

        const productsRes: PaginatedResponse<Product> = await api.getProducts({
          vendorId: vendorRes.data.id,
          limit: 50,
        });
        setProducts(productsRes.data);
      } catch {
        setVendor(null);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params.slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-light">
        <div className="animate-pulse">
          <div className="h-64 bg-white" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
            <div className="h-8 bg-white rounded w-1/3" />
            <div className="h-4 bg-white rounded w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary mb-4">
            Vendor Not Found
          </h1>
          <p className="text-primary/60 mb-6">
            This vendor page doesn&apos;t exist or may have been removed.
          </p>
          <Link href="/vendors" className="btn-primary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Vendors
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light">
      {/* Banner */}
      <div className="relative h-48 md:h-64 bg-gradient-to-r from-teal to-teal/70 overflow-hidden">
        {vendor.bannerUrl && (
          <img
            src={vendor.bannerUrl}
            alt={vendor.businessName}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent" />
      </div>

      {/* Vendor Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative -mt-16 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-light p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              {/* Logo */}
              <div className="flex-shrink-0">
                {vendor.logoUrl ? (
                  <div className="w-24 h-24 rounded-xl overflow-hidden border-4 border-white shadow-sm bg-white">
                    <img
                      src={vendor.logoUrl}
                      alt={`${vendor.businessName} logo`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-xl border-4 border-white shadow-sm bg-teal/10 flex items-center justify-center">
                    <Store className="w-10 h-10 text-teal" />
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-primary mb-2">
                  {vendor.businessName}
                </h1>
                {vendor.description && (
                  <p className="text-primary/60 leading-relaxed mb-4 max-w-2xl">
                    {vendor.description}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-4 text-sm text-primary/60">
                  {vendor.address && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-teal" />
                      <span>{vendor.address}</span>
                    </div>
                  )}
                  {vendor.phone && (
                    <a
                      href={`tel:${vendor.phone}`}
                      className="flex items-center gap-1 hover:text-teal transition-colors"
                    >
                      <Phone className="w-4 h-4 text-teal" />
                      <span>{vendor.phone}</span>
                    </a>
                  )}
                  {vendor.website && (
                    <a
                      href={vendor.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-teal transition-colors"
                    >
                      <Globe className="w-4 h-4 text-teal" />
                      <span>Website</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Products */}
        <div className="pb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-primary">Products</h2>
            <span className="text-sm text-primary/60">
              {products.length} product{products.length !== 1 ? 's' : ''}
            </span>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-xl border border-light">
              <ShoppingBag className="w-12 h-12 text-primary/20 mx-auto mb-3" />
              <h3 className="font-semibold text-primary mb-1">
                No Products Yet
              </h3>
              <p className="text-primary/60 text-sm">
                This vendor hasn&apos;t listed any products yet. Check back soon!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
