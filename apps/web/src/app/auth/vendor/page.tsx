'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Lock,
  User as UserIcon,
  ArrowRight,
  ArrowLeft,
  Heart,
  Loader2,
  Store,
  Globe,
  Phone,
  MapPin,
  FileText,
  Link as LinkIcon,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

export default function VendorRegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);

  // Account fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Business fields
  const [businessName, setBusinessName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleBusinessNameChange = (value: string) => {
    setBusinessName(value);
    // Auto-generate slug if user hasn't manually edited it
    if (!slug || slug === generateSlug(businessName)) {
      setSlug(generateSlug(value));
    }
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.registerVendor({
        email,
        password,
        name,
        businessName,
        slug,
        description: description || undefined,
        phone: phone || undefined,
        address: address || undefined,
        website: website || undefined,
      });

      const { token, user } = res.data;
      login(token, user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
      // If the error is about email/account, go back to step 1
      if (err?.message?.toLowerCase().includes('email')) {
        setStep(1);
      }
    } finally {
      setLoading(false);
    }
  };

  const accountFieldsValid = name && email && password.length >= 8;
  const businessFieldsValid = businessName.length >= 2 && slug.length >= 2;

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
              Become a Vendor
            </h1>
            <p className="text-primary/60 text-sm">
              {step === 1
                ? 'Create your account to get started'
                : 'Tell us about your business'}
            </p>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 mb-6">
            <div className="flex-1 h-1.5 rounded-full bg-teal" />
            <div
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                step === 2 ? 'bg-teal' : 'bg-light'
              }`}
            />
          </div>

          {step === 1 ? (
            <form onSubmit={handleNext}>
              {/* Name */}
              <div className="mb-4">
                <label htmlFor="name" className="block text-sm font-medium text-primary mb-2">
                  Your Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40" />
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="input-field pl-12"
                    required
                    autoFocus
                  />
                </div>
              </div>

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
                  />
                </div>
              </div>

              {/* Password */}
              <div className="mb-6">
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
                disabled={!accountFieldsValid}
                className="w-full btn-primary py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Business Name */}
              <div className="mb-4">
                <label htmlFor="businessName" className="block text-sm font-medium text-primary mb-2">
                  Business Name
                </label>
                <div className="relative">
                  <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40" />
                  <input
                    id="businessName"
                    type="text"
                    value={businessName}
                    onChange={(e) => handleBusinessNameChange(e.target.value)}
                    placeholder="Your business name"
                    className="input-field pl-12"
                    required
                    minLength={2}
                    autoFocus
                  />
                </div>
              </div>

              {/* Store URL / Slug */}
              <div className="mb-4">
                <label htmlFor="slug" className="block text-sm font-medium text-primary mb-2">
                  Store URL
                </label>
                <div className="relative">
                  <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40" />
                  <input
                    id="slug"
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="my-store"
                    className="input-field pl-12"
                    required
                    minLength={2}
                  />
                </div>
                {slug && (
                  <p className="text-xs text-primary/50 mt-1">
                    ilovefdl.com/vendors/{slug}
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="mb-4">
                <label htmlFor="description" className="block text-sm font-medium text-primary mb-2">
                  Description <span className="text-primary/40">(optional)</span>
                </label>
                <div className="relative">
                  <FileText className="absolute left-4 top-3 w-5 h-5 text-primary/40" />
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell customers about your business"
                    className="input-field pl-12 min-h-[80px] resize-none"
                    rows={3}
                    maxLength={2000}
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="mb-4">
                <label htmlFor="phone" className="block text-sm font-medium text-primary mb-2">
                  Phone <span className="text-primary/40">(optional)</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40" />
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    className="input-field pl-12"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="mb-4">
                <label htmlFor="address" className="block text-sm font-medium text-primary mb-2">
                  Address <span className="text-primary/40">(optional)</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40" />
                  <input
                    id="address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="123 Main St, Fond du Lac, WI"
                    className="input-field pl-12"
                  />
                </div>
              </div>

              {/* Website */}
              <div className="mb-6">
                <label htmlFor="website" className="block text-sm font-medium text-primary mb-2">
                  Website <span className="text-primary/40">(optional)</span>
                </label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40" />
                  <input
                    id="website"
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://yourwebsite.com"
                    className="input-field pl-12"
                  />
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-accent/5 border border-accent/20 rounded-lg text-accent text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setStep(1); setError(''); }}
                  className="btn-outline py-4 px-4"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <button
                  type="submit"
                  disabled={loading || !businessFieldsValid}
                  className="flex-1 btn-primary py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Create Vendor Account
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Links to other registration types */}
          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-primary/60">
              Own a bar or restaurant?{' '}
              <Link
                href="/auth/bar-owner"
                className="text-teal hover:text-teal/80 font-medium transition-colors"
              >
                List your establishment
              </Link>
            </p>
            <p className="text-sm text-primary/60">
              Just want to shop?{' '}
              <Link
                href="/auth"
                className="text-teal hover:text-teal/80 font-medium transition-colors"
              >
                Create a member account
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-primary/40 mt-6">
          By registering, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
