'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Menu,
  X,
  ShoppingCart,
  User,
  Heart,
  LogOut,
  LayoutDashboard,
} from 'lucide-react';
import { useAuth } from './AuthProvider';

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Marketplace', href: '/marketplace' },
  { label: 'News', href: '/news' },
  { label: 'Bars & Specials', href: '/bars' },
];

export default function Header() {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => {
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
    logout();
  };

  const dashboardHref =
    user?.role === 'ADMIN' || user?.role === 'EDITOR' ? '/admin' : '/dashboard';

  return (
    <header className="sticky top-0 z-50 bg-white border-t-4 border-teal shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1 group">
            <span className="text-2xl font-bold text-primary">
              I{' '}
              <Heart
                className="inline-block w-6 h-6 text-accent fill-accent group-hover:scale-110 transition-transform"
                aria-label="Love"
              />{' '}
              FDL
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-primary/80 hover:text-accent font-medium transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Section */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/cart"
              className="relative p-2 text-primary/70 hover:text-teal transition-colors"
              aria-label="Shopping cart"
            >
              <ShoppingCart className="w-5 h-5" />
            </Link>

            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-teal text-white text-sm font-semibold rounded-lg hover:bg-teal/90 transition-colors"
                >
                  <User className="w-4 h-4" />
                  {user.name || user.email.split('@')[0]}
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-light py-1 z-50">
                    <div className="px-4 py-2 border-b border-light">
                      <p className="text-sm font-medium text-primary truncate">{user.name || user.email}</p>
                      <p className="text-xs text-primary/50 truncate">{user.email}</p>
                    </div>
                    {(user.role === 'ADMIN' || user.role === 'EDITOR' || user.role === 'VENDOR') && (
                      <Link
                        href={dashboardHref}
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-primary/80 hover:bg-light transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                      </Link>
                    )}
                    {user.role === 'USER' && (
                      <Link
                        href="/account"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-primary/80 hover:bg-light transition-colors"
                      >
                        <User className="w-4 h-4" />
                        My Account
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-accent hover:bg-light transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/auth"
                className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent/90 transition-colors"
              >
                <User className="w-4 h-4" />
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-3">
            <Link
              href="/cart"
              className="p-2 text-primary/70 hover:text-teal transition-colors"
              aria-label="Shopping cart"
            >
              <ShoppingCart className="w-5 h-5" />
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-primary/70 hover:text-primary transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-light pb-4">
            <nav className="flex flex-col gap-1 pt-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-3 text-primary/80 hover:bg-light hover:text-accent rounded-lg font-medium transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <div className="border-t border-light mt-2 pt-3 px-4">
                {user ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-primary">{user.name || user.email}</p>
                    {(user.role === 'ADMIN' || user.role === 'EDITOR' || user.role === 'VENDOR') && (
                      <Link
                        href={dashboardHref}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-2 py-2 text-sm text-primary/80"
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                      </Link>
                    )}
                    {user.role === 'USER' && (
                      <Link
                        href="/account"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-2 py-2 text-sm text-primary/80"
                      >
                        <User className="w-4 h-4" />
                        My Account
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 py-2 text-sm text-accent"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/auth"
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex items-center gap-2 w-full justify-center px-4 py-3 bg-accent text-white font-semibold rounded-lg hover:bg-accent/90 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    Sign In
                  </Link>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
