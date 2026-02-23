'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Lock, ArrowRight, ArrowLeft, Heart, Loader2, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await api.resetPassword(token!, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center">
        <div className="mb-6 p-4 bg-accent/5 border border-accent/20 rounded-lg flex items-center justify-center gap-2">
          <AlertTriangle className="w-5 h-5 text-accent" />
          <span className="text-accent text-sm">
            Invalid or missing reset token. Please request a new password reset link.
          </span>
        </div>
        <Link
          href="/auth/forgot-password"
          className="w-full btn-primary py-4 text-lg flex items-center justify-center"
        >
          Request New Reset Link
          <ArrowRight className="w-5 h-5 ml-2" />
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div>
        <div className="mb-6 p-4 bg-teal/5 border border-teal/20 rounded-lg text-teal text-sm text-center">
          Your password has been reset successfully.
        </div>
        <Link
          href="/auth"
          className="w-full btn-primary py-4 text-lg flex items-center justify-center"
        >
          Sign In
          <ArrowRight className="w-5 h-5 ml-2" />
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* New Password */}
      <div className="mb-4">
        <label htmlFor="password" className="block text-sm font-medium text-primary mb-2">
          New Password
        </label>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40" />
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            className="input-field pl-12"
            required
            minLength={6}
            autoFocus
          />
        </div>
      </div>

      {/* Confirm Password */}
      <div className="mb-4">
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-primary mb-2">
          Confirm Password
        </label>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40" />
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your new password"
            className="input-field pl-12"
            required
            minLength={6}
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-accent/5 border border-accent/20 rounded-lg text-accent text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !password || !confirmPassword}
        className="w-full btn-primary py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            Reset Password
            <ArrowRight className="w-5 h-5 ml-2" />
          </>
        )}
      </button>

      <div className="text-center mt-6">
        <Link
          href="/auth"
          className="text-sm text-teal hover:text-teal/80 transition-colors inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sign In
        </Link>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-light flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-sm border border-light p-8 md:p-10">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-1 mb-4">
              <span className="text-3xl font-bold text-primary">
                I{' '}
                <Heart className="inline-block w-7 h-7 text-accent fill-accent" />{' '}
                FDL
              </span>
            </Link>
            <h1 className="text-xl font-bold text-primary mb-1">
              Reset Password
            </h1>
            <p className="text-primary/60 text-sm">
              Enter your new password below
            </p>
          </div>

          <Suspense fallback={
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
            </div>
          }>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
