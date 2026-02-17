'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Store,
  ShoppingBag,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Users,
  Newspaper,
  Beer,
  ArrowRight,
  Clock,
} from 'lucide-react';
import api from '@/lib/api';
import { formatPrice, formatDate } from '@/lib/utils';
import type { Order, Vendor, Product, BlogPost } from '@ilovefdl/shared';

interface DashboardStats {
  vendorCount: number;
  productCount: number;
  orderCount: number;
  revenue: number;
}

export default function AdminPage() {
  const [stats, setStats] = useState<DashboardStats>({
    vendorCount: 0,
    productCount: 0,
    orderCount: 0,
    revenue: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [vendorsRes, productsRes, ordersRes] = await Promise.all([
          api.getVendors({ limit: 1 }),
          api.getProducts({ limit: 1 }),
          api.getOrders({ limit: 10 }),
        ]);

        const revenue = ordersRes.data.reduce(
          (sum, order) => sum + order.total,
          0
        );

        setStats({
          vendorCount: vendorsRes.total,
          productCount: productsRes.total,
          orderCount: ordersRes.total,
          revenue,
        });
        setRecentOrders(ordersRes.data);
      } catch {
        // Dashboard data failed - show zeros
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  const statCards = [
    {
      label: 'Total Vendors',
      value: stats.vendorCount,
      icon: Store,
      color: 'text-teal',
      bg: 'bg-teal/10',
    },
    {
      label: 'Total Products',
      value: stats.productCount,
      icon: ShoppingBag,
      color: 'text-accent',
      bg: 'bg-accent/10',
    },
    {
      label: 'Total Orders',
      value: stats.orderCount,
      icon: ShoppingCart,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Revenue',
      value: formatPrice(stats.revenue),
      icon: DollarSign,
      color: 'text-teal',
      bg: 'bg-teal/10',
    },
  ];

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    PAID: 'bg-blue-100 text-blue-800',
    FULFILLED: 'bg-green-100 text-green-800',
    REFUNDED: 'bg-gray-100 text-gray-800',
    CANCELLED: 'bg-red-100 text-red-800',
  };

  return (
    <div className="min-h-screen bg-light">
      {/* Header */}
      <div className="bg-white border-b border-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-primary mb-1">
            Admin Dashboard
          </h1>
          <p className="text-primary/60">
            Manage the I Love FDL platform
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {statCards.map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-light p-6"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-primary">
                {loading ? (
                  <span className="inline-block w-16 h-7 bg-light rounded animate-pulse" />
                ) : (
                  stat.value
                )}
              </p>
              <p className="text-sm text-primary/60 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Quick Links */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Manage Vendors', href: '/vendors', icon: Store, color: 'border-teal' },
            { label: 'Manage Products', href: '/marketplace', icon: ShoppingBag, color: 'border-accent' },
            { label: 'Blog Posts', href: '/news', icon: Newspaper, color: 'border-primary' },
            { label: 'Bars & Specials', href: '/bars', icon: Beer, color: 'border-teal' },
          ].map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={`bg-white rounded-xl border-l-4 ${link.color} border border-light p-5 hover:shadow-md transition-shadow flex items-center justify-between group`}
            >
              <div className="flex items-center gap-3">
                <link.icon className="w-5 h-5 text-primary/60" />
                <span className="font-medium text-primary">{link.label}</span>
              </div>
              <ArrowRight className="w-4 h-4 text-primary/30 group-hover:text-primary/60 transition-colors" />
            </Link>
          ))}
        </div>

        {/* Recent Orders Table */}
        <div className="bg-white rounded-xl border border-light overflow-hidden">
          <div className="px-6 py-4 border-b border-light flex items-center justify-between">
            <h2 className="text-lg font-bold text-primary">Recent Orders</h2>
            <Clock className="w-4 h-4 text-primary/40" />
          </div>

          {loading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse flex items-center gap-4"
                >
                  <div className="h-4 bg-light rounded w-1/6" />
                  <div className="h-4 bg-light rounded w-1/4" />
                  <div className="h-4 bg-light rounded w-1/6" />
                  <div className="h-4 bg-light rounded w-1/6" />
                </div>
              ))}
            </div>
          ) : recentOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-semibold text-primary/50 uppercase tracking-wider border-b border-light">
                    <th className="px-6 py-3">Order ID</th>
                    <th className="px-6 py-3">Customer</th>
                    <th className="px-6 py-3">Vendor</th>
                    <th className="px-6 py-3">Total</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-light">
                  {recentOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-light/50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm font-mono text-primary/60">
                        {order.id.slice(0, 8)}...
                      </td>
                      <td className="px-6 py-4 text-sm text-primary">
                        {order.user?.name || order.user?.email || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 text-sm text-primary/60">
                        {order.vendor?.businessName || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-primary">
                        {formatPrice(order.total)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            statusColors[order.status] || 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-primary/60">
                        {formatDate(order.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <ShoppingCart className="w-10 h-10 text-primary/20 mx-auto mb-3" />
              <p className="text-primary/60 text-sm">No orders yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
