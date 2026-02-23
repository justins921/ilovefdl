'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Trophy,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  Gift,
  TrendingUp,
  DollarSign,
  Loader2,
  User,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Zap,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { formatPrice, formatDate } from '@/lib/utils';
import type { LoyaltyAccount, LoyaltyTransaction } from '@ilovefdl/shared';

// ─── Tier configuration ──────────────────────────────────

const TIERS = [
  { name: 'BRONZE', label: 'Bronze', threshold: 0, color: 'text-amber-700', bg: 'bg-amber-100', border: 'border-amber-200' },
  { name: 'SILVER', label: 'Silver', threshold: 1000, color: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-200' },
  { name: 'GOLD', label: 'Gold', threshold: 5000, color: 'text-yellow-600', bg: 'bg-yellow-100', border: 'border-yellow-200' },
  { name: 'PLATINUM', label: 'Platinum', threshold: 10000, color: 'text-purple-700', bg: 'bg-purple-100', border: 'border-purple-200' },
] as const;

// Points conversion: 100 pts = $1.00
const POINTS_PER_DOLLAR = 100;

// ─── Helpers ─────────────────────────────────────────────

function getTierConfig(tierName: string) {
  return TIERS.find((t) => t.name === tierName) || TIERS[0];
}

function getNextTier(tierName: string) {
  const idx = TIERS.findIndex((t) => t.name === tierName);
  if (idx < 0 || idx >= TIERS.length - 1) return null;
  return TIERS[idx + 1];
}

function getProgressToNextTier(lifetimePoints: number, tierName: string) {
  const nextTier = getNextTier(tierName);
  if (!nextTier) return { progress: 100, remaining: 0, nextThreshold: 0 };

  const currentTier = getTierConfig(tierName);
  const range = nextTier.threshold - currentTier.threshold;
  const earned = lifetimePoints - currentTier.threshold;
  const progress = Math.min(Math.max((earned / range) * 100, 0), 100);
  const remaining = Math.max(nextTier.threshold - lifetimePoints, 0);

  return { progress, remaining, nextThreshold: nextTier.threshold };
}

function pointsToDollars(points: number): number {
  return points / POINTS_PER_DOLLAR;
}

function transactionIcon(type: string) {
  switch (type) {
    case 'earn':
      return (
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
          <ArrowUpRight className="w-4 h-4 text-green-600" />
        </div>
      );
    case 'redeem':
      return (
        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
          <ArrowDownRight className="w-4 h-4 text-red-600" />
        </div>
      );
    case 'bonus':
      return (
        <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
          <Star className="w-4 h-4 text-yellow-600" />
        </div>
      );
    case 'expire':
      return (
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
          <AlertCircle className="w-4 h-4 text-gray-500" />
        </div>
      );
    default:
      return (
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-gray-500" />
        </div>
      );
  }
}

// ─── Component ───────────────────────────────────────────

export default function LoyaltyPage() {
  const { user, loading: authLoading } = useAuth();

  // Loyalty account
  const [account, setAccount] = useState<LoyaltyAccount | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(true);
  const [accountError, setAccountError] = useState(false);

  // Transactions
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  // Redeem form
  const [redeemAmount, setRedeemAmount] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null);

  // ─── Fetch account ─────────────────────────────────────

  const fetchAccount = useCallback(async () => {
    try {
      const res = await api.getLoyaltyAccount();
      setAccount(res.data);
      setAccountError(false);
    } catch {
      setAccountError(true);
    } finally {
      setLoadingAccount(false);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await api.getLoyaltyTransactions({ limit: 20 });
      setTransactions(res.data);
    } catch {
      // Failed to fetch transactions
    } finally {
      setLoadingTransactions(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoadingAccount(false);
      setLoadingTransactions(false);
      return;
    }

    fetchAccount();
    fetchTransactions();
  }, [user, authLoading, fetchAccount, fetchTransactions]);

  // ─── Redeem handler ────────────────────────────────────

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    setRedeemError(null);
    setRedeemSuccess(null);

    const points = parseInt(redeemAmount, 10);

    if (isNaN(points) || points < 100) {
      setRedeemError('Minimum redemption is 100 points');
      return;
    }

    if (account && points > account.points) {
      setRedeemError('Insufficient points balance');
      return;
    }

    setRedeeming(true);

    try {
      const res = await api.redeemPoints({ points });
      setRedeemSuccess(
        `Successfully redeemed ${points} points for ${formatPrice(res.data.discount)} credit! Remaining: ${res.data.remainingPoints} points.`,
      );
      setRedeemAmount('');

      // Refresh data
      await fetchAccount();
      await fetchTransactions();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to redeem points';
      setRedeemError(message);
    } finally {
      setRedeeming(false);
    }
  }

  // ─── Derived values ────────────────────────────────────

  const redeemPoints = parseInt(redeemAmount, 10) || 0;
  const redeemDollars = pointsToDollars(redeemPoints);

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
            Please sign in to view your loyalty rewards and earn points with every purchase.
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

  const tierConfig = account ? getTierConfig(account.tier) : TIERS[0];
  const nextTier = account ? getNextTier(account.tier) : TIERS[1];
  const tierProgress = account
    ? getProgressToNextTier(account.lifetimePoints, account.tier)
    : { progress: 0, remaining: 1000, nextThreshold: 1000 };

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
            <Trophy className="w-7 h-7 text-accent" />
            <h1 className="text-2xl sm:text-3xl font-bold text-primary">
              Loyalty Rewards
            </h1>
          </div>
          <p className="text-primary/60 text-sm sm:text-lg mt-1">
            Earn points with every purchase and unlock exclusive rewards.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {loadingAccount ? (
          /* Loading skeleton */
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-light p-8 animate-pulse">
              <div className="h-8 bg-light rounded w-1/4 mb-4" />
              <div className="h-12 bg-light rounded w-1/3 mb-4" />
              <div className="h-4 bg-light rounded w-full mb-2" />
              <div className="h-4 bg-light rounded w-2/3" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-light p-6 animate-pulse">
                  <div className="h-4 bg-light rounded w-1/2 mb-3" />
                  <div className="h-8 bg-light rounded w-2/3" />
                </div>
              ))}
            </div>
          </div>
        ) : accountError || !account ? (
          /* Empty state: no loyalty account yet */
          <div className="bg-white rounded-xl border border-light p-12 text-center">
            <Trophy className="w-16 h-16 text-primary/15 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-primary mb-2">
              Start Earning Rewards
            </h3>
            <p className="text-primary/60 mb-6 max-w-md mx-auto">
              Start earning rewards with your purchases! Every dollar you spend
              earns you points that can be redeemed for discounts.
            </p>
            <Link href="/marketplace" className="btn-primary">
              <Gift className="w-5 h-5 mr-2" />
              Browse Marketplace
            </Link>
          </div>
        ) : (
          <>
            {/* ─── Points Summary Card ──────────────────────── */}
            <div className="bg-white rounded-xl border border-light overflow-hidden">
              <div className="p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                  {/* Points + Tier */}
                  <div>
                    <p className="text-xs text-primary/50 uppercase tracking-wider mb-1">
                      Available Points
                    </p>
                    <p className="text-4xl sm:text-5xl font-bold text-primary">
                      {account.points.toLocaleString()}
                    </p>
                    <p className="text-sm text-primary/50 mt-1">
                      Worth {formatPrice(pointsToDollars(account.points))}
                    </p>
                  </div>

                  {/* Tier badge */}
                  <div
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${tierConfig.bg} ${tierConfig.border} border`}
                  >
                    <Trophy className={`w-5 h-5 ${tierConfig.color}`} />
                    <span
                      className={`text-sm font-bold ${tierConfig.color}`}
                    >
                      {tierConfig.label} Tier
                    </span>
                  </div>
                </div>

                {/* Progress bar to next tier */}
                {nextTier && (
                  <div>
                    <div className="flex items-center justify-between text-xs text-primary/50 mb-2">
                      <span>{tierConfig.label}</span>
                      <span>
                        {tierProgress.remaining.toLocaleString()} pts to{' '}
                        {nextTier.label}
                      </span>
                    </div>
                    <div className="w-full bg-light rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-teal to-accent rounded-full transition-all duration-500"
                        style={{ width: `${tierProgress.progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-primary/40 mt-1">
                      <span>{getTierConfig(account.tier).threshold.toLocaleString()} pts</span>
                      <span>{nextTier.threshold.toLocaleString()} pts</span>
                    </div>
                  </div>
                )}

                {/* Already at max tier */}
                {!nextTier && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3 text-sm text-purple-700 flex items-center gap-2">
                    <Star className="w-4 h-4 flex-shrink-0" />
                    You have reached the highest tier! Enjoy all exclusive benefits.
                  </div>
                )}
              </div>
            </div>

            {/* ─── Quick Stats ──────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-light p-5">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-teal" />
                  <p className="text-xs text-primary/50 uppercase tracking-wider">
                    Lifetime Points
                  </p>
                </div>
                <p className="text-2xl font-bold text-primary">
                  {account.lifetimePoints.toLocaleString()}
                </p>
              </div>

              <div className="bg-white rounded-xl border border-light p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-4 h-4 text-teal" />
                  <p className="text-xs text-primary/50 uppercase tracking-wider">
                    Current Tier
                  </p>
                </div>
                <p className={`text-2xl font-bold ${tierConfig.color}`}>
                  {tierConfig.label}
                </p>
              </div>

              <div className="bg-white rounded-xl border border-light p-5">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-teal" />
                  <p className="text-xs text-primary/50 uppercase tracking-wider">
                    Points Value
                  </p>
                </div>
                <p className="text-2xl font-bold text-primary">
                  {formatPrice(pointsToDollars(account.points))}
                </p>
                <p className="text-xs text-primary/40 mt-0.5">
                  100 pts = $1.00
                </p>
              </div>
            </div>

            {/* ─── Redeem Section ───────────────────────────── */}
            <div className="bg-white rounded-xl border border-light p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-6">
                <Gift className="w-5 h-5 text-teal" />
                <h2 className="text-lg sm:text-xl font-bold text-primary">
                  Redeem Points
                </h2>
              </div>

              <form onSubmit={handleRedeem} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-medium text-primary/60 uppercase tracking-wider mb-1.5">
                      Points to Redeem (min 100)
                    </label>
                    <input
                      type="number"
                      min="100"
                      step="1"
                      value={redeemAmount}
                      onChange={(e) => setRedeemAmount(e.target.value)}
                      placeholder="Enter points amount"
                      className="input-field"
                    />
                  </div>
                  <div className="bg-teal/5 border border-teal/20 rounded-lg px-4 py-3">
                    <p className="text-xs text-primary/50 mb-0.5">
                      Dollar Value
                    </p>
                    <p className="text-xl font-bold text-teal">
                      {formatPrice(redeemDollars)}
                    </p>
                  </div>
                </div>

                {redeemError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    {redeemError}
                  </div>
                )}

                {redeemSuccess && (
                  <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    {redeemSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={redeeming || redeemPoints < 100}
                  className="btn-primary text-sm disabled:opacity-50"
                >
                  {redeeming ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Gift className="w-4 h-4 mr-2" />
                  )}
                  {redeeming
                    ? 'Redeeming...'
                    : `Redeem ${redeemPoints > 0 ? redeemPoints.toLocaleString() + ' Points' : 'Points'}`}
                </button>
              </form>
            </div>

            {/* ─── Transaction History ──────────────────────── */}
            <div className="bg-white rounded-xl border border-light p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-teal" />
                <h2 className="text-lg sm:text-xl font-bold text-primary">
                  Transaction History
                </h2>
              </div>

              {loadingTransactions ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 p-3 animate-pulse"
                    >
                      <div className="w-8 h-8 bg-light rounded-full" />
                      <div className="flex-1">
                        <div className="h-4 bg-light rounded w-2/3 mb-1" />
                        <div className="h-3 bg-light rounded w-1/3" />
                      </div>
                      <div className="h-4 bg-light rounded w-16" />
                    </div>
                  ))}
                </div>
              ) : transactions.length > 0 ? (
                <div className="space-y-1">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-light/50 transition-colors"
                    >
                      {transactionIcon(tx.type)}

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-primary truncate">
                          {tx.description}
                        </p>
                        <p className="text-xs text-primary/40">
                          {formatDate(tx.createdAt)}
                        </p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p
                          className={`text-sm font-bold ${
                            tx.type === 'redeem' || tx.type === 'expire'
                              ? 'text-red-600'
                              : 'text-green-600'
                          }`}
                        >
                          {tx.type === 'redeem' || tx.type === 'expire'
                            ? '-'
                            : '+'}
                          {Math.abs(tx.points).toLocaleString()} pts
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <TrendingUp className="w-10 h-10 text-primary/15 mx-auto mb-3" />
                  <p className="text-primary/60 text-sm">
                    No transactions yet. Start shopping to earn points!
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
