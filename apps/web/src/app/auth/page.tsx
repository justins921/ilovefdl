'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowRight, Heart, CheckCircle, Loader2 } from 'lucide-react';
import api from '@/lib/api';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.login(email);
      setSent(true);
    } catch (err: any) {
      setError(
        err?.message || 'Something went wrong. Please try again.'
      );
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
              Welcome Back
            </h1>
            <p className="text-primary/60 text-sm">
              Sign in with your email to continue
            </p>
          </div>

          {sent ? (
            /* Success State */
            <div className="text-center">
              <div className="w-16 h-16 bg-teal/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-teal" />
              </div>
              <h2 className="text-lg font-bold text-primary mb-2">
                Check Your Email
              </h2>
              <p className="text-primary/60 text-sm mb-6">
                We sent a magic link to{' '}
                <strong className="text-primary">{email}</strong>. Click the
                link in the email to sign in.
              </p>
              <p className="text-xs text-primary/40 mb-6">
                Didn&apos;t receive it? Check your spam folder or try again.
              </p>
              <button
                onClick={() => {
                  setSent(false);
                  setEmail('');
                }}
                className="text-teal font-medium text-sm hover:underline"
              >
                Try a different email
              </button>
            </div>
          ) : (
            /* Login Form */
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-primary mb-2"
                >
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
                className="w-full btn-primary py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed mb-4"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Send Magic Link
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </button>

              <p className="text-xs text-center text-primary/40">
                No password needed. We&apos;ll send you a secure link to sign in.
              </p>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-primary/40 mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
