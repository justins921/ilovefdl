'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, CheckCircle, XCircle, Heart } from 'lucide-react';
import api from '@/lib/api';

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading'
  );
  const [error, setError] = useState('');

  useEffect(() => {
    async function verify() {
      if (!token) {
        setStatus('error');
        setError('No verification token found. Please request a new magic link.');
        return;
      }

      try {
        const res = await api.verifyMagicLink(token);
        const { tokens, user } = res.data;

        // Store auth tokens
        localStorage.setItem('ilovefdl_token', tokens.accessToken);
        if (tokens.refreshToken) {
          localStorage.setItem('ilovefdl_refresh_token', tokens.refreshToken);
        }
        localStorage.setItem('ilovefdl_user', JSON.stringify(user));

        // Update API client with new token
        api.setToken(tokens.accessToken);

        setStatus('success');

        // Redirect based on role
        setTimeout(() => {
          if (user.role === 'ADMIN') {
            router.push('/admin');
          } else if (user.role === 'VENDOR') {
            router.push('/dashboard');
          } else {
            router.push('/');
          }
        }, 1500);
      } catch (err: any) {
        setStatus('error');
        setError(
          err?.message ||
            'This link has expired or is invalid. Please request a new one.'
        );
      }
    }

    verify();
  }, [token, router]);

  return (
    <div className="min-h-screen bg-light flex items-center justify-center">
      <div className="max-w-md w-full mx-4 text-center">
        <Link href="/" className="inline-flex items-center gap-1 mb-8">
          <span className="text-3xl font-bold text-primary">
            I{' '}
            <Heart className="inline-block w-7 h-7 text-accent fill-accent" />{' '}
            FDL
          </span>
        </Link>

        {status === 'loading' && (
          <div className="bg-white rounded-2xl shadow-sm border border-light p-10">
            <Loader2 className="w-12 h-12 text-teal animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-bold text-primary mb-2">
              Verifying Your Link
            </h1>
            <p className="text-primary/60 text-sm">
              Please wait while we sign you in...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="bg-white rounded-2xl shadow-sm border border-light p-10">
            <div className="w-16 h-16 bg-teal/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-teal" />
            </div>
            <h1 className="text-xl font-bold text-primary mb-2">
              You&apos;re Signed In!
            </h1>
            <p className="text-primary/60 text-sm">
              Redirecting you now...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-white rounded-2xl shadow-sm border border-light p-10">
            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-accent" />
            </div>
            <h1 className="text-xl font-bold text-primary mb-2">
              Verification Failed
            </h1>
            <p className="text-primary/60 text-sm mb-6">{error}</p>
            <Link href="/auth" className="btn-primary">
              Request New Link
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
