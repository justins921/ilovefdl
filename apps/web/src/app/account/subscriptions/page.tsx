'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Repeat,
  Package,
  Pause,
  Play,
  Pencil,
  XCircle,
  X,
  Loader2,
  User,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Calendar,
  ShoppingBag,
  Clock,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { formatPrice, formatDate } from '@/lib/utils';
import type { Subscription, SubscriptionStatus } from '@ilovefdl/shared';

// ─── Interval options ────────────────────────────────────

const INTERVAL_OPTIONS = [
  { value: 7, label: 'Weekly' },
  { value: 14, label: 'Bi-weekly' },
  { value: 30, label: 'Monthly' },
  { value: 60, label: 'Every 2 months' },
  { value: 90, label: 'Every 3 months' },
];

// ─── Helpers ─────────────────────────────────────────────

function intervalLabel(days: number): string {
  const option = INTERVAL_OPTIONS.find((o) => o.value === days);
  if (option) return option.label;
  if (days === 1) return 'Every day';
  if (days < 7) return `Every ${days} days`;
  if (days % 30 === 0) {
    const months = days / 30;
    return months === 1 ? 'Monthly' : `Every ${months} months`;
  }
  if (days % 7 === 0) {
    const weeks = days / 7;
    return weeks === 1 ? 'Weekly' : `Every ${weeks} weeks`;
  }
  return `Every ${days} days`;
}

function statusBadge(status: SubscriptionStatus | string) {
  switch (status) {
    case 'ACTIVE':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3" />
          Active
        </span>
      );
    case 'PAUSED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Pause className="w-3 h-3" />
          Paused
        </span>
      );
    case 'CANCELLED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <XCircle className="w-3 h-3" />
          Cancelled
        </span>
      );
    case 'EXPIRED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          <Clock className="w-3 h-3" />
          Expired
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          {status}
        </span>
      );
  }
}

// ─── Edit modal form ─────────────────────────────────────

interface EditFormData {
  quantity: number;
  intervalDays: number;
}

// ─── Component ───────────────────────────────────────────

export default function SubscriptionsPage() {
  const { user, loading: authLoading } = useAuth();

  // Subscriptions list
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  // Action states
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState<string | null>(null);

  // Edit modal state
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [editForm, setEditForm] = useState<EditFormData>({ quantity: 1, intervalDays: 30 });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // General feedback
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ─── Fetch subscriptions ───────────────────────────────

  const fetchSubscriptions = useCallback(async () => {
    try {
      const res = await api.getSubscriptions();
      setSubscriptions(res.data);
    } catch {
      // Failed to fetch subscriptions
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    fetchSubscriptions();
  }, [user, authLoading, fetchSubscriptions]);

  // ─── Auto-dismiss success message ──────────────────────

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  // ─── Pause / Resume toggle ─────────────────────────────

  async function handleTogglePause(sub: Subscription) {
    const newStatus = sub.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';

    setTogglingIds((prev) => new Set(prev).add(sub.id));

    try {
      await api.updateSubscription(sub.id, { status: newStatus });
      setSubscriptions((prev) =>
        prev.map((s) =>
          s.id === sub.id ? { ...s, status: newStatus as SubscriptionStatus } : s,
        ),
      );
      setSuccessMessage(
        newStatus === 'PAUSED'
          ? 'Subscription paused successfully.'
          : 'Subscription resumed successfully.',
      );
    } catch {
      // Failed to toggle
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(sub.id);
        return next;
      });
    }
  }

  // ─── Cancel handler ────────────────────────────────────

  async function handleCancel(subId: string) {
    setCancellingId(subId);

    try {
      await api.cancelSubscription(subId);
      setSubscriptions((prev) =>
        prev.map((s) =>
          s.id === subId ? { ...s, status: 'CANCELLED' as SubscriptionStatus } : s,
        ),
      );
      setSuccessMessage('Subscription cancelled.');
      setShowCancelConfirm(null);
    } catch {
      // Failed to cancel
    } finally {
      setCancellingId(null);
    }
  }

  // ─── Edit modal ────────────────────────────────────────

  function openEditModal(sub: Subscription) {
    setEditingSub(sub);
    setEditForm({
      quantity: sub.quantity,
      intervalDays: sub.intervalDays,
    });
    setEditError(null);
  }

  function closeEditModal() {
    setEditingSub(null);
    setEditError(null);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSub) return;

    setEditSubmitting(true);
    setEditError(null);

    try {
      const payload: { quantity?: number; intervalDays?: number } = {};

      if (editForm.quantity !== editingSub.quantity) {
        payload.quantity = editForm.quantity;
      }
      if (editForm.intervalDays !== editingSub.intervalDays) {
        payload.intervalDays = editForm.intervalDays;
      }

      if (Object.keys(payload).length === 0) {
        closeEditModal();
        return;
      }

      await api.updateSubscription(editingSub.id, payload);

      setSubscriptions((prev) =>
        prev.map((s) =>
          s.id === editingSub.id
            ? { ...s, ...payload }
            : s,
        ),
      );
      setSuccessMessage('Subscription updated successfully.');
      closeEditModal();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to update subscription';
      setEditError(message);
    } finally {
      setEditSubmitting(false);
    }
  }

  // ─── Auth loading state ────────────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="animate-pulse text-primary/40">Loading...</div>
      </div>
    );
  }

  // ─── Not authenticated ─────────────────────────────────

  if (!user) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="text-center max-w-md">
          <User className="w-16 h-16 text-primary/20 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-primary mb-3">
            Sign In Required
          </h1>
          <p className="text-primary/60 mb-6">
            Please sign in to manage your subscriptions and recurring deliveries.
          </p>
          <Link href="/auth" className="btn-primary">
            Sign In
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </div>
    );
  }

  // ─── Main render ───────────────────────────────────────

  return (
    <div className="min-h-screen bg-light">
      {/* Page Header */}
      <div className="bg-white border-b border-light">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/account"
              className="text-primary/40 hover:text-primary/60 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <span className="text-xs text-primary/40 uppercase tracking-wider">
              Account
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Repeat className="w-7 h-7 text-accent" />
            <h1 className="text-2xl sm:text-3xl font-bold text-primary">
              My Subscriptions
            </h1>
          </div>
          <p className="text-primary/60 text-sm sm:text-lg mt-1">
            Manage your recurring deliveries and subscriptions.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success banner */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            {successMessage}
            <button
              type="button"
              onClick={() => setSuccessMessage(null)}
              className="ml-auto text-green-600 hover:text-green-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-light p-6 animate-pulse"
              >
                <div className="flex gap-4">
                  <div className="w-20 h-20 bg-light rounded-lg flex-shrink-0" />
                  <div className="flex-1">
                    <div className="h-4 bg-light rounded w-1/3 mb-2" />
                    <div className="h-3 bg-light rounded w-1/4 mb-3" />
                    <div className="h-3 bg-light rounded w-1/2 mb-2" />
                    <div className="h-3 bg-light rounded w-1/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : subscriptions.length > 0 ? (
          <div className="space-y-4">
            {subscriptions.map((sub) => {
              const isToggling = togglingIds.has(sub.id);
              const isCancelling = cancellingId === sub.id;
              const isActive = sub.status === 'ACTIVE';
              const isPaused = sub.status === 'PAUSED';
              const canManage = isActive || isPaused;

              return (
                <div
                  key={sub.id}
                  className="bg-white rounded-xl border border-light overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                      {/* Product image */}
                      <div className="flex-shrink-0">
                        {sub.product?.images?.[0] ? (
                          <img
                            src={sub.product.images[0]}
                            alt={sub.product?.name || 'Product'}
                            className="w-20 h-20 rounded-lg object-cover border border-light"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-lg bg-light flex items-center justify-center border border-light">
                            <Package className="w-8 h-8 text-primary/15" />
                          </div>
                        )}
                      </div>

                      {/* Subscription details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                          <div>
                            <h3 className="font-semibold text-primary text-sm sm:text-base">
                              {sub.product?.name || 'Product'}
                            </h3>
                            {sub.product?.vendor && (
                              <p className="text-xs text-teal font-medium">
                                {sub.product.vendor.businessName}
                              </p>
                            )}
                          </div>
                          {statusBadge(sub.status)}
                        </div>

                        {/* Details grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                          <div>
                            <p className="text-xs text-primary/40 uppercase tracking-wider">
                              Quantity
                            </p>
                            <p className="text-sm font-semibold text-primary">
                              {sub.quantity}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-primary/40 uppercase tracking-wider">
                              Interval
                            </p>
                            <p className="text-sm font-semibold text-primary">
                              {intervalLabel(sub.intervalDays)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-primary/40 uppercase tracking-wider">
                              Price / Delivery
                            </p>
                            <p className="text-sm font-bold text-accent">
                              {formatPrice(sub.price * sub.quantity)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-primary/40 uppercase tracking-wider">
                              Next Delivery
                            </p>
                            <p className="text-sm font-semibold text-primary flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-primary/40" />
                              {sub.status === 'ACTIVE'
                                ? formatDate(sub.nextDeliveryAt)
                                : '--'}
                            </p>
                          </div>
                        </div>

                        {/* Last delivery */}
                        {sub.lastDeliveryAt && (
                          <p className="text-xs text-primary/40 mt-2">
                            Last delivery: {formatDate(sub.lastDeliveryAt)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    {canManage && (
                      <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-light">
                        {/* Pause / Resume */}
                        <button
                          type="button"
                          onClick={() => handleTogglePause(sub)}
                          disabled={isToggling}
                          className="btn-outline text-xs px-3 py-2 disabled:opacity-50"
                        >
                          {isToggling ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          ) : isActive ? (
                            <Pause className="w-3.5 h-3.5 mr-1.5" />
                          ) : (
                            <Play className="w-3.5 h-3.5 mr-1.5" />
                          )}
                          {isActive ? 'Pause' : 'Resume'}
                        </button>

                        {/* Edit */}
                        <button
                          type="button"
                          onClick={() => openEditModal(sub)}
                          className="btn-outline text-xs px-3 py-2"
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1.5" />
                          Edit
                        </button>

                        {/* Cancel */}
                        {showCancelConfirm === sub.id ? (
                          <div className="flex items-center gap-2 ml-auto">
                            <span className="text-xs text-red-600 font-medium">
                              Cancel subscription?
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCancel(sub.id)}
                              disabled={isCancelling}
                              className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                            >
                              {isCancelling ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                'Yes, Cancel'
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowCancelConfirm(null)}
                              className="px-3 py-1.5 text-xs font-medium text-primary/60 bg-light rounded-lg hover:bg-gray-200 transition-colors"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowCancelConfirm(sub.id)}
                            className="btn-outline text-xs px-3 py-2 text-red-600 border-red-200 hover:bg-red-50 ml-auto"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1.5" />
                            Cancel
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty state */
          <div className="bg-white rounded-xl border border-light p-12 text-center">
            <Repeat className="w-16 h-16 text-primary/15 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-primary mb-2">
              No Active Subscriptions
            </h3>
            <p className="text-primary/60 mb-6 max-w-md mx-auto">
              No active subscriptions. Browse products to set up recurring
              deliveries.
            </p>
            <Link href="/marketplace" className="btn-primary">
              <ShoppingBag className="w-5 h-5 mr-2" />
              Browse Products
            </Link>
          </div>
        )}
      </div>

      {/* ─── Edit Modal ─────────────────────────────────────── */}
      {editingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeEditModal}
          />

          {/* Modal content */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-light">
              <h2 className="text-lg font-bold text-primary">
                Edit Subscription
              </h2>
              <button
                type="button"
                onClick={closeEditModal}
                className="text-primary/40 hover:text-primary/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Product info */}
            <div className="px-6 pt-4 pb-2">
              <div className="flex items-center gap-3">
                {editingSub.product?.images?.[0] ? (
                  <img
                    src={editingSub.product.images[0]}
                    alt={editingSub.product?.name || 'Product'}
                    className="w-12 h-12 rounded-lg object-cover border border-light"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-light flex items-center justify-center">
                    <Package className="w-5 h-5 text-primary/15" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-primary text-sm">
                    {editingSub.product?.name || 'Product'}
                  </p>
                  <p className="text-xs text-primary/50">
                    {formatPrice(editingSub.price)} per item
                  </p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleEditSubmit} className="p-6 space-y-5">
              {editError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {editError}
                </div>
              )}

              {/* Quantity */}
              <div>
                <label className="block text-xs font-medium text-primary/60 uppercase tracking-wider mb-1.5">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={editForm.quantity}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      quantity: Math.max(1, parseInt(e.target.value, 10) || 1),
                    }))
                  }
                  className="input-field"
                />
              </div>

              {/* Interval */}
              <div>
                <label className="block text-xs font-medium text-primary/60 uppercase tracking-wider mb-1.5">
                  Delivery Interval
                </label>
                <select
                  value={editForm.intervalDays}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      intervalDays: parseInt(e.target.value, 10),
                    }))
                  }
                  className="input-field"
                >
                  {INTERVAL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price summary */}
              <div className="bg-teal/5 border border-teal/20 rounded-lg px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-primary/60">
                    Price per delivery
                  </span>
                  <span className="text-sm font-bold text-teal">
                    {formatPrice(editingSub.price * editForm.quantity)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-light">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="btn-outline text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="btn-primary text-sm disabled:opacity-50"
                >
                  {editSubmitting && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
