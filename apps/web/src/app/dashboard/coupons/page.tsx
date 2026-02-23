'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Ticket,
  Loader2,
  Percent,
  DollarSign,
  Truck,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { formatPrice, formatDate } from '@/lib/utils';
import type { Coupon } from '@ilovefdl/shared';
import { CouponType } from '@ilovefdl/shared';

interface CouponFormData {
  code: string;
  type: CouponType;
  value: string;
  minOrderAmount: string;
  maxUses: string;
  startsAt: string;
  expiresAt: string;
}

const emptyForm: CouponFormData = {
  code: '',
  type: CouponType.PERCENTAGE,
  value: '',
  minOrderAmount: '',
  maxUses: '',
  startsAt: '',
  expiresAt: '',
};

const COUPON_TYPE_LABELS: Record<CouponType, string> = {
  [CouponType.PERCENTAGE]: 'Percentage',
  [CouponType.FIXED_AMOUNT]: 'Fixed Amount',
  [CouponType.FREE_SHIPPING]: 'Free Shipping',
};

const COUPON_TYPE_ICONS: Record<CouponType, typeof Percent> = {
  [CouponType.PERCENTAGE]: Percent,
  [CouponType.FIXED_AMOUNT]: DollarSign,
  [CouponType.FREE_SHIPPING]: Truck,
};

function formatCouponValue(type: CouponType, value: number): string {
  switch (type) {
    case CouponType.PERCENTAGE:
      return `${value}%`;
    case CouponType.FIXED_AMOUNT:
      return formatPrice(value);
    case CouponType.FREE_SHIPPING:
      return 'Free Shipping';
  }
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(value: string): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

function getCouponStatus(coupon: Coupon): { label: string; className: string } {
  if (!coupon.isActive) {
    return { label: 'Inactive', className: 'bg-gray-100 text-gray-500' };
  }
  const now = new Date();
  if (coupon.startsAt && new Date(coupon.startsAt) > now) {
    return { label: 'Scheduled', className: 'bg-blue-50 text-blue-600' };
  }
  if (coupon.expiresAt && new Date(coupon.expiresAt) < now) {
    return { label: 'Expired', className: 'bg-red-50 text-red-600' };
  }
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
    return { label: 'Exhausted', className: 'bg-yellow-50 text-yellow-700' };
  }
  return { label: 'Active', className: 'bg-teal/10 text-teal' };
}

export default function CouponsPage() {
  const { user } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [form, setForm] = useState<CouponFormData>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      const tokenStr = localStorage.getItem('ilovefdl_token');
      if (tokenStr) api.setToken(tokenStr);

      const res = await api.getCoupons({ limit: 100 });
      setCoupons(res.data);
    } catch {
      setError('Failed to load coupons.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Modal Helpers ───────────────────────────────────────

  function openAddModal() {
    setEditingCoupon(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  }

  function openEditModal(coupon: Coupon) {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code,
      type: coupon.type,
      value: String(coupon.value),
      minOrderAmount: coupon.minOrderAmount != null ? String(coupon.minOrderAmount) : '',
      maxUses: coupon.maxUses != null ? String(coupon.maxUses) : '',
      startsAt: toDatetimeLocal(coupon.startsAt),
      expiresAt: toDatetimeLocal(coupon.expiresAt),
    });
    setFormError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingCoupon(null);
    setForm(emptyForm);
    setFormError(null);
  }

  function updateField(field: keyof CouponFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // ─── Submit Handler ──────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const code = form.code.trim();
    if (!code || code.length < 3) {
      setFormError('Coupon code must be at least 3 characters.');
      return;
    }

    const value = parseFloat(form.value);
    if (isNaN(value) || value < 0) {
      setFormError('Please enter a valid value.');
      return;
    }

    if (form.type === CouponType.PERCENTAGE && value > 100) {
      setFormError('Percentage discount cannot exceed 100%.');
      return;
    }

    const minOrderAmount = form.minOrderAmount ? parseFloat(form.minOrderAmount) : null;
    if (minOrderAmount !== null && (isNaN(minOrderAmount) || minOrderAmount < 0)) {
      setFormError('Please enter a valid minimum order amount.');
      return;
    }

    const maxUses = form.maxUses ? parseInt(form.maxUses, 10) : null;
    if (maxUses !== null && (isNaN(maxUses) || maxUses < 1)) {
      setFormError('Max uses must be at least 1.');
      return;
    }

    const startsAt = fromDatetimeLocal(form.startsAt);
    const expiresAt = fromDatetimeLocal(form.expiresAt);

    if (startsAt && expiresAt && new Date(startsAt) >= new Date(expiresAt)) {
      setFormError('Expiry date must be after start date.');
      return;
    }

    const payload = {
      code,
      type: form.type,
      value,
      isActive: true,
      minOrderAmount: minOrderAmount ?? undefined,
      maxUses: maxUses ?? undefined,
      startsAt: startsAt ?? undefined,
      expiresAt: expiresAt ?? undefined,
    };

    setSaving(true);

    try {
      if (editingCoupon) {
        const res = await api.updateCoupon(editingCoupon.id, payload);
        setCoupons((prev) =>
          prev.map((c) => (c.id === editingCoupon.id ? res.data : c))
        );
      } else {
        const res = await api.createCoupon(payload);
        setCoupons((prev) => [res.data, ...prev]);
      }
      closeModal();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong.';
      setFormError(message);
    } finally {
      setSaving(false);
    }
  }

  // ─── Delete Handler ──────────────────────────────────────

  async function handleDelete(couponId: string) {
    try {
      await api.deleteCoupon(couponId);
      setCoupons((prev) => prev.filter((c) => c.id !== couponId));
    } catch {
      setError('Failed to delete coupon.');
    } finally {
      setDeletingId(null);
    }
  }

  // ─── Loading State ───────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-white rounded w-1/3" />
            <div className="h-12 bg-white rounded w-1/4" />
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 bg-white rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main Render ─────────────────────────────────────────

  return (
    <div className="min-h-screen bg-light">
      {/* Header */}
      <div className="bg-white border-b border-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-primary mb-1">
                Coupons
              </h1>
              <p className="text-primary/60">
                Create and manage discount coupons for your products
              </p>
            </div>
            <button onClick={openAddModal} className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Create Coupon
            </button>
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

        {/* Coupons Table */}
        {coupons.length > 0 ? (
          <div className="bg-white rounded-xl border border-light overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-light">
                    <th className="text-left text-xs font-semibold text-primary/50 uppercase tracking-wider px-6 py-4">
                      Code
                    </th>
                    <th className="text-left text-xs font-semibold text-primary/50 uppercase tracking-wider px-6 py-4">
                      Type
                    </th>
                    <th className="text-left text-xs font-semibold text-primary/50 uppercase tracking-wider px-6 py-4">
                      Value
                    </th>
                    <th className="text-left text-xs font-semibold text-primary/50 uppercase tracking-wider px-6 py-4">
                      Usage
                    </th>
                    <th className="text-left text-xs font-semibold text-primary/50 uppercase tracking-wider px-6 py-4">
                      Status
                    </th>
                    <th className="text-left text-xs font-semibold text-primary/50 uppercase tracking-wider px-6 py-4">
                      Dates
                    </th>
                    <th className="text-right text-xs font-semibold text-primary/50 uppercase tracking-wider px-6 py-4">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-light">
                  {coupons.map((coupon) => {
                    const status = getCouponStatus(coupon);
                    const Icon = COUPON_TYPE_ICONS[coupon.type];
                    return (
                      <tr
                        key={coupon.id}
                        className="hover:bg-light/50 transition-colors"
                      >
                        {/* Code */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                              <Icon className="w-4 h-4 text-accent" />
                            </div>
                            <span className="text-sm font-bold text-primary font-mono tracking-wide">
                              {coupon.code}
                            </span>
                          </div>
                        </td>

                        {/* Type */}
                        <td className="px-6 py-4">
                          <span className="text-sm text-primary/60">
                            {COUPON_TYPE_LABELS[coupon.type]}
                          </span>
                        </td>

                        {/* Value */}
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-primary">
                            {formatCouponValue(coupon.type, coupon.value)}
                          </span>
                          {coupon.minOrderAmount != null && coupon.minOrderAmount > 0 && (
                            <p className="text-xs text-primary/40 mt-0.5">
                              Min. order {formatPrice(coupon.minOrderAmount)}
                            </p>
                          )}
                        </td>

                        {/* Usage */}
                        <td className="px-6 py-4">
                          <span className="text-sm text-primary">
                            {coupon.usedCount}
                            {coupon.maxUses != null ? ` / ${coupon.maxUses}` : ''}
                          </span>
                          {coupon.maxUses != null && (
                            <div className="w-16 h-1.5 bg-light rounded-full mt-1">
                              <div
                                className="h-full bg-teal rounded-full transition-all"
                                style={{
                                  width: `${Math.min((coupon.usedCount / coupon.maxUses) * 100, 100)}%`,
                                }}
                              />
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </td>

                        {/* Dates */}
                        <td className="px-6 py-4">
                          <div className="text-xs text-primary/50 space-y-0.5">
                            {coupon.startsAt && (
                              <p>Starts: {formatDate(coupon.startsAt)}</p>
                            )}
                            {coupon.expiresAt && (
                              <p>Expires: {formatDate(coupon.expiresAt)}</p>
                            )}
                            {!coupon.startsAt && !coupon.expiresAt && (
                              <p>No date limits</p>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditModal(coupon)}
                              className="p-2 rounded-lg text-primary/50 hover:text-accent hover:bg-accent/10 transition-colors"
                              title="Edit coupon"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>

                            {deletingId === coupon.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDelete(coupon.id)}
                                  className="px-2 py-1 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setDeletingId(null)}
                                  className="px-2 py-1 text-xs font-medium text-primary/50 bg-light rounded hover:bg-gray-200 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeletingId(coupon.id)}
                                className="p-2 rounded-lg text-primary/50 hover:text-red-500 hover:bg-red-50 transition-colors"
                                title="Delete coupon"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="bg-white rounded-xl border border-light p-16 text-center">
            <Ticket className="w-16 h-16 text-primary/20 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-primary mb-2">
              No coupons yet
            </h2>
            <p className="text-primary/60 mb-6 max-w-md mx-auto">
              Create discount coupons to attract customers and boost sales.
              Offer percentage discounts, fixed amounts, or free shipping.
            </p>
            <button onClick={openAddModal} className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Coupon
            </button>
          </div>
        )}
      </div>

      {/* ─── Modal ───────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
            onClick={closeModal}
          />

          {/* Modal Content */}
          <div className="relative bg-white rounded-xl border border-light shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-light px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
              <h2 className="text-lg font-bold text-primary">
                {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg text-primary/50 hover:text-primary hover:bg-light transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              {/* Code */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1.5">
                  Coupon Code <span className="text-accent">*</span>
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => updateField('code', e.target.value.toUpperCase())}
                  placeholder="e.g. SUMMER20"
                  className="input-field font-mono tracking-wide"
                  required
                />
                <p className="text-xs text-primary/40 mt-1">
                  Minimum 3 characters. Will be converted to uppercase.
                </p>
              </div>

              {/* Type + Value */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1.5">
                    Discount Type <span className="text-accent">*</span>
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => updateField('type', e.target.value)}
                    className="input-field"
                  >
                    {Object.values(CouponType).map((type) => (
                      <option key={type} value={type}>
                        {COUPON_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-1.5">
                    Value <span className="text-accent">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={form.type === CouponType.PERCENTAGE ? '100' : undefined}
                    value={form.value}
                    onChange={(e) => updateField('value', e.target.value)}
                    placeholder={form.type === CouponType.PERCENTAGE ? '0 - 100' : '0.00'}
                    className="input-field"
                    required
                    disabled={form.type === CouponType.FREE_SHIPPING}
                  />
                  {form.type === CouponType.FREE_SHIPPING && (
                    <p className="text-xs text-primary/40 mt-1">
                      Value is not required for free shipping coupons.
                    </p>
                  )}
                </div>
              </div>

              {/* Min Order Amount + Max Uses */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1.5">
                    Minimum Order Amount ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.minOrderAmount}
                    onChange={(e) => updateField('minOrderAmount', e.target.value)}
                    placeholder="No minimum"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-1.5">
                    Max Uses
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={form.maxUses}
                    onChange={(e) => updateField('maxUses', e.target.value)}
                    placeholder="Unlimited"
                    className="input-field"
                  />
                </div>
              </div>

              {/* Start + Expiry Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1.5">
                    Starts At
                  </label>
                  <input
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) => updateField('startsAt', e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-1.5">
                    Expires At
                  </label>
                  <input
                    type="datetime-local"
                    value={form.expiresAt}
                    onChange={(e) => updateField('expiresAt', e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-light">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2.5 text-sm font-medium text-primary/60 hover:text-primary rounded-lg hover:bg-light transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : editingCoupon ? (
                    'Update Coupon'
                  ) : (
                    'Create Coupon'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
