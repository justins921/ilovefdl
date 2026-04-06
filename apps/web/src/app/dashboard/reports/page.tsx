'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart3,
  DollarSign,
  ShoppingCart,
  Package,
  TrendingUp,
  Store,
  ArrowRight,
  PieChart,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { formatPrice, formatDate } from '@/lib/utils';
import type { Order, Product, Vendor } from '@ilovefdl/shared';
import { OrderStatus } from '@ilovefdl/shared';

const STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'Pending',
  [OrderStatus.PAID]: 'Paid',
  [OrderStatus.PROCESSING]: 'Processing',
  [OrderStatus.SHIPPED]: 'Shipped',
  [OrderStatus.FULFILLED]: 'Fulfilled',
  [OrderStatus.REFUNDED]: 'Refunded',
  [OrderStatus.CANCELLED]: 'Cancelled',
};

const STATUS_BADGE_CLASSES: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'bg-yellow-50 text-yellow-700',
  [OrderStatus.PAID]: 'bg-blue-50 text-blue-600',
  [OrderStatus.PROCESSING]: 'bg-indigo-50 text-indigo-600',
  [OrderStatus.SHIPPED]: 'bg-purple-50 text-purple-600',
  [OrderStatus.FULFILLED]: 'bg-teal/10 text-teal',
  [OrderStatus.REFUNDED]: 'bg-red-50 text-red-600',
  [OrderStatus.CANCELLED]: 'bg-gray-100 text-gray-500',
};

export default function ReportsPage() {
  const { user } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      const tokenStr = localStorage.getItem('ilovefdl_token');
      if (tokenStr) {
        api.setToken(tokenStr);
      }

      const vendorRes = await api.getMyVendor();
      const myVendor = vendorRes.data;

      if (myVendor) {
        setVendor(myVendor);
        const [ordersRes, productsRes] = await Promise.all([
          api.getOrders({ vendorId: myVendor.id, limit: 200 }),
          api.getProducts({ vendorId: myVendor.id, limit: 200 }),
        ]);
        setOrders(ordersRes.data);
        setProducts(productsRes.data);
      }
    } catch {
      setError('Failed to load reports data.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Computed Stats ─────────────────────────────────────

  const revenueSummary = useMemo(() => {
    const nonCancelledOrders = orders.filter(
      (o) => o.status !== OrderStatus.CANCELLED && o.status !== OrderStatus.REFUNDED,
    );
    const totalRevenue = nonCancelledOrders.reduce((sum, o) => sum + o.total, 0);
    const totalOrders = nonCancelledOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const commissionPaid = nonCancelledOrders.reduce(
      (sum, o) => sum + o.commissionAmount,
      0,
    );

    return { totalRevenue, totalOrders, avgOrderValue, commissionPaid };
  }, [orders]);

  const orderStatusBreakdown = useMemo(() => {
    const counts: Record<OrderStatus, number> = {
      [OrderStatus.PENDING]: 0,
      [OrderStatus.PAID]: 0,
      [OrderStatus.PROCESSING]: 0,
      [OrderStatus.SHIPPED]: 0,
      [OrderStatus.FULFILLED]: 0,
      [OrderStatus.REFUNDED]: 0,
      [OrderStatus.CANCELLED]: 0,
    };
    for (const order of orders) {
      counts[order.status]++;
    }
    return counts;
  }, [orders]);

  const productPerformance = useMemo(() => {
    // Build a map of productId -> { totalSold, revenue }
    const productStats: Record<string, { totalSold: number; revenue: number }> = {};

    for (const order of orders) {
      if (
        order.status === OrderStatus.CANCELLED ||
        order.status === OrderStatus.REFUNDED
      ) {
        continue;
      }
      if (order.items) {
        for (const item of order.items) {
          if (!productStats[item.productId]) {
            productStats[item.productId] = { totalSold: 0, revenue: 0 };
          }
          productStats[item.productId].totalSold += item.quantity;
          productStats[item.productId].revenue += item.total;
        }
      }
    }

    return products
      .map((product) => ({
        id: product.id,
        name: product.name,
        totalSold: productStats[product.id]?.totalSold ?? 0,
        revenue: productStats[product.id]?.revenue ?? 0,
        stock: product.inventory,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [orders, products]);

  const categoryBreakdown = useMemo(() => {
    const catMap: Record<string, number> = {};
    for (const product of products) {
      if (product.categoryTags && product.categoryTags.length > 0) {
        for (const tag of product.categoryTags) {
          catMap[tag] = (catMap[tag] || 0) + 1;
        }
      } else {
        catMap['Uncategorized'] = (catMap['Uncategorized'] || 0) + 1;
      }
    }
    return Object.entries(catMap)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }, [products]);

  // ─── Loading State ─────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-white rounded w-1/3" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 bg-white rounded-xl" />
              ))}
            </div>
            <div className="h-64 bg-white rounded-xl" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-48 bg-white rounded-xl" />
              <div className="h-48 bg-white rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── No Vendor State ───────────────────────────────────

  if (!vendor) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="text-center max-w-md">
          <Store className="w-16 h-16 text-primary/20 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-primary mb-3">
            No Vendor Profile
          </h1>
          <p className="text-primary/60 mb-6">
            You need a vendor profile to view reports. Apply to become a vendor
            on the I Love FDL marketplace.
          </p>
          <a href="/auth" className="btn-primary">
            Apply to Sell
            <ArrowRight className="w-4 h-4 ml-2" />
          </a>
        </div>
      </div>
    );
  }

  // ─── Main Render ───────────────────────────────────────

  return (
    <div className="min-h-screen bg-light">
      {/* Header */}
      <div className="bg-white border-b border-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-1">
                Reports
              </h1>
              <p className="text-primary/60 text-sm sm:text-base">
                Analytics and performance for {vendor.businessName}
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-primary/60">
              <BarChart3 className="w-4 h-4" />
              <span>
                {orders.length} order{orders.length !== 1 ? 's' : ''} &middot;{' '}
                {products.length} product{products.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Revenue Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-light p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-teal/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-teal" />
              </div>
              <p className="text-sm font-medium text-primary/60">Total Revenue</p>
            </div>
            <p className="text-2xl font-bold text-primary">
              {formatPrice(revenueSummary.totalRevenue)}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-light p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-sm font-medium text-primary/60">Total Orders</p>
            </div>
            <p className="text-2xl font-bold text-primary">
              {revenueSummary.totalOrders}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-light p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-sm font-medium text-primary/60">Avg Order Value</p>
            </div>
            <p className="text-2xl font-bold text-primary">
              {formatPrice(revenueSummary.avgOrderValue)}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-light p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <PieChart className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-sm font-medium text-primary/60">Commission Paid</p>
            </div>
            <p className="text-2xl font-bold text-primary">
              {formatPrice(revenueSummary.commissionPaid)}
            </p>
          </div>
        </div>

        {/* Product Performance Table */}
        <div className="bg-white rounded-xl border border-light overflow-hidden mb-8">
          <div className="px-6 py-5 border-b border-light">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary/40" />
              <h2 className="text-lg font-bold text-primary">Product Performance</h2>
            </div>
          </div>

          {productPerformance.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-light">
                    <th className="text-left text-xs font-semibold text-primary/50 uppercase tracking-wider px-6 py-4">
                      Product
                    </th>
                    <th className="text-right text-xs font-semibold text-primary/50 uppercase tracking-wider px-6 py-4">
                      Total Sold
                    </th>
                    <th className="text-right text-xs font-semibold text-primary/50 uppercase tracking-wider px-6 py-4">
                      Revenue
                    </th>
                    <th className="text-right text-xs font-semibold text-primary/50 uppercase tracking-wider px-6 py-4">
                      Stock
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-light">
                  {productPerformance.map((product) => (
                    <tr key={product.id} className="hover:bg-light/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-primary">
                          {product.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm text-primary/60">
                          {product.totalSold}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-semibold text-primary">
                          {formatPrice(product.revenue)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`text-sm font-medium ${
                            product.stock <= 0
                              ? 'text-red-500'
                              : product.stock <= 5
                                ? 'text-yellow-600'
                                : 'text-primary/60'
                          }`}
                        >
                          {product.stock}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <Package className="w-12 h-12 text-primary/20 mx-auto mb-3" />
              <p className="text-sm text-primary/60">No products found.</p>
            </div>
          )}
        </div>

        {/* Bottom Grid: Order Status + Category Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Status Breakdown */}
          <div className="bg-white rounded-xl border border-light overflow-hidden">
            <div className="px-6 py-5 border-b border-light">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary/40" />
                <h2 className="text-lg font-bold text-primary">
                  Order Status Breakdown
                </h2>
              </div>
            </div>
            <div className="p-6 space-y-3">
              {Object.values(OrderStatus).map((status) => {
                const count = orderStatusBreakdown[status];
                const percentage =
                  orders.length > 0
                    ? Math.round((count / orders.length) * 100)
                    : 0;

                return (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE_CLASSES[status]}`}
                      >
                        {STATUS_LABELS[status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 bg-light rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary/20 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-primary w-8 text-right">
                        {count}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div className="pt-3 mt-3 border-t border-light flex items-center justify-between">
                <span className="text-sm font-semibold text-primary">Total</span>
                <span className="text-sm font-bold text-primary">{orders.length}</span>
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="bg-white rounded-xl border border-light overflow-hidden">
            <div className="px-6 py-5 border-b border-light">
              <div className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-primary/40" />
                <h2 className="text-lg font-bold text-primary">Category Breakdown</h2>
              </div>
            </div>
            {categoryBreakdown.length > 0 ? (
              <div className="p-6 space-y-3">
                {categoryBreakdown.map(({ category, count }) => {
                  const percentage =
                    products.length > 0
                      ? Math.round((count / products.length) * 100)
                      : 0;

                  return (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-primary truncate mr-4">
                        {category}
                      </span>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="w-24 h-2 bg-light rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent/40 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-primary/60 w-16 text-right">
                          {count} product{count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-6 py-12 text-center">
                <PieChart className="w-12 h-12 text-primary/20 mx-auto mb-3" />
                <p className="text-sm text-primary/60">No categories found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
