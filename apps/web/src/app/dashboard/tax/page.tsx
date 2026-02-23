'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Receipt,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Upload,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  CheckCircle,
  MapPin,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { formatDate } from '@/lib/utils';
import type { TaxRate } from '@ilovefdl/shared';
import { Role } from '@ilovefdl/shared';

// ─── Types ───────────────────────────────────────────────

interface TaxFormData {
  country: string;
  state: string;
  rate: string;
  name: string;
}

const emptyForm: TaxFormData = {
  country: 'US',
  state: '',
  rate: '',
  name: '',
};

// ─── Default US State Tax Rates ──────────────────────────

const US_DEFAULT_RATES: { state: string; rate: number; name: string }[] = [
  { state: 'AL', rate: 0.04, name: 'Alabama State Tax' },
  { state: 'AK', rate: 0.0, name: 'Alaska State Tax' },
  { state: 'AZ', rate: 0.056, name: 'Arizona State Tax' },
  { state: 'AR', rate: 0.065, name: 'Arkansas State Tax' },
  { state: 'CA', rate: 0.0725, name: 'California State Tax' },
  { state: 'CO', rate: 0.029, name: 'Colorado State Tax' },
  { state: 'CT', rate: 0.0635, name: 'Connecticut State Tax' },
  { state: 'DE', rate: 0.0, name: 'Delaware State Tax' },
  { state: 'FL', rate: 0.06, name: 'Florida State Tax' },
  { state: 'GA', rate: 0.04, name: 'Georgia State Tax' },
  { state: 'HI', rate: 0.04, name: 'Hawaii State Tax' },
  { state: 'ID', rate: 0.06, name: 'Idaho State Tax' },
  { state: 'IL', rate: 0.0625, name: 'Illinois State Tax' },
  { state: 'IN', rate: 0.07, name: 'Indiana State Tax' },
  { state: 'IA', rate: 0.06, name: 'Iowa State Tax' },
  { state: 'KS', rate: 0.065, name: 'Kansas State Tax' },
  { state: 'KY', rate: 0.06, name: 'Kentucky State Tax' },
  { state: 'LA', rate: 0.0445, name: 'Louisiana State Tax' },
  { state: 'ME', rate: 0.055, name: 'Maine State Tax' },
  { state: 'MD', rate: 0.06, name: 'Maryland State Tax' },
  { state: 'MA', rate: 0.0625, name: 'Massachusetts State Tax' },
  { state: 'MI', rate: 0.06, name: 'Michigan State Tax' },
  { state: 'MN', rate: 0.06875, name: 'Minnesota State Tax' },
  { state: 'MS', rate: 0.07, name: 'Mississippi State Tax' },
  { state: 'MO', rate: 0.04225, name: 'Missouri State Tax' },
  { state: 'MT', rate: 0.0, name: 'Montana State Tax' },
  { state: 'NE', rate: 0.055, name: 'Nebraska State Tax' },
  { state: 'NV', rate: 0.0685, name: 'Nevada State Tax' },
  { state: 'NH', rate: 0.0, name: 'New Hampshire State Tax' },
  { state: 'NJ', rate: 0.06625, name: 'New Jersey State Tax' },
  { state: 'NM', rate: 0.05125, name: 'New Mexico State Tax' },
  { state: 'NY', rate: 0.04, name: 'New York State Tax' },
  { state: 'NC', rate: 0.0475, name: 'North Carolina State Tax' },
  { state: 'ND', rate: 0.05, name: 'North Dakota State Tax' },
  { state: 'OH', rate: 0.0575, name: 'Ohio State Tax' },
  { state: 'OK', rate: 0.045, name: 'Oklahoma State Tax' },
  { state: 'OR', rate: 0.0, name: 'Oregon State Tax' },
  { state: 'PA', rate: 0.06, name: 'Pennsylvania State Tax' },
  { state: 'RI', rate: 0.07, name: 'Rhode Island State Tax' },
  { state: 'SC', rate: 0.06, name: 'South Carolina State Tax' },
  { state: 'SD', rate: 0.042, name: 'South Dakota State Tax' },
  { state: 'TN', rate: 0.07, name: 'Tennessee State Tax' },
  { state: 'TX', rate: 0.0625, name: 'Texas State Tax' },
  { state: 'UT', rate: 0.061, name: 'Utah State Tax' },
  { state: 'VT', rate: 0.06, name: 'Vermont State Tax' },
  { state: 'VA', rate: 0.053, name: 'Virginia State Tax' },
  { state: 'WA', rate: 0.065, name: 'Washington State Tax' },
  { state: 'WV', rate: 0.06, name: 'West Virginia State Tax' },
  { state: 'WI', rate: 0.05, name: 'Wisconsin State Tax' },
  { state: 'WY', rate: 0.04, name: 'Wyoming State Tax' },
  { state: 'DC', rate: 0.06, name: 'District of Columbia Tax' },
];

// ─── Component ───────────────────────────────────────────

export default function TaxRatesPage() {
  const { user, loading: authLoading } = useAuth();
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<TaxRate | null>(null);
  const [form, setForm] = useState<TaxFormData>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Loading defaults
  const [loadingDefaults, setLoadingDefaults] = useState(false);

  // Toggling active
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // ─── Admin check ───────────────────────────────────────

  const isAdmin = user?.role === Role.ADMIN;

  // ─── Fetch tax rates ───────────────────────────────────

  const fetchTaxRates = useCallback(async () => {
    try {
      const tokenStr = localStorage.getItem('ilovefdl_token');
      if (tokenStr) api.setToken(tokenStr);

      const res = await api.getTaxRates();
      setTaxRates(res.data);
    } catch {
      setError('Failed to load tax rates.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    fetchTaxRates();
  }, [user, authLoading, fetchTaxRates]);

  // ─── Modal helpers ─────────────────────────────────────

  function openAddModal() {
    setEditingRate(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  }

  function openEditModal(rate: TaxRate) {
    setEditingRate(rate);
    setForm({
      country: rate.country,
      state: rate.state,
      rate: String((rate.rate * 100).toFixed(4)),
      name: rate.name,
    });
    setFormError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingRate(null);
    setForm(emptyForm);
    setFormError(null);
  }

  function updateField(field: keyof TaxFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // ─── Submit handler ────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const country = form.country.trim().toUpperCase();
    if (country.length !== 2) {
      setFormError('Country must be a 2-letter code (e.g. US).');
      return;
    }

    const state = form.state.trim().toUpperCase();
    if (!state) {
      setFormError('State is required.');
      return;
    }

    const ratePercent = parseFloat(form.rate);
    if (isNaN(ratePercent) || ratePercent < 0 || ratePercent > 100) {
      setFormError('Rate must be between 0% and 100%.');
      return;
    }
    const rateDecimal = ratePercent / 100;

    const name = form.name.trim();
    if (!name) {
      setFormError('Tax rate name is required.');
      return;
    }

    setSaving(true);

    try {
      if (editingRate) {
        const res = await api.updateTaxRate(editingRate.id, {
          rate: rateDecimal,
          name,
        });
        setTaxRates((prev) =>
          prev.map((r) => (r.id === editingRate.id ? res.data : r))
        );
      } else {
        const res = await api.createTaxRate({
          country,
          state,
          rate: rateDecimal,
          name,
        });
        setTaxRates((prev) => [...prev, res.data]);
      }
      closeModal();
      setSuccess(editingRate ? 'Tax rate updated.' : 'Tax rate created.');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong.';
      setFormError(message);
    } finally {
      setSaving(false);
    }
  }

  // ─── Toggle active ─────────────────────────────────────

  async function handleToggleActive(rate: TaxRate) {
    setTogglingId(rate.id);
    try {
      const res = await api.updateTaxRate(rate.id, { isActive: !rate.isActive });
      setTaxRates((prev) =>
        prev.map((r) => (r.id === rate.id ? res.data : r))
      );
    } catch {
      setError('Failed to update tax rate.');
    } finally {
      setTogglingId(null);
    }
  }

  // ─── Delete ────────────────────────────────────────────

  async function handleDelete(id: string) {
    try {
      await api.deleteTaxRate(id);
      setTaxRates((prev) => prev.filter((r) => r.id !== id));
      setSuccess('Tax rate deleted.');
    } catch {
      setError('Failed to delete tax rate.');
    } finally {
      setDeletingId(null);
    }
  }

  // ─── Load US Defaults ──────────────────────────────────

  async function handleLoadDefaults() {
    if (
      !confirm(
        'This will create tax rates for all US states. Existing rates for duplicate states will be skipped. Continue?'
      )
    ) {
      return;
    }

    setLoadingDefaults(true);
    setError(null);

    const existingStates = new Set(
      taxRates
        .filter((r) => r.country === 'US')
        .map((r) => r.state.toUpperCase())
    );

    let created = 0;
    let skipped = 0;

    for (const defaultRate of US_DEFAULT_RATES) {
      if (existingStates.has(defaultRate.state)) {
        skipped++;
        continue;
      }

      try {
        const res = await api.createTaxRate({
          country: 'US',
          state: defaultRate.state,
          rate: defaultRate.rate,
          name: defaultRate.name,
        });
        setTaxRates((prev) => [...prev, res.data]);
        created++;
      } catch {
        // Skip on error, continue with next
      }
    }

    setLoadingDefaults(false);
    setSuccess(
      `Loaded US default rates: ${created} created, ${skipped} skipped (already exist).`
    );
  }

  // ─── Auth loading ──────────────────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="animate-pulse text-primary/40">Loading...</div>
      </div>
    );
  }

  // ─── Not admin ─────────────────────────────────────────

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-primary mb-3">
            Admin Access Required
          </h1>
          <p className="text-primary/60 mb-6">
            You need administrator privileges to manage tax rates.
          </p>
        </div>
      </div>
    );
  }

  // ─── Loading state ─────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-white rounded w-1/3" />
            <div className="h-12 bg-white rounded w-1/4" />
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-16 bg-white rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Helper to sort rates ──────────────────────────────

  const sortedRates = [...taxRates].sort((a, b) => {
    // Wisconsin first
    if (a.state === 'WI' && b.state !== 'WI') return -1;
    if (b.state === 'WI' && a.state !== 'WI') return 1;
    // Then by country, then by state
    if (a.country !== b.country) return a.country.localeCompare(b.country);
    return a.state.localeCompare(b.state);
  });

  // ─── Main render ───────────────────────────────────────

  return (
    <div className="min-h-screen bg-light">
      {/* Header */}
      <div className="bg-white border-b border-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <Receipt className="w-7 h-7 text-teal" />
                <h1 className="text-2xl sm:text-3xl font-bold text-primary">
                  Tax Rates
                </h1>
              </div>
              <p className="text-primary/60 text-sm sm:text-base mt-1">
                Configure sales tax rates by state and country.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button
                onClick={handleLoadDefaults}
                disabled={loadingDefaults}
                className="btn-outline text-sm w-full sm:w-auto disabled:opacity-50"
              >
                {loadingDefaults ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Load US Default Rates
              </button>
              <button onClick={openAddModal} className="btn-primary w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Add Tax Rate
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success banner */}
        {success && (
          <div className="mb-6 bg-teal/10 border border-teal/20 text-teal px-4 py-3 rounded-lg flex items-center justify-between">
            <span className="text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {success}
            </span>
            <button
              onClick={() => setSuccess(null)}
              className="text-teal/60 hover:text-teal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Error banner */}
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

        {/* Wisconsin highlight */}
        {taxRates.some((r) => r.state === 'WI') && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
            <MapPin className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-yellow-800">
                Fond du Lac, Wisconsin
              </p>
              <p className="text-xs text-yellow-700 mt-0.5">
                As a Fond du Lac-based marketplace, Wisconsin tax rates are highlighted.
                Current WI state sales tax rate:{' '}
                <strong>
                  {(
                    (taxRates.find((r) => r.state === 'WI' && r.country === 'US')?.rate ?? 0.05) * 100
                  ).toFixed(2)}
                  %
                </strong>
              </p>
            </div>
          </div>
        )}

        {/* Tax rates table */}
        {sortedRates.length > 0 ? (
          <div className="bg-white rounded-xl border border-light overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px]">
                <thead>
                  <tr className="border-b border-light">
                    <th className="text-left text-xs font-semibold text-primary/50 uppercase tracking-wider px-4 sm:px-6 py-4">
                      Country
                    </th>
                    <th className="text-left text-xs font-semibold text-primary/50 uppercase tracking-wider px-4 sm:px-6 py-4">
                      State
                    </th>
                    <th className="text-left text-xs font-semibold text-primary/50 uppercase tracking-wider px-4 sm:px-6 py-4">
                      Rate
                    </th>
                    <th className="text-left text-xs font-semibold text-primary/50 uppercase tracking-wider px-4 sm:px-6 py-4">
                      Name
                    </th>
                    <th className="text-left text-xs font-semibold text-primary/50 uppercase tracking-wider px-4 sm:px-6 py-4">
                      Active
                    </th>
                    <th className="text-right text-xs font-semibold text-primary/50 uppercase tracking-wider px-4 sm:px-6 py-4">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-light">
                  {sortedRates.map((rate) => {
                    const isWI = rate.state === 'WI' && rate.country === 'US';
                    return (
                      <tr
                        key={rate.id}
                        className={`hover:bg-light/50 transition-colors ${
                          isWI ? 'bg-yellow-50/50' : ''
                        }`}
                      >
                        {/* Country */}
                        <td className="px-4 sm:px-6 py-4">
                          <span className="text-sm font-medium text-primary">
                            {rate.country}
                          </span>
                        </td>

                        {/* State */}
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-primary">
                              {rate.state}
                            </span>
                            {isWI && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                <MapPin className="w-3 h-3" />
                                FDL
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Rate */}
                        <td className="px-4 sm:px-6 py-4">
                          <span className="text-sm font-bold text-accent">
                            {(rate.rate * 100).toFixed(2)}%
                          </span>
                        </td>

                        {/* Name */}
                        <td className="px-4 sm:px-6 py-4">
                          <span className="text-sm text-primary/60">
                            {rate.name}
                          </span>
                        </td>

                        {/* Active toggle */}
                        <td className="px-4 sm:px-6 py-4">
                          <button
                            onClick={() => handleToggleActive(rate)}
                            disabled={togglingId === rate.id}
                            className="flex items-center gap-2 disabled:opacity-50"
                            title={rate.isActive ? 'Click to deactivate' : 'Click to activate'}
                          >
                            {togglingId === rate.id ? (
                              <Loader2 className="w-5 h-5 animate-spin text-primary/40" />
                            ) : rate.isActive ? (
                              <ToggleRight className="w-8 h-8 text-teal" />
                            ) : (
                              <ToggleLeft className="w-8 h-8 text-primary/30" />
                            )}
                            <span
                              className={`text-xs font-medium ${
                                rate.isActive ? 'text-teal' : 'text-primary/40'
                              }`}
                            >
                              {rate.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditModal(rate)}
                              className="p-2.5 rounded-lg text-primary/50 hover:text-accent hover:bg-accent/10 transition-colors"
                              title="Edit tax rate"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>

                            {deletingId === rate.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDelete(rate.id)}
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
                                onClick={() => setDeletingId(rate.id)}
                                className="p-2 rounded-lg text-primary/50 hover:text-red-500 hover:bg-red-50 transition-colors"
                                title="Delete tax rate"
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

            {/* Summary footer */}
            <div className="border-t border-light px-4 sm:px-6 py-3 bg-light/30">
              <p className="text-xs text-primary/50">
                {taxRates.length} tax rate{taxRates.length !== 1 ? 's' : ''} configured
                {' '}&bull;{' '}
                {taxRates.filter((r) => r.isActive).length} active
                {' '}&bull;{' '}
                {taxRates.filter((r) => !r.isActive).length} inactive
              </p>
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="bg-white rounded-xl border border-light p-16 text-center">
            <Receipt className="w-16 h-16 text-primary/20 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-primary mb-2">
              No tax rates configured
            </h2>
            <p className="text-primary/60 mb-6 max-w-md mx-auto">
              Set up tax rates to automatically calculate sales tax on orders.
              You can load US default rates or add them manually.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={handleLoadDefaults}
                disabled={loadingDefaults}
                className="btn-outline disabled:opacity-50"
              >
                {loadingDefaults ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Load US Default Rates
              </button>
              <button onClick={openAddModal} className="btn-primary">
                <Plus className="w-4 h-4 mr-2" />
                Add Tax Rate Manually
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Create / Edit Modal ───────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
            onClick={closeModal}
          />

          {/* Modal content */}
          <div className="relative bg-white rounded-xl border border-light shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="sticky top-0 bg-white border-b border-light px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
              <h2 className="text-lg font-bold text-primary">
                {editingRate ? 'Edit Tax Rate' : 'Add Tax Rate'}
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

              {/* Country + State row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1.5">
                    Country Code <span className="text-accent">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.country}
                    onChange={(e) =>
                      updateField('country', e.target.value.toUpperCase().slice(0, 2))
                    }
                    placeholder="US"
                    className="input-field font-mono tracking-wider"
                    maxLength={2}
                    required
                    disabled={!!editingRate}
                  />
                  <p className="text-xs text-primary/40 mt-1">
                    2-letter ISO country code
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-1.5">
                    State / Province <span className="text-accent">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.state}
                    onChange={(e) =>
                      updateField('state', e.target.value.toUpperCase().slice(0, 10))
                    }
                    placeholder="WI"
                    className="input-field font-mono tracking-wider"
                    maxLength={10}
                    required
                    disabled={!!editingRate}
                  />
                  <p className="text-xs text-primary/40 mt-1">
                    State abbreviation (e.g. WI, CA, NY)
                  </p>
                </div>
              </div>

              {/* Rate */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1.5">
                  Tax Rate (%) <span className="text-accent">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    max="100"
                    value={form.rate}
                    onChange={(e) => updateField('rate', e.target.value)}
                    placeholder="5.0"
                    className="input-field pr-10"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/40 font-medium text-sm">
                    %
                  </span>
                </div>
                <p className="text-xs text-primary/40 mt-1">
                  Enter as a percentage (e.g. 5.0 for 5%). Stored as decimal (0.05).
                </p>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1.5">
                  Name <span className="text-accent">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="e.g. Wisconsin State Tax"
                  className="input-field"
                  maxLength={100}
                  required
                />
              </div>

              {/* Form actions */}
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-light">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2.5 text-sm font-medium text-primary/60 hover:text-primary rounded-lg hover:bg-light transition-colors text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed justify-center"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : editingRate ? (
                    'Update Tax Rate'
                  ) : (
                    'Create Tax Rate'
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
