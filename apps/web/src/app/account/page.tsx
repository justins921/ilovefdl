'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  User,
  ShoppingBag,
  Package,
  Clock,
  ArrowRight,
  Heart,
  LogOut,
  MapPin,
  MessageSquare,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { formatPrice, formatDate } from '@/lib/utils';
import type { Order } from '@ilovefdl/shared';

export default function AccountPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    async function fetchOrders() {
      try {
        const res = await api.getOrders({ limit: 50 });
        setOrders(res.data);
      } catch {
        // Failed to fetch orders
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, [user, authLoading]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="animate-pulse text-primary/40">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="text-center max-w-md">
          <User className="w-16 h-16 text-primary/20 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-primary mb-3">
            Sign In Required
          </h1>
          <p className="text-primary/60 mb-6">
            Please sign in to view your account and order history.
          </p>
          <Link href="/auth" className="btn-primary">
            Sign In
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </div>
    );
  }

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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-primary mb-1">
                My Account
              </h1>
              <p className="text-primary/60">
                Welcome back, {user.name || user.email.split('@')[0]}
              </p>
            </div>
            <button
              onClick={logout}
              className="btn-outline text-sm text-accent border-accent/20 hover:bg-accent/5"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Profile Card */}
        <div className="bg-white rounded-xl border border-light p-6">
          <h2 className="text-lg font-bold text-primary mb-4">Profile</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-primary/50 uppercase tracking-wider mb-1">Name</p>
              <p className="text-sm font-medium text-primary">{user.name || 'Not set'}</p>
            </div>
            <div>
              <p className="text-xs text-primary/50 uppercase tracking-wider mb-1">Email</p>
              <p className="text-sm font-medium text-primary">{user.email}</p>
            </div>
            <div>
              <p className="text-xs text-primary/50 uppercase tracking-wider mb-1">Member Since</p>
              <p className="text-sm font-medium text-primary">{user.createdAt ? formatDate(user.createdAt) : 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-primary/50 uppercase tracking-wider mb-1">Account Type</p>
              <p className="text-sm font-medium text-primary capitalize">{user.role.toLowerCase()}</p>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Link
            href="/wishlist"
            className="bg-white rounded-xl border border-light p-5 hover:shadow-md transition-shadow flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                <Heart className="w-5 h-5 text-accent" />
              </div>
              <span className="font-medium text-primary">My Wishlist</span>
            </div>
            <ArrowRight className="w-4 h-4 text-primary/30 group-hover:text-primary/60 transition-colors" />
          </Link>
          <Link
            href="/account/addresses"
            className="bg-white rounded-xl border border-light p-5 hover:shadow-md transition-shadow flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal/10 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-teal" />
              </div>
              <span className="font-medium text-primary">Saved Addresses</span>
            </div>
            <ArrowRight className="w-4 h-4 text-primary/30 group-hover:text-primary/60 transition-colors" />
          </Link>
          <Link
            href="/marketplace"
            className="bg-white rounded-xl border border-light p-5 hover:shadow-md transition-shadow flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal/10 rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-teal" />
              </div>
              <span className="font-medium text-primary">Shop Marketplace</span>
            </div>
            <ArrowRight className="w-4 h-4 text-primary/30 group-hover:text-primary/60 transition-colors" />
          </Link>
          <Link
            href="/dashboard/messages"
            className="bg-white rounded-xl border border-light p-5 hover:shadow-md transition-shadow flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <span className="font-medium text-primary">Messages</span>
            </div>
            <ArrowRight className="w-4 h-4 text-primary/30 group-hover:text-primary/60 transition-colors" />
          </Link>
        </div>

        {/* Orders */}
        <div className="bg-white rounded-xl border border-light overflow-hidden">
          <div className="px-6 py-4 border-b border-light flex items-center justify-between">
            <h2 className="text-lg font-bold text-primary">Order History</h2>
            <Clock className="w-4 h-4 text-primary/40" />
          </div>

          {loading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-4">
                  <div className="h-4 bg-light rounded w-1/6" />
                  <div className="h-4 bg-light rounded w-1/4" />
                  <div className="h-4 bg-light rounded w-1/6" />
                </div>
              ))}
            </div>
          ) : orders.length > 0 ? (
            <div className="divide-y divide-light">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="px-6 py-4 flex items-center justify-between hover:bg-light/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-medium text-primary">
                        Order #{order.id.slice(0, 8)}
                      </p>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          statusColors[order.status] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <p className="text-xs text-primary/50 mt-1">
                      {formatDate(order.createdAt)}
                      {order.vendor && ` \u00B7 ${order.vendor.businessName}`}
                    </p>
                    {order.items && order.items.length > 0 && (
                      <p className="text-xs text-primary/40 mt-0.5">
                        {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  <span className="font-semibold text-primary text-sm ml-4">
                    {formatPrice(order.total)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <Package className="w-10 h-10 text-primary/20 mx-auto mb-3" />
              <p className="text-primary/60 text-sm mb-4">
                No orders yet. Start shopping local!
              </p>
              <Link href="/marketplace" className="btn-primary text-sm">
                Browse Marketplace
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
