'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Lock,
  User as UserIcon,
  ArrowRight,
  Heart,
  Loader2,
  Store,
  Beer,
  ShoppingBag,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

type Mode = 'login' | 'choose-role' | 'register-member';

export default function AuthPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let res;
      if (mode === 'register-member') {
        res = await api.register(email, password, name);
      } else {
        res = await api.login(email, password);
      }

      const { token, user } = res.data;
      login(token, user);

      if (user.role === 'ADMIN') {
        router.push('/admin');
      } else if (user.role === 'VENDOR') {
        router.push('/dashboard');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isRegister = mode === 'register-member';

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
              {mode === 'login' && 'Welcome Back'}
              {mode === 'choose-role' && 'Join I Love FDL'}
              {mode === 'register-member' && 'Create Member Account'}
            </h1>
            <p className="text-primary/60 text-sm">
              {mode === 'login' && 'Sign in to your account'}
              {mode === 'choose-role' && 'How would you like to participate?'}
              {mode === 'register-member' && 'Shop local and support the FDL community'}
            </p>
          </div>

          {/* Mode Tabs */}
          <div className="flex rounded-lg bg-light p-1 mb-6">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                mode === 'login'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-primary/60 hover:text-primary'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode(isRegister ? 'register-member' : 'choose-role'); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                mode !== 'login'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-primary/60 hover:text-primary'
              }`}
            >
              Register
            </button>
          </div>

          {/* Role Selection */}
          {mode === 'choose-role' && (
            <div className="space-y-3">
              <button
                onClick={() => setMode('register-member')}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-light hover:border-teal/40 hover:bg-teal/5 transition-all text-left group"
              >
                <div className="w-12 h-12 bg-teal/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-teal/20 transition-colors">
                  <ShoppingBag className="w-6 h-6 text-teal" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-primary">Member</p>
                  <p className="text-xs text-primary/60">Shop local, read news, find bar specials</p>
                </div>
                <ArrowRight className="w-4 h-4 text-primary/30 group-hover:text-teal transition-colors" />
              </button>

              <Link
                href="/auth/vendor"
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-light hover:border-teal/40 hover:bg-teal/5 transition-all text-left group"
              >
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 transition-colors">
                  <Store className="w-6 h-6 text-accent" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-primary">Vendor</p>
                  <p className="text-xs text-primary/60">Sell products on the I Love FDL marketplace</p>
                </div>
                <ArrowRight className="w-4 h-4 text-primary/30 group-hover:text-teal transition-colors" />
              </Link>

              <Link
                href="/auth/bar-owner"
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-light hover:border-teal/40 hover:bg-teal/5 transition-all text-left group"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-primary/15 transition-colors">
                  <Beer className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-primary">Bar / Restaurant Owner</p>
                  <p className="text-xs text-primary/60">List your establishment and post daily specials</p>
                </div>
                <ArrowRight className="w-4 h-4 text-primary/30 group-hover:text-teal transition-colors" />
              </Link>
            </div>
          )}

          {/* Login Form */}
          {mode === 'login' && (
            <form onSubmit={handleSubmit}>
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

              <div className="mb-4">
                <label htmlFor="password" className="block text-sm font-medium text-primary mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40" />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    className="input-field pl-12"
                    required
                  />
                </div>
              </div>

              <div className="text-right mb-4">
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-teal hover:text-teal/80 transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-accent/5 border border-accent/20 rounded-lg text-accent text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full btn-primary py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Member Registration Form */}
          {mode === 'register-member' && (
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="name" className="block text-sm font-medium text-primary mb-2">
                  Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40" />
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="input-field pl-12"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="reg-email" className="block text-sm font-medium text-primary mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40" />
                  <input
                    id="reg-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="input-field pl-12"
                    required
                  />
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="reg-password" className="block text-sm font-medium text-primary mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40" />
                  <input
                    id="reg-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="input-field pl-12"
                    required
                    minLength={8}
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
                disabled={loading || !email || !password || !name}
                className="w-full btn-primary py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setMode('choose-role')}
                className="w-full mt-3 text-sm text-primary/50 hover:text-primary transition-colors"
              >
                Choose a different account type
              </button>
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
