'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import {
  Package,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  Store,
  ArrowRight,
  X,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { formatPrice, formatDate } from '@/lib/utils';
import type { Order, Vendor } from '@ilovefdl/shared';
import { OrderStatus } from '@ilovefdl/shared';

const STATUS_FILTERS = ['ALL', ...Object.values(OrderStatus)] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const STATUS_BADGE_CLASSES: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'bg-yellow-50 text-yellow-700',
  [OrderStatus.PAID]: 'bg-blue-50 text-blue-600',
  [OrderStatus.PROCESSING]: 'bg-indigo-50 text-indigo-600',
  [OrderStatus.SHIPPED]: 'bg-purple-50 text-purple-600',
  [OrderStatus.FULFILLED]: 'bg-teal/10 text-teal',
  [OrderStatus.REFUNDED]: 'bg-red-50 text-red-600',
  [OrderStatus.CANCELLED]: 'bg-gray-100 text-gray-500',
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'Pending',
  [OrderStatus.PAID]: 'Paid',
  [OrderStatus.PROCESSING]: 'Processing',
  [OrderStatus.SHIPPED]: 'Shipped',
  [OrderStatus.FULFILLED]: 'Fulfilled',
  [OrderStatus.REFUNDED]: 'Refunded',
  [OrderStatus.CANCELLED]: 'Cancelled',
};

function truncateId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}...` : id;
}

export default function OrdersPage() {
  const { user } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  // Expanded order rows
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

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
        const ordersRes = await api.getOrders({
          vendorId: myVendor.id,
          limit: 50,
        });
        setOrders(ordersRes.data);
      }
    } catch {
      setError('Failed to load orders.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Filtered Orders ───────────────────────────────────

  const filteredOrders =
    statusFilter === 'ALL'
      ? orders
      : orders.filter((o) => o.status === statusFilter);

  // ─── Loading State ─────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-white rounded w-1/3" />
            <div className="h-10 bg-white rounded w-2/3" />
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-20 bg-white rounded-xl" />
              ))}
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
            You need a vendor profile to view orders. Apply to become a vendor
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
                Orders
              </h1>
              <p className="text-primary/60 text-sm sm:text-base">
                Manage orders for {vendor.businessName}
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-primary/60">
              <ShoppingCart className="w-4 h-4" />
              <span>
                {orders.length} total order{orders.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
            <span className="text-sm">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Status Filter Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {STATUS_FILTERS.map((status) => {
            const isActive = statusFilter === status;
            const count =
              status === 'ALL'
                ? orders.length
                : orders.filter((o) => o.status === status).length;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'bg-white border border-light text-primary/60 hover:text-primary hover:border-primary/20'
                }`}
              >
                {status === 'ALL' ? 'All' : STATUS_LABELS[status as OrderStatus]}{' '}
                <span
                  className={`ml-1 ${isActive ? 'text-white/70' : 'text-primary/40'}`}
                >
                  ({count})
                </span>
              </button>
            );
          })}
        </div>

        {/* Orders Table */}
        {filteredOrders.length > 0 ? (
          <div className="bg-white rounded-xl border border-light overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-light">
                    <th className="text-left text-xs font-semibold text-primary/50 uppercase tracking-wider px-4 sm:px-6 py-4 w-8" />
                    <th className="text-left text-xs font-semibold text-primary/50 uppercase tracking-wider px-4 sm:px-6 py-4">
                      Order
                    </th>
                    <th className="text-left text-xs font-semibold text-primary/50 uppercase tracking-wider px-4 sm:px-6 py-4">
                      Customer
                    </th>
                    <th className="text-left text-xs font-semibold text-primary/50 uppercase tracking-wider px-4 sm:px-6 py-4 hidden md:table-cell">
                      Date
                    </th>
                    <th className="text-left text-xs font-semibold text-primary/50 uppercase tracking-wider px-4 sm:px-6 py-4">
                      Status
                    </th>
                    <th className="text-right text-xs font-semibold text-primary/50 uppercase tracking-wider px-4 sm:px-6 py-4">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-light">
                  {filteredOrders.map((order) => {
                    const isExpanded = expandedIds.has(order.id);
                    return (
                      <Fragment key={order.id}>
                        <tr
                          onClick={() => toggleExpanded(order.id)}
                          className="hover:bg-light/50 transition-colors cursor-pointer"
                        >
                          {/* Expand toggle */}
                          <td className="px-4 sm:px-6 py-4">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-primary/40" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-primary/40" />
                            )}
                          </td>

                          {/* Order ID */}
                          <td className="px-4 sm:px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                                <Package className="w-4 h-4 text-accent" />
                              </div>
                              <span
                                className="text-sm font-bold text-primary font-mono tracking-wide"
                                title={order.id}
                              >
                                {truncateId(order.id)}
                              </span>
                            </div>
                          </td>

                          {/* Customer */}
                          <td className="px-4 sm:px-6 py-4">
                            {order.user ? (
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-primary truncate">
                                  {order.user.name || 'Unknown'}
                                </p>
                                <p className="text-xs text-primary/50 truncate">
                                  {order.user.email}
                                </p>
                              </div>
                            ) : (
                              <span className="text-sm text-primary/40">
                                N/A
                              </span>
                            )}
                          </td>

                          {/* Date */}
                          <td className="px-4 sm:px-6 py-4 hidden md:table-cell">
                            <span className="text-sm text-primary/60">
                              {formatDate(order.createdAt)}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-4 sm:px-6 py-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE_CLASSES[order.status]}`}
                            >
                              {STATUS_LABELS[order.status]}
                            </span>
                          </td>

                          {/* Total */}
                          <td className="px-4 sm:px-6 py-4 text-right">
                            <span className="text-sm font-semibold text-primary">
                              {formatPrice(order.total)}
                            </span>
                          </td>
                        </tr>

                        {/* Expanded Row: Order Items */}
                        {isExpanded && (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-4 sm:px-6 py-4 bg-light/50"
                            >
                              <div className="space-y-4">
                                {/* Order details summary */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <p className="text-primary/50 text-xs uppercase tracking-wider mb-1">
                                      Subtotal
                                    </p>
                                    <p className="font-medium text-primary">
                                      {formatPrice(order.subtotal)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-primary/50 text-xs uppercase tracking-wider mb-1">
                                      Tax
                                    </p>
                                    <p className="font-medium text-primary">
                                      {formatPrice(order.tax)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-primary/50 text-xs uppercase tracking-wider mb-1">
                                      Shipping
                                    </p>
                                    <p className="font-medium text-primary">
                                      {formatPrice(order.shipping)}
                                    </p>
                                  </div>
                                  {order.discount > 0 && (
                                    <div>
                                      <p className="text-primary/50 text-xs uppercase tracking-wider mb-1">
                                        Discount
                                      </p>
                                      <p className="font-medium text-teal">
                                        -{formatPrice(order.discount)}
                                      </p>
                                    </div>
                                  )}
                                </div>

                                {/* Tracking info */}
                                {(order.trackingNumber || order.trackingCarrier) && (
                                  <div className="text-sm">
                                    <p className="text-primary/50 text-xs uppercase tracking-wider mb-1">
                                      Tracking
                                    </p>
                                    <p className="font-medium text-primary">
                                      {order.trackingCarrier && (
                                        <span className="mr-2">
                                          {order.trackingCarrier}
                                        </span>
                                      )}
                                      {order.trackingNumber && (
                                        <span className="font-mono">
                                          {order.trackingNumber}
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                )}

                                {/* Shipping address */}
                                {order.shippingAddress && (
                                  <div className="text-sm">
                                    <p className="text-primary/50 text-xs uppercase tracking-wider mb-1">
                                      Shipping Address
                                    </p>
                                    <p className="text-primary/80">
                                      {typeof order.shippingAddress === 'object'
                                        ? Object.values(
                                            order.shippingAddress as unknown as Record<string, string>,
                                          )
                                            .filter(Boolean)
                                            .join(', ')
                                        : String(order.shippingAddress)}
                                    </p>
                                  </div>
                                )}

                                {/* Items */}
                                {order.items && order.items.length > 0 ? (
                                  <div>
                                    <p className="text-primary/50 text-xs uppercase tracking-wider mb-2">
                                      Items ({order.items.length})
                                    </p>
                                    <div className="bg-white rounded-lg border border-light divide-y divide-light">
                                      {order.items.map((item) => (
                                        <div
                                          key={item.id}
                                          className="flex items-center justify-between px-4 py-3"
                                        >
                                          <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 rounded bg-light flex items-center justify-center flex-shrink-0">
                                              <Package className="w-3.5 h-3.5 text-primary/30" />
                                            </div>
                                            <div className="min-w-0">
                                              <p className="text-sm font-medium text-primary truncate">
                                                {item.product?.name ||
                                                  `Product ${truncateId(item.productId)}`}
                                              </p>
                                              {item.variantName && (
                                                <p className="text-xs text-primary/50">
                                                  {item.variantName}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                          <div className="text-right flex-shrink-0 ml-4">
                                            <p className="text-sm font-medium text-primary">
                                              {formatPrice(item.total)}
                                            </p>
                                            <p className="text-xs text-primary/50">
                                              {item.quantity} x{' '}
                                              {formatPrice(item.unitPrice)}
                                            </p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-sm text-primary/40">
                                    No item details available.
                                  </p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="bg-white rounded-xl border border-light p-16 text-center">
            <ShoppingCart className="w-16 h-16 text-primary/20 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-primary mb-2">
              {statusFilter === 'ALL'
                ? 'No orders yet'
                : `No ${STATUS_LABELS[statusFilter as OrderStatus].toLowerCase()} orders`}
            </h2>
            <p className="text-primary/60 mb-6 max-w-md mx-auto">
              {statusFilter === 'ALL'
                ? 'When customers place orders from your store, they will appear here.'
                : 'Try selecting a different status filter to see other orders.'}
            </p>
            {statusFilter !== 'ALL' && (
              <button
                onClick={() => setStatusFilter('ALL')}
                className="btn-primary"
              >
                View All Orders
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
