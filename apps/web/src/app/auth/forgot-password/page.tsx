'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, Heart, Loader2 } from 'lucide-react';
import api from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.forgotPassword(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
              Forgot Password
            </h1>
            <p className="text-primary/60 text-sm">
              Enter your email and we&apos;ll send you a reset link
            </p>
          </div>

          {success ? (
            <div>
              <div className="mb-6 p-4 bg-teal/5 border border-teal/20 rounded-lg text-teal text-sm text-center">
                If an account exists with that email, we&apos;ve sent a password reset link.
              </div>
              <Link
                href="/auth"
                className="w-full btn-primary py-4 text-lg flex items-center justify-center"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Email */}
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-primary mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="input-field pl-12"
                    required
                    autoFocus
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
                disabled={loading || !email}
                className="w-full btn-primary py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Send Reset Link'
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
          )}
        </div>
      </div>
    </div>
  );
}
