'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Store,
  ShoppingBag,
  ShoppingCart,
  DollarSign,
  ArrowRight,
  Package,
  Clock,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { formatPrice, formatDate } from '@/lib/utils';
import type { Order, Product, Vendor } from '@ilovefdl/shared';

export default function VendorDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    async function fetchDashboardData() {
      try {
        const vendorRes = await api.getMyVendor();
        const myVendor = vendorRes.data;

        setVendor(myVendor);

        const [productsRes, ordersRes] = await Promise.all([
          api.getProducts({ vendorId: myVendor.id, limit: 50 }),
          api.getOrders({ vendorId: myVendor.id, limit: 10 }),
        ]);

        setProducts(productsRes.data);
        setOrders(ordersRes.data);
        setTotalRevenue(
          ordersRes.data.reduce((sum, o) => sum + o.vendorNetAmount, 0)
        );
      } catch {
        // Dashboard load failed — vendor profile not found
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, [user, authLoading]);

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    PAID: 'bg-blue-100 text-blue-800',
    FULFILLED: 'bg-green-100 text-green-800',
    REFUNDED: 'bg-gray-100 text-gray-800',
    CANCELLED: 'bg-red-100 text-red-800',
  };

  if (authLoading || loading) {
    return (
      <div className="animate-pulse space-y-8 py-6">
        <div className="h-8 bg-white rounded w-1/3" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-white rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-white rounded-xl" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-md">
          <Store className="w-16 h-16 text-primary/20 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-primary mb-3">
            No Vendor Profile
          </h1>
          <p className="text-primary/60 mb-6">
            You don&apos;t have a vendor profile yet. Apply to become a vendor
            on the I Love FDL marketplace.
          </p>
          <Link href="/auth/vendor" className="btn-primary">
            Apply to Sell
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-primary mb-1">
            Dashboard
          </h1>
          <p className="text-primary/60 text-sm">
            Welcome back, {vendor.businessName}
          </p>
        </div>
        <Link
          href={`/vendors/${vendor.slug}`}
          className="btn-outline text-sm"
        >
          <Store className="w-4 h-4 mr-2" />
          View Storefront
        </Link>
      </div>

      <div>
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <div className="bg-white rounded-xl border border-light p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-teal/10 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-teal" />
              </div>
              <TrendingUp className="w-4 h-4 text-teal" />
            </div>
            <p className="text-2xl font-bold text-primary">
              {formatPrice(totalRevenue)}
            </p>
            <p className="text-sm text-primary/60 mt-1">Total Revenue</p>
          </div>

          <div className="bg-white rounded-xl border border-light p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-accent" />
              </div>
            </div>
            <p className="text-2xl font-bold text-primary">{orders.length}</p>
            <p className="text-sm text-primary/60 mt-1">Orders</p>
          </div>

          <div className="bg-white rounded-xl border border-light p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold text-primary">
              {products.length}
            </p>
            <p className="text-sm text-primary/60 mt-1">Products</p>
          </div>

          <div className="bg-white rounded-xl border border-light p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-teal/10 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-teal" />
              </div>
            </div>
            <p className="text-2xl font-bold text-primary">
              {(vendor.commissionRate * 100).toFixed(0)}%
            </p>
            <p className="text-sm text-primary/60 mt-1">Commission Rate</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Recent Orders */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-light overflow-hidden">
              <div className="px-6 py-4 border-b border-light flex items-center justify-between">
                <h2 className="text-lg font-bold text-primary">
                  Recent Orders
                </h2>
                <Clock className="w-4 h-4 text-primary/40" />
              </div>

              {orders.length > 0 ? (
                <div className="divide-y divide-light">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="px-6 py-4 flex items-center justify-between hover:bg-light/50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-primary">
                          {order.user?.name || order.user?.email || 'Customer'}
                        </p>
                        <p className="text-xs text-primary/50">
                          {formatDate(order.createdAt)} &middot; #{order.id.slice(0, 8)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            statusColors[order.status] || 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {order.status}
                        </span>
                        <span className="font-semibold text-primary text-sm">
                          {formatPrice(order.total)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <Package className="w-10 h-10 text-primary/20 mx-auto mb-3" />
                  <p className="text-primary/60 text-sm">
                    No orders yet. Share your storefront to start selling!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Products Summary */}
          <div>
            <div className="bg-white rounded-xl border border-light p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-primary">Your Products</h3>
                <Link
                  href="/dashboard/products"
                  className="text-xs text-teal hover:underline"
                >
                  Manage All
                </Link>
              </div>
              {products.length > 0 ? (
                <div className="space-y-3">
                  {products.slice(0, 5).map((product) => (
                    <Link
                      key={product.id}
                      href={`/marketplace/${product.slug}`}
                      className="flex items-center gap-3 group"
                    >
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-light flex items-center justify-center">
                          <ShoppingBag className="w-4 h-4 text-primary/20" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-primary truncate group-hover:text-accent transition-colors">
                          {product.name}
                        </p>
                        <p className="text-xs text-primary/50">
                          {formatPrice(product.price)} &middot;{' '}
                          {product.inventory} in stock
                        </p>
                      </div>
                    </Link>
                  ))}
                  {products.length > 5 && (
                    <p className="text-xs text-center text-primary/40 pt-2">
                      +{products.length - 5} more products
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-primary/60 mb-3">
                    No products listed yet.
                  </p>
                  <Link
                    href="/dashboard/products"
                    className="text-sm text-teal hover:underline font-medium"
                  >
                    Add your first product
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
