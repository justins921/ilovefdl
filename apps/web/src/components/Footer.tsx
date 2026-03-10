'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, Mail, MapPin, Facebook, Instagram, Twitter } from 'lucide-react';

const quickLinks = [
  { label: 'Marketplace', href: '/marketplace' },
  { label: 'Community News', href: '/news' },
  { label: 'Bars & Specials', href: '/bars' },
  { label: "Today's Specials", href: '/specials' },
  { label: 'Become a Vendor', href: '/auth' },
];

const categoryLinks = [
  { label: 'The Fondy Frontline', href: '/news?category=THE_FONDY_FRONTLINE' },
  { label: 'Faces of our Future', href: '/news?category=FACES_OF_OUR_FUTURE' },
  { label: 'Finding Balance', href: '/news?category=FINDING_BALANCE' },
  { label: 'Play. Explore. Repeat.', href: '/news?category=PLAY_EXPLORE_REPEAT' },
  { label: 'The Creative Corner', href: '/news?category=THE_CREATIVE_CORNER' },
];

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <footer className="bg-primary text-white/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* About */}
          <div>
            <Link href="/" className="flex items-center gap-1 mb-4">
              <span className="text-2xl font-bold text-white">
                I{' '}
                <Heart className="inline-block w-5 h-5 text-accent fill-accent" />{' '}
                FDL
              </span>
            </Link>
            <p className="text-white/60 text-sm leading-relaxed mb-4">
              Celebrating the heart of Fond du Lac, Wisconsin. Your home for local
              shopping, community news, and everything that makes our city special.
            </p>
            <div className="flex items-center gap-2 text-white/60 text-sm">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span>Fond du Lac, Wisconsin</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 hover:text-accent transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* News Categories */}
          <div>
            <h3 className="text-white font-semibold mb-4">News</h3>
            <ul className="space-y-2">
              {categoryLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 hover:text-accent transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="text-white font-semibold mb-4">Stay Connected</h3>
            <p className="text-sm text-white/60 mb-4">
              Get the latest news, specials, and community updates delivered to your inbox.
            </p>
            {subscribed ? (
              <div className="bg-teal/20 border border-teal/30 rounded-lg p-4 text-sm text-teal">
                Thanks for subscribing! We&apos;ll keep you in the loop.
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-col gap-3">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email address"
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-3 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent/90 transition-colors"
                >
                  Subscribe
                </button>
              </form>
            )}

            {/* Social Links */}
            <div className="flex items-center gap-4 mt-6">
              <a
                href="https://www.facebook.com/ilovefdl"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-accent transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="https://www.instagram.com/ilovefdl"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-accent transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://x.com/ilovefdl"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-accent transition-colors"
                aria-label="X (Twitter)"
              >
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-white/40">
            &copy; {new Date().getFullYear()} I Love FDL. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-white/40">
            <span>
              Made with{' '}
              <Heart className="inline-block w-3 h-3 text-accent fill-accent" />{' '}
              in Fond du Lac, WI
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
