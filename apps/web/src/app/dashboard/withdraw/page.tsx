'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  DollarSign,
  CreditCard,
  ArrowDownToLine,
  Clock,
  Store,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Ban,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { formatPrice } from '@/lib/utils';
import type { Order, Vendor } from '@ilovefdl/shared';
import { OrderStatus } from '@ilovefdl/shared';

export default function WithdrawPage() {
  const { user } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [showComingSoon, setShowComingSoon] = useState(false);

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
          limit: 500,
        });
        setOrders(ordersRes.data);
      }
    } catch {
      setError('Failed to load withdrawal data.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Balance Calculations ─────────────────────────────

  const fulfilledOrders = orders.filter(
    (o) => o.status === OrderStatus.FULFILLED,
  );
  const pendingOrders = orders.filter((o) =>
    [OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.SHIPPED].includes(
      o.status,
    ),
  );

  const availableBalance = fulfilledOrders.reduce(
    (sum, o) => sum + (o.vendorNetAmount ?? 0),
    0,
  );
  const pendingBalance = pendingOrders.reduce(
    (sum, o) => sum + (o.vendorNetAmount ?? 0),
    0,
  );
  const totalEarnings = availableBalance + pendingBalance;

  // ─── Loading State ─────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-white rounded w-1/3" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
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
            You need a vendor profile to withdraw earnings. Apply to become a
            vendor on the I Love FDL marketplace.
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
                Withdraw Earnings
              </h1>
              <p className="text-primary/60 text-sm sm:text-base">
                Manage payouts for {vendor.businessName}
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-primary/60">
              <Wallet className="w-4 h-4" />
              <span>
                {fulfilledOrders.length} fulfilled order
                {fulfilledOrders.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
            <span className="text-sm">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600"
            >
              <Ban className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Balance Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Available Balance */}
          <div className="bg-white rounded-xl border border-light p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-teal/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-teal" />
              </div>
              <div>
                <p className="text-xs font-semibold text-primary/50 uppercase tracking-wider">
                  Available Balance
                </p>
              </div>
            </div>
            <p className="text-3xl font-bold text-primary">
              {formatPrice(availableBalance)}
            </p>
            <p className="text-xs text-primary/50 mt-1">
              From {fulfilledOrders.length} fulfilled order
              {fulfilledOrders.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Pending Balance */}
          <div className="bg-white rounded-xl border border-light p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-primary/50 uppercase tracking-wider">
                  Pending Balance
                </p>
              </div>
            </div>
            <p className="text-3xl font-bold text-primary">
              {formatPrice(pendingBalance)}
            </p>
            <p className="text-xs text-primary/50 mt-1">
              From {pendingOrders.length} in-progress order
              {pendingOrders.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Total Earnings */}
          <div className="bg-white rounded-xl border border-light p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-xs font-semibold text-primary/50 uppercase tracking-wider">
                  Total Earnings
                </p>
              </div>
            </div>
            <p className="text-3xl font-bold text-primary">
              {formatPrice(totalEarnings)}
            </p>
            <p className="text-xs text-primary/50 mt-1">
              Lifetime vendor earnings
            </p>
          </div>
        </div>

        {/* Withdraw Form */}
        <div className="bg-white rounded-xl border border-light p-6">
          <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
            <ArrowDownToLine className="w-5 h-5 text-primary/60" />
            Request Withdrawal
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Amount to Withdraw
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/40 font-medium">
                  $
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  max={availableBalance}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.00"
                  className="input-field pl-7 w-full"
                />
              </div>
              <p className="text-xs text-primary/50 mt-1">
                Maximum: {formatPrice(availableBalance)}
              </p>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Payment Method
              </label>
              <div
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  vendor.stripeOnboarded
                    ? 'border-teal/30 bg-teal/5'
                    : 'border-yellow-200 bg-yellow-50'
                }`}
              >
                <CreditCard
                  className={`w-5 h-5 ${
                    vendor.stripeOnboarded ? 'text-teal' : 'text-yellow-600'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary">
                    Stripe Connect
                  </p>
                  <p
                    className={`text-xs ${
                      vendor.stripeOnboarded
                        ? 'text-teal'
                        : 'text-yellow-600'
                    }`}
                  >
                    {vendor.stripeOnboarded ? 'Connected' : 'Not connected'}
                  </p>
                </div>
                {vendor.stripeOnboarded ? (
                  <CheckCircle className="w-5 h-5 text-teal flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                )}
              </div>
            </div>
          </div>

          {/* Withdraw Button */}
          <div className="mt-6">
            <button
              onClick={() => setShowComingSoon(true)}
              disabled={
                !vendor.stripeOnboarded ||
                availableBalance <= 0 ||
                !withdrawAmount ||
                Number(withdrawAmount) <= 0 ||
                Number(withdrawAmount) > availableBalance
              }
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowDownToLine className="w-4 h-4 mr-2" />
              Withdraw Funds
            </button>

            {showComingSoon && (
              <div className="mt-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p className="text-sm">
                  Withdrawals are coming soon. We are finalizing the payout
                  system. You will be notified when withdrawals are available.
                </p>
              </div>
            )}

            {!vendor.stripeOnboarded && (
              <p className="mt-3 text-xs text-yellow-600">
                You must connect your Stripe account before you can withdraw
                funds.
              </p>
            )}
          </div>
        </div>

        {/* Past Withdrawals */}
        <div className="bg-white rounded-xl border border-light p-6">
          <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary/60" />
            Withdrawal History
          </h2>

          <div className="text-center py-12">
            <ArrowDownToLine className="w-12 h-12 text-primary/15 mx-auto mb-3" />
            <p className="text-primary/60 font-medium">No withdrawals yet</p>
            <p className="text-sm text-primary/40 mt-1">
              Your withdrawal history will appear here once you make your first
              payout request.
            </p>
          </div>
        </div>

        {/* Payment Details / Stripe Connection Status */}
        <div className="bg-white rounded-xl border border-light p-6">
          <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary/60" />
            Payment Details
          </h2>

          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                vendor.stripeOnboarded ? 'bg-teal/10' : 'bg-yellow-50'
              }`}
            >
              {vendor.stripeOnboarded ? (
                <CheckCircle className="w-6 h-6 text-teal" />
              ) : (
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-primary">
                Stripe Connect
              </h3>
              <p className="text-sm text-primary/60 mt-1">
                {vendor.stripeOnboarded
                  ? 'Your Stripe account is connected and ready to receive payouts. You can manage your Stripe settings from the integrations page.'
                  : 'Connect your Stripe account to receive payouts. This is required before you can withdraw any earnings.'}
              </p>
              <a
                href="/dashboard/integrations"
                className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent/80 mt-3 transition-colors"
              >
                {vendor.stripeOnboarded
                  ? 'Manage Stripe Settings'
                  : 'Set Up Stripe Connect'}
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
