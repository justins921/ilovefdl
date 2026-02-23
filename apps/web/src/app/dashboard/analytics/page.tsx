'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  ShoppingCart,
  Package,
  TrendingUp,
  Percent,
  Wallet,
  BarChart3,
  Trophy,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { formatPrice } from '@/lib/utils';
import type { VendorAnalytics } from '@ilovefdl/shared';

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<VendorAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      const tokenStr = localStorage.getItem('ilovefdl_token');
      if (tokenStr) api.setToken(tokenStr);

      const res = await api.getVendorAnalytics();
      setAnalytics(res.data);
    } catch {
      setError('Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Loading State ───────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-white rounded w-1/3" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-32 bg-white rounded-xl" />
              ))}
            </div>
            <div className="h-64 bg-white rounded-xl" />
            <div className="h-48 bg-white rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="text-center max-w-md">
          <BarChart3 className="w-16 h-16 text-primary/20 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-primary mb-3">
            {error || 'No analytics data available'}
          </h1>
          <p className="text-primary/60 mb-6">
            Analytics data will appear once you start receiving orders.
          </p>
        </div>
      </div>
    );
  }

  // ─── Chart helpers ───────────────────────────────────────

  const maxRevenue = Math.max(
    ...analytics.revenueByMonth.map((m) => m.revenue),
    1
  );

  // ─── Stat cards definition ──────────────────────────────

  const stats = [
    {
      label: 'Total Revenue',
      value: formatPrice(analytics.totalRevenue),
      icon: DollarSign,
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
    },
    {
      label: 'Total Orders',
      value: analytics.totalOrders.toLocaleString(),
      icon: ShoppingCart,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Total Products',
      value: analytics.totalProducts.toLocaleString(),
      icon: Package,
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
    {
      label: 'Avg. Order Value',
      value: formatPrice(analytics.averageOrderValue),
      icon: TrendingUp,
      iconBg: 'bg-orange-50',
      iconColor: 'text-orange-600',
    },
    {
      label: 'Commission Paid',
      value: formatPrice(analytics.totalCommissionPaid),
      icon: Percent,
      iconBg: 'bg-red-50',
      iconColor: 'text-red-600',
    },
    {
      label: 'Pending Payouts',
      value: formatPrice(analytics.pendingPayouts),
      icon: Wallet,
      iconBg: 'bg-teal/10',
      iconColor: 'text-teal',
    },
  ];

  // ─── Main Render ─────────────────────────────────────────

  return (
    <div className="min-h-screen bg-light">
      {/* Header */}
      <div className="bg-white border-b border-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-1">
              Analytics
            </h1>
            <p className="text-primary/60">
              Track your store performance and revenue
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="bg-white rounded-xl border border-light p-6"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.iconBg}`}
                  >
                    <Icon className={`w-5 h-5 ${stat.iconColor}`} />
                  </div>
                  <span className="text-sm text-primary/60">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold text-primary">{stat.value}</p>
              </div>
            );
          })}
        </div>

        {/* Revenue by Month Chart */}
        {analytics.revenueByMonth.length > 0 && (
          <div className="bg-white rounded-xl border border-light p-6">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="w-5 h-5 text-primary/40" />
              <h2 className="text-lg font-bold text-primary">
                Revenue by Month
              </h2>
            </div>

            <div className="flex items-end gap-2 h-64">
              {analytics.revenueByMonth.map((month) => {
                const heightPercent = (month.revenue / maxRevenue) * 100;
                return (
                  <div
                    key={month.month}
                    className="flex-1 flex flex-col items-center justify-end gap-2 group"
                  >
                    {/* Tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-center">
                      <p className="text-xs font-semibold text-primary">
                        {formatPrice(month.revenue)}
                      </p>
                      <p className="text-xs text-primary/40">
                        {month.orders} order{month.orders !== 1 ? 's' : ''}
                      </p>
                    </div>

                    {/* Bar */}
                    <div
                      className="w-full bg-teal/80 rounded-t-lg hover:bg-teal transition-colors min-h-[4px]"
                      style={{ height: `${Math.max(heightPercent, 2)}%` }}
                    />

                    {/* Label */}
                    <span className="text-xs text-primary/50 truncate w-full text-center">
                      {month.month}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Top Products Table */}
        {analytics.topProducts.length > 0 && (
          <div className="bg-white rounded-xl border border-light overflow-hidden">
            <div className="px-6 py-4 border-b border-light flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary/40" />
              <h2 className="text-lg font-bold text-primary">
                Top Products
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-light">
                    <th className="text-left text-xs font-semibold text-primary/50 uppercase tracking-wider px-6 py-4">
                      #
                    </th>
                    <th className="text-left text-xs font-semibold text-primary/50 uppercase tracking-wider px-6 py-4">
                      Product
                    </th>
                    <th className="text-right text-xs font-semibold text-primary/50 uppercase tracking-wider px-6 py-4">
                      Revenue
                    </th>
                    <th className="text-right text-xs font-semibold text-primary/50 uppercase tracking-wider px-6 py-4">
                      Qty Sold
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-light">
                  {analytics.topProducts.map((product, index) => (
                    <tr
                      key={product.productId}
                      className="hover:bg-light/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-primary/40">
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-primary">
                          {product.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-medium text-primary">
                          {formatPrice(product.revenue)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm text-primary/60">
                          {product.quantity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
